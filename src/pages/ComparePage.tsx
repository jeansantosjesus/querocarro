import { Link, Navigate } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { PageTitle } from '../components/ui/PageTitle'

import { vehicleDetailPath } from '../features/recommendations/paths'

import { useSimulation } from '../features/simulation/SimulationContext'

import type { RankedVehicle } from '../types/decision'

import { formatBRL, formatNumber, formatPercent } from '../utils/format'



interface Row {

label: string

value: (item: RankedVehicle) => number | null

format: (value: number | null) => string

/** min: menor é melhor; max: maior é melhor; null: apenas informativo. */

better: 'min' | 'max' | null

}



const ROWS: Row[] = [

{

label: 'Preço de referência (FIPE)',

value: (i) => i.costs.priceBRL,

format: (v) => formatBRL(v),

better: 'min',

},

{

label: 'Custo mensal total estimado',

value: (i) => i.costs.monthlyTotal,

format: (v) => formatBRL(v),

better: 'min',

},

{

label: 'Parcela estimada',

value: (i) => i.costs.monthlyInstallment,

format: (v) => formatBRL(v),

better: 'min',

},

{

label: 'Energia por km',

value: (i) => i.costs.energyCostPerKm,

format: (v) => formatBRL(v, { cents: true }),

better: 'min',

},

{

label: 'Manutenção anual estimada',

value: (i) => i.costs.maintenanceAnnual,

format: (v) => formatBRL(v),

better: 'min',

},

{

label: 'Depreciação anual estimada',

value: (i) => i.costs.depreciationAnnual,

format: (v) => formatBRL(v),

better: 'min',

},

{

label: 'Comprometimento da renda',

value: (i) => i.financial.commitmentRatio,

format: (v) => formatPercent(v),

better: 'min',

},

{

label: 'Margem mensal restante',

value: (i) => i.financial.remainingMargin,

format: (v) => formatBRL(v),

better: 'max',

},

{

label: 'Aderência ao tipo de uso (0–100)',

value: (i) => i.criteria.usageFit,

format: (v) => formatNumber(v, 0),

better: 'max',

},

{

label: 'Preferências atendidas (0–100)',

value: (i) => i.criteria.preference,

format: (v) => formatNumber(v, 0),

better: 'max',

},

{

label: 'Aderência ao cenário (0–100)',

value: (i) => i.index,

format: (v) => formatNumber(v, 0),

better: 'max',

},

{

label: 'Porta-malas (litros)',

value: (i) => i.vehicle.trunkLiters,

format: (v) => formatNumber(v, 0),

better: 'max',

},

{

label: 'Lugares',

value: (i) => i.vehicle.seats,

format: (v) => formatNumber(v, 0),

better: null,

},

]



function bestValue(values: Array<number | null>, better: 'min' | 'max'): number | null {

const present = values.filter(

(value): value is number => value !== null && Number.isFinite(value),

)

if (present.length < 2) return null

const best = better === 'min' ? Math.min(...present) : Math.max(...present)

// Se todos forem iguais, não há o que destacar.

return present.every((value) => value === best) ? null : best

}



export function ComparePage() {

const { input, result, compareIds, toggleCompare } = useSimulation()

if (!input || !result) return <Navigate to="/simulacao" replace />



const items = compareIds

.map((id) => result.ranking.find((entry) => entry.vehicle.id === id))

.filter((entry): entry is RankedVehicle => entry !== undefined)



if (items.length < 2) {

return (

<div>

<PageTitle title="Comparar opções" />

<Alert tone="info">

Selecione de 2 a 3 opções no resultado para compará-las.{' '}

<Link to="/resultado" className="font-semibold underline">

Voltar ao resultado

</Link>

</Alert>

</div>

)

}



return (

<div className="space-y-6">

<PageTitle

title="Comparar opções"

subtitle="O símbolo ★ marca o melhor valor entre os veículos comparados em cada critério. Isso não indica um vencedor geral: cada critério tem importância diferente para cada pessoa."

actions={

<>

<Link to="/resultado" className="qc-btn-secondary">

Voltar ao resultado

</Link>

<button type="button" className="qc-btn-secondary" onClick={() => window.print()}>

Imprimir / salvar PDF

</button>

</>

}

/>



<div className="qc-card overflow-x-auto p-2 sm:p-4">

<table className="w-full min-w-[36rem] border-collapse text-left text-sm">

<caption className="sr-only">Comparação lado a lado das opções selecionadas</caption>

<thead>

<tr className="border-b border-ink-300">

<th scope="col" className="py-3 pr-3">

Critério

</th>

{items.map((item) => (

<th key={item.vehicle.id} scope="col" className="px-3 py-3 align-top">

<span className="block text-base font-bold">

{item.vehicle.brand} {item.vehicle.model}

</span>

<span className="block font-normal text-ink-700">

Ano {item.vehicle.modelYear}

</span>

<span className="no-print mt-1 flex flex-wrap gap-3 font-normal">

<Link

to={vehicleDetailPath(item.vehicle.id)}

className="font-semibold text-brand-800 underline"

>

Detalhes

</Link>

<button

type="button"

className="font-semibold text-bad-fg underline"

onClick={() => toggleCompare(item.vehicle.id)}

>

Remover

</button>

</span>

</th>

))}

</tr>

</thead>

<tbody>

{ROWS.map((row) => {

const values = items.map((item) => row.value(item))

const best = row.better ? bestValue(values, row.better) : null

return (

<tr key={row.label} className="border-b border-ink-100">

<th scope="row" className="py-3 pr-3 font-medium">

{row.label}

</th>

{values.map((value, index) => {

const isBest = best !== null && value === best

return (

<td

key={items[index]?.vehicle.id}

className={`px-3 py-3 tabular-nums ${isBest ? 'bg-good-bg font-semibold text-good-fg' : ''}`}

>

{isBest ? (

<>

<span aria-hidden="true">★ </span>

<span className="sr-only">Melhor valor entre os comparados: </span>

</>

) : null}

{row.format(value)}

</td>

)

})}

</tr>

)

})}

</tbody>

</table>

</div>

<p className="text-sm text-ink-600">

Valores estimados a partir das premissas da simulação. “Informação não disponível” indica

dado ausente (nunca zero).

</p>

</div>

)

}
