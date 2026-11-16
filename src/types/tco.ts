import type { TcoHorizon } from '../config/tco'



export type AmortizationSystem = 'price' | 'sac'



export type ExtraCostId =

'documentation' | 'transfer' | 'parking' | 'cleaning' | 'tolls' | 'options'



export interface ExtraCostInput {

/** Valor em BRL. Pode ser único (ex.: documentação) ou mensal (ex.: estacionamento). */

amount: number

periodicity: 'unico' | 'mensal'

}



/** Itens sem fonte na base. Ausente (null) não entra no total e aparece como "não incluído". */

export type ExtraCosts = Partial<Record<ExtraCostId, ExtraCostInput | null>>



export interface ScheduleRow {

period: number

opening: number

interest: number

amortization: number

installment: number

closing: number

}



export interface TcoInput {

priceBRL: number

purchaseMode: 'avista' | 'financiado'

downPayment: number

monthlyRatePct: number

installments: number

ipvaAnnual: number | null

licensingAnnual: number

insuranceAnnual: number | null

/** Manutenção anual já ajustada à idade inicial do veículo. */

maintenanceAnnualAtStart: number | null

ageAtStart: number

/** Custo de energia por km, já com margem do cenário. */

energyCostPerKm: number | null

monthlyKm: number

depreciationAnnualPct: number | null

extras: ExtraCosts

assumptions: {

maintenanceAgeFreeYears: number

maintenanceAgeIncreasePctPerYear: number

}

}



export interface TcoEconomicBreakdown {

total: number | null

acquisition: number

/** Valor residual estimado no horizonte (subtraído). */

residual: number | null

interest: number

taxes: number | null

insurance: number | null

energy: number | null

maintenance: number | null

extras: number

}



export interface TcoCashBreakdown {

total: number | null

entry: number

installments: number

taxes: number | null

insurance: number | null

energy: number | null

maintenance: number | null

extras: number

/** Residual estimado menos saldo devedor no horizonte: posição líquida se o veículo fosse vendido. */

netResidualPosition: number | null

}



export interface TcoResult {

horizonMonths: TcoHorizon

system: AmortizationSystem

/** Custo econômico: não inclui o principal separadamente (já está no preço). */

economic: TcoEconomicBreakdown

/** Fluxo de caixa: desembolsos reais no horizonte. */

cash: TcoCashBreakdown

interestPaid: number

balanceAtHorizon: number

residualCapped: boolean

/** Componentes obrigatórios ausentes. Se houver, os totais são null. */

missing: string[]

/** Itens opcionais não informados. Não entram no total. */

notIncluded: string[]

}



/** TCO de um veículo em todas as combinações de horizonte e sistema de amortização. */

export interface VehicleTco {

/** Horizonte usado pelo critério no ranking. */

criterionHorizonMonths: TcoHorizon

/** Custo econômico (Price) no horizonte do critério. null se algum componente faltar. */

criterionValue: number | null

byHorizon: Record<TcoHorizon, { price: TcoResult; sac: TcoResult }>

}
