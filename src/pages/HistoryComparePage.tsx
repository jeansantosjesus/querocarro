import { useEffect, useState } from 'react'

import { Link, useSearchParams } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { PageTitle } from '../components/ui/PageTitle'

import { Spinner } from '../components/ui/Spinner'

import { CRITERIA } from '../config/criteria'

import { getScenarioDefinition } from '../config/scenarios'

import { useRepositories } from '../features/history/RepositoriesContext'

import type { SavedSimulation } from '../types/history'

import { formatBRL, formatDateTime, formatNumber, formatReferenceMonth } from '../utils/format'

import { UUID_PATTERN } from '../utils/ids'



/** Compara duas simulações salvas: parâmetros, pesos e grupos de opções lado a lado. */

export function HistoryComparePage() {

const [params] = useSearchParams()

const repositories = useRepositories()

const a = params.get('a') ?? ''

const b = params.get('b') ?? ''

const [pair, setPair] = useState<[SavedSimulation, SavedSimulation] | null | undefined>(undefined)



const invalid = !repositories || !UUID_PATTERN.test(a) || !UUID_PATTERN.test(b) || a === b



useEffect(() => {

let active = true

if (!repositories || invalid) return

Promise.all([repositories.simulations.get(a), repositories.simulations.get(b)])

.then(([first, second]) => {

if (active) setPair(first && second ? [first, second] : null)

})

.catch(() => {

if (active) setPair(null)

})

return () => {

active = false

}

}, [repositories, a, b, invalid])



if (!invalid && pair === undefined) return <Spinner label="Carregando simulações…" />

if (invalid || !pair) {

return (

<div>

<PageTitle title="Comparar simulações" />

<Alert tone="warn">

Selecione duas simulações válidas no histórico.{' '}

<Link to="/historico" className="font-semibold underline">

Voltar ao histórico

</Link>

</Alert>

</div>

)

}



const [first, second] = pair

const groupOf = (sim: SavedSimulation) =>

sim.results.filter((result) => result.inRecommendedGroup)

const firstGroup = groupOf(first)

const secondGroup = groupOf(second)

const names = new Map<string, string>()

for (const result of [...firstGroup, ...secondGroup]) {

names.set(

`${result.vehicleFipeCode}:${result.vehicleYearId}`,

`${result.payload.vehicle.brand} ${result.payload.vehicle.model} ${result.payload.vehicle.modelYear}`,

)

}

const ids = [...names.keys()].sort((x, y) =>

(names.get(x) ?? '').localeCompare(names.get(y) ?? '', 'pt-BR'),

)

const findIn = (sim: SavedSimulation, id: string) =>

sim.results.find(

(result) =>

`${result.vehicleFipeCode}:${result.vehicleYearId}` === id && result.inRecommendedGroup,

)



return (

<div className="space-y-6">

<PageTitle

title="Comparar simulações"

subtitle="Compare como parâmetros diferentes mudam o grupo de opções compatíveis. As colunas são apenas registros: nenhuma simulação é “a certa”."

actions={

<Link to="/historico" className="qc-btn-secondary">

Voltar ao histórico

</Link>

}

/>



<div className="qc-card overflow-x-auto p-4">

<table className="w-full min-w-[34rem] border-collapse text-left text-sm">

<caption className="sr-only">Parâmetros e pesos das duas simulações</caption>

<thead>

<tr className="border-b border-ink-300">

<th scope="col" className="py-2 pr-3">

Item

</th>

{[first, second].map((sim) => (

<th key={sim.id} scope="col" className="px-3 py-2">

{sim.title}

<span className="block font-normal text-ink-700">

{formatDateTime(sim.createdAt)}

</span>

</th>

))}

</tr>

</thead>

<tbody>

<Row

label="Cenário"

values={[

getScenarioDefinition(first.scenarioId).label,

getScenarioDefinition(second.scenarioId).label,

]}

/>

<Row

label="Referência FIPE"

values={[

formatReferenceMonth(first.fipeReferenceMonth, first.fipeReferenceMonthLabel),

formatReferenceMonth(second.fipeReferenceMonth, second.fipeReferenceMonthLabel),

]}

/>

<Row

label="Gasto mensal máximo"

values={[

formatBRL(first.inputs.finance.maxMonthlyVehicleSpend),

formatBRL(second.inputs.finance.maxMonthlyVehicleSpend),

]}

/>

{CRITERIA.map((criterion) => (

<Row

key={criterion.id}

label={`Peso: ${criterion.label}`}

values={[`${first.weights[criterion.id]}%`, `${second.weights[criterion.id]}%`]}

/>

))}

</tbody>

</table>

</div>



<section aria-labelledby="cmp-groups" className="qc-card overflow-x-auto p-4">

<h2 id="cmp-groups" className="mb-3 text-xl font-bold">

Opções dos grupos (ordem alfabética)

</h2>

<table className="w-full min-w-[34rem] border-collapse text-left text-sm">

<caption className="sr-only">

Aderência de cada veículo do grupo em cada simulação

</caption>

<thead>

<tr className="border-b border-ink-300">

<th scope="col" className="py-2 pr-3">

Veículo

</th>

<th scope="col" className="px-3 py-2">

{first.title}

</th>

<th scope="col" className="px-3 py-2">

{second.title}

</th>

</tr>

</thead>

<tbody>

{ids.map((id) => {

const inFirst = findIn(first, id)

const inSecond = findIn(second, id)

return (

<tr key={id} className="border-b border-ink-100">

<th scope="row" className="py-2 pr-3 font-medium">

{names.get(id)}

{inFirst && inSecond ? (

<span className="block text-xs font-normal text-ink-600">

Aparece nas duas simulações

</span>

) : null}

</th>

<td className="px-3 py-2">

{inFirst

? `${formatNumber(inFirst.compatibilityIndex, 0)} / 100`

: 'Fora do grupo'}

</td>

<td className="px-3 py-2">

{inSecond

? `${formatNumber(inSecond.compatibilityIndex, 0)} / 100`

: 'Fora do grupo'}

</td>

</tr>

)

})}

</tbody>

</table>

</section>

</div>

)

}



function Row({ label, values }: { label: string; values: [string, string] }) {

return (

<tr className="border-b border-ink-100">

<th scope="row" className="py-2 pr-3 font-medium">

{label}

</th>

<td className="px-3 py-2">{values[0]}</td>

<td className="px-3 py-2">{values[1]}</td>

</tr>

)

}
