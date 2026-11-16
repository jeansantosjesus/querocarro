import type { DistributionBand, StatSummary } from '../utils/stats'



export type AdherenceLevel = 'muito_alta' | 'alta' | 'moderada' | 'baixa' | 'incompativel'

export type PressureLevel = 'baixa' | 'moderada' | 'elevada' | 'critica'



export type TcoComponentId =

'installment' | 'ipva' | 'licensing' | 'insurance' | 'maintenance' | 'energy' | 'depreciation'



export interface TcoComponentShare {

id: TcoComponentId

label: string

monthly: number

/** Fração do custo mensal total (0-1). */

share: number

}



export interface TcoComposition {

monthlyTotal: number

components: TcoComponentShare[]

}



export type ClusteringMethod = 'kmeans' | 'faixas_tco' | 'indisponivel'



export interface AnalyticGroup {

/** Letra (A, B, ...): identifica o grupo, não indica qualidade. */

id: string

label: string

size: number

description: string

}



export interface ClusteringSummary {

method: ClusteringMethod

k: number | null

silhouette: number | null

/** Motivo da escolha do método (ex.: amostra insuficiente). */

reason: string

groups: AnalyticGroup[]

/** Veículos sem grupo por dado indisponível. */

unassignedCount: number

}



export interface VehicleAnalytics {

/** Id do grupo analítico; null se o veículo não pôde ser agrupado. */

groupId: string | null

adherence: AdherenceLevel | null

tcoComposition: TcoComposition | null

}



export interface DecisionSummary {

evaluatedCount: number

eligibleCount: number

excludedCount: number

excludedByStage: Record<'qualidade' | 'dados' | 'filtro' | 'viabilidade', number>

price: StatSummary

monthlyTotal: StatSummary

/** Distribuição do custo mensal nas faixas definidas pelos quartis do próprio conjunto. */

monthlyTotalBands: DistributionBand[]

}



export interface DecisionAnalytics {

summary: DecisionSummary

clustering: ClusteringSummary

}



/**

* Contrato para estimativas contínuas futuras (regressão). Nenhuma implementação existe:

* só pode ser criada com base histórica real, documentada e com métricas de erro publicadas.

*/

export interface ContinuousEstimator<Features> {

readonly id: string

readonly target: string

readonly trainingDataSource: string

readonly metrics: { mae: number; rmse: number; r2: number } | null

/** Retorna null quando não houver dado suficiente para estimar. */

estimate(features: Features): { value: number; lower: number; upper: number } | null

}



/**

* Evento aceito para análises de associação futuras. Só eventos anônimos, consentidos

* e agregados; nunca contém renda exata, identificador de usuário ou dado pessoal.

*/

export interface AssociationEvent {

consented: true

/** Itens do evento (ex.: categoria escolhida, combustível); sem valores monetários exatos. */

items: readonly string[]

/** Faixa de renda agregada, nunca o valor informado. */

incomeBand: string | null

}
