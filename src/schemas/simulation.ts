import { z } from 'zod'

import { ASSUMPTION_OVERRIDE_LIMITS } from '../config/assumptions'

import { INPUT_LIMITS, WEIGHT_LIMITS } from '../config/limits'

import { CUSTOM_MARGIN_LIMITS } from '../config/scenarios'

import { CRITERION_IDS } from '../types/decision'

import { RESERVE_MONTH_LIMITS, VEHICLE_SHARE_LIMITS } from '../config/capacity'

import { BRAZILIAN_STATE_CODES } from '../types/regionalTax'



const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })



function numberMsg(min: number, max: number, currency = false): string {

const fmt = (n: number) => (currency ? brl.format(n) : String(n))

return `Informe um valor entre ${fmt(min)} e ${fmt(max)}.`

}



/** Campo numérico com limites. NaN (campo vazio) gera mensagem clara. */

export function boundedNumber(min: number, max: number, options?: { currency?: boolean }) {

const message = numberMsg(min, max, options?.currency)

return z

.number({ error: 'Informe um número válido.' })

.min(min, { error: message })

.max(max, { error: message })

}



export function boundedInt(min: number, max: number) {

return boundedNumber(min, max).int({ error: 'Informe um número inteiro.' })

}



const money = () =>

boundedNumber(INPUT_LIMITS.money.min, INPUT_LIMITS.money.max, { currency: true })



const nullableNumber = (schema: z.ZodNumber) =>

z.union([schema, z.null()], { error: 'Informe um número válido ou deixe em branco.' })



export const SCENARIO_IDS = ['economico', 'equilibrado', 'conservador', 'personalizado'] as const

export const FUEL_PREFERENCES = [

'indiferente',

'flex',

'gasolina',

'etanol',

'diesel',

'hibrido',

'eletrico',

] as const



const brandName = z.string().trim().min(1).max(60)



/** Critérios de custo substituídos pelo TCO. Simulações salvas com eles são convertidas. */

const LEGACY_COST_KEYS = [

'price',

'monthlyCost',

'consumption',

'maintenance',

'depreciation',

] as const



/**

* Converte pesos de versões anteriores: a soma dos cinco critérios de custo antigos vira o TCO.

* Pesos já no formato atual passam sem alteração.

*/

export function migrateLegacyWeights(value: unknown): unknown {

if (typeof value !== 'object' || value === null || 'tco' in value) return value

const record = value as Record<string, unknown>

if (!LEGACY_COST_KEYS.some((key) => key in record)) return value

const legacyTotal = LEGACY_COST_KEYS.reduce((sum, key) => {

const item = record[key]

return typeof item === 'number' ? sum + item : sum

}, 0)

return {

tco: legacyTotal,

incomeCommitment: record.incomeCommitment,

usageFit: record.usageFit,

preference: record.preference,

}

}



export const weightsSchema = z

.object({

tco: boundedNumber(WEIGHT_LIMITS.minPerCriterion, WEIGHT_LIMITS.maxPerCriterion),

incomeCommitment: boundedNumber(WEIGHT_LIMITS.minPerCriterion, WEIGHT_LIMITS.maxPerCriterion),

usageFit: boundedNumber(WEIGHT_LIMITS.minPerCriterion, WEIGHT_LIMITS.maxPerCriterion),

preference: boundedNumber(WEIGHT_LIMITS.minPerCriterion, WEIGHT_LIMITS.maxPerCriterion),

})

.refine(

(weights) => {

const total = CRITERION_IDS.reduce((sum, id) => sum + weights[id], 0)

return Math.abs(total - WEIGHT_LIMITS.total) < 0.01

},

{ error: 'A soma dos pesos deve ser 100%.' },

)

export const objectiveSchema = z.object({

title: z

.string()

.trim()

.min(1, { error: 'Dê um nome para a simulação.' })

.max(INPUT_LIMITS.titleMaxLength, { error: 'Use até 80 caracteres.' }),

scenarioId: z.enum(SCENARIO_IDS),

customMarginMultiplier: boundedNumber(CUSTOM_MARGIN_LIMITS.min, CUSTOM_MARGIN_LIMITS.max),

purchaseMode: z.enum(['avista', 'financiado']),

condition: z.enum(['indiferente', 'novo', 'usado']),

maxPurchasePrice: nullableNumber(

z.number().min(1, { error: 'Informe um valor maior que zero.' }).max(INPUT_LIMITS.money.max),

),

})



export const financeSchema = z.object({

netIncome: boundedNumber(INPUT_LIMITS.income.min, INPUT_LIMITS.income.max, { currency: true }),

/** Despesas essenciais. */

fixedExpenses: money(),

/** Outras despesas recorrentes, além das essenciais. */

otherRecurringExpenses: money(),

otherDebts: money(),

/** Reserva mensal planejada, descontada da renda disponível. */

monthlyReserve: money(),

downPayment: money(),

/** Valor que não pode ser usado na entrada, salvo confirmação explícita. */

reserve: money(),

/** Saldo acumulado. A entrada não pode ultrapassar o que sobra depois da reserva protegida. */

accumulatedReserve: money(),

reserveMonths: boundedInt(RESERVE_MONTH_LIMITS.min, RESERVE_MONTH_LIMITS.max),

/** Margem mensal que o orçamento do veículo deve preservar. */

safetyMarginMonthly: money(),

limitMode: z.enum(['informado', 'estimado']),

/** Null usa o percentual do cenário. */

vehicleSharePct: z

.number()

.min(VEHICLE_SHARE_LIMITS.min)

.max(VEHICLE_SHARE_LIMITS.max)

.nullable(),

/** Confirma usar a entrada informada mesmo reduzindo a reserva protegida. */

useFullDownPayment: z.boolean(),

maxMonthlyVehicleSpend: boundedNumber(1, INPUT_LIMITS.money.max, { currency: true }),

installments: boundedInt(INPUT_LIMITS.installments.min, INPUT_LIMITS.installments.max),

monthlyRatePct: boundedNumber(INPUT_LIMITS.monthlyRatePct.min, INPUT_LIMITS.monthlyRatePct.max),

maxInstallment: nullableNumber(

z.number().min(0, { error: 'Não use valores negativos.' }).max(INPUT_LIMITS.money.max),

),

})



