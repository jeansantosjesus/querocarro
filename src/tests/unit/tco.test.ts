import { DEFAULT_ASSUMPTIONS } from '../../config/assumptions'

import { DEFAULT_TCO_HORIZON, TCO_HORIZONS } from '../../config/tco'

import { SCENARIOS } from '../../config/scenarios'

import {

computeVehicleCosts,

maintenanceAgeFactor,

type CostContext,

} from '../../domain/finance/costs'

import { FinanceInputError } from '../../domain/finance/loan'

import { runSensitivity } from '../../domain/finance/sensitivity'

import {

buildSchedule,

buildTcoInput,

calculateTco,

calculateVehicleTco,

maintenanceOverHorizon,

residualValue,

summarizeScheduleUpTo,

} from '../../domain/finance/tco'

import type { TcoHorizon } from '../../config/tco'

import type { TcoInput } from '../../types/tco'

import { REFERENCE_YEAR, makeInput, makeVehicle } from '../fixtures/factories'



const ASSUMPTIONS = {

maintenanceAgeFreeYears: DEFAULT_ASSUMPTIONS.maintenanceAgeFreeYears,

maintenanceAgeIncreasePctPerYear: DEFAULT_ASSUMPTIONS.maintenanceAgeIncreasePctPerYear,

}



function baseInput(overrides: Partial<TcoInput> = {}): TcoInput {

return {

priceBRL: 60_000,

purchaseMode: 'financiado',

downPayment: 12_000,

monthlyRatePct: 1.5,

installments: 48,

ipvaAnnual: 2_400,

licensingAnnual: 160,

insuranceAnnual: 2_400,

maintenanceAnnualAtStart: 1_200,

ageAtStart: 2,

energyCostPerKm: 0.4,

monthlyKm: 1_000,

depreciationAnnualPct: 12,

extras: {},

assumptions: ASSUMPTIONS,

...overrides,

}

}



const sumOf = (values: number[]) => values.reduce((total, value) => total + value, 0)



describe('cronograma de financiamento', () => {

it('Price: valor conhecido (R$ 10.000, 1% a.m., 12x) e saldo final zero', () => {

const rows = buildSchedule('price', 10_000, 1, 12)

expect(rows[0]!.installment).toBeCloseTo(888.4879, 3)

expect(rows[0]!.interest).toBeCloseTo(100, 8)

expect(rows[11]!.closing).toBeCloseTo(0, 6)

})



it('Price: parcelas iguais e amortizações somam o principal (sem arredondamento interno)', () => {

const rows = buildSchedule('price', 10_000, 1, 12)

const installments = rows.map((row) => row.installment)

expect(Math.max(...installments) - Math.min(...installments)).toBeCloseTo(0, 8)

expect(sumOf(rows.map((row) => row.amortization))).toBeCloseTo(10_000, 6)

})



it('SAC: amortização constante (P/n) e juros decrescentes', () => {

const rows = buildSchedule('sac', 100_000, 14.0175, 10)

for (const row of rows) expect(row.amortization).toBeCloseTo(10_000, 8)

expect(rows[0]!.interest).toBeCloseTo(14_017.5, 6)

expect(rows[0]!.installment).toBeCloseTo(24_017.5, 6)

for (let index = 1; index < rows.length; index += 1) {

expect(rows[index]!.interest).toBeLessThan(rows[index - 1]!.interest)

}

expect(rows[9]!.closing).toBeCloseTo(0, 6)

})



it('SAC total de juros é menor que o da Price no mesmo prazo', () => {

const price = sumOf(buildSchedule('price', 100_000, 1, 12).map((row) => row.interest))

const sac = sumOf(buildSchedule('sac', 100_000, 1, 12).map((row) => row.interest))

expect(sac).toBeLessThan(price)

})



it('exemplo de DIAS JÚNIOR (2023), 3.3.1: P = 100.000, i = 14,0175% a.m., n = 10 → parcela ≈ 19.184,40', () => {

// Valor da tabela do TCC, obtido com n = 10 parcelas (arredondamento da taxa na fonte).

// Com n = 12 a parcela seria 17.680,49. Divergência registrada em docs/metodologia/referencias.md.

const rows = buildSchedule('price', 100_000, 14.0175, 10)

expect(Math.abs(rows[0]!.installment - 19_184.4)).toBeLessThan(0.1)

expect(Math.abs(rows[0]!.interest - 14_017.5)).toBeLessThan(0.1)

expect(Math.abs(rows[0]!.amortization - 5_166.9)).toBeLessThan(0.1)

})



it('taxa zero: Price divide igualmente e não há juros', () => {

const rows = buildSchedule('price', 12_000, 0, 12)

expect(rows.every((row) => row.interest === 0)).toBe(true)

expect(rows[0]!.installment).toBe(1_000)

})



it('principal zero (entrada cobre o preço): nenhum juro, nenhum saldo', () => {

const summary = summarizeScheduleUpTo(buildSchedule('price', 0, 1.5, 48), 36)

expect(summary).toEqual({ interest: 0, installments: 0, balance: 0 })

})



it('prazo zero, taxa negativa e principal negativo são rejeitados', () => {

expect(() => buildSchedule('price', 1_000, 1, 0)).toThrow(FinanceInputError)

expect(() => buildSchedule('sac', 1_000, -0.5, 12)).toThrow(FinanceInputError)

expect(() => buildSchedule('price', -1, 1, 12)).toThrow(FinanceInputError)

})



it('resumo até o horizonte: horizonte menor que o prazo deixa saldo; maior que o prazo não', () => {

const rows = buildSchedule('price', 10_000, 1, 24)

const inside = summarizeScheduleUpTo(rows, 12)

expect(inside.balance).toBeGreaterThan(0)

expect(inside.balance).toBeCloseTo(rows[11]!.closing, 8)

expect(summarizeScheduleUpTo(rows, 60).balance).toBe(0)

expect(summarizeScheduleUpTo(rows, 60).installments).toBeCloseTo(

sumOf(rows.map((row) => row.installment)),

6,

)

})

})



