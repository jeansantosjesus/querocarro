import type { Assumptions } from '../config/assumptions'

import type { SimulationInput } from '../schemas/simulation'

import type { RankedVehicle, ScenarioId, Weights } from './decision'



/**

* Premissas usadas no cálculo, gravadas com a simulação. Os ajustes da pessoa já estão em

* `inputs.assumptionOverrides`; aqui fica o conjunto completo (padrões + ajustes) e o ano de referência.

*/

export interface SavedPremises {

assumptionsReferenceMonth: string

referenceYear: number

assumptions: Assumptions

}



export interface SavedResultItem {

vehicleFipeCode: string

vehicleYearId: string

compatibilityIndex: number

inRecommendedGroup: boolean

rank: number

/** Resultado completo (RankedVehicle) como o usuário viu. */

payload: RankedVehicle

}



export interface ScenarioSnapshot {

scenarioId: ScenarioId

modelVersion: string

multipliers: { insurance: number; maintenance: number; energy: number }

monthlyLimitShare: number

maxIncomeCommitment: number

/** Ausente em simulações salvas antes do registro de premissas. */

premises?: SavedPremises

}



export interface SimulationDraft {

title: string

scenarioId: ScenarioId

inputs: SimulationInput

weights: Weights

scenarioSnapshot: ScenarioSnapshot

fipeReferenceMonth: string | null

fipeReferenceMonthLabel: string | null

catalogVersion: string

results: SavedResultItem[]

}



export interface SavedSimulation extends SimulationDraft {

id: string

createdAt: string

}



export interface SavedSimulationSummary {

id: string

title: string

scenarioId: ScenarioId

createdAt: string

fipeReferenceMonth: string | null

fipeReferenceMonthLabel: string | null

resultCount: number

}



export interface UserProfile {

id: string

displayName: string

privacyAcceptedAt: string | null

}



export interface UserPreferences {

persistHistoryConsent: boolean

defaultScenario: ScenarioId | null

}
