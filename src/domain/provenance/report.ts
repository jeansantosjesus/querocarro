import {

GOVERNMENT_SOURCE_KEYS,

PROVENANCE_ENTRIES,

UNRECORDED_PREMISES,

type ProvenanceKey,

} from '../../config/provenance'

import type { BrazilianStateCode, RegionalTaxRule } from '../../types/regionalTax'

import type { Vehicle, VehicleCatalog } from '../../types/vehicle'

import { validateRegionalRule } from '../finance/regionalTax'



/**

* Relatório técnico de dados e fontes. Função pura: mesma entrada, mesmo relatório.

* Não lê o relógio nem a rede. A data de referência vem de fora (`asOf`).

*/



export interface DataReportInput {

catalog: VehicleCatalog

/** Todas as regras cadastradas (qualquer UF). */

rules: readonly RegionalTaxRule[]

/** As 27 UFs, na ordem de exibição. */

states: readonly BrazilianStateCode[]

/** Data de referência (YYYY-MM-DD) usada para julgar vigência. */

asOf: string

/** Data da última atualização da base complementar. */

supplementUpdatedAt: string

}



/** Campos do veículo que entram na cobertura. Ausente conta como ausente, nunca como zero. */

export const COVERAGE_FIELDS = [

'priceBRL',

'referenceMonth',

'fuel',

'transmission',

'urbanConsumption',

'highwayConsumption',

'maintenanceAnnualBRL',

'insuranceCategory',

'depreciationAnnualPct',

'category',

'trunkLiters',

'seats',

] as const satisfies readonly (keyof Vehicle)[]



export type CoverageField = (typeof COVERAGE_FIELDS)[number]



export interface FieldCoverage {

field: CoverageField

available: number

missing: number

total: number

}



export type InvalidReason =

| 'id_inconsistente'

| 'id_duplicado'

| 'preco_invalido'

| 'ano_invalido'

| 'mes_invalido'

| 'valor_invalido'



export interface InvalidRecord {

id: string

reasons: InvalidReason[]

}



export type StateCoverageStatus =

'verificada' | 'demonstracao' | 'pendente_ou_vencida' | 'sem_regra'



export interface StateCoverage {

state: BrazilianStateCode

status: StateCoverageStatus

ruleIds: string[]

}



export interface DataReport {

asOf: string

catalog: {

version: string

referenceMonth: string | null

fetchedAt: string

liveStatus: VehicleCatalog['liveStatus']

vehicleCount: number

onlineCount: number

snapshotCount: number

supplementUpdatedAt: string

}

coverageByField: FieldCoverage[]

vehiclesWithSupplement: number

vehiclesWithoutSupplement: number

invalidRecords: InvalidRecord[]

stateCoverage: StateCoverage[]

/** UFs sem regra oficial verificada (inclui demonstração, sem regra e regra pendente ou vencida). */

statesWithoutVerifiedRule: BrazilianStateCode[]

expiredRules: { id: string; state: BrazilianStateCode; validUntil: string }[]

pendingRules: { id: string; state: BrazilianStateCode }[]

rulesWithoutVerification: string[]

/** Chaves de proveniência com origem "premissa" ou "demonstração" e sem URL de fonte. */

valuesWithoutExternalSource: ProvenanceKey[]

/** Fontes oficiais cadastradas. Zero significa que nenhum valor tem fonte oficial no QC. */

governmentSourceCount: number

unrecordedPremises: readonly { id: string; description: string }[]

}



const MONTH_PATTERN = /^\d{4}-\d{2}$/

const MIN_MODEL_YEAR = 1950



function isPresent<T>(value: T | null | undefined): value is T {

return value !== null && value !== undefined

}



function coverageOf(vehicles: readonly Vehicle[]): FieldCoverage[] {

return COVERAGE_FIELDS.map((field) => {

const available = vehicles.filter((vehicle) => isPresent(vehicle[field])).length

return { field, available, missing: vehicles.length - available, total: vehicles.length }

})

}



