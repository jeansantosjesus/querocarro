import { resolveAssumptions } from '../../config/assumptions'
import { RECOMMENDATION_LIMITS } from '../../config/limits'
import { MODEL_VERSION } from '../../config/scenarios'
import type { SimulationInput } from '../../schemas/simulation'
import {
  type AdjustmentSuggestion,
  type CriterionId,
  type DecisionResult,
  type ExclusionRecord,
  type FinancialIndicators,
  type RankedVehicle,
} from '../../types/decision'
import type { Vehicle } from '../../types/vehicle'
import { computeVehicleCosts, type CostContext } from '../finance/costs'
import { buildTcoInput, calculateVehicleTco } from '../finance/tco'
import { assessVehicle, calculateHouseholdBudget } from '../finance/capacity'
import { calculateEffectiveMonthlyLimit } from '../finance/indicators'
import { classifyAdherence, classifyPressure } from '../analytics/classify'
import { clusterVehicles } from '../analytics/cluster'
import { calculateTcoComposition, summarizeDecision } from '../analytics/summary'
import { applyHardFilters } from '../vehicle/filters'
import { calculatePreferenceScore, calculateUsageFit } from '../vehicle/fit'
import { assessCatalogQuality, vehicleLabel } from '../vehicle/quality'
import { explainVehicle } from './explain'
import { resolveScenario } from './scenarios'
import { rankByIndex, scoreCandidates, type ScoringCandidate } from './wsm'

export interface DecisionOptions {
  referenceYear: number
  /** Tamanho do grupo recomendado (3 a 5). */
  groupSize?: number
  /** Calcula sugestões de ajuste quando houver poucas ou nenhuma opção. */
  withSuggestions?: boolean
}

function buildFinancialIndicators(
  availableIncome: number,
  assessment: ReturnType<typeof assessVehicle>,
): FinancialIndicators {
  const pressureLevel =
    availableIncome < 0 ? 'critica' : classifyPressure(assessment.commitmentRatio)
  return {
    commitmentRatio: assessment.commitmentRatio,
    limitUsageRatio: assessment.budgetUtilization,
    availableMonthly: availableIncome,
    availableCommitment: assessment.availableCommitment,
    remainingMargin: assessment.marginAfterVehicle,
    coverageIndex: assessment.coverageIndex,
    priceToPurchasePowerRatio: assessment.priceToCapacity,
    acquisitionCapacity: assessment.acquisitionCapacity,
    acquisitionMargin: assessment.acquisitionMargin,
    affordabilityClass: assessment.class,
    financialScore: assessment.financialScore,
    financialContributions: assessment.contributions,
    pressureLevel,
  }
}

/**
 * Pipeline completo e determinístico do SAD:
 * qualidade dos dados -> filtros -> custos -> viabilidade -> normalização -> soma ponderada
 * -> ranking interno -> grupo recomendado -> explicações.
 *
 * Não usa aleatoriedade, relógio nem rede: mesmos dados de entrada, pesos e base de veículos
 * produzem exatamente o mesmo resultado.
 */
