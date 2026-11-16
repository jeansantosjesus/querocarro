import { WEEKS_PER_MONTH } from '../../config/assumptions'

import type { ScenarioDefinition } from '../../config/scenarios'

import type { FinanceInput, UsageInput } from '../../schemas/simulation'

import { calculateHouseholdBudget } from './capacity'



/** Converte valor anual em equivalente mensal. */

export function annualToMonthly(annual: number): number {

return annual / 12

}



/**

* Comprometimento mensal: custo mensal / renda líquida.

* Retorna null se a renda for inválida (<= 0): nunca divide por zero.

*/

export function calculateCommitmentRatio(monthlyCost: number, netIncome: number): number | null {

if (!Number.isFinite(monthlyCost) || !Number.isFinite(netIncome) || netIncome <= 0) return null

return monthlyCost / netIncome

}



/**

* Renda líquida − despesas essenciais − outras despesas recorrentes − dívidas − reserva mensal.

* Pode ser negativa. Nesse caso não há capacidade de compra positiva.

*/

export function calculateAvailableMonthly(finance: FinanceInput): number {

return (

finance.netIncome -

finance.fixedExpenses -

finance.otherRecurringExpenses -

finance.otherDebts -

finance.monthlyReserve

)

}



/** Margem restante após o custo mensal do veículo. */

export function calculateRemainingMargin(availableMonthly: number, monthlyCost: number): number {

return availableMonthly - monthlyCost

}



/**

* Relação entre preço e capacidade de compra:

* capacidade = entrada disponível + (parcela máxima x parcelas), usada apenas como referência.

* Retorna null se a capacidade for zero.

*/

export function calculatePriceToPurchasePower(

price: number,

finance: FinanceInput,

purchaseMode: 'avista' | 'financiado',

): number | null {

const installmentCapacity =

purchaseMode === 'financiado' && finance.maxInstallment !== null

? finance.maxInstallment * finance.installments

: 0

const capacity = finance.downPayment + installmentCapacity

if (capacity <= 0) return null

return price / capacity

}

/**

* Orçamento mensal do veículo.

* No modo informado, é o menor valor entre o limite informado e a renda disponível × percentual do cenário.

* No modo estimado, usa só o calculado. O cenário conservador ainda aplica a fração de segurança.

* Renda disponível negativa produz orçamento zero.

*/

export function calculateEffectiveMonthlyLimit(

finance: FinanceInput,

scenario: ScenarioDefinition,

): number {

return calculateHouseholdBudget(finance, scenario).vehicleBudget

}



/** Quilômetros mensais: informado diretamente ou km/dia x dias/semana x semanas por mês. */

export function calculateMonthlyKm(usage: UsageInput): number {

if (usage.monthlyKmOverride !== null) return usage.monthlyKmOverride

return usage.kmPerDay * usage.daysPerWeek * WEEKS_PER_MONTH

}
