import type { DecisionSummary, TcoComponentId, TcoComposition } from '../../types/analytics'
import type { ExclusionRecord, VehicleCosts } from '../../types/decision'
import { distributionByBands, percentile, splitFinite, summarize } from '../../utils/stats'
import { annualToMonthly } from '../finance/indicators'

const TCO_LABELS: Record<TcoComponentId, string> = {
  installment: 'Parcela do financiamento',
  ipva: 'IPVA',
  licensing: 'Licenciamento',
  insurance: 'Seguro',
  maintenance: 'Manutenção',
  energy: 'Energia',
  depreciation: 'Depreciação',
}

/**
 * Participação de cada componente no custo mensal total.
 * Retorna null se o total ou algum componente estiver ausente (nunca completa com zero).
 */
export function calculateTcoComposition(costs: VehicleCosts): TcoComposition | null {
  const {
    monthlyTotal,
    ipvaAnnual,
    insuranceAnnual,
    maintenanceAnnual,
    energyMonthly,
    depreciationAnnual,
  } = costs
  if (
    monthlyTotal === null ||
    monthlyTotal <= 0 ||
    ipvaAnnual === null ||
    insuranceAnnual === null ||
    maintenanceAnnual === null ||
    energyMonthly === null ||
    depreciationAnnual === null
  ) {
    return null
  }
  const monthly: Record<TcoComponentId, number> = {
    installment: costs.monthlyInstallment,
    ipva: annualToMonthly(ipvaAnnual),
    licensing: annualToMonthly(costs.licensingAnnual),
    insurance: annualToMonthly(insuranceAnnual),
    maintenance: annualToMonthly(maintenanceAnnual),
    energy: energyMonthly,
    depreciation: annualToMonthly(depreciationAnnual),
  }
  const ids = Object.keys(monthly) as TcoComponentId[]
  return {
    monthlyTotal,
    components: ids.map((id) => ({
      id,
      label: TCO_LABELS[id],
      monthly: monthly[id],
      share: monthly[id] / monthlyTotal,
    })),
  }
}

/** Resumo descritivo das alternativas avaliadas, elegíveis e excluídas. */
export function summarizeDecision(
  evaluatedCount: number,
  eligibleCosts: readonly VehicleCosts[],
  excluded: readonly ExclusionRecord[],
): DecisionSummary {
  const excludedByStage: DecisionSummary['excludedByStage'] = {
    qualidade: 0,
    dados: 0,
    filtro: 0,
    viabilidade: 0,
  }
  for (const record of excluded) excludedByStage[record.stage] += 1

  const monthlyValues = eligibleCosts.map((costs) => costs.monthlyTotal)
  const { values: finiteMonthly } = splitFinite(monthlyValues)
  const edges = [0.25, 0.5, 0.75]
    .map((p) => percentile(finiteMonthly, p))
    .filter((value): value is number => value !== null)
  const uniqueEdges = [...new Set(edges)]

  return {
    evaluatedCount,
    eligibleCount: eligibleCosts.length,
    excludedCount: excluded.length,
    excludedByStage,
    price: summarize(eligibleCosts.map((costs) => costs.priceBRL)),
    monthlyTotal: summarize(monthlyValues),
    monthlyTotalBands:
      finiteMonthly.length > 0 ? distributionByBands(finiteMonthly, uniqueEdges) : [],
  }
}
