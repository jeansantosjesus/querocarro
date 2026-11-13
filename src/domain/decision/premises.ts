import { ASSUMPTIONS_REFERENCE_MONTH, resolveAssumptions } from '../../config/assumptions'
import type { SimulationInput } from '../../schemas/simulation'
import type { SavedPremises } from '../../types/history'

/** Ano de referência do cálculo: o da tabela FIPE; sem mês válido, o ano atual. */
export function referenceYearOf(
  referenceMonth: string | null | undefined,
  fallbackYear: number = new Date().getFullYear(),
): number {
  return Number(referenceMonth?.slice(0, 4)) || fallbackYear
}

/** Premissas completas usadas numa simulação: padrões do QC mais os ajustes da pessoa. */
export function buildPremises(input: SimulationInput, referenceYear: number): SavedPremises {
  return {
    assumptionsReferenceMonth: ASSUMPTIONS_REFERENCE_MONTH,
    referenceYear,
    assumptions: resolveAssumptions(input.assumptionOverrides),
  }
}
