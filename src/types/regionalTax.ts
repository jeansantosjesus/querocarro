import type { Fuel } from './vehicle'



/** Siglas oficiais das 27 unidades federativas, na ordem pedida pela interface. */

export const BRAZILIAN_STATE_CODES = [

'AC',

'AL',

'AP',

'AM',

'BA',

'CE',

'DF',

'ES',

'GO',

'MA',

'MT',

'MS',

'MG',

'PA',

'PB',

'PR',

'PE',

'PI',

'RJ',

'RN',

'RS',

'RO',

'RR',

'SC',

'SP',

'SE',

'TO',

] as const



export type BrazilianStateCode = (typeof BRAZILIAN_STATE_CODES)[number]



export type TaxRuleStatus = 'verificada' | 'pendente' | 'vencida' | 'demonstracao'



/** oficial só existe para regra verificada. O restante nunca é apresentado como lei. */

export type TaxConfidence = 'oficial' | 'demonstracao' | 'manual' | 'indisponivel'



export type VehicleConditionScope = 'qualquer' | 'novo' | 'usado'

export type PropulsionScope = 'qualquer' | 'combustao' | 'hibrido' | 'eletrico'



export interface ExemptionRule {

id: string

state: BrazilianStateCode

description: string

vehicleCondition: VehicleConditionScope

propulsion: PropulsionScope

/** null = isenção total (alíquota zero explícita da regra). Número = alíquota substituta. */

ratePct: number | null

source: string

legalBasis: string

fiscalYear: number

validFrom: string

validUntil: string

lastVerifiedAt: string | null

status: TaxRuleStatus

}



export interface RegionalTaxRule {

id: string

state: BrazilianStateCode

tax: 'ipva'

vehicleCondition: VehicleConditionScope

propulsion: PropulsionScope

/** Alíquota em % da base. Exclusiva com `fixedAmountBRL`. */

ratePct: number | null

fixedAmountBRL: number | null

exemptions: ExemptionRule[]

source: string

legalBasis: string

fiscalYear: number

validFrom: string

validUntil: string

lastVerifiedAt: string | null

status: TaxRuleStatus

}



export type RegionalTaxAlertCode =

| 'regra_ausente'

| 'regra_pendente'

| 'regra_vencida'

| 'regra_invalida'

| 'demonstracao'

| 'manual'

| 'isencao'

| 'arredondamento'



export interface RegionalTaxAlert {

code: RegionalTaxAlertCode

message: string

}



/** Fotografia do IPVA usado para um veículo nesta simulação. */

export interface RegionalTaxCalculation {

state: BrazilianStateCode

baseBRL: number | null

ratePct: number | null

fixedAmountBRL: number | null

annualBRL: number | null

monthlyBRL: number | null

/** Regra do catálogo consultada, mesmo quando outra fonte (manual ou estimativa) foi aplicada. */

rule: RegionalTaxRule | null

exemption: ExemptionRule | null

source: string

legalBasis: string | null

fiscalYear: number | null

alerts: RegionalTaxAlert[]

confidence: TaxConfidence

explanation: string

}



export interface RegionalTaxQuery {

state: BrazilianStateCode

priceBRL: number | null

condition: 'novo' | 'usado' | 'indiferente'

fuel: Fuel | null

/** Data de referência ISO (YYYY-MM-DD). O motor não lê o relógio. */

asOf: string

/** Preenchido só quando a pessoa informa a alíquota nesta simulação. */

manualRatePct: number | undefined

allowDemonstrativeEstimate: boolean

/** Alíquota da estimativa configurável, usada só no modo demonstração explícito. */

demonstrativeRatePct: number

}
