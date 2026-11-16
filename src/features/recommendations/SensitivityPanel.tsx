import { useId, useState } from 'react'

import { Alert } from '../../components/ui/Alert'

import { DEFAULT_TCO_HORIZON } from '../../config/tco'

import {

rankSensitivityEffects,

vehicleSensitivity,

type SensitivityContext,

} from '../../domain/decision/sensitivity'

import type { RankedVehicle } from '../../types/decision'

import { formatBRL } from '../../utils/format'



interface SensitivityPanelProps {

items: RankedVehicle[]

context: SensitivityContext

}



export function SensitivityPanel({ items, context }: SensitivityPanelProps) {

const selectId = useId()

const [selectedId, setSelectedId] = useState<string | null>(null)

const selected = items.find((item) => item.vehicle.id === selectedId) ?? items[0]

if (!selected) return null



const cases = vehicleSensitivity(selected, context)

const base = cases[0]?.result.economic.total ?? null

const effects = rankSensitivityEffects(cases)

const top = effects.find((effect) => effect.delta !== null && effect.delta !== 0)

const isCash = context.purchaseMode === 'avista'



return (

<section aria-labelledby="sensitivity-title" className="qc-card p-6">

<h2 id="sensitivity-title" className="text-xl font-bold">

Sensibilidade do custo total

</h2>

<p className="mt-1 max-w-3xl text-sm text-ink-700">

Cada linha muda uma premissa para cima ou para baixo e mantém as demais. Mostra o custo

econômico em {DEFAULT_TCO_HORIZON} meses, com a Tabela Price. Não é uma previsão: mostra

quais premissas mais pesam nesta opção.

</p>

{isCash ? (

<p className="mt-2 text-sm text-ink-700">

Na compra à vista, entrada, taxa e prazo não alteram o custo.

</p>

) : null}



<div className="mt-4 max-w-md">

<label htmlFor={selectId} className="qc-label">

Veículo

</label>

<select

id={selectId}

className="qc-input"

value={selected.vehicle.id}

onChange={(event) => setSelectedId(event.target.value)}

>

{items.map((item) => (

<option key={item.vehicle.id} value={item.vehicle.id}>

{item.vehicle.brand} {item.vehicle.model} {item.vehicle.modelYear}

</option>

))}

</select>

</div>



{base === null ? (

<div className="mt-4">

<Alert tone="warn">

Não é possível calcular a sensibilidade deste veículo: algum componente do custo está

ausente.

</Alert>

</div>

) : (

<>

<div className="mt-4 overflow-x-auto">

<table className="w-full min-w-[30rem] border-collapse text-left text-sm">

<caption className="sr-only">

Custo econômico em {DEFAULT_TCO_HORIZON} meses para cada variação de premissa

</caption>

<thead>

<tr className="border-b border-ink-300">

<th scope="col" className="py-2 pr-3">

Variação

</th>

<th scope="col" className="py-2 pr-3">

Custo em {DEFAULT_TCO_HORIZON} meses

</th>

<th scope="col" className="py-2">

Diferença para o caso base

</th>

</tr>

</thead>

<tbody>

{cases.map((item) => {

const total = item.result.economic.total

const delta = base === null || total === null ? null : total - base

return (

<tr

key={item.label}

className={`border-b border-ink-100 ${item.driver === null ? 'font-semibold' : ''}`}

>

<th scope="row" className="py-2 pr-3 font-medium">

{item.label}

</th>

<td className="py-2 pr-3">{formatBRL(total)}</td>

<td className="py-2">{item.driver === null ? '—' : formatDelta(delta)}</td>

</tr>

)

})}

</tbody>

</table>

</div>

<p className="mt-3 text-sm text-ink-800">

{top

? `Premissa de maior efeito: ${top.label.toLowerCase()} (${formatDelta(top.delta)}).`

: 'Nenhuma variação altera o custo desta opção.'}

</p>

</>

)}

</section>

)

}



function formatDelta(delta: number | null): string {

if (delta === null) return formatBRL(null)

if (delta === 0) return formatBRL(0)

const sign = delta > 0 ? '+' : '−'

return `${sign}${formatBRL(Math.abs(delta))}`

}
