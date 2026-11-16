import {

DEFAULT_TCO_HORIZON,

EXTRA_COST_LABELS,

TCO_HORIZONS,

type TcoHorizon,

} from '../../config/tco'

import type { FinanceInput, UsageInput } from '../../schemas/simulation'

import type { VehicleCosts } from '../../types/decision'

import type {

AmortizationSystem,

ExtraCostId,

ExtraCosts,

ScheduleRow,

TcoInput,

TcoResult,

VehicleTco,

} from '../../types/tco'

import type { Vehicle } from '../../types/vehicle'

import { maintenanceAgeFactor } from './costs'

import { FinanceInputError, calculateMonthlyPayment } from './loan'



const EXTRA_ORDER: readonly ExtraCostId[] = [

'documentation',

'transfer',

'parking',

'cleaning',

'tolls',

'options',

]



export function isTcoHorizon(value: number): value is TcoHorizon {

return (TCO_HORIZONS as readonly number[]).includes(value)

}



/**

* Cronograma completo de um financiamento (Price ou SAC), período a período.

*

* Price: PMT = P · i / (1 − (1 + i)^−n); juros = saldo anterior · i; amortização = PMT − juros.

* SAC: amortização = P / n; juros = saldo anterior · i; parcela = amortização + juros.

*

* Valores internos não são arredondados. Entradas inválidas lançam FinanceInputError.

*/

export function buildSchedule(

system: AmortizationSystem,

principal: number,

monthlyRatePct: number,

installments: number,

): ScheduleRow[] {

// Reaproveita a validação da Price (principal, taxa e parcelas).

const pmt = calculateMonthlyPayment(principal, monthlyRatePct, installments)

const rate = monthlyRatePct / 100

const sacAmortization = principal / installments



const rows: ScheduleRow[] = []

let opening = principal

for (let period = 1; period <= installments; period += 1) {

const interest = opening * rate

const amortization = system === 'price' ? pmt - interest : sacAmortization

const installment = amortization + interest

const closing = opening - amortization

rows.push({ period, opening, interest, amortization, installment, closing })

opening = closing

}

return rows

}



/** Juros, parcelas pagas e saldo devedor até `months` (sem ultrapassar o prazo). */

export function summarizeScheduleUpTo(

rows: readonly ScheduleRow[],

months: number,

): { interest: number; installments: number; balance: number } {

let interest = 0

let installments = 0

for (const row of rows) {

if (row.period > months) break

interest += row.interest

installments += row.installment

}

const last = rows[Math.min(months, rows.length) - 1]

const balance = last && months < rows.length ? Math.max(last.closing, 0) : 0

return { interest, installments, balance }

}



/**

* Valor residual linear (mesma lógica do custo mensal atual): preço · (1 − d% · meses/12), mínimo 0.

* Retorna value = null se a depreciação for ausente ou inválida (nunca vira zero).

*/

export function residualValue(

priceBRL: number,

depreciationAnnualPct: number | null,

months: number,

): { value: number | null; capped: boolean } {

if (

depreciationAnnualPct === null ||

!Number.isFinite(depreciationAnnualPct) ||

depreciationAnnualPct < 0 ||

depreciationAnnualPct > 100

) {

return { value: null, capped: false }

}

const raw = priceBRL * (1 - (depreciationAnnualPct / 100) * (months / 12))

return { value: Math.max(raw, 0), capped: raw < 0 }

}



/** Soma da manutenção mês a mês; cada ano segue o fator de idade do próprio ano do veículo. */

export function maintenanceOverHorizon(

annualAtStart: number,

ageAtStart: number,

months: number,

assumptions: TcoInput['assumptions'],

): number {

const base = maintenanceAgeFactor(ageAtStart, assumptions)

let total = 0

for (let month = 1; month <= months; month += 1) {

const yearIndex = Math.ceil(month / 12) - 1

const factor = maintenanceAgeFactor(ageAtStart + yearIndex, assumptions) / base

total += (annualAtStart * factor) / 12

}

return total

}



function extrasTotal(extras: ExtraCosts, months: number): { total: number; notIncluded: string[] } {

let total = 0

const notIncluded: string[] = []

for (const id of EXTRA_ORDER) {

const item = extras[id]

if (item === undefined || item === null) {

notIncluded.push(EXTRA_COST_LABELS[id])

continue

}

if (!Number.isFinite(item.amount) || item.amount < 0) {

throw new FinanceInputError(`${EXTRA_COST_LABELS[id]}: valor deve ser maior ou igual a zero.`)

}

total += item.periodicity === 'mensal' ? item.amount * months : item.amount

}

return { total, notIncluded }

}



/**

* Monta a entrada do TCO a partir dos mesmos componentes já usados no custo mensal,

* para que as duas leituras nunca divirjam. Itens sem fonte começam como null (não incluídos).

*/

