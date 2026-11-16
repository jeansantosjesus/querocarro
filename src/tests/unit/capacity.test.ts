import { SCENARIOS } from '../../config/scenarios'

import {

acquisitionCapacity,

assessVehicle,

calculateHouseholdBudget,

comfortScore,

marginComfortScore,

type HouseholdBudget,

} from '../../domain/finance/capacity'

import {

calculateFinancedPrincipal,

calculateMonthlyPayment,

totalPaidWithInterest,

} from '../../domain/finance/loan'

import type { FinanceInput } from '../../schemas/simulation'

import { makeInput } from '../fixtures/factories'



function finance(patch: Partial<FinanceInput> = {}): FinanceInput {

return { ...makeInput().finance, ...patch }

}



function budget(

patch: Partial<FinanceInput> = {},

scenario = SCENARIOS.equilibrado,

): HouseholdBudget {

return calculateHouseholdBudget(finance(patch), scenario)

}



function assess(

household: HouseholdBudget,

patch: Partial<Parameters<typeof assessVehicle>[0]> = {},

) {

return assessVehicle({

budget: household,

purchaseMode: 'financiado',

price: 50000,

monthlyTotal: 1200,

monthlyInstallment: 700,

netIncome: 12000,

monthlyRatePct: 1.5,

installments: 48,

safetyMarginMonthly: 0,

essentialExpenses: 4000,

...patch,

})

}



describe('orçamento da casa', () => {

it('renda disponível desconta essenciais, outras despesas, dívidas e reserva mensal', () => {

const household = budget({

netIncome: 10000,

fixedExpenses: 3000,

otherRecurringExpenses: 500,

otherDebts: 400,

monthlyReserve: 300,

})

expect(household.availableIncome).toBe(5800)

expect(household.pressureCritical).toBe(false)

})



it('renda disponível negativa não cria capacidade positiva', () => {

const household = budget({ netIncome: 3000, fixedExpenses: 4500, otherDebts: 200 })

expect(household.availableIncome).toBeLessThan(0)

expect(household.pressureCritical).toBe(true)

expect(household.calculatedLimit).toBe(0)

expect(household.vehicleBudget).toBe(0)

expect(household.premise).toMatch(/não é regra universal|premissa do cenário/i)

})



it('modo informado usa o menor entre o limite digitado e o calculado', () => {

const household = budget()

// Disponível 8.000 × 35% = 2.800, menor que os 3.500 informados.

expect(household.calculatedLimit).toBe(2800)

expect(household.vehicleBudget).toBe(2800)

expect(household.limitSource).toBe('informado')

})



it('modo estimado ignora o limite informado e declara a premissa', () => {

const household = budget({ limitMode: 'estimado', maxMonthlyVehicleSpend: 500 })

expect(household.vehicleBudget).toBe(2800)

expect(household.premise).toMatch(/Limite estimado/)

expect(household.premise).toMatch(/Não é regra universal/)

})



it('o conservador ainda aplica 80% depois do percentual da renda', () => {

const household = budget({}, SCENARIOS.conservador)

// 8.000 × 25% = 2.000; min(3.500, 2.000) × 0,8 = 1.600.

expect(household.vehicleBudget).toBe(1600)

})



it('aumentar renda não reduz o orçamento, e aumentar despesas ou dívidas não o aumenta', () => {

const base = budget({ limitMode: 'estimado' }).vehicleBudget

expect(

budget({ limitMode: 'estimado', netIncome: 20000 }).vehicleBudget,

).toBeGreaterThanOrEqual(base)

expect(

budget({ limitMode: 'estimado', fixedExpenses: 5000 }).vehicleBudget,

).toBeLessThanOrEqual(base)

expect(budget({ limitMode: 'estimado', otherDebts: 1000 }).vehicleBudget).toBeLessThanOrEqual(

base,

)

})

})



describe('reserva', () => {

it('protege o maior valor entre o pedido e os meses de despesas essenciais', () => {

const household = budget({ reserve: 1000, reserveMonths: 3, fixedExpenses: 4000 })

expect(household.protectedReserve).toBe(12000)

})



it('bloqueia a entrada que invade a reserva e mostra a sobra', () => {

const household = budget({

downPayment: 30000,

reserve: 10000,

accumulatedReserve: 20000,

useFullDownPayment: false,

})

expect(household.downPaymentRoom).toBe(10000)

expect(household.reserveBlocked).toBe(true)

expect(household.usableDownPayment).toBeNull()

})



it('com confirmação, usa a entrada e reduz a preservação da reserva', () => {

const household = budget({

downPayment: 30000,

reserve: 10000,

accumulatedReserve: 20000,

useFullDownPayment: true,

})

expect(household.reserveBlocked).toBe(false)

expect(household.usableDownPayment).toBe(30000)

expect(household.reserveOverride).toBe(true)

expect(household.reserveConsumedShare).toBeGreaterThan(0)

expect(household.reserveConsumedShare).toBeLessThanOrEqual(1)

})



it('proteger mais reserva não aumenta a entrada utilizável', () => {

const low = budget({ reserveMonths: 0 }).usableDownPayment ?? 0

const high = budget({ reserveMonths: 6, accumulatedReserve: 40000 }).usableDownPayment ?? 0

expect(high).toBeLessThanOrEqual(low)

})

})



