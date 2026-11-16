/**

* Propriedades que devem valer para qualquer entrada da grade testada.

* Não são oráculos de valor: verificam relações entre resultados (monotonia,

* determinismo, reconciliação, ausência que não vira zero).

*/

import { describe, expect, it } from 'vitest'

import { DEFAULT_ASSUMPTIONS } from '../../config/assumptions'

import { SCENARIOS } from '../../config/scenarios'

import {

calculateInverseOptions,

isDominated,

type InverseCandidate,

type InverseRequest,

} from '../../domain/finance/inverse'

import { calculateRegionalTaxes } from '../../domain/finance/regionalTax'

import { computeVehicleCosts, type CostContext } from '../../domain/finance/costs'

import { calculateMonthlyPayment, totalPaidWithInterest } from '../../domain/finance/loan'

import { buildSchedule, calculateTco } from '../../domain/finance/tco'

import type { TcoInput } from '../../types/tco'

import { REFERENCE_YEAR, makeInput, makeVehicle } from '../fixtures/factories'



const EPS = 1e-6



function nonDecreasing(values: readonly number[]) {

for (let i = 1; i < values.length; i += 1) {

expect(values[i]).toBeGreaterThanOrEqual((values[i - 1] as number) - EPS)

}

}



function nonIncreasing(values: readonly number[]) {

for (let i = 1; i < values.length; i += 1) {

expect(values[i]).toBeLessThanOrEqual((values[i - 1] as number) + EPS)

}

}



function costContext(overrides: Partial<CostContext> = {}): CostContext {

const base = makeInput()

return {

finance: base.finance,

usage: base.usage,

purchaseMode: 'financiado',

fuelPreference: 'indiferente',

assumptions: DEFAULT_ASSUMPTIONS,

scenario: SCENARIOS.equilibrado,

referenceYear: REFERENCE_YEAR,

registrationState: 'BA',

condition: 'indiferente',

manualIpvaRatePct: undefined,

allowDemonstrativeTax: true,

...overrides,

}

}



function tcoInput(overrides: Partial<TcoInput> = {}): TcoInput {

return {

priceBRL: 60000,

purchaseMode: 'financiado',

downPayment: 12000,

monthlyRatePct: 1.5,

installments: 48,

ipvaAnnual: 2400,

licensingAnnual: 160,

insuranceAnnual: 2000,

maintenanceAnnualAtStart: 1500,

ageAtStart: 2,

energyCostPerKm: 0.6,

monthlyKm: 1000,

depreciationAnnualPct: 8,

extras: {},

assumptions: {

maintenanceAgeFreeYears: DEFAULT_ASSUMPTIONS.maintenanceAgeFreeYears,

maintenanceAgeIncreasePctPerYear: DEFAULT_ASSUMPTIONS.maintenanceAgeIncreasePctPerYear,

},

...overrides,

}

}



function inverseRequest(overrides: Partial<InverseRequest> = {}): InverseRequest {

const base = makeInput()

return {

vehicle: makeVehicle({ priceBRL: 70000 }),

registrationState: 'BA',

condition: 'indiferente',

usage: base.usage,

fuelPreference: 'indiferente',

assumptions: DEFAULT_ASSUMPTIONS,

scenario: SCENARIOS.equilibrado,

referenceYear: REFERENCE_YEAR,

horizonMonths: 36,

allowDemonstrativeTax: true,

finance: base.finance,

hasIncome: true,

purchaseModes: ['avista', 'financiado'],

amortization: 'price',

maxDownPayment: null,

maxMonthlyTotal: null,

personalized: null,

...overrides,

}

}



const TERMS = [12, 24, 36, 48, 60] as const



