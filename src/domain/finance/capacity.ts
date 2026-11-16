import { COMFORT_BANDS, FINANCIAL_SCORE_WEIGHTS } from '../../config/capacity'
import type { ScenarioDefinition } from '../../config/scenarios'
import type { FinanceInput } from '../../schemas/simulation'
import type { AffordabilityClass, FinancialScoreParts } from '../../types/decision'
import { calculateFinancedPrincipal } from './loan'

export interface HouseholdBudget {
  availableIncome: number
  /** Premissa do cenário, ou a tolerância informada. Fração, não percentual. */
  vehicleShare: number
  /** Renda disponível × percentual. Zero quando a renda disponível é negativa. */
  calculatedLimit: number
  /** Orçamento mensal usado na análise, já com a fração do cenário. */
  vehicleBudget: number
  limitSource: 'informado' | 'estimado'
  premise: string
  /** O maior valor entre a reserva que a pessoa pediu para preservar e despesas essenciais × meses. */
  protectedReserve: number
  /** Maior entrada que cabe sem usar a reserva protegida. */
  downPaymentRoom: number
  /** Entrada que o financiamento pode usar. Null quando a reserva bloqueia a simulação. */
  usableDownPayment: number | null
  /** A entrada informada usaria a reserva protegida e a pessoa não autorizou. */
  reserveBlocked: boolean
  /** A pessoa autorizou usar a entrada mesmo reduzindo a reserva. */
  reserveOverride: boolean
  /** Parcela da reserva protegida que a entrada autorizada consome (0–1). */
  reserveConsumedShare: number
  pressureCritical: boolean
}

export interface AffordabilityReason {
  code: string
  message: string
  required: number | null
  available: number | null
  gap: number | null
}

export interface VehicleAffordability {
  class: AffordabilityClass
  feasible: boolean
  reasons: AffordabilityReason[]
  commitmentRatio: number | null
  availableCommitment: number | null
  budgetUtilization: number | null
  marginAfterVehicle: number | null
  coverageIndex: number | null
  priceToCapacity: number | null
  acquisitionMargin: number | null
  acquisitionCapacity: number | null
  maxInstallment: number | null
  financialScore: number | null
  contributions: FinancialScoreParts | null
}

/** Centavos. Meio centavo sobe. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Nota de benefício para uma fração.
 * Até 50% do referencial, 100 pontos. De 50% a 100%, cai em linha reta até 0.
 * Acima de 100%, 0. Não é uma curva não linear.
 */
export function comfortScore(share: number): number | null {
  if (!Number.isFinite(share) || share < 0) return null
  if (share <= COMFORT_BANDS.fullComfortShare) return 100
  if (share >= COMFORT_BANDS.limitShare) return 0
  const span = COMFORT_BANDS.limitShare - COMFORT_BANDS.fullComfortShare
  return (100 * (COMFORT_BANDS.limitShare - share)) / span
}

export function classifyAffordability(utilization: number | null): AffordabilityClass {
  if (utilization === null || !Number.isFinite(utilization)) return 'inviavel'
  if (utilization <= COMFORT_BANDS.fullComfortShare) return 'confortavel'
  if (utilization <= COMFORT_BANDS.highShare) return 'adequada'
  if (utilization <= COMFORT_BANDS.limitShare) return 'proxima_do_limite'
  return 'acima_do_limite'
}

function ratio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null
  return numerator / denominator
}

/**
 * Renda disponível e orçamento do veículo.
 * Renda disponível negativa não gera capacidade positiva.
 */
