import { useId } from 'react'

import { CRITERIA } from '../../config/criteria'

import { WEIGHT_LIMITS } from '../../config/limits'

import { rebalanceWeights, sumWeights, weightDeltas } from '../../domain/decision/weights'

import { CRITERION_IDS, type CriterionId, type Weights } from '../../types/decision'



interface WeightsEditorProps {

weights: Weights

/** Pesos de referência (cenário + prioridades) para mostrar quais critérios ganharam ou perderam importância. */

reference: Weights

onChange: (weights: Weights) => void

onReset?: () => void

compact?: boolean

}



function describeDelta(delta: number): string {

if (delta === 0) return 'sem alteração em relação ao padrão do cenário'

const points = Math.abs(delta)

return `${delta > 0 ? 'ganhou' : 'perdeu'} ${points} ${points === 1 ? 'ponto' : 'pontos'} de importância`

}



/**

* Controles de peso. A soma permanece SEMPRE em 100%: ao alterar um critério, a diferença

* é redistribuída entre os demais (proporcionalmente), respeitando o máximo por critério.

*/

export function WeightsEditor({

weights,

reference,

onChange,

onReset,

compact,

}: WeightsEditorProps) {

const baseId = useId()

const deltas = weightDeltas(weights, reference)

const gained = CRITERION_IDS.filter((id) => deltas[id] > 0)

const lost = CRITERION_IDS.filter((id) => deltas[id] < 0)

const labelOf = (id: CriterionId) =>

CRITERIA.find((criterion) => criterion.id === id)?.label ?? id



return (

<div>

<ul className="space-y-4">

{CRITERIA.map((criterion) => {

const id = `${baseId}-${criterion.id}`

const value = weights[criterion.id]

const delta = deltas[criterion.id]

return (

<li key={criterion.id}>

<div className="flex items-baseline justify-between gap-3">

<label htmlFor={id} className="font-semibold text-ink-900">

{criterion.label}

</label>

<output htmlFor={id} className="text-lg font-bold tabular-nums text-brand-900">

{value}%

</output>

</div>

<input

id={id}

type="range"

min={WEIGHT_LIMITS.minPerCriterion}

max={WEIGHT_LIMITS.maxPerCriterion}

step={1}

value={value}

aria-valuetext={`${value} por cento`}

aria-describedby={`${id}-desc`}

onChange​={(event) =>

onChange(rebalanceWeights(weights, criterion.id, Number(event.target.value)))

}

className="mt-1 h-6 w-full accent-brand-700"

/>

<p id={`${id}-desc`} className="text-sm text-ink-600">

{criterion.direction === 'cost'

? 'Critério de custo (menor é melhor). '

: 'Critério de benefício (maior é melhor). '}

{compact ? '' : criterion.description}{' '}

<span className={delta === 0 ? '' : 'font-medium text-ink-800'}>

{delta === 0 ? '' : `(${describeDelta(delta)})`}

</span>

</p>

</li>

)

})}

</ul>



<div className="mt-5 rounded-xl bg-ink-100 p-4 text-sm" aria-live="polite">

<p className="font-semibold">

Soma dos pesos: {sumWeights(weights)}% (máximo de {WEIGHT_LIMITS.maxPerCriterion}% por

critério)

</p>

{gained.length > 0 || lost.length > 0 ? (

<p className="mt-1 text-ink-700">

{gained.length > 0 ? `Ganharam importância: ${gained.map(labelOf).join(', ')}. ` : ''}

{lost.length > 0 ? `Perderam importância: ${lost.map(labelOf).join(', ')}.` : ''}

</p>

) : (

<p className="mt-1 text-ink-700">Os pesos estão iguais ao padrão do cenário escolhido.</p>

)}

</div>



{onReset ? (

<button type="button" className="qc-btn-secondary mt-4" onClick​={onReset}>

Restaurar pesos do cenário

</button>

) : null}

</div>

)

}