describe('propriedades financeiras', () => {

it('aumentar a entrada não aumenta o valor financiado nem a parcela', () => {

const downPayments = [0, 5000, 10000, 20000, 40000]

const costs = downPayments.map((downPayment) =>

computeVehicleCosts(

makeVehicle({ priceBRL: 60000 }),

costContext({ finance: { ...makeInput().finance, downPayment, monthlyRatePct: 1.5 } }),

),

)

const financed = costs.map((result) => (result.ok ? result.costs.financedAmount : Number.NaN))

const installments = costs.map((result) =>

result.ok ? result.costs.monthlyInstallment : Number.NaN,

)

nonIncreasing(financed)

nonIncreasing(installments)

})



it('com taxa positiva, aumentar o prazo não reduz os juros totais', () => {

const principal = 50000

const totals = TERMS.map((n) => totalPaidWithInterest(principal, 1.5, n))

nonDecreasing(totals)

for (const n of TERMS) {

expect(totalPaidWithInterest(principal, 1.5, n)).toBeGreaterThan(principal)

}

})



it('o sistema SAC paga juros totais não maiores que a Price, com a mesma taxa e prazo', () => {

for (const n of TERMS) {

const price = buildSchedule('price', 50000, 1.5, n).reduce(

(sum, row) => sum + row.interest,

0,

)

const sac = buildSchedule('sac', 50000, 1.5, n).reduce((sum, row) => sum + row.interest, 0)

expect(sac).toBeLessThanOrEqual(price + EPS)

}

})



it('a Price sem juros é exatamente o principal dividido pelas parcelas, para qualquer prazo', () => {

for (const n of TERMS) {

expect(calculateMonthlyPayment(60000, 0, n) * n).toBeCloseTo(60000, 6)

}

})



it('aumentar a quilometragem não reduz o custo de energia mensal', () => {

const kms = [500, 1000, 2000, 4000]

const energy = kms.map((monthlyKmOverride) => {

const result = computeVehicleCosts(

makeVehicle({ fuel: 'gasolina' }),

costContext({ usage: { ...makeInput().usage, monthlyKmOverride } }),

)

return result.ok ? (result.costs.energyMonthly ?? Number.NaN) : Number.NaN

})

nonDecreasing(energy)

})

})



describe('propriedades do TCO', () => {

it('aumentar qualquer custo não reduz o TCO econômico, em todos os horizontes e sistemas', () => {

const increases: Array<[string, Partial<TcoInput>]> = [

['IPVA', { ipvaAnnual: 2400 + 500 }],

['licenciamento', { licensingAnnual: 160 + 500 }],

['seguro', { insuranceAnnual: 2000 + 500 }],

['manutenção', { maintenanceAnnualAtStart: 1500 + 500 }],

['energia por km', { energyCostPerKm: 0.6 + 0.2 }],

['quilometragem', { monthlyKm: 1000 + 500 }],

['taxa de juros', { monthlyRatePct: 1.5 + 1 }],

['depreciação', { depreciationAnnualPct: 8 + 4 }],

['extra mensal', { extras: { parking: { amount: 200, periodicity: 'mensal' } } }],

['extra único', { extras: { documentation: { amount: 800, periodicity: 'unico' } } }],

]

const base = tcoInput()

for (const horizon of TERMS) {

for (const system of ['price', 'sac'] as const) {

const before = calculateTco(base, horizon, system).economic.total

for (const [label, change] of increases) {

const after = calculateTco(tcoInput(change), horizon, system).economic.total

expect(after, `${label} em ${horizon} meses (${system})`).not.toBeNull()

expect(

after as number,

`${label} em ${horizon} meses (${system})`,

).toBeGreaterThanOrEqual((before as number) - EPS)

}

}

}

})



it('reconciliação: econômico = caixa − (residual − saldo devedor) em todos os horizontes e sistemas', () => {

for (const horizon of TERMS) {

for (const system of ['price', 'sac'] as const) {

const result = calculateTco(tcoInput(), horizon, system)

expect(result.economic.total).not.toBeNull()

const cashIdentity =

(result.cash.total as number) - (result.cash.netResidualPosition as number)

expect(cashIdentity).toBeCloseTo(result.economic.total as number, 4)

}

}

})



it('dado ausente não vira zero: sem depreciação, o TCO econômico fica indisponível (null)', () => {

const result = calculateTco(tcoInput({ depreciationAnnualPct: null }), 36, 'price')

expect(result.economic.total).toBeNull()

expect(result.economic.residual).toBeNull()

expect(result.missing).toContain('Depreciação (valor residual)')

})
it('dado ausente não vira zero: sem energia, o TCO não é calculado como se o combustível fosse zero', () => {

const result = calculateTco(tcoInput({ energyCostPerKm: null }), 36, 'price')

expect(result.economic.total).toBeNull()

expect(result.cash.total).toBeNull()

expect(result.missing).toContain('Combustível ou energia')

})

})