export function runDecision(
  input: SimulationInput,
  vehicles: readonly Vehicle[],
  options: DecisionOptions,
): DecisionResult {
  const scenario = resolveScenario(input.objective)
  const assumptions = resolveAssumptions(input.assumptionOverrides)
  const weights = input.weights
  const household = calculateHouseholdBudget(input.finance, scenario)
  const effectiveMonthlyLimit = calculateEffectiveMonthlyLimit(input.finance, scenario)
  const budgetAlerts = household.reserveOverride
    ? [
        'A entrada informada reduz a reserva protegida. O uso foi confirmado e reduz a preservação da reserva no score financeiro.',
      ]
    : []

  const quality = assessCatalogQuality(vehicles, options.referenceYear)
  const excluded: ExclusionRecord[] = [...quality.excluded]

  const costContext: CostContext = {
    finance:
      household.usableDownPayment === null
        ? input.finance
        : { ...input.finance, downPayment: household.usableDownPayment },
    usage: input.usage,
    purchaseMode: input.objective.purchaseMode,
    fuelPreference: input.preferences.fuel,
    assumptions,
    scenario,
    referenceYear: options.referenceYear,
    registrationState: input.registrationState,
    condition: input.objective.condition,
    manualIpvaRatePct: input.assumptionOverrides.ipvaRatePct,
    allowDemonstrativeTax: input.allowDemonstrativeTax,
  }

  const candidates: ScoringCandidate[] = []

  for (const vehicle of quality.valid) {
    const label = vehicleLabel(vehicle)

    const rejection = applyHardFilters(vehicle, input, options.referenceYear)
    if (rejection) {
      excluded.push({ vehicleId: vehicle.id, label, stage: 'filtro', ...rejection })
      continue
    }

    const costResult = computeVehicleCosts(vehicle, costContext)
    if (!costResult.ok) {
      excluded.push({
        vehicleId: vehicle.id,
        label,
        stage: 'dados',
        code: costResult.code,
        message: costResult.message,
      })
      continue
    }
    const costs = costResult.costs

    if (costs.monthlyTotal === null) {
      excluded.push({
        vehicleId: vehicle.id,
        label,
        stage: 'dados',
        code: 'custo_mensal_incompleto',
        message: `Custo mensal não pôde ser estimado: ${costs.notes.join(' ') || 'dados ausentes.'}`,
      })
      continue
    }

    if (household.usableDownPayment === null) {
      excluded.push({
        vehicleId: vehicle.id,
        label,
        stage: 'viabilidade',
        code: 'reserva_violada',
        message:
          'A entrada informada usa a reserva protegida. Reduza a entrada ou confirme o uso da reserva.',
        required: input.finance.downPayment,
        available: household.downPaymentRoom,
        gap: Math.max(0, input.finance.downPayment - household.downPaymentRoom),
      })
      continue
    }
    if (
      input.objective.purchaseMode === 'financiado' &&
      input.finance.maxInstallment !== null &&
      costs.monthlyInstallment > input.finance.maxInstallment
    ) {
      excluded.push({
        vehicleId: vehicle.id,
        label,
        stage: 'viabilidade',
        code: 'parcela_acima_limite',
        message: 'Parcela estimada acima do valor máximo aceitável informado.',
        required: costs.monthlyInstallment,
        available: input.finance.maxInstallment,
        gap: costs.monthlyInstallment - input.finance.maxInstallment,
      })
      continue
    }

    const assessment = assessVehicle({
      budget: household,
      purchaseMode: input.objective.purchaseMode,
      price: costs.priceBRL,
      monthlyTotal: costs.monthlyTotal,
      monthlyInstallment: costs.monthlyInstallment,
      netIncome: input.finance.netIncome,
      monthlyRatePct: input.finance.monthlyRatePct,
      installments: input.finance.installments,
      safetyMarginMonthly: input.finance.safetyMarginMonthly,
      essentialExpenses: input.finance.fixedExpenses,
    })
    if (!assessment.feasible || assessment.financialScore === null) {
      const primary = assessment.reasons[0]
      excluded.push({
        vehicleId: vehicle.id,
        label,
        stage: 'viabilidade',
        code: primary?.code ?? 'inviavel',
        message: primary?.message ?? 'A opção não passou nas restrições financeiras.',
        required: primary?.required ?? null,
        available: primary?.available ?? null,
        gap: primary?.gap ?? null,
      })
      continue
    }
    const financial = buildFinancialIndicators(household.availableIncome, assessment)

    const tco = calculateVehicleTco(
      buildTcoInput({
        vehicle,
        costs,
        finance: input.finance,
        usage: input.usage,
        purchaseMode: input.objective.purchaseMode,
        assumptions,
        referenceYear: options.referenceYear,
      }),
    )
    const criteria = {
      tco: tco.criterionValue,
      incomeCommitment: financial.financialScore,
      usageFit: calculateUsageFit(vehicle, input.usage),
      preference: calculatePreferenceScore(vehicle, input, options.referenceYear),
    } satisfies Record<CriterionId, number | null>

    candidates.push({ vehicle, costs, financial, tco, criteria })
  }

  const scoring = scoreCandidates(candidates, weights, scenario, effectiveMonthlyLimit)
  excluded.push(...scoring.excluded)

  const ranked = rankByIndex(scoring.scored)
  const clustering = clusterVehicles(
    ranked.map((item) => ({
      id: item.vehicle.id,
      price: item.costs.priceBRL,
      monthlyTotal: item.costs.monthlyTotal,
      energyCostPerKm: item.costs.energyCostPerKm,
      maintenanceAnnual: item.costs.maintenanceAnnual,
      depreciationAnnual: item.costs.depreciationAnnual,
      usageFit: item.criteria.usageFit,
      category: item.vehicle.category,
    })),
  )

  const ranking: RankedVehicle[] = ranked.map((item, position) => {
    const { pros, alerts } = explainVehicle(item)
    return {
      ...item,
      rank: position + 1,
      pros,
      alerts,
      analytics: {
        groupId: clustering.assignments.get(item.vehicle.id) ?? null,
        adherence: classifyAdherence(item.criteria.usageFit),
        tcoComposition: calculateTcoComposition(item.costs),
      },
    }
  })

  const groupSize = Math.min(
    Math.max(
      options.groupSize ?? RECOMMENDATION_LIMITS.defaultGroupSize,
      RECOMMENDATION_LIMITS.minGroupSize,
    ),
    RECOMMENDATION_LIMITS.maxGroupSize,
  )
  const group = ranking.slice(0, groupSize)

  const suggestions =
    (options.withSuggestions ?? true) && ranking.length < RECOMMENDATION_LIMITS.minGroupSize
      ? buildSuggestions(input, vehicles, options, ranking.length)
      : []

  return {
    scenarioId: input.objective.scenarioId,
    weights,
    modelVersion: MODEL_VERSION,
    ranking,
    group,
    excluded,
    eligibleCount: ranking.length,
    evaluatedCount: vehicles.length,
    noOptions: ranking.length === 0,
    suggestions,
    stats: scoring.stats,
    effectiveMonthlyLimit,
    budgetPremise: household.premise,
    budgetAlerts,
    analytics: {
      summary: summarizeDecision(
        vehicles.length,
        ranking.map((item) => item.costs),
        excluded,
      ),
      clustering: clustering.summary,
    },
  }
}

