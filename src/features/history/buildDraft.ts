import { MODEL_VERSION } from '../../config/scenarios'

import { buildPremises, referenceYearOf } from '../../domain/decision/premises'

import { resolveScenario } from '../../domain/decision/scenarios'

import type { SimulationInput } from '../../schemas/simulation'

import type { DecisionResult } from '../../types/decision'

import type { SavedResultItem, SimulationDraft } from '../../types/history'

import type { VehicleCatalog } from '../../types/vehicle'

/**

* Converte o resultado atual em um rascunho persistível.

* Guarda todo o ranking elegível (com marcação do grupo recomendado), o snapshot do cenário

* e a versão do catálogo, para que o histórico mostre exatamente o que o usuário viu.

*/

export function buildSimulationDraft(
  input: SimulationInput,

  result: DecisionResult,

  catalog: VehicleCatalog,
): SimulationDraft {
  const scenario = resolveScenario(input.objective)

  const groupIds = new Set(result.group.map((item) => item.vehicle.id))

  const results: SavedResultItem[] = result.ranking.map((item) => ({
    vehicleFipeCode: item.vehicle.fipeCode,

    vehicleYearId: item.vehicle.fipeYearId,

    compatibilityIndex: item.index,

    inRecommendedGroup: groupIds.has(item.vehicle.id),

    rank: item.rank,

    payload: item,
  }))

  return {
    title: input.objective.title,

    scenarioId: input.objective.scenarioId,

    inputs: input,

    weights: input.weights,

    scenarioSnapshot: {
      scenarioId: input.objective.scenarioId,

      modelVersion: MODEL_VERSION,

      multipliers: scenario.multipliers,

      monthlyLimitShare: scenario.monthlyLimitShare,

      maxIncomeCommitment: scenario.maxIncomeCommitment,

      premises: buildPremises(input, referenceYearOf(catalog.referenceMonth)),
    },

    fipeReferenceMonth: catalog.referenceMonth,

    fipeReferenceMonthLabel: catalog.referenceMonthLabel,

    catalogVersion: catalog.version,

    results,
  }
}