describe('capacidade e restrições', () => {

it('inverso da Price recupera o principal', () => {

const principal = 100000

const payment = calculateMonthlyPayment(principal, 1.5, 48)

expect(calculateFinancedPrincipal(payment, 1.5, 48)).toBeCloseTo(principal, 6)

expect(calculateFinancedPrincipal(500, 0, 10)).toBe(5000)

})



it('aumentar a taxa não reduz os juros totais', () => {

const low = totalPaidWithInterest(100000, 1, 48) - 100000

const high = totalPaidWithInterest(100000, 2, 48) - 100000

expect(high).toBeGreaterThanOrEqual(low)

})



it('aumentar a entrada não reduz a capacidade, e aumentar o custo não melhora o score', () => {

const household = budget({ limitMode: 'estimado' })

const small = acquisitionCapacity({

purchaseMode: 'financiado',

usableDownPayment: 10000,

maxInstallment: 800,

monthlyRatePct: 1.5,

installments: 48,

})

const large = acquisitionCapacity({

purchaseMode: 'financiado',

usableDownPayment: 20000,

maxInstallment: 800,

monthlyRatePct: 1.5,

installments: 48,

})

expect(large).toBeGreaterThanOrEqual(small)



const cheap = assess(household, { monthlyTotal: 800, monthlyInstallment: 400, price: 40000 })

const costly = assess(household, { monthlyTotal: 1600, monthlyInstallment: 900, price: 70000 })

expect(cheap.financialScore).not.toBeNull()

expect(costly.financialScore!).toBeLessThanOrEqual(cheap.financialScore!)

})



it('no limite passa, e um centavo acima sai com exigido, disponível e diferença', () => {

const household = budget()

const atLimit = assess(household, { monthlyTotal: household.vehicleBudget })

expect(atLimit.feasible).toBe(true)

const over = assess(household, { monthlyTotal: household.vehicleBudget + 0.01 })

expect(over.feasible).toBe(false)

expect(over.class).toBe('acima_do_limite')

const reason = over.reasons.find((item) => item.code === 'custo_acima_limite')

expect(reason?.required).toBeCloseTo(household.vehicleBudget + 0.01, 2)

expect(reason?.available).toBe(household.vehicleBudget)

expect(reason?.gap).toBeCloseTo(0.01, 2)

})



it('preço acima da capacidade e folga negativa ficam inviáveis, sem score', () => {

const household = budget({

limitMode: 'estimado',

downPayment: 1000,

accumulatedReserve: 20000,

})

const tooExpensive = assess(household, {

price: 5_000_000,

monthlyTotal: 100,

monthlyInstallment: 0,

})

expect(tooExpensive.feasible).toBe(false)

expect(tooExpensive.financialScore).toBeNull()

expect(tooExpensive.reasons.some((item) => item.code === 'preco_acima_capacidade')).toBe(true)



const forced: HouseholdBudget = {

...budget({ limitMode: 'estimado' }),

availableIncome: 1000,

vehicleBudget: 2000,

pressureCritical: false,

}
const negativeMargin = assess(forced, {

monthlyTotal: 1500,

monthlyInstallment: 800,

price: 40000,

netIncome: 5000,

essentialExpenses: 400,

})

expect(negativeMargin.reasons.some((item) => item.code === 'margem_negativa')).toBe(true)

expect(negativeMargin.financialScore).toBeNull()

expect(negativeMargin.class).toBe('inviavel')

})



it('a saturação impede que renda maior eleve o score de quem já está folgado', () => {

const lowIncome = budget({

limitMode: 'informado',

netIncome: 15000,

maxMonthlyVehicleSpend: 3500,

})

const highIncome = budget({

limitMode: 'informado',

netIncome: 100000,

maxMonthlyVehicleSpend: 3500,

})

expect(lowIncome.vehicleBudget).toBe(highIncome.vehicleBudget)

const low = assess(lowIncome, {

netIncome: 15000,

monthlyTotal: 900,

monthlyInstallment: 500,

price: 45000,

})

const high = assess(highIncome, {

netIncome: 100000,

monthlyTotal: 900,

monthlyInstallment: 500,

price: 45000,

})

expect(low.feasible && high.feasible).toBe(true)

expect(high.financialScore!).toBeCloseTo(low.financialScore!, 6)

expect(high.commitmentRatio!).toBeLessThan(low.commitmentRatio!)

expect(high.acquisitionCapacity).toBeCloseTo(low.acquisitionCapacity!, 2)

})



it('reduzir o limite não amplia a elegibilidade', () => {

const wide = budget({ limitMode: 'estimado' })

const narrow = budget({ limitMode: 'informado', maxMonthlyVehicleSpend: 900 })

const vehicle = { monthlyTotal: 1500, monthlyInstallment: 800, price: 50000 }

expect(assess(wide, vehicle).feasible).toBe(true)

expect(assess(narrow, vehicle).feasible).toBe(false)

})



it('a nota de conforto é linear entre 50% e 100% e a folga satura em um mês de essenciais', () => {

expect(comfortScore(0.5)).toBe(100)

expect(comfortScore(0.75)).toBe(50)

expect(comfortScore(1)).toBe(0)

expect(comfortScore(1.2)).toBe(0)

expect(marginComfortScore(-10, 4000)).toBe(0)

expect(marginComfortScore(2000, 4000)).toBe(50)

expect(marginComfortScore(4000, 4000)).toBe(100)

expect(marginComfortScore(9000, 4000)).toBe(100)

})

})