describe('propriedades do custo mensal', () => {

it('mesmas entradas produzem exatamente o mesmo resultado', () => {

const vehicle = makeVehicle({ priceBRL: 65000 })

const context = costContext()

expect(computeVehicleCosts(vehicle, context)).toEqual(computeVehicleCosts(vehicle, context))

})



it('reconcilia: caixa = parcela + IPVA/12 + licenciamento/12 + seguro/12 + manutenção/12 + energia, e total = caixa + depreciação/12', () => {

const result = computeVehicleCosts(makeVehicle({ priceBRL: 65000 }), costContext())

expect(result.ok).toBe(true)

if (!result.ok) return

const c = result.costs

const expectedCash =

(c.monthlyInstallment ?? 0) +

((c.ipvaAnnual ?? 0) +

c.licensingAnnual +

(c.insuranceAnnual ?? 0) +

(c.maintenanceAnnual ?? 0)) /

12 +

(c.energyMonthly ?? 0)

expect(c.monthlyCash).toBeCloseTo(expectedCash, 6)

expect(c.monthlyTotal).toBeCloseTo((c.monthlyCash ?? 0) + (c.depreciationAnnual ?? 0) / 12, 6)

expect(c.annualTotal).toBeCloseTo((c.monthlyTotal ?? 0) * 12, 6)

})



it('dado ausente não vira zero: sem categoria de seguro, o custo mensal total fica indisponível', () => {

const result = computeVehicleCosts(

makeVehicle({ insuranceCategory: null, priceBRL: 65000 }),

costContext(),

)

expect(result.ok).toBe(true)

if (!result.ok) return

expect(result.costs.insuranceAnnual).toBeNull()

expect(result.costs.monthlyTotal).toBeNull()

expect(result.costs.notes.join(' ')).toMatch(/Categoria de seguro/)

})



it('mudar a UF recalcula o componente regional: Bahia (demonstração) aplica IPVA; UF sem regra fica ausente', () => {

const vehicle = makeVehicle({ priceBRL: 65000 })

const ba = computeVehicleCosts(vehicle, costContext({ registrationState: 'BA' }))

const sp = computeVehicleCosts(

vehicle,

costContext({ registrationState: 'SP', allowDemonstrativeTax: false }),

)

expect(ba.ok && ba.costs.ipvaAnnual).toBeCloseTo(2600, 6)

expect(sp.ok && sp.costs.ipvaAnnual).toBeNull()

})



it('calcular IPVA duas vezes com a mesma entrada dá o mesmo resultado', () => {

const input = {

state: 'BA' as const,

priceBRL: 50000,

condition: 'usado' as const,

fuel: 'gasolina' as const,

asOf: '2026-11-01',

manualRatePct: undefined,

allowDemonstrativeEstimate: true,

demonstrativeRatePct: 4,

}

expect(calculateRegionalTaxes(input)).toEqual(calculateRegionalTaxes(input))

})

})



describe('oráculo de dominância (fronteira de Pareto)', () => {

// Vetor: (entrada, parcela, TCO econômico). Menor é melhor em parcela e TCO; maior entrada é

// melhor (menos dívida). Dominada = outra é igual ou melhor nos três e estritamente melhor em uma.

function withVector(

base: InverseCandidate,

downPayment: number,

monthlyInstallment: number,

tcoEconomic: number,

): InverseCandidate {

return { ...base, downPayment, monthlyInstallment, tcoEconomic }

}



it('casos conhecidos de dominância', () => {

const base = calculateInverseOptions(inverseRequest()).candidates[0]

expect(base).toBeDefined()

if (!base) return

const a = withVector(base, 10000, 1000, 50000)

const better = withVector(base, 10000, 900, 50000) // mesma entrada, parcela menor, mesmo TCO

const same = withVector(base, 10000, 1000, 50000) // idêntica

const tradeoff = withVector(base, 5000, 1200, 60000) // entrada menor, parcela e TCO piores

const cheaperTco = withVector(base, 10000, 1000, 48000) // melhor só no TCO



expect(isDominated(a, better)).toBe(true) // a é dominada por better

expect(isDominated(better, a)).toBe(false)

expect(isDominated(a, same)).toBe(false) // empate não domina

expect(isDominated(a, tradeoff)).toBe(false) // trade-off: nenhuma domina a outra

expect(isDominated(tradeoff, a)).toBe(false)

expect(isDominated(a, cheaperTco)).toBe(true)

})

})



describe('propriedades da simulação inversa', () => {

it('mesma entrada, mesmo resultado (determinismo)', () => {

const request = inverseRequest()

expect(calculateInverseOptions(request)).toEqual(calculateInverseOptions(request))

})



it('nenhuma opção final domina outra opção final (fronteira de Pareto)', () => {

const result = calculateInverseOptions(inverseRequest())

expect(result.options.length).toBeGreaterThan(0)

for (const option of result.options) {

expect(result.candidates.some((candidate) => candidate.id === option.id)).toBe(true)

for (const other of result.options) {

if (other === option) continue

expect(isDominated(option, other), `${option.id} dominada por ${other.id}`).toBe(false)

}

}

})

})