export function calculateHouseholdBudget(
  finance: FinanceInput,
  scenario: ScenarioDefinition,
): HouseholdBudget {
  const availableIncome =
    finance.netIncome -
    finance.fixedExpenses -
    finance.otherRecurringExpenses -
    finance.otherDebts -
    finance.monthlyReserve
  const pressureCritical = !(availableIncome > 0)
  const vehicleShare =
    finance.vehicleSharePct === null ? scenario.maxIncomeCommitment : finance.vehicleSharePct / 100
  const calculatedLimit = pressureCritical ? 0 : roundMoney(availableIncome * vehicleShare)
  const informed = finance.limitMode === 'informado' ? finance.maxMonthlyVehicleSpend : null
  const beforeScenarioShare =
    informed === null ? calculatedLimit : Math.min(informed, calculatedLimit)
  const vehicleBudget = pressureCritical
    ? 0
    : roundMoney(Math.max(0, beforeScenarioShare) * scenario.monthlyLimitShare)
  const protectedReserve = roundMoney(
    Math.max(0, finance.reserve, finance.fixedExpenses * finance.reserveMonths),
  )
  const room = finance.accumulatedReserve - protectedReserve
  const downPaymentRoom = roundMoney(Math.max(0, Math.min(finance.downPayment, room)))
  const reserveBlocked =
    finance.downPayment > downPaymentRoom + 0.001 && !finance.useFullDownPayment
  const usableDownPayment = reserveBlocked
    ? null
    : finance.useFullDownPayment
      ? roundMoney(Math.max(0, finance.downPayment))
      : downPaymentRoom
  const overrun = Math.max(0, finance.downPayment - Math.max(0, room))
  const consumed = protectedReserve <= 0 ? 0 : Math.max(0, Math.min(1, overrun / protectedReserve))
  const reserveConsumedShare = finance.useFullDownPayment ? consumed : 0
  const shareLabel = `${Math.round(vehicleShare * 100)}%`
  const premise =
    finance.limitMode === 'estimado'
      ? `Limite estimado: ${shareLabel} da renda disponível, premissa do cenário ${scenario.label}. Não é regra universal.`
      : `Limite informado, limitado a ${shareLabel} da renda disponível (premissa do cenário ${scenario.label}).`

  return {
    availableIncome,
    vehicleShare,
    calculatedLimit,
    vehicleBudget,
    limitSource: finance.limitMode,
    premise,
    protectedReserve,
    downPaymentRoom,
    usableDownPayment,
    reserveBlocked,
    reserveOverride: finance.useFullDownPayment && consumed > 0,
    reserveConsumedShare,
    pressureCritical,
  }
}

export function maxInstallmentFor(
  budget: HouseholdBudget,
  nonFinancialMonthly: number,
  safetyMarginMonthly: number,
): number {
  return roundMoney(
    Math.max(0, budget.vehicleBudget - nonFinancialMonthly - Math.max(0, safetyMarginMonthly)),
  )
}

export function acquisitionCapacity(params: {
  purchaseMode: 'avista' | 'financiado'
  usableDownPayment: number
  maxInstallment: number
  monthlyRatePct: number
  installments: number
}): number {
  if (params.purchaseMode === 'avista') return roundMoney(Math.max(0, params.usableDownPayment))
  const principal = calculateFinancedPrincipal(
    params.maxInstallment,
    params.monthlyRatePct,
    params.installments,
  )
  return roundMoney(params.usableDownPayment + principal)
}

/**
 * A folga mensal satura quando cobre pelo menos um mês de despesas essenciais.
 * Sem despesas essenciais, qualquer folga não negativa já está no máximo.
 * Abaixo do mês de despesas, a nota cai em linha reta até zero.
 */
export function marginComfortScore(margin: number, essentialExpenses: number): number | null {
  if (!Number.isFinite(margin) || !Number.isFinite(essentialExpenses)) return null
  if (margin < 0) return 0
  if (essentialExpenses <= 0) return 100
  if (margin >= essentialExpenses) return 100
  return (100 * margin) / essentialExpenses
}

function reason(
  code: string,
  message: string,
  required: number | null,
  available: number | null,
): AffordabilityReason {
  const gap =
    required === null || available === null ? null : roundMoney(Math.max(0, required - available))
  return { code, message, required, available, gap }
}
/**
 * Viabilidade de um veículo diante do orçamento da casa.
 * Restrição rígida não recebe score: preferência e TCO não compensam inviabilidade.
 */
