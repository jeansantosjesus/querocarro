import { SUPPLEMENT_UPDATED_AT } from '../../config/vehicleSupplementData'

import type {

FipePriceRecord,

PriceSource,

SupplementRecord,

Vehicle,

VehicleCatalog,

} from '../../types/vehicle'



/**

* Origem de cada campo do veículo (exibida na ficha). Campos técnicos NUNCA são

* atribuídos à FIPE: vêm da base complementar, uma estimativa demonstrativa.

*/

export const FIELD_ORIGINS = {

preco: 'FIPE (preço de referência)',

marca_modelo_ano_combustivel: 'FIPE',

cambio: 'Base complementar (estimativa demonstrativa)',

consumo: 'Base complementar (estimativa demonstrativa)',

manutencao: 'Base complementar (estimativa demonstrativa)',

seguro: 'Base complementar (estimativa demonstrativa)',

depreciacao: 'Base complementar (estimativa demonstrativa)',

categoria: 'Base complementar (estimativa demonstrativa)',

porta_malas: 'Base complementar (estimativa demonstrativa)',

passageiros: 'Base complementar (estimativa demonstrativa)',

} as const



export function vehicleId(fipeCode: string, yearId: string): string {

return `${fipeCode}:${yearId}`

}



export function mergeVehicle(

supplement: SupplementRecord,

price: FipePriceRecord,

source: PriceSource,

): Vehicle {

return {

id: vehicleId(supplement.fipeCode, supplement.fipeYearId),

fipeCode: price.fipeCode,

fipeBrandId: supplement.fipeBrandId,

fipeModelId: supplement.fipeModelId,

fipeYearId: supplement.fipeYearId,

brand: price.brand,

model: price.model,

modelYear: price.modelYear,

fuel: price.fuel,

priceBRL: price.priceBRL,

priceSource: source,

referenceMonth: price.referenceMonth,

referenceMonthLabel: price.referenceMonthLabel,

transmission: supplement.transmission,

urbanConsumption: supplement.urbanConsumption,

highwayConsumption: supplement.highwayConsumption,

consumptionUnit: supplement.consumptionUnit,

maintenanceAnnualBRL: supplement.maintenanceAnnualBRL,

insuranceCategory: supplement.insuranceCategory,

depreciationAnnualPct: supplement.depreciationAnnualPct,

category: supplement.category,

trunkLiters: supplement.trunkLiters,

seats: supplement.seats,

supplementUpdatedAt: SUPPLEMENT_UPDATED_AT,

hasSupplement: true,

}

}



/** Mês de referência predominante entre os veículos (desempate pelo mais recente). */

export function dominantReferenceMonth(vehicles: readonly Vehicle[]): {

month: string | null

label: string | null

} {

const counts = new Map<string, { count: number; label: string | null }>()

for (const vehicle of vehicles) {

if (!vehicle.referenceMonth) continue

const entry = counts.get(vehicle.referenceMonth) ?? {

count: 0,

label: vehicle.referenceMonthLabel,

}

entry.count += 1

counts.set(vehicle.referenceMonth, entry)

}

let best: { month: string; count: number; label: string | null } | null = null

for (const [month, entry] of counts) {

if (!best || entry.count > best.count || (entry.count === best.count && month > best.month)) {

best = { month, ...entry }

}

}

return best ? { month: best.month, label: best.label } : { month: null, label: null }

}



export function buildCatalog(params: {

vehicles: Vehicle[]

sourceLabel: string

versionTag: string

warnings: string[]

retryable: boolean

now?: Date

}): VehicleCatalog {

const { vehicles } = params

const reference = dominantReferenceMonth(vehicles)

const onlineCount = vehicles.filter((vehicle) => vehicle.priceSource === 'fipe_online').length

const snapshotCount = vehicles.length - onlineCount

return {

vehicles,

referenceMonth: reference.month,

referenceMonthLabel: reference.label,

sourceLabel: params.sourceLabel,

fetchedAt: (params.now ?? new Date()).toISOString(),

version: `${params.versionTag}|${reference.month ?? 'sem-referencia'}|${SUPPLEMENT_UPDATED_AT}`,

warnings: params.warnings,

onlineCount,

snapshotCount,

liveStatus: snapshotCount === 0 ? 'online' : onlineCount === 0 ? 'referencia_salva' : 'parcial',

retryable: params.retryable,

}

}
