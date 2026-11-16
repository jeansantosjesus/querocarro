import { useFormContext } from 'react-hook-form'

import { getScenarioDefinition } from '../../../config/scenarios'

import { initialWeights } from '../../../domain/decision/scenarios'

import type { SimulationInput } from '../../../schemas/simulation'

import type { Weights } from '../../../types/decision'

import { WeightsEditor } from '../../recommendations/WeightsEditor'

import { useSimulation } from '../SimulationContext'



export function StepWeights() {

const { watch, setValue } = useFormContext<SimulationInput>()

const { setWeightsCustomized } = useSimulation()

const weights = watch('weights') as Weights

const scenarioId = watch('objective.scenarioId')

const priorities = watch('preferences.priorities')

const reference = initialWeights(scenarioId, priorities)

const scenario = getScenarioDefinition(scenarioId)



return (

<div className="space-y-5">

<p className="text-ink-700">

Os pesos mostram o quanto cada critério influencia o{' '}

<strong>índice de compatibilidade</strong>. Os valores iniciais vêm do cenário{' '}

<strong>{scenario.label}</strong> e das suas prioridades. A soma é sempre 100%.

</p>

<WeightsEditor

weights={weights}

reference={reference}

onChange​={(next) => {

setValue('weights', next, { shouldDirty: true, shouldValidate: true })

setWeightsCustomized(true)

}}

onReset​={() => {

setValue('weights', reference, { shouldDirty: true, shouldValidate: true })

setWeightsCustomized(false)

}}

/>

</div>

)

}
