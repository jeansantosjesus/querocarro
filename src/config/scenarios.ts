import type { ScenarioId, Weights } from '../types/decision'

/**
 * Cenários do QC. TODOS os percentuais e multiplicadores ficam aqui,
 * centralizados, e são explicados na interface (Central de ajuda, artigo de metodologia).
 */
export interface ScenarioDefinition {
  id: ScenarioId
  label: string
  shortDescription: string
  explanation: string
  weights: Weights
  /** Multiplicadores aplicados às estimativas de custo. */
  multipliers: {
    insurance: number
    maintenance: number
    energy: number
  }
  /** Fração do gasto mensal desejado usada como limite efetivo. */
  monthlyLimitShare: number
  /** Comprometimento máximo da renda líquida admitido pelo cenário (fração). */
  maxIncomeCommitment: number
  /**
   * Penalização para opções próximas do limite efetivo:
   * a partir de `startShare` do limite, subtrai até `maxPoints` do índice.
   */
  proximityPenalty: { startShare: number; maxPoints: number } | null
}

export const SCENARIOS: Record<Exclude<ScenarioId, 'personalizado'>, ScenarioDefinition> = {
  economico: {
    id: 'economico',
    label: 'Econômico',
    shortDescription: 'Prioriza menor custo total no horizonte.',
    explanation:
      'Dá mais peso ao custo total no horizonte (TCO), e menos peso a aderência e preferências. Usa as estimativas padrão, sem margem extra.',
    weights: {
      tco: 75,
      incomeCommitment: 15,
      usageFit: 5,
      preference: 5,
    },
    multipliers: { insurance: 1, maintenance: 1, energy: 1 },
    monthlyLimitShare: 1,
    maxIncomeCommitment: 0.4,
    proximityPenalty: null,
  },
  equilibrado: {
    id: 'equilibrado',
    label: 'Equilibrado',
    shortDescription: 'Equilibra custo total, comprometimento da renda, uso e preferências.',
    explanation:
      'Distribui os pesos de forma mais uniforme entre os critérios, valorizando também a aderência ao uso e as preferências informadas.',
    weights: {
      tco: 65,
      incomeCommitment: 15,
      usageFit: 12,
      preference: 8,
    },
    multipliers: { insurance: 1, maintenance: 1, energy: 1 },
    monthlyLimitShare: 1,
    maxIncomeCommitment: 0.35,
    proximityPenalty: null,
  },
  conservador: {
    id: 'conservador',
    label: 'Conservador',
    shortDescription: 'Usa margem de segurança maior e evita opções próximas do limite.',
    explanation:
      'Aumenta as estimativas de seguro (+25%), manutenção (+30%) e energia (+10%), usa apenas 80% do gasto mensal desejado como limite, admite no máximo 25% da renda comprometida e reduz o índice de opções que ficam acima de 70% desse limite.',
    weights: {
      tco: 70,
      incomeCommitment: 20,
      usageFit: 5,
      preference: 5,
    },
    multipliers: { insurance: 1.25, maintenance: 1.3, energy: 1.1 },
    monthlyLimitShare: 0.8,
    maxIncomeCommitment: 0.25,
    proximityPenalty: { startShare: 0.7, maxPoints: 15 },
  },
}

/** Parâmetros base do cenário personalizado (equivalente ao equilibrado, editável). */
export const CUSTOM_SCENARIO_BASE: ScenarioDefinition = {
  ...SCENARIOS.equilibrado,
  id: 'personalizado',
  label: 'Personalizado',
  shortDescription: 'Você define os pesos e a margem de segurança.',
  explanation:
    'Parte do cenário equilibrado. Você ajusta os pesos e o multiplicador de margem de segurança dentro dos limites do sistema.',
}

export const CUSTOM_MARGIN_LIMITS = { min: 1, max: 1.5 } as const

export const SCENARIO_LIST: ScenarioDefinition[] = [
  SCENARIOS.economico,
  SCENARIOS.equilibrado,
  SCENARIOS.conservador,
  CUSTOM_SCENARIO_BASE,
]

export function getScenarioDefinition(id: ScenarioId): ScenarioDefinition {
  return id === 'personalizado' ? CUSTOM_SCENARIO_BASE : SCENARIOS[id]
}

/**
 * Efeito dos controles de prioridade (1-5) sobre os pesos do cenário.
 * Cada passo acima/abaixo de 3 altera o peso do critério em `stepPct`.
 * ATENÇÃO: a base demonstrativa não possui dados de desempenho; "desempenho"
 * só altera a importância das preferências informadas.
 */
export const PRIORITY_EFFECT = {
  stepPct: 0.15,
  neutral: 3,
  mapping: {
    economia: ['incomeCommitment'],
    conforto: ['usageFit'],
    desempenho: ['preference'],
    manutencao: ['tco'],
  },
} as const

export const MODEL_VERSION = 'wsm-1.0.0'