describe('residual e manutenção', () => {

it('residual linear: preço · (1 − d% · meses/12), mínimo zero', () => {

expect(residualValue(60_000, 12, 36)).toEqual({ value: 60_000 * (1 - 0.12 * 3), capped: false })

expect(residualValue(60_000, 40, 60)).toEqual({ value: 0, capped: true })

})



it('residual inválido ou ausente nunca vira zero', () => {

for (const pct of [null, Number.NaN, -1, 101]) {

expect(residualValue(60_000, pct, 36).value).toBeNull()

}

})



it('fator de idade: nenhum acréscimo nos anos livres, acréscimo depois', () => {

expect(maintenanceAgeFactor(3, ASSUMPTIONS)).toBe(1)

expect(maintenanceAgeFactor(5, ASSUMPTIONS)).toBeCloseTo(1 + 2 * 0.04, 10)

})



it('manutenção no horizonte: 12 meses em veículo novo = anual; ano seguinte com acréscimo', () => {

const oneYear = maintenanceOverHorizon(1_200, 0, 12, ASSUMPTIONS)

expect(oneYear).toBeCloseTo(1_200, 6)

const twoYears = maintenanceOverHorizon(1_200, 3, 24, ASSUMPTIONS)

expect(twoYears).toBeCloseTo(1_200 + 1_200 * (1 + 0.04), 6)

})

})



