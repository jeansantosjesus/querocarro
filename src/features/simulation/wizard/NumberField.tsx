import type { ReactNode } from 'react'

import { get, useFormContext, type FieldPath } from 'react-hook-form'

import { Field } from '../../../components/ui/Field'

import type { SimulationInput } from '../../../schemas/simulation'

import { optionalNumber, overrideNumber, requiredNumber } from './numeric'



interface NumberFieldProps {

name: FieldPath<SimulationInput>

label: string

hint?: ReactNode

/** Vazio vira `null` (campo opcional do modelo). */

optional?: boolean

/** Vazio vira ausente (ajuste opcional de premissa). */

override?: boolean

step?: string

min?: number

max?: number

placeholder?: string

}



/** Campo numérico ligado ao formulário do assistente (aceita vírgula decimal). */

export function NumberField({

name,

label,

hint,

optional,

override,

step = 'any',

min,

max,

placeholder,

}: NumberFieldProps) {

const {

register,

formState: { errors },

} = useFormContext<SimulationInput>()

const message = (get(errors, name) as { message?: string } | undefined)?.message

const options = override ? overrideNumber : optional ? optionalNumber : requiredNumber



return (

<Field label={label} hint={hint} error={message} required={!optional && !override}>

{(props) => (

<input

{...props}

type="number"

inputMode="decimal"

step={step}

min={min}

max={max}

placeholder={placeholder}

className="qc-input"

{...register(name, options)}

/>

)}

</Field>

)

}
