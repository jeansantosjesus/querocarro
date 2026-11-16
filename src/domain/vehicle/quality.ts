import { DATA_QUALITY } from '../../config/limits'

import type { ExclusionRecord } from '../../types/decision'

import type { Vehicle } from '../../types/vehicle'

import { iqrFences } from '../../utils/stats'



export function vehicleLabel(vehicle: Pick<Vehicle, 'brand' | 'model' | 'modelYear'>): string {

const name = `${vehicle.brand} ${vehicle.model}`.trim()

return name ? `${name} (${vehicle.modelYear})` : 'Veículo sem identificação'

}



export interface QualityIssue {

code: string

message: string

}



function inRange(value: number, range: { min: number; max: number }): boolean {

return Number.isFinite(value) && value >= range.min && value <= range.max

}



/**

* Validação estrutural de um registro (sem comparar com os demais).

* Retorna a lista de problemas que tornam o registro INVÁLIDO para o ranking.

*/

export function validateVehicle(vehicle: Vehicle, referenceYear: number): QualityIssue[] {

const issues: QualityIssue[] = []



if (!vehicle.fipeCode || vehicle.fipeCode.trim() === '') {

issues.push({ code: 'codigo_fipe_ausente', message: 'Código FIPE ausente.' })

}

if (!vehicle.brand?.trim() || !vehicle.model?.trim()) {

issues.push({

code: 'sem_identificacao',

message: 'Veículo sem marca ou modelo identificados.',

})

}

if (vehicle.priceBRL === null || !Number.isFinite(vehicle.priceBRL) || vehicle.priceBRL <= 0) {

issues.push({

code: 'preco_invalido',

message: 'Preço de referência ausente, zero ou negativo.',

})

}

if (

!Number.isInteger(vehicle.modelYear) ||

vehicle.modelYear < DATA_QUALITY.yearMin ||

vehicle.modelYear > referenceYear + 1

) {

issues.push({ code: 'ano_invalido', message: `Ano-modelo inválido (${vehicle.modelYear}).` })

}



const consumptionRange =

vehicle.consumptionUnit === 'km/kWh'

? DATA_QUALITY.consumptionKmPerKwh

: DATA_QUALITY.consumptionKmPerLiter

for (const [field, value] of [

['urbano', vehicle.urbanConsumption],

['rodoviário', vehicle.highwayConsumption],

] as const) {

if (value !== null && !inRange(value, consumptionRange)) {

issues.push({

code: 'consumo_impossivel',

message: `Consumo ${field} fora da faixa plausível (${value} ${vehicle.consumptionUnit}).`,

})

}

}



if (

vehicle.maintenanceAnnualBRL !== null &&

!inRange(vehicle.maintenanceAnnualBRL, DATA_QUALITY.maintenanceAnnual)

) {

issues.push({

code: 'manutencao_invalida',

message: 'Custo de manutenção negativo ou extremo.',

})

}

if (

vehicle.depreciationAnnualPct !== null &&

!inRange(vehicle.depreciationAnnualPct, DATA_QUALITY.depreciationPct)

) {

issues.push({

code: 'depreciacao_invalida',

message: 'Percentual de depreciação fora da faixa.',

})

}

if (vehicle.trunkLiters !== null && !inRange(vehicle.trunkLiters, DATA_QUALITY.trunkLiters)) {

issues.push({ code: 'porta_malas_invalido', message: 'Capacidade do porta-malas inválida.' })

}

if (vehicle.seats !== null && !inRange(vehicle.seats, DATA_QUALITY.seats)) {

issues.push({ code: 'passageiros_invalido', message: 'Quantidade de passageiros inválida.' })

}



return issues

}



export interface QualityAssessment {

valid: Vehicle[]

excluded: ExclusionRecord[]

/** Contagem por código de exclusão, para o relatório técnico. */

summary: Record<string, number>

}



/**

* Avalia o catálogo inteiro: validação estrutural, duplicidade e outliers estatísticos

* extremos (cercas de Tukey com k = 3). Registros inválidos NÃO participam do ranking e

* têm o motivo registrado.

*/