describe('cálculo do TCO', () => {

it('todos os horizontes produzem totais finitos e crescentes com o tempo', () => {

let previous = -Infinity

for (const horizon of TCO_HORIZONS) {

const result = calculateTco(baseInput(), horizon, 'price')

expect(result.horizonMonths).toBe(horizon)

expect(result.economic.total).not.toBeNull()

expect(Number.isFinite(result.economic.total!)).toBe(true)

expect(result.economic.total!).toBeGreaterThan(previous)

previous = result.economic.total!

}

})



it('horizonte inválido é rejeitado', () => {

expect(() => calculateTco(baseInput(), 20 as TcoHorizon, 'price')).toThrow(FinanceInputError)

})



it('visão econômica: preço − residual + juros + tributos + seguro + energia + manutenção', () => {

const input = baseInput()

const result = calculateTco(input, 36, 'price')

const residual = 60_000 * (1 - 0.12 * 3)

const expected =

60_000 -

residual +

result.interestPaid +

((2_400 + 160) / 12) * 36 +

(2_400 / 12) * 36 +

0.4 * 1_000 * 36 +

result.economic.maintenance!

expect(result.economic.total).toBeCloseTo(expected, 6)

})



it('não há dupla contagem: a depreciação entra só pelo residual, e o principal só pelo preço', () => {

const result = calculateTco(baseInput(), 36, 'price')

const components = result.economic

const summed =

components.acquisition -

components.residual! +

components.interest +

components.taxes! +

components.insurance! +

components.energy! +

components.maintenance! +

components.extras

expect(components.total).toBeCloseTo(summed, 8)

// O principal financiado não aparece como componente separado.

expect(Object.keys(components)).not.toContain('principal')

expect(Object.keys(components)).not.toContain('depreciation')

})
it('identidade entre as visões: econômica = caixa − (residual − saldo devedor), para todos os casos', () => {

const cases: Array<[Partial<TcoInput>, TcoHorizon, 'price' | 'sac']> = [

[{}, 12, 'price'],

[{}, 36, 'sac'],

[{ installments: 12 }, 60, 'price'],

[{ downPayment: 0 }, 24, 'sac'],

[{ purchaseMode: 'avista', downPayment: 0 }, 48, 'price'],

]

for (const [overrides, horizon, system] of cases) {

const result = calculateTco(baseInput(overrides), horizon, system)

const residual = result.economic.residual!

expect(result.economic.total!).toBeCloseTo(

result.cash.total! - (residual - result.balanceAtHorizon),

6,

)

}

})



it('entrada igual ao preço: sem juros, sem parcelas, saldo zero', () => {

const result = calculateTco(baseInput({ downPayment: 60_000 }), 36, 'price')

expect(result.interestPaid).toBe(0)

expect(result.cash.installments).toBe(0)

expect(result.balanceAtHorizon).toBe(0)

expect(result.cash.entry).toBe(60_000)

})



it('entrada superior ao preço: a entrada considerada é limitada ao preço', () => {

const result = calculateTco(baseInput({ downPayment: 90_000 }), 36, 'price')

expect(result.cash.entry).toBe(60_000)

expect(result.interestPaid).toBe(0)

})



it('compra à vista: sem parcelas e sem juros; caixa inicial é o preço', () => {

const result = calculateTco(baseInput({ purchaseMode: 'avista' }), 36, 'price')

expect(result.cash.installments).toBe(0)

expect(result.interestPaid).toBe(0)

expect(result.cash.entry).toBe(60_000)

expect(result.economic.total!).toBeCloseTo(

60_000 -

60_000 * (1 - 0.12 * 3) +

result.economic.taxes! +

2_400 * 3 +

0.4 * 1_000 * 36 +

result.economic.maintenance!,

6,

)

})



it('horizonte menor que o prazo: saldo devedor aparece na posição líquida', () => {

const result = calculateTco(baseInput(), 12, 'price')

expect(result.balanceAtHorizon).toBeGreaterThan(0)

expect(result.cash.netResidualPosition!).toBeCloseTo(

result.economic.residual! - result.balanceAtHorizon,

6,

)

})



it('horizonte maior que o prazo: parcelas somam o financiamento completo', () => {

const result = calculateTco(baseInput({ installments: 12 }), 60, 'price')

expect(result.balanceAtHorizon).toBe(0)

const rows = buildSchedule('price', 48_000, 1.5, 12)

expect(result.cash.installments).toBeCloseTo(sumOf(rows.map((row) => row.installment)), 6)

})



it('SAC gera menos juros que a Price no mesmo horizonte (mesmo prazo)', () => {

const price = calculateTco(baseInput({ installments: 48 }), 48, 'price')

const sac = calculateTco(baseInput({ installments: 48 }), 48, 'sac')

expect(sac.interestPaid).toBeLessThan(price.interestPaid)

expect(sac.economic.total!).toBeLessThan(price.economic.total!)

})



it('consumo ausente: energia null, total null e componente listado como ausente (não vira zero)', () => {

const result = calculateTco(baseInput({ energyCostPerKm: null }), 36, 'price')

expect(result.economic.energy).toBeNull()

expect(result.economic.total).toBeNull()

expect(result.cash.total).toBeNull()

expect(result.missing).toContain('Combustível ou energia')

})



it('depreciação inválida: residual null, total null, sem assumir zero', () => {

const result = calculateTco(baseInput({ depreciationAnnualPct: 150 }), 36, 'price')

expect(result.economic.residual).toBeNull()

expect(result.economic.total).toBeNull()

expect(result.missing).toContain('Depreciação (valor residual)')

})



it('residual que chega a zero no horizonte é marcado como limitado', () => {

const result = calculateTco(baseInput({ depreciationAnnualPct: 40 }), 60, 'price')

expect(result.economic.residual).toBe(0)

expect(result.residualCapped).toBe(true)

})



it('itens opcionais: informados entram no total; ausentes vão para "não incluídos", sem zero', () => {

const withParking = calculateTco(

baseInput({ extras: { parking: { amount: 100, periodicity: 'mensal' } } }),

12,

'price',

)

const without = calculateTco(baseInput(), 12, 'price')

expect(withParking.economic.total! - without.economic.total!).toBeCloseTo(1_200, 6)

expect(without.notIncluded).toContain('Estacionamento')

expect(without.notIncluded).toContain('Documentação')

expect(without.economic.total).not.toBeNull()

})



it('item único (documentação) entra uma vez, independentemente do horizonte', () => {

const doc = { documentation: { amount: 500, periodicity: 'unico' as const } }

const short = calculateTco(baseInput({ extras: doc }), 12, 'price')

const long = calculateTco(baseInput({ extras: doc }), 60, 'price')

const shortBase = calculateTco(baseInput(), 12, 'price')

const longBase = calculateTco(baseInput(), 60, 'price')

expect(short.economic.total! - shortBase.economic.total!).toBeCloseTo(500, 6)

expect(long.economic.total! - longBase.economic.total!).toBeCloseTo(500, 6)

})



it('valor de item informado negativo é rejeitado', () => {

expect(() =>

calculateTco(

baseInput({ extras: { tolls: { amount: -10, periodicity: 'mensal' } } }),

12,

'price',

),

).toThrow(FinanceInputError)

})



it('centavos: valores internos não são arredondados', () => {

const result = calculateTco(baseInput({ priceBRL: 60_000.37 }), 36, 'price')

expect(result.economic.acquisition).toBe(60_000.37)

expect(result.economic.total).not.toBeCloseTo(Math.round(result.economic.total!), 10)

})

})



