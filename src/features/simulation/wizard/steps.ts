import type { FieldPath } from 'react-hook-form'

import type { SimulationInput } from '../../../schemas/simulation'



export type WizardStepId =

| 'objetivo'

| 'financas'

| 'uso'

| 'preferencias'

| 'pesos'

| 'revisao'

| 'processamento'

| 'resultado'



export interface WizardStep {

id: WizardStepId

title: string

/** Campos validados antes de avançar. */

fields: FieldPath<SimulationInput>[]

}



export const WIZARD_STEPS: readonly WizardStep[] = [

{

id: 'objetivo',

title: 'Objetivo',

fields: [

'objective.title',

'objective.scenarioId',

'objective.customMarginMultiplier',

'objective.purchaseMode',

'objective.condition',

'objective.maxPurchasePrice',

],

},

{

id: 'financas',

title: 'Finanças',

fields: [

'registrationState',

'allowDemonstrativeTax',

'finance.netIncome',

'finance.fixedExpenses',

'finance.otherRecurringExpenses',

'finance.otherDebts',

'finance.monthlyReserve',

'finance.downPayment',

'finance.reserve',

'finance.accumulatedReserve',

'finance.reserveMonths',

'finance.safetyMarginMonthly',

'finance.limitMode',

'finance.vehicleSharePct',

'finance.useFullDownPayment',

'finance.maxMonthlyVehicleSpend',

'finance.installments',

'finance.monthlyRatePct',

'finance.maxInstallment',

],

},

{

id: 'uso',

title: 'Uso',

fields: [

'usage.type',

'usage.kmPerDay',

'usage.daysPerWeek',

'usage.monthlyKmOverride',

'usage.passengers',

'usage.trunkNeed',

],

},

{ id: 'preferencias', title: 'Preferências', fields: ['preferences'] },

{ id: 'pesos', title: 'Pesos', fields: ['weights'] },

{ id: 'revisao', title: 'Revisão', fields: ['assumptionOverrides'] },

{ id: 'processamento', title: 'Processamento', fields: [] },

{ id: 'resultado', title: 'Resultado', fields: [] },

] as const
