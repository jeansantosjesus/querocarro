import {
  CUSTOM_SCENARIO_BASE,
  getScenarioDefinition,
  type ScenarioDefinition,
} from '../../config/scenarios'
import type { ObjectiveInput } from '../../schemas/simulation'
import type { Weights } from '../../types/decision'
import { applyPriorities, type Priorities } from './weights'

/**
 * Resolve a definição efetiva do cenário.
 * No cenário personalizado, o multiplicador de margem escolhido pelo usuário
 * (>= 1) aumenta seguro, manutenção e energia e reduz proporcionalmente o limite mensal usado.
 */
export function resolveScenario(
  objective: Pick<ObjectiveInput, 'scenarioId' | 'customMarginMultiplier'>,
): ScenarioDefinition {
  if (objective.scenarioId !== 'personalizado') return getScenarioDefinition(objective.scenarioId)
  const margin = Math.max(objective.customMarginMultiplier, 1)
  return {
    ...CUSTOM_SCENARIO_BASE,
    multipliers: { insurance: margin, maintenance: margin, energy: margin },
    monthlyLimitShare: 1 / margin,
    maxIncomeCommitment: CUSTOM_SCENARIO_BASE.maxIncomeCommitment / margin,
    proximityPenalty: null,
  }
}

/** Pesos iniciais recomendados = pesos do cenário ajustados pelas prioridades. */
export function initialWeights(
  scenarioId: ObjectiveInput['scenarioId'],
  priorities: Priorities,
): Weights {
  return applyPriorities(getScenarioDefinition(scenarioId).weights, priorities)
}
