import type { TcoHorizon } from '../../config/tco'

import type { AmortizationSystem, TcoInput, TcoResult } from '../../types/tco'

import { calculateTco } from './tco'



export type SensitivityDriver =

| 'downPayment'

| 'monthlyRatePct'

| 'installments'

| 'monthlyKm'

| 'energyPrice'

| 'maintenance'

| 'insurance'

| 'depreciation'



export interface SensitivityCase {

/** `null` apenas para o caso base. */

driver: SensitivityDriver | null

label: string

result: TcoResult

}



/** Variações fixas, uma variável por vez. Os valores são premissas de teste de sensibilidade. */

const VARIATIONS: ReadonlyArray<{

driver: SensitivityDriver

label: string

apply: (input: TcoInput) => TcoInput

}> = [

{

driver: 'downPayment',

label: 'Entrada −20%',

apply: (input) => ({ ...input, downPayment: input.downPayment * 0.8 }),

},

{

driver: 'downPayment',

label: 'Entrada +20%',

apply: (input) => ({ ...input, downPayment: input.downPayment * 1.2 }),

},

{

driver: 'monthlyRatePct',

label: 'Taxa −1 p.p. ao mês',

apply: (input) => ({ ...input, monthlyRatePct: Math.max(input.monthlyRatePct - 1, 0) }),

},

{

driver: 'monthlyRatePct',

label: 'Taxa +1 p.p. ao mês',

apply: (input) => ({ ...input, monthlyRatePct: input.monthlyRatePct + 1 }),

},

{

driver: 'installments',

label: 'Prazo −12 parcelas',

apply: (input) => ({ ...input, installments: Math.max(input.installments - 12, 1) }),

},

{

driver: 'installments',

label: 'Prazo +12 parcelas',

apply: (input) => ({ ...input, installments: input.installments + 12 }),

},

{

driver: 'monthlyKm',

label: 'Quilometragem −20%',

apply: (input) => ({ ...input, monthlyKm: input.monthlyKm * 0.8 }),

},

{

driver: 'monthlyKm',

label: 'Quilometragem +20%',

apply: (input) => ({ ...input, monthlyKm: input.monthlyKm * 1.2 }),

},

{

driver: 'energyPrice',

label: 'Combustível/energia −20%',

apply: (input) => ({

...input,

energyCostPerKm: input.energyCostPerKm === null ? null : input.energyCostPerKm * 0.8,

}),

},

{

driver: 'energyPrice',

label: 'Combustível/energia +20%',

apply: (input) => ({

...input,

energyCostPerKm: input.energyCostPerKm === null ? null : input.energyCostPerKm * 1.2,

}),

},

{

driver: 'maintenance',

label: 'Manutenção −20%',

apply: (input) => ({

...input,

maintenanceAnnualAtStart:

input.maintenanceAnnualAtStart === null ? null : input.maintenanceAnnualAtStart * 0.8,

}),

},

{

driver: 'maintenance',

label: 'Manutenção +20%',

apply: (input) => ({

...input,

maintenanceAnnualAtStart:

input.maintenanceAnnualAtStart === null ? null : input.maintenanceAnnualAtStart * 1.2,

}),

},

{

driver: 'insurance',

label: 'Seguro −20%',

apply: (input) => ({

...input,

insuranceAnnual: input.insuranceAnnual === null ? null : input.insuranceAnnual * 0.8,

}),

},

{

driver: 'insurance',

label: 'Seguro +20%',

apply: (input) => ({

...input,

insuranceAnnual: input.insuranceAnnual === null ? null : input.insuranceAnnual * 1.2,

}),

},

{

driver: 'depreciation',

label: 'Depreciação −20%',

apply: (input) => ({

...input,

depreciationAnnualPct:

input.depreciationAnnualPct === null ? null : input.depreciationAnnualPct * 0.8,

}),

},

{

driver: 'depreciation',

label: 'Depreciação +20%',

apply: (input) => ({

...input,

depreciationAnnualPct:

input.depreciationAnnualPct === null

? null

: Math.min(input.depreciationAnnualPct * 1.2, 100),

}),

},

]



/** Caso base seguido das variações, cada uma alterando um único driver. */

export function runSensitivity(

base: TcoInput,

horizon: TcoHorizon,

system: AmortizationSystem,

): SensitivityCase[] {

const cases: SensitivityCase[] = [

{

driver: null,

label: 'Caso base',

result: calculateTco(base, horizon, system),

},

]

for (const variation of VARIATIONS) {

cases.push({

driver: variation.driver,

label: variation.label,

result: calculateTco(variation.apply(base), horizon, system),

})

}

return cases

}
