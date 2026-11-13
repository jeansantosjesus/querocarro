import { DEFAULT_ASSUMPTIONS } from './assumptions'
import type { BrazilianStateCode, RegionalTaxRule } from '../types/regionalTax'

/**
 * Data em que a vigência é julgada. Fixa de propósito: o cálculo não usa o relógio
 * do navegador, então a mesma simulação continua reproduzível.
 * Coincide com o mês de referência das premissas (`ASSUMPTIONS_REFERENCE_MONTH`).
 */
export const TAX_REFERENCE_DATE = '2026-11-01'

/**
 * Única regra cadastrada. É dado de demonstração: reutiliza a estimativa configurável
 * de 4% e não é alíquota oficial da Bahia. Nenhuma outra UF tem regra.
 */
export const BAHIA_DEMONSTRATION_RULE: RegionalTaxRule = {
  id: 'ba-ipva-demonstracao-2026',
  state: 'BA',
  tax: 'ipva',
  vehicleCondition: 'qualquer',
  propulsion: 'qualquer',
  ratePct: DEFAULT_ASSUMPTIONS.ipvaRatePct,
  fixedAmountBRL: null,
  exemptions: [],
  source:
    'Dado de demonstração do QC. Reutiliza a estimativa configurável nacional de IPVA. Não é alíquota oficial da Bahia.',
  legalBasis: 'Nenhuma base legal cadastrada. O QC não afirma que esta alíquota vale na Bahia.',
  fiscalYear: 2026,
  validFrom: '2026-01-01',
  validUntil: '2026-12-31',
  lastVerifiedAt: null,
  status: 'demonstracao',
}

const RULES: readonly RegionalTaxRule[] = [BAHIA_DEMONSTRATION_RULE]

export function catalogRulesFor(state: BrazilianStateCode): readonly RegionalTaxRule[] {
  return RULES.filter((rule) => rule.state === state)
}