function invalidReasons(vehicle: Vehicle, asOfYear: number): InvalidReason[] {

const reasons: InvalidReason[] = []

if (vehicle.id !== `${vehicle.fipeCode}:${vehicle.fipeYearId}`) reasons.push('id_inconsistente')

if (

isPresent(vehicle.priceBRL) &&

(!Number.isFinite(vehicle.priceBRL) || vehicle.priceBRL <= 0)

) {

reasons.push('preco_invalido')

}

if (

!Number.isInteger(vehicle.modelYear) ||

vehicle.modelYear < MIN_MODEL_YEAR ||

vehicle.modelYear > asOfYear + 1

) {

reasons.push('ano_invalido')

}

if (isPresent(vehicle.referenceMonth) && !MONTH_PATTERN.test(vehicle.referenceMonth)) {

reasons.push('mes_invalido')

}

const numbers = [

vehicle.urbanConsumption,

vehicle.highwayConsumption,

vehicle.maintenanceAnnualBRL,

vehicle.depreciationAnnualPct,

vehicle.trunkLiters,

vehicle.seats,

]

if (numbers.some((value) => isPresent(value) && (!Number.isFinite(value) || value < 0))) {

reasons.push('valor_invalido')

}

return reasons

}



function invalidRecordsOf(vehicles: readonly Vehicle[], asOfYear: number): InvalidRecord[] {

const seen = new Set<string>()

const records: InvalidRecord[] = []

for (const vehicle of vehicles) {

const reasons = invalidReasons(vehicle, asOfYear)

if (seen.has(vehicle.id)) reasons.push('id_duplicado')

seen.add(vehicle.id)

if (reasons.length > 0) records.push({ id: vehicle.id, reasons })

}

return records

}



function stateStatus(rules: readonly RegionalTaxRule[], asOf: string): StateCoverageStatus {

if (rules.length === 0) return 'sem_regra'

const usable = rules.filter((rule) => {

const check = validateRegionalRule(rule, asOf)

return check.valid && !check.expired

})

if (usable.some((rule) => rule.status === 'verificada')) return 'verificada'

if (usable.some((rule) => rule.status === 'demonstracao')) return 'demonstracao'

return 'pendente_ou_vencida'

}



/** Monta o relatório técnico a partir do catálogo e das regras cadastradas. */

export function buildDataReport(input: DataReportInput): DataReport {

const { catalog, rules, states, asOf } = input

const asOfYear = Number(asOf.slice(0, 4))

const vehicles = catalog.vehicles



const stateCoverage: StateCoverage[] = states.map((state) => {

const stateRules = rules.filter((rule) => rule.state === state)

return {

state,

status: stateStatus(stateRules, asOf),

ruleIds: stateRules.map((rule) => rule.id),

}

})



const expiredRules = rules

.filter((rule) => validateRegionalRule(rule, asOf).expired)

.map((rule) => ({ id: rule.id, state: rule.state, validUntil: rule.validUntil }))



const pendingRules = rules

.filter((rule) => rule.status === 'pendente')

.map((rule) => ({ id: rule.id, state: rule.state }))



const valuesWithoutExternalSource = (Object.keys(PROVENANCE_ENTRIES) as ProvenanceKey[]).filter(

(key) => {

const entry = PROVENANCE_ENTRIES[key]

return (

(entry.origin === 'estimated' || entry.origin === 'demonstration') &&

entry.sourceUrl === null

)

},

)



return {

asOf,

catalog: {

version: catalog.version,

referenceMonth: catalog.referenceMonth,

fetchedAt: catalog.fetchedAt,

liveStatus: catalog.liveStatus,

vehicleCount: vehicles.length,

onlineCount: catalog.onlineCount,

snapshotCount: catalog.snapshotCount,

supplementUpdatedAt: input.supplementUpdatedAt,

},

coverageByField: coverageOf(vehicles),

vehiclesWithSupplement: vehicles.filter((vehicle) => vehicle.hasSupplement).length,

vehiclesWithoutSupplement: vehicles.filter((vehicle) => !vehicle.hasSupplement).length,

invalidRecords: invalidRecordsOf(vehicles, asOfYear),

stateCoverage,

statesWithoutVerifiedRule: stateCoverage

.filter((item) => item.status !== 'verificada')

.map((item) => item.state),

expiredRules,

pendingRules,

rulesWithoutVerification: rules

.filter((rule) => rule.lastVerifiedAt === null)

.map((rule) => rule.id),

valuesWithoutExternalSource,

governmentSourceCount: GOVERNMENT_SOURCE_KEYS.length,

unrecordedPremises: UNRECORDED_PREMISES,

}

}
