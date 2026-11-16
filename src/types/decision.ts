import type { DecisionAnalytics, PressureLevel, VehicleAnalytics } from './analytics'

import type { RegionalTaxCalculation } from './regionalTax'

import type { Vehicle } from './vehicle'

import type { VehicleTco } from './tco'



/**

* Critérios do WSM. O custo total no horizonte (TCO) substitui preço, custo mensal, consumo,

* manutenção e depreciação, que já estão dentro dele: assim cada custo é contado uma vez.

*/

export const CRITERION_IDS = ['tco', 'incomeCommitment', 'usageFit', 'preference'] as const



export type CriterionId = (typeof CRITERION_IDS)[number]

export type CriterionDirection = 'cost' | 'benefit'

export type Weights = Record<CriterionId, number>

export type ScenarioId = 'economico' | 'equilibrado' | 'conservador' | 'personalizado'



export type ExplanationSeverity = 'favoravel' | 'atencao' | 'informativo'



export interface ExplanationItem {

code: string

text: string

severity: ExplanationSeverity

}



export type ExclusionStage = 'qualidade' | 'dados' | 'filtro' | 'viabilidade'



export type AffordabilityClass =

'confortavel' | 'adequada' | 'proxima_do_limite' | 'acima_do_limite' | 'inviavel'



export interface FinancialScoreParts {

utilization: number

availableCommitment: number

priceCapacity: number

margin: number

reserve: number

}



export interface ExclusionRecord {

vehicleId: string

label: string

stage: ExclusionStage

code: string

message: string

/** Valor exigido pela restrição, quando houver. */

required?: number | null

/** Valor disponível na simulação, quando houver. */

available?: number | null

/** Distância até a viabilidade (exigido − disponível), nunca negativa. */

gap?: number | null

}



/** Componentes de custo, todos nullable: ausente nunca vira zero. */

export interface VehicleCosts {

priceBRL: number

downPaymentUsed: number

financedAmount: number

monthlyInstallment: number

/** null quando a UF não tem regra utilizável e a pessoa não informou alíquota. */

ipvaAnnual: number | null

licensingAnnual: number

/** Fotografia do IPVA usado neste veículo. */

regionalTax: RegionalTaxCalculation

insuranceAnnual: number | null

maintenanceAnnual: number | null

energyMonthly: number | null

energyCostPerKm: number | null

depreciationAnnual: number | null

/** Soma completa conforme fórmula do SAD; null se algum componente estiver ausente. */

monthlyTotal: number | null

/** monthlyTotal sem depreciação (desembolso mensal de caixa). */

monthlyCash: number | null

annualTotal: number | null

effectiveConsumption: number | null

monthlyKm: number

usedFuelLabel: string

notes: string[]

}



export interface FinancialIndicators {

/** monthlyTotal / renda líquida (0-1+), null se renda inválida ou custo ausente. */

commitmentRatio: number | null

/** custo / orçamento mensal do veículo. */

limitUsageRatio: number | null

availableMonthly: number

/** Custo mensal / renda disponível. Null se a renda disponível não for positiva. */

availableCommitment: number | null

remainingMargin: number | null

/** Renda disponível / custo mensal. */

coverageIndex: number | null

priceToPurchasePowerRatio: number | null

acquisitionCapacity: number | null

acquisitionMargin: number | null

affordabilityClass: AffordabilityClass | null

/** Score 0–100 com saturação. É o valor do critério financeiro. */

financialScore: number | null

financialContributions: FinancialScoreParts | null

pressureLevel: PressureLevel | null

}



export interface RankedVehicle {

vehicle: Vehicle

costs: VehicleCosts

financial: FinancialIndicators

/** TCO por horizonte e sistema. Informação complementar: o critério usa só o horizonte padrão. */

tco: VehicleTco

criteria: Record<CriterionId, number | null>

normalized: Record<CriterionId, number | null>

/** Peso efetivo (%), já renormalizado quando há critérios ausentes. */

effectiveWeights: Record<CriterionId, number>

/** Pontos de contribuição de cada critério ao índice base. */

contributions: Record<CriterionId, number>

missingCriteria: CriterionId[]

baseIndex: number

penalty: number

/** Índice de compatibilidade 0-100. */

index: number

rank: number

pros: ExplanationItem[]

alerts: ExplanationItem[]

/** Análises complementares: não entram no índice nem na ordem do ranking. */

analytics: VehicleAnalytics

}



export interface NormalizationStat {

min: number

max: number

count: number

degenerate: boolean

}



export interface AdjustmentSuggestion {

id: string

label: string

wouldYield: number

}



export interface DecisionResult {

scenarioId: ScenarioId

weights: Weights

modelVersion: string

ranking: RankedVehicle[]

group: RankedVehicle[]

excluded: ExclusionRecord[]

eligibleCount: number

evaluatedCount: number

noOptions: boolean

suggestions: AdjustmentSuggestion[]

stats: Record<CriterionId, NormalizationStat | null>

effectiveMonthlyLimit: number

/** Premissa do orçamento mensal e alertas da casa, como o uso autorizado da reserva. */

budgetPremise: string

budgetAlerts: string[]

analytics: DecisionAnalytics

}