export function buildTcoInput(args: {

vehicle: Pick<Vehicle, 'modelYear' | 'depreciationAnnualPct'>

costs: VehicleCosts

finance: FinanceInput

usage: UsageInput

purchaseMode: 'avista' | 'financiado'

assumptions: TcoInput['assumptions']

referenceYear: number

extras?: ExtraCosts

}): TcoInput {

const { vehicle, costs, finance, purchaseMode, assumptions, referenceYear } = args

return {

priceBRL: costs.priceBRL,

purchaseMode,

downPayment: finance.downPayment,

monthlyRatePct: finance.monthlyRatePct,

installments: finance.installments,

ipvaAnnual: costs.ipvaAnnual,

licensingAnnual: costs.licensingAnnual,

insuranceAnnual: costs.insuranceAnnual,

maintenanceAnnualAtStart: costs.maintenanceAnnual,

ageAtStart: Math.max(referenceYear - vehicle.modelYear, 0),

energyCostPerKm: costs.energyCostPerKm,

monthlyKm: costs.monthlyKm,

depreciationAnnualPct: vehicle.depreciationAnnualPct,

extras: args.extras ?? {},

assumptions,

}

}



/**

* Custo total de propriedade no horizonte, em duas visões separadas:

*

* Econômica = preço − residual + juros(h) + tributos(h) + seguro(h) + energia(h) + manutenção(h) + extras(h)

* Caixa = entrada + parcelas(h) + tributos(h) + seguro(h) + energia(h) + manutenção(h) + extras(h)

*

* O principal financiado aparece só no preço (visão econômica), e a depreciação só no residual.

* Por isso não há dupla contagem. Identidade: econômica = caixa − (residual − saldo devedor).

*/

export function calculateTco(

input: TcoInput,

horizonMonths: TcoHorizon,

system: AmortizationSystem,

): TcoResult {

if (!isTcoHorizon(horizonMonths)) {

throw new FinanceInputError('Horizonte inválido: use 12, 24, 36, 48 ou 60 meses.')

}

if (!Number.isFinite(input.priceBRL) || input.priceBRL <= 0) {

throw new FinanceInputError('Preço de referência deve ser positivo.')

}



const downPaymentUsed = Math.min(Math.max(input.downPayment, 0), input.priceBRL)

const financed = input.purchaseMode === 'avista' ? 0 : input.priceBRL - downPaymentUsed

const entry = input.purchaseMode === 'avista' ? input.priceBRL : downPaymentUsed



const schedule =

input.purchaseMode === 'avista'

? []

: buildSchedule(system, financed, input.monthlyRatePct, input.installments)

const debt = summarizeScheduleUpTo(schedule, horizonMonths)



const residual = residualValue(input.priceBRL, input.depreciationAnnualPct, horizonMonths)

const taxes =

input.ipvaAnnual === null

? null

: ((input.ipvaAnnual + input.licensingAnnual) / 12) * horizonMonths

const insurance =

input.insuranceAnnual === null ? null : (input.insuranceAnnual / 12) * horizonMonths

const energy =

input.energyCostPerKm === null ? null : input.energyCostPerKm * input.monthlyKm * horizonMonths

const maintenance =

input.maintenanceAnnualAtStart === null

? null

: maintenanceOverHorizon(

input.maintenanceAnnualAtStart,

input.ageAtStart,

horizonMonths,

input.assumptions,

)

const extras = extrasTotal(input.extras, horizonMonths)
const missing: string[] = []

if (taxes === null) missing.push('IPVA')

if (residual.value === null) missing.push('Depreciação (valor residual)')

if (insurance === null) missing.push('Seguro')

if (maintenance === null) missing.push('Manutenção')

if (energy === null) missing.push('Combustível ou energia')



const complete = missing.length === 0

const residualValueOrNull = residual.value

const economicTotal =

complete && residualValueOrNull !== null

? input.priceBRL -

residualValueOrNull +

debt.interest +

(taxes as number) +

(insurance as number) +

(energy as number) +

(maintenance as number) +

extras.total

: null

const cashTotal = complete

? entry +

debt.installments +

(taxes as number) +

(insurance as number) +

(energy as number) +

(maintenance as number) +

extras.total

: null



return {

horizonMonths,

system,

economic: {

total: economicTotal,

acquisition: input.priceBRL,

residual: residual.value,

interest: debt.interest,

taxes,

insurance,

energy,

maintenance,

extras: extras.total,

},

cash: {

total: cashTotal,

entry,

installments: debt.installments,

taxes,

insurance,

energy,

maintenance,

extras: extras.total,

netResidualPosition: residual.value === null ? null : residual.value - debt.balance,

},

interestPaid: debt.interest,

balanceAtHorizon: debt.balance,

residualCapped: residual.capped,

missing,

notIncluded: extras.notIncluded,

}

}



/** TCO nos cinco horizontes e nos dois sistemas. O critério do ranking usa Price no horizonte padrão. */

export function calculateVehicleTco(input: TcoInput): VehicleTco {

const byHorizon = {} as VehicleTco['byHorizon']

for (const horizon of TCO_HORIZONS) {

byHorizon[horizon] = {

price: calculateTco(input, horizon, 'price'),

sac: calculateTco(input, horizon, 'sac'),

}

}

return {

criterionHorizonMonths: DEFAULT_TCO_HORIZON,

criterionValue: byHorizon[DEFAULT_TCO_HORIZON].price.economic.total,

byHorizon,

}

}