export function assessVehicle(input: {
  budget: HouseholdBudget
  purchaseMode: 'avista' | 'financiado'
  price: number
  monthlyTotal: number
  monthlyInstallment: number
  netIncome: number
  monthlyRatePct: number
  installments: number
  safetyMarginMonthly: number
  /** Despesas essenciais. A folga satura quando cobre pelo menos um mês delas. */
  essentialExpenses: number
}): VehicleAffordability {
  const { budget } = input
  const nonFinancial = input.monthlyTotal - input.monthlyInstallment
  const empty = (
    reasons: AffordabilityReason[],
    affordabilityClass: AffordabilityClass,
  ): VehicleAffordability => ({
    class: affordabilityClass,
    feasible: false,
    reasons,
    commitmentRatio: ratio(input.monthlyTotal, input.netIncome),
    availableCommitment: ratio(input.monthlyTotal, budget.availableIncome),
    budgetUtilization: budget.vehicleBudget > 0 ? input.monthlyTotal / budget.vehicleBudget : null,
    marginAfterVehicle:
      budget.availableIncome > 0 ? budget.availableIncome - input.monthlyTotal : null,
    coverageIndex: ratio(budget.availableIncome, input.monthlyTotal),
    priceToCapacity: null,
    acquisitionMargin: null,
    acquisitionCapacity: null,
    maxInstallment: null,
    financialScore: null,
    contributions: null,
  })

  if (budget.pressureCritical || budget.reserveBlocked || budget.usableDownPayment === null) {
    const blocked = budget.reserveBlocked
    return empty(
      [
        blocked
          ? reason(
              'reserva_violada',
              'A entrada informada usa a reserva protegida. Reduza a entrada ou confirme o uso da reserva.',
              input.price,
              budget.downPaymentRoom,
            )
          : reason(
              'renda_disponivel_negativa',
              'A renda disponível não é positiva. Não há capacidade de compra automática.',
              null,
              budget.availableIncome,
            ),
      ],
      'inviavel',
    )
  }

  const installmentCap = maxInstallmentFor(budget, nonFinancial, input.safetyMarginMonthly)
  const capacity = acquisitionCapacity({
    purchaseMode: input.purchaseMode,
    usableDownPayment: budget.usableDownPayment,
    maxInstallment: installmentCap,
    monthlyRatePct: input.monthlyRatePct,
    installments: input.installments,
  })
  const cashRoom = roundMoney(budget.vehicleBudget - Math.max(0, input.safetyMarginMonthly))
  const utilization = cashRoom > 0 ? input.monthlyTotal / cashRoom : null
  const margin = budget.availableIncome - input.monthlyTotal
  const commitment = ratio(input.monthlyTotal, input.netIncome)
  const availableCommitment = ratio(input.monthlyTotal, budget.availableIncome)
  const priceToCapacity = ratio(input.price, capacity)

  const reasons: AffordabilityReason[] = []
  if (roundMoney(input.monthlyTotal) > cashRoom) {
    reasons.push(
      reason(
        'custo_acima_limite',
        'O custo mensal estimado passa do orçamento do veículo.',
        input.monthlyTotal,
        cashRoom,
      ),
    )
  }
  if (roundMoney(input.price) > capacity) {
    reasons.push(
      reason(
        'preco_acima_capacidade',
        'O preço de referência passa da capacidade de aquisição estimada.',
        input.price,
        capacity,
      ),
    )
  }
  if (margin < 0) {
    reasons.push(
      reason(
        'margem_negativa',
        'O custo mensal é maior que a renda disponível.',
        input.monthlyTotal,
        budget.availableIncome,
      ),
    )
  }
  if (reasons.length > 0) {
    const aboveLimit = reasons.some((item) => item.code === 'custo_acima_limite')
    return {
      ...empty(reasons, aboveLimit ? 'acima_do_limite' : 'inviavel'),
      acquisitionCapacity: capacity,
      maxInstallment: installmentCap,
      priceToCapacity,
      acquisitionMargin: capacity - input.price,
      marginAfterVehicle: margin,
    }
  }

  const utilizationScore = comfortScore(utilization ?? Number.NaN)
  const commitmentScore = comfortScore(availableCommitment ?? Number.NaN)
  const priceScore = comfortScore(priceToCapacity ?? Number.NaN)
  const marginBenefit = marginComfortScore(margin, input.essentialExpenses)
  const reserveScore = (1 - budget.reserveConsumedShare) * 100
  const parts = [utilizationScore, commitmentScore, priceScore, marginBenefit]
  if (parts.some((part) => part === null)) {
    return empty(
      [
        reason(
          'dado_essencial_ausente',
          'Não há dados suficientes para o score financeiro.',
          null,
          null,
        ),
      ],
      'inviavel',
    )
  }
  const weights = FINANCIAL_SCORE_WEIGHTS
  const contributions: FinancialScoreParts = {
    utilization: (weights.utilization / 100) * (utilizationScore as number),
    availableCommitment: (weights.availableCommitment / 100) * (commitmentScore as number),
    priceCapacity: (weights.priceCapacity / 100) * (priceScore as number),
    margin: (weights.margin / 100) * (marginBenefit as number),
    reserve: (weights.reserve / 100) * reserveScore,
  }
  const financialScore =
    contributions.utilization +
    contributions.availableCommitment +
    contributions.priceCapacity +
    contributions.margin +
    contributions.reserve

  return {
    class: classifyAffordability(utilization),
    feasible: true,
    reasons: [],
    commitmentRatio: commitment,
    availableCommitment,
    budgetUtilization: utilization,
    marginAfterVehicle: margin,
    coverageIndex: ratio(budget.availableIncome, input.monthlyTotal),
    priceToCapacity,
    acquisitionMargin: capacity - input.price,
    acquisitionCapacity: capacity,
    maxInstallment: installmentCap,
    financialScore,
    contributions,
  }
}