export const usageSchema = z.object({

type: z.enum(['urbano', 'rodoviario', 'misto']),

kmPerDay: boundedNumber(INPUT_LIMITS.kmPerDay.min, INPUT_LIMITS.kmPerDay.max),

daysPerWeek: boundedInt(INPUT_LIMITS.daysPerWeek.min, INPUT_LIMITS.daysPerWeek.max),

monthlyKmOverride: nullableNumber(

z

.number()

.min(INPUT_LIMITS.kmPerMonth.min, { error: numberMsg(0, INPUT_LIMITS.kmPerMonth.max) })

.max(INPUT_LIMITS.kmPerMonth.max, { error: numberMsg(0, INPUT_LIMITS.kmPerMonth.max) }),

),

passengers: boundedInt(INPUT_LIMITS.passengers.min, INPUT_LIMITS.passengers.max),

trunkNeed: z.enum(['baixa', 'media', 'alta']),

})



const priority = () => boundedInt(INPUT_LIMITS.priority.min, INPUT_LIMITS.priority.max)



export const preferencesSchema = z

.object({

fuel: z.enum(FUEL_PREFERENCES),

transmission: z.enum(['indiferente', 'manual', 'automatico']),

requireFuel: z.boolean(),

requireTransmission: z.boolean(),

requireCondition: z.boolean(),

yearMin: nullableNumber(boundedInt(INPUT_LIMITS.yearRange.min, INPUT_LIMITS.yearRange.max)),

yearMax: nullableNumber(boundedInt(INPUT_LIMITS.yearRange.min, INPUT_LIMITS.yearRange.max)),

wantedBrands: z.array(brandName).max(INPUT_LIMITS.brandListMax),

avoidedBrands: z.array(brandName).max(INPUT_LIMITS.brandListMax),

priorities: z.object({

economia: priority(),

conforto: priority(),

desempenho: priority(),

manutencao: priority(),

}),

})

.superRefine((value, ctx) => {

if (value.yearMin !== null && value.yearMax !== null && value.yearMin > value.yearMax) {

ctx.addIssue({

code: 'custom',

path: ['yearMin'],

message: 'O ano inicial não pode ser maior que o ano final.',

})

}

const overlap = value.wantedBrands.filter((brand) =>

value.avoidedBrands.some((other) => other.toLowerCase() === brand.toLowerCase()),

)

if (overlap.length > 0) {

ctx.addIssue({

code: 'custom',

path: ['avoidedBrands'],

message: `A marca ${overlap[0]} está em "desejadas" e em "não desejadas".`,

})

}

})



const optionalOverride = (min: number, max: number) => z.number().min(min).max(max).optional()
export const assumptionOverridesSchema = z.object({

gasolinePricePerLiter: optionalOverride(

ASSUMPTION_OVERRIDE_LIMITS.fuelPrice.min,

ASSUMPTION_OVERRIDE_LIMITS.fuelPrice.max,

),

ethanolPricePerLiter: optionalOverride(

ASSUMPTION_OVERRIDE_LIMITS.fuelPrice.min,

ASSUMPTION_OVERRIDE_LIMITS.fuelPrice.max,

),

dieselPricePerLiter: optionalOverride(

ASSUMPTION_OVERRIDE_LIMITS.fuelPrice.min,

ASSUMPTION_OVERRIDE_LIMITS.fuelPrice.max,

),

electricityPricePerKwh: optionalOverride(

ASSUMPTION_OVERRIDE_LIMITS.electricityPrice.min,

ASSUMPTION_OVERRIDE_LIMITS.electricityPrice.max,

),

ipvaRatePct: optionalOverride(

ASSUMPTION_OVERRIDE_LIMITS.ipvaRatePct.min,

ASSUMPTION_OVERRIDE_LIMITS.ipvaRatePct.max,

),

licensingAnnualBRL: optionalOverride(

ASSUMPTION_OVERRIDE_LIMITS.licensingAnnualBRL.min,

ASSUMPTION_OVERRIDE_LIMITS.licensingAnnualBRL.max,

),

})



export const simulationInputSchema = z.object({

objective: objectiveSchema,

finance: financeSchema,

usage: usageSchema,

preferences: preferencesSchema,

weights: weightsSchema,

assumptionOverrides: assumptionOverridesSchema,

registrationState: z.enum(BRAZILIAN_STATE_CODES, {

error: 'Selecione o estado em que o veículo será registrado.',

}),

/** A pessoa marca para estimar o IPVA quando a UF não tem regra. O QC não marca sozinho. */

allowDemonstrativeTax: z.boolean(),

useLiveFipe: z.boolean(),

})



export type SimulationInput = z.infer<typeof simulationInputSchema>

export type ObjectiveInput = z.infer<typeof objectiveSchema>

export type FinanceInput = z.infer<typeof financeSchema>

export type UsageInput = z.infer<typeof usageSchema>

export type PreferencesInput = z.infer<typeof preferencesSchema>