export function assessCatalogQuality(

vehicles: readonly Vehicle[],

referenceYear: number,

): QualityAssessment {

const excluded: ExclusionRecord[] = []

const seen = new Set<string>()

const structurallyValid: Vehicle[] = []



for (const vehicle of vehicles) {

const label = vehicleLabel(vehicle)

const issues = validateVehicle(vehicle, referenceYear)



if (seen.has(vehicle.id)) {

issues.unshift({

code: 'duplicado',

message: 'Registro duplicado (mesmo código FIPE e ano).',

})

}

seen.add(vehicle.id)



const first = issues[0]

if (first) {

excluded.push({

vehicleId: vehicle.id,

label,

stage: 'qualidade',

code: first.code,

message: issues.map((issue) => issue.message).join(' '),

})

} else {

structurallyValid.push(vehicle)

}

}



// Outliers estatísticos extremos (apenas com amostra suficiente)

const outlierIds = new Map<string, QualityIssue>()

if (structurallyValid.length >= DATA_QUALITY.minRecordsForOutlierDetection) {

const k = DATA_QUALITY.iqrMultiplier

const checks: Array<{

label: string

get: (vehicle: Vehicle) => number | null

group?: (vehicle: Vehicle) => string

}> = [

{ label: 'preço', get: (vehicle) => vehicle.priceBRL },

{ label: 'manutenção anual', get: (vehicle) => vehicle.maintenanceAnnualBRL },

{

label: 'consumo urbano',

get: (vehicle) => vehicle.urbanConsumption,

// Compara apenas veículos do mesmo combustível (híbrido/elétrico não são outliers de flex).

group: (vehicle) => `${vehicle.fuel ?? 'desconhecido'}:${vehicle.consumptionUnit}`,

},

]

for (const check of checks) {

const groups = new Map<string, Vehicle[]>()

for (const vehicle of structurallyValid) {

const key = check.group ? check.group(vehicle) : 'all'

const list = groups.get(key) ?? []

list.push(vehicle)

groups.set(key, list)

}

for (const group of groups.values()) {

if (group.length < DATA_QUALITY.minRecordsForOutlierDetection) continue

const values = group

.map((vehicle) => check.get(vehicle))

.filter((value): value is number => value !== null)

const fences = iqrFences(values, k)

if (!fences) continue

for (const vehicle of group) {

const value = check.get(vehicle)

if (value === null) continue

if (value < fences.lower || value > fences.upper) {

outlierIds.set(vehicle.id, {

code: 'outlier_estatistico',

message: `Valor de ${check.label} muito afastado da distribuição do catálogo.`,

})

}

}

}

}

}



const valid: Vehicle[] = []

for (const vehicle of structurallyValid) {

const outlier = outlierIds.get(vehicle.id)

if (outlier) {

excluded.push({

vehicleId: vehicle.id,

label: vehicleLabel(vehicle),

stage: 'qualidade',

code: outlier.code,

message: outlier.message,

})

} else {

valid.push(vehicle)

}

}



const summary: Record<string, number> = {}

for (const record of excluded) {

summary[record.code] = (summary[record.code] ?? 0) + 1

}



return { valid, excluded, summary }

}



/**

* Categorias que podem ser exibidas como grupo próprio: um registro isolado

* não forma artificialmente uma categoria de recomendação.

*/

export function groupableCategories(vehicles: readonly Vehicle[]): {

categories: string[]

isolated: Vehicle[]

} {

const byCategory = new Map<string, Vehicle[]>()

for (const vehicle of vehicles) {

if (!vehicle.category) continue

const list = byCategory.get(vehicle.category) ?? []

list.push(vehicle)

byCategory.set(vehicle.category, list)

}

const categories: string[] = []

const isolated: Vehicle[] = []

for (const [category, list] of byCategory) {

if (list.length >= DATA_QUALITY.minVehiclesPerCategory) categories.push(category)

else isolated.push(...list)

}

return { categories: categories.sort(), isolated }

}
