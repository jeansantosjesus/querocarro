import type { Assumptions } from '../../config/assumptions'
import { DEFAULT_TCO_HORIZON, type TcoHorizon } from '../../config/tco'
import type { FinanceInput, UsageInput } from '../../schemas/simulation'
import type { RankedVehicle } from '../../types/decision'
import { runSensitivity, type SensitivityCase } from '../finance/sensitivity'
import { buildTcoInput } from '../finance/tco'

export interface SensitivityContext {
  purchaseMode: 'avista' | 'financiado'
  finance: FinanceInput
  usage: UsageInput
  assumptions: Assumptions
  referenceYear: number
}

/**
 * Sensibilidade do custo econômico (Tabela Price, horizonte padrão) de um veículo do ranking.
 * Usa a mesma montagem de entrada do pipeline, então o caso base é o TCO já exibido.
 */
export function vehicleSensitivity(
  item: RankedVehicle,
  context: SensitivityContext,
  horizon: TcoHorizon = DEFAULT_TCO_HORIZON,
): SensitivityCase[] {
  const base = buildTcoInput({
    vehicle: item.vehicle,
    costs: item.costs,
    finance: context.finance,
    usage: context.usage,
    purchaseMode: context.purchaseMode,
    assumptions: context.assumptions,
    referenceYear: context.referenceYear,
  })
  return runSensitivity(base, horizon, 'price')
}

export interface SensitivityEffect {
  label: string
  /** Diferença para o caso base, em BRL. null se algum caso não puder ser calculado. */
  delta: number | null
}

/** Variações (sem o caso base), da de maior efeito absoluto para a de menor. */
export function rankSensitivityEffects(cases: readonly SensitivityCase[]): SensitivityEffect[] {
  const base = cases[0]?.result.economic.total ?? null
  return cases
    .slice(1)
    .map((item) => {
      const total = item.result.economic.total
      return {
        label: item.label,
        delta: base === null || total === null ? null : total - base,
      }
    })
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
}
