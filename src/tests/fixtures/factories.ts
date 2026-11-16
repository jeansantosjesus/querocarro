import { initialWeights } from '../../domain/decision/scenarios'

import { buildVehiclesFromSnapshot } from '../../services/vehicles/MockVehicleDataProvider'

import type { SimulationInput } from '../../schemas/simulation'

import type { DeepPartial } from '../../types/utils'

import type { Vehicle } from '../../types/vehicle'



export const REFERENCE_YEAR = 2026



/** Entrada base realista (renda média-alta, financiamento 48x). */

export function makeInput(overrides: DeepPartial<SimulationInput> = {}): SimulationInput {

const priorities = { economia: 3, conforto: 3, desempenho: 3, manutencao: 3 }

const base: SimulationInput = {

objective: {

title: 'Simulação de teste',

scenarioId: 'equilibrado',

customMarginMultiplier: 1,

purchaseMode: 'financiado',

condition: 'indiferente',

maxPurchasePrice: null,

},

finance: {

netIncome: 12000,

fixedExpenses: 4000,

otherRecurringExpenses: 0,

otherDebts: 0,

monthlyReserve: 0,

downPayment: 30000,

reserve: 10000,

accumulatedReserve: 40000,

reserveMonths: 0,

safetyMarginMonthly: 0,

limitMode: 'informado',

vehicleSharePct: null,

useFullDownPayment: false,

maxMonthlyVehicleSpend: 3500,

installments: 48,

monthlyRatePct: 1.5,

maxInstallment: 2200,

},

usage: {

type: 'misto',

kmPerDay: 30,

daysPerWeek: 5,

monthlyKmOverride: null,

passengers: 4,

trunkNeed: 'media',

},

preferences: {

fuel: 'indiferente',

transmission: 'indiferente',

requireFuel: false,

requireTransmission: false,

requireCondition: false,

yearMin: null,

yearMax: null,

wantedBrands: [],

avoidedBrands: [],

priorities,

},

weights: initialWeights('equilibrado', priorities),

assumptionOverrides: {},

registrationState: 'BA',

allowDemonstrativeTax: false,

useLiveFipe: false,

}

return deepMerge(base, overrides)

}



export type { DeepPartial }



function isPlainObject(value: unknown): value is Record<string, unknown> {

return typeof value === 'object' && value !== null && !Array.isArray(value)

}



function deepMerge<T>(base: T, patch: DeepPartial<T>): T {

if (!isPlainObject(base) || !isPlainObject(patch)) return (patch ?? base) as T

const result: Record<string, unknown> = { ...base }

for (const [key, value] of Object.entries(patch)) {

const current = result[key]

result[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value

}

return result as T

}



let counter = 0



/** Veículo sintético completo e válido. */

export function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {

counter += 1

const fipeCode = overrides.fipeCode ?? `TEST-${String(counter).padStart(4, '0')}`

const yearId = overrides.fipeYearId ?? '2023-5'

return {

id: `${fipeCode}:${yearId}`,

fipeCode,

fipeBrandId: '1',

fipeModelId: '1',

fipeYearId: yearId,

brand: 'Marca',

model: `Modelo ${counter}`,

modelYear: 2023,

fuel: 'flex',

priceBRL: 70000,

priceSource: 'fipe_referencia_salva',

referenceMonth: '2026-11',

referenceMonthLabel: 'novembro de 2026',

transmission: 'manual',

urbanConsumption: 12,

highwayConsumption: 14,

consumptionUnit: 'km/l',

maintenanceAnnualBRL: 1800,

insuranceCategory: 'medio',

depreciationAnnualPct: 8,

category: 'hatch',

trunkLiters: 300,

seats: 5,

supplementUpdatedAt: '2026-11-06',

hasSupplement: true,

...overrides,

}

}



/** Catálogo completo da base demonstrativa (respostas FIPE salvas). */

export function loadCatalogVehicles(): Vehicle[] {

return buildVehiclesFromSnapshot()

}