/**
 * Sugestões transparentes de ajuste: cada uma reexecuta o mesmo pipeline com UM parâmetro
 * relaxado e informa quantas alternativas passariam a ser elegíveis. Nada é aplicado automaticamente.
 */
export interface RelaxedVariant {
  id: string
  label: string
  input: SimulationInput
}

/** Variantes da simulação com UM parâmetro relaxado (usadas nas sugestões e ao aplicá-las). */
export function buildRelaxedVariants(input: SimulationInput): RelaxedVariant[] {
  const variants: RelaxedVariant[] = []
  const { objective, finance, preferences } = input

  if (objective.maxPurchasePrice !== null) {
    variants.push({
      id: 'aumentar_faixa_preco',
      label: 'Aumentar em 25% a faixa de preço máxima',
      input: {
        ...input,
        objective: {
          ...objective,
          maxPurchasePrice: Math.round(objective.maxPurchasePrice * 1.25),
        },
      },
    })
  }
  if (preferences.yearMin !== null || preferences.yearMax !== null) {
    variants.push({
      id: 'ampliar_anos',
      label: 'Ampliar a faixa de anos aceitável',
      input: { ...input, preferences: { ...preferences, yearMin: null, yearMax: null } },
    })
  }
  variants.push({
    id: 'rever_gasto_mensal',
    label: 'Aumentar em 25% o gasto mensal desejado e a parcela máxima',
    input: {
      ...input,
      finance: {
        ...finance,
        maxMonthlyVehicleSpend: finance.maxMonthlyVehicleSpend * 1.25,
        maxInstallment: finance.maxInstallment === null ? null : finance.maxInstallment * 1.25,
      },
    },
  })
  if (preferences.requireFuel || preferences.requireTransmission || preferences.requireCondition) {
    variants.push({
      id: 'remover_filtros_opcionais',
      label: 'Remover filtros opcionais (combustível, câmbio ou condição como obrigatórios)',
      input: {
        ...input,
        preferences: {
          ...preferences,
          requireFuel: false,
          requireTransmission: false,
          requireCondition: false,
        },
      },
    })
  }

  return variants
}

function buildSuggestions(
  input: SimulationInput,
  vehicles: readonly Vehicle[],
  options: DecisionOptions,
  currentCount: number,
): AdjustmentSuggestion[] {
  const suggestions: AdjustmentSuggestion[] = []
  for (const variant of buildRelaxedVariants(input)) {
    const result = runDecision(variant.input, vehicles, { ...options, withSuggestions: false })
    if (result.eligibleCount > currentCount) {
      suggestions.push({ id: variant.id, label: variant.label, wouldYield: result.eligibleCount })
    }
  }
  return suggestions
        }
