import { useFormContext } from 'react-hook-form'

import { Field } from '../../../components/ui/Field'

import { CUSTOM_MARGIN_LIMITS, SCENARIO_LIST } from '../../../config/scenarios'

import type { SimulationInput } from '../../../schemas/simulation'

import { optionalNumber, requiredNumber } from './numeric'



export function StepObjective() {

const {

register,

watch,

formState: { errors },

} = useFormContext<SimulationInput>()

const scenarioId = watch('objective.scenarioId')

const err = errors.objective



return (

<div className="space-y-6">

<Field

label="Nome da simulação"

required

hint="Ex.: “Primeiro carro” ou “Troca do carro da família”. Evite dados pessoais."

error={err?.title?.message}

>

{(props) => (

<input {...props} className="qc-input" maxLength={80} {...register('objective.title')} />

)}

</Field>



<fieldset>

<legend className="qc-label">Cenário de análise</legend>

<p className="qc-hint mb-3">

O cenário define os pesos iniciais e a margem de segurança das estimativas. Você poderá

ajustar os pesos depois.

</p>

<div className="grid gap-3 sm:grid-cols-2">

{SCENARIO_LIST.map((scenario) => (

<label

key={scenario.id}

className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-300 bg-white p-4 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50"

>

<input

type="radio"

value={scenario.id}

className="mt-1 size-5"

{...register('objective.scenarioId')}

/>

<span>

<span className="block font-semibold">{scenario.label}</span>

<span className="block text-sm text-ink-700">{scenario.shortDescription}</span>

</span>

</label>

))}

</div>

{err?.scenarioId ? <p className="qc-error">{err.scenarioId.message}</p> : null}

</fieldset>



{scenarioId === 'personalizado' ? (

<Field

label="Multiplicador de margem de segurança"

hint={`Entre ${CUSTOM_MARGIN_LIMITS.min} e ${CUSTOM_MARGIN_LIMITS.max}. Valores maiores aumentam as estimativas de seguro, manutenção e energia e reduzem o limite mensal usado (1 = sem margem extra).`}

error={err?.customMarginMultiplier?.message}

>

{(props) => (

<input

{...props}

type="number"

step="0.05"

min={CUSTOM_MARGIN_LIMITS.min}

max={CUSTOM_MARGIN_LIMITS.max}

className="qc-input"

{...register('objective.customMarginMultiplier', requiredNumber)}

/>

)}

</Field>

) : null}



<fieldset>

<legend className="qc-label">Forma de compra</legend>

<div className="flex flex-wrap gap-4">

<label className="flex items-center gap-2">

<input

type="radio"

value="financiado"

className="size-5"

{...register('objective.purchaseMode')}

/>

Financiado

</label>

<label className="flex items-center gap-2">

<input

type="radio"

value="avista"

className="size-5"

{...register('objective.purchaseMode')}

/>

À vista

</label>

</div>

</fieldset>



<div className="grid gap-6 sm:grid-cols-2">

<Field label="Condição do veículo" error={err?.condition?.message}>

{(props) => (

<select {...props} className="qc-input" {...register('objective.condition')}>

<option value="indiferente">Indiferente</option>

<option value="novo">Somente novos (zero km / ano recente)</option>

<option value="usado">Somente usados</option>

</select>

)}

</Field>



<Field

label="Preço máximo do veículo (opcional)"

hint="Deixe em branco para não limitar o preço."

error={err?.maxPurchasePrice?.message}

>

{(props) => (

<input

{...props}

type="number"

inputMode="decimal"

min={0}

step="any"

className="qc-input"

{...register('objective.maxPurchasePrice', optionalNumber)}

/>

)}

</Field>

</div>

</div>

)

}