describe('TCO a partir dos custos da simulação', () => {

const context: CostContext = {

finance: makeInput().finance,

usage: makeInput().usage,

purchaseMode: 'financiado',

fuelPreference: 'indiferente',

assumptions: DEFAULT_ASSUMPTIONS,

scenario: SCENARIOS.equilibrado,

referenceYear: REFERENCE_YEAR,

registrationState: 'BA',

condition: 'indiferente',

manualIpvaRatePct: undefined,

allowDemonstrativeTax: false,

}



it('elétrico: energia calculada em kWh, sem consumo de combustível', () => {

const vehicle = makeVehicle({

fuel: 'eletrico',

priceBRL: 150_000,

urbanConsumption: 8,

highwayConsumption: 7,

consumptionUnit: 'km/kWh',

maintenanceAnnualBRL: 800,

depreciationAnnualPct: 15,

})

const costs = computeVehicleCosts(vehicle, context)

expect(costs.ok).toBe(true)

if (!costs.ok) return

const input = buildTcoInput({

vehicle,

costs: costs.costs,

finance: context.finance,

usage: context.usage,

purchaseMode: 'financiado',

assumptions: ASSUMPTIONS,

referenceYear: REFERENCE_YEAR,

})

const result = calculateVehicleTco(input)

expect(result.byHorizon[36].price.missing).toEqual([])

expect(result.byHorizon[36].price.economic.energy).toBeCloseTo(

costs.costs.energyCostPerKm! * costs.costs.monthlyKm * 36,

6,

)

})



it('calculateVehicleTco preenche os cinco horizontes nos dois sistemas', () => {

const vehicle = makeVehicle({ priceBRL: 80_000 })

const costs = computeVehicleCosts(vehicle, context)

if (!costs.ok) throw new Error('custos inválidos no teste')

const tco = calculateVehicleTco(

buildTcoInput({

vehicle,

costs: costs.costs,

finance: context.finance,

usage: context.usage,

purchaseMode: 'financiado',

assumptions: ASSUMPTIONS,

referenceYear: REFERENCE_YEAR,

}),

)

for (const horizon of TCO_HORIZONS) {

expect(tco.byHorizon[horizon].price.horizonMonths).toBe(horizon)

expect(tco.byHorizon[horizon].sac.system).toBe('sac')

}

expect(tco.criterionHorizonMonths).toBe(DEFAULT_TCO_HORIZON)

expect(tco.criterionValue).toBe(tco.byHorizon[DEFAULT_TCO_HORIZON].price.economic.total)

})

})
describe('sensibilidade', () => {

const cases = runSensitivity(baseInput(), 36, 'price')

const find = (label: string) => cases.find((item) => item.label === label)!



it('caso base primeiro, depois uma variação por vez', () => {

expect(cases[0]!.label).toBe('Caso base')

expect(cases[0]!.driver).toBeNull()

expect(cases.length).toBeGreaterThan(10)

for (const item of cases.slice(1)) expect(item.driver).not.toBeNull()

})



it('mais entrada reduz o custo econômico; juros maiores o elevam', () => {

const base = cases[0]!.result.economic.total!

expect(find('Entrada +20%').result.economic.total!).toBeLessThan(base)

expect(find('Taxa +1 p.p. ao mês').result.economic.total!).toBeGreaterThan(base)

})



it('mais quilometragem, manutenção, seguro e depreciação elevam o custo (depreciação eleva a perda de valor)', () => {

const base = cases[0]!.result.economic.total!

expect(find('Quilometragem +20%').result.economic.total!).toBeGreaterThan(base)

expect(find('Manutenção +20%').result.economic.total!).toBeGreaterThan(base)

expect(find('Seguro +20%').result.economic.total!).toBeGreaterThan(base)

expect(find('Depreciação +20%').result.economic.total!).toBeGreaterThan(base)

})



it('sensibilidade com consumo ausente: todas as variações de energia ficam nulas', () => {

const missing = runSensitivity(baseInput({ energyCostPerKm: null }), 36, 'price')

expect(

missing.find((item) => item.label === 'Combustível/energia +20%')!.result.economic.total,

).toBeNull()

})

})
