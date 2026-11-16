import { useEffect, useState } from 'react'

import { Link, useNavigate, useParams } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { PageTitle } from '../components/ui/PageTitle'

import { Spinner } from '../components/ui/Spinner'

import { CRITERIA } from '../config/criteria'

import { getScenarioDefinition } from '../config/scenarios'

import { useRepositories } from '../features/history/RepositoriesContext'

import { useSimulation } from '../features/simulation/SimulationContext'

import type { SavedPremises, SavedSimulation } from '../types/history'

import type { InsuranceCategory } from '../types/vehicle'

import { downloadJson } from '../utils/download'

import { UUID_PATTERN } from '../utils/ids'

import { formatBRL, formatDateTime, formatNumber, formatReferenceMonth } from '../utils/format'



export function HistoryDetailPage() {

const { id = '' } = useParams()

const repositories = useRepositories()

const { loadInput } = useSimulation()

const navigate = useNavigate()

const [saved, setSaved] = useState<SavedSimulation | null | undefined>(undefined)

const [error, setError] = useState<string | null>(null)



const invalid = !repositories || !UUID_PATTERN.test(id)



useEffect(() => {

let active = true

if (!repositories || invalid) return

repositories.simulations

.get(id)

.then((value) => {

if (active) setSaved(value)

})

.catch(() => {

if (active) {

setError('Não foi possível carregar esta simulação.')

setSaved(null)

}

})

return () => {

active = false

}

}, [repositories, id, invalid])



if (!invalid && saved === undefined) return <Spinner label="Carregando simulação…" />



if (invalid || !saved) {

return (

<div>

<PageTitle title="Simulação não encontrada" />

<Alert tone={error ? 'bad' : 'warn'}>

{error ?? 'Esta simulação não existe ou não está disponível para você.'}{' '}

<Link to="/historico" className="font-semibold underline">

Voltar ao histórico

</Link>

</Alert>

</div>

)

}



const scenario = getScenarioDefinition(saved.scenarioId)

const group = saved.results

.filter((result) => result.inRecommendedGroup)

.map((result) => result.payload)

const all = saved.results.map((result) => result.payload)

const current = saved



function duplicate() {

loadInput({

...current.inputs,

objective: { ...current.inputs.objective, title: `${current.title} (cópia)`.slice(0, 80) },

})

navigate('/simulacao')

}



function recalculate() {

loadInput(current.inputs)

navigate('/simulacao', { state: { step: 'revisao' } })

}



async function remove() {

if (!repositories) return

if (!window.confirm(`Excluir a simulação “${current.title}”? Esta ação não pode ser desfeita.`))

return

try {

await repositories.simulations.remove(current.id)

navigate('/historico', { replace: true })

} catch {

setError('Não foi possível excluir esta simulação.')

}

}



return (

<div className="space-y-6">

<PageTitle

title={saved.title}

subtitle={`Salva em ${formatDateTime(saved.createdAt)} · cenário ${scenario.label} · FIPE ${formatReferenceMonth(saved.fipeReferenceMonth, saved.fipeReferenceMonthLabel)}`}

actions={

<>

<button type="button" className="qc-btn-secondary" onClick​={duplicate}>

Duplicar e editar

</button>

<button type="button" className="qc-btn-secondary" onClick​={recalculate}>

Recalcular com preços atuais

</button>

<button

type="button"

className="qc-btn-secondary"

onClick​={() => downloadJson(`simulacao-${current.title}`, current)}

>

Exportar JSON

</button>

<button type="button" className="qc-btn-secondary" onClick​={() => window.print()}>

Imprimir / salvar PDF

</button>

<button type="button" className="qc-btn-danger" onClick​={() => void remove()}>

Excluir

</button>

</>

}

/>



{error ? <Alert tone="bad">{error}</Alert> : null}



<Alert tone="info" title="Resultado salvo, como você o viu">

Os valores abaixo são um registro da data da simulação (modelo{' '}

{saved.scenarioSnapshot.modelVersion}, catálogo {saved.catalogVersion}). Para valores

atualizados, use “Recalcular com preços atuais”.

</Alert>



<section aria-labelledby="hd-group" className="qc-card p-6">

<h2 id="hd-group" className="text-xl font-bold">

Grupo de opções compatíveis ({group.length})

</h2>

<div className="mt-4 overflow-x-auto">

<ResultsTable items={group} />

</div>

</section>



<section aria-labelledby="hd-weights" className="qc-card p-6">

<h2 id="hd-weights" className="text-xl font-bold">

Pesos utilizados

</h2>

<ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">

{CRITERIA.map((criterion) => (

<li key={criterion.id} className="flex justify-between border-b border-ink-100 py-1">

<span>{criterion.label}</span>

<strong>{saved.weights[criterion.id]}%</strong>

</li>

))}

</ul>

</section>



<section aria-labelledby="hd-premises" className="qc-card p-6">

<h2 id="hd-premises" className="text-xl font-bold">

Premissas usadas no cálculo

</h2>

<PremisesSection premises={current.scenarioSnapshot.premises} />

</section>



<details className="qc-card p-5">

<summary className="cursor-pointer text-lg font-bold">

Todas as opções elegíveis ({all.length})

</summary>

<div className="mt-4 overflow-x-auto">

<ResultsTable items={all} />

</div>

</details>



<details className="qc-card p-5">

<summary className="cursor-pointer text-lg font-bold">Parâmetros informados</summary>

<dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">

<Item label="Renda líquida" value={formatBRL(saved.inputs.finance.netIncome)} />

<Item

label="Gasto máximo desejado"

value={formatBRL(saved.inputs.finance.maxMonthlyVehicleSpend)}

/>

<Item

label="Entrada / valor disponível"

value={formatBRL(saved.inputs.finance.downPayment)}

/>

<Item

label="Forma de compra"

value={saved.inputs.objective.purchaseMode === 'avista' ? 'À vista' : 'Financiado'}

/>

<Item label="Tipo de uso" value={saved.inputs.usage.type} />

<Item label="Passageiros" value={String(saved.inputs.usage.passengers)} />

</dl>

</details>

</div>

)

}



const INSURANCE_LABELS: ReadonlyArray<[InsuranceCategory, string]> = [

['baixo', 'Seguro, categoria baixo'],

['medio', 'Seguro, categoria médio'],

['alto', 'Seguro, categoria alto'],

['muito_alto', 'Seguro, categoria muito alto'],

]



function PremisesSection({ premises }: { premises: SavedPremises | undefined }) {

if (!premises) {

return (

<div className="mt-3">

<Alert tone="warn">

Esta simulação foi salva antes do registro de premissas. Os valores de custo acima estão

registrados, mas não as premissas padrão usadas para chegar neles.

</Alert>

</div>

)

}

const a = premises.assumptions

return (

<>

<p className="mt-2 text-sm text-ink-700">

Estimativas configuráveis do QC, não valores oficiais. Os ajustes feitos por você aparecem

aqui como os demais valores.

</p>
<dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">

<Item label="Ano de referência dos valores" value={String(premises.referenceYear)} />

<Item label="Mês das premissas de custo" value={premises.assumptionsReferenceMonth} />

<Item

label="Gasolina (R$ por litro)"

value={formatBRL(a.gasolinePricePerLiter, { cents: true })}

/>

<Item

label="Etanol (R$ por litro)"

value={formatBRL(a.ethanolPricePerLiter, { cents: true })}

/>

<Item

label="Diesel (R$ por litro)"

value={formatBRL(a.dieselPricePerLiter, { cents: true })}

/>

<Item

label="Eletricidade (R$ por kWh)"

value={formatBRL(a.electricityPricePerKwh, { cents: true })}

/>

<Item

label="Etanol em relação à gasolina"

value={formatNumber(a.ethanolConsumptionFactor, 2)}

/>

<Item label="Alíquota de IPVA de referência" value={`${formatNumber(a.ipvaRatePct, 1)}%`} />

<Item label="Licenciamento anual" value={formatBRL(a.licensingAnnualBRL)} />

{INSURANCE_LABELS.map(([category, label]) => (

<Item

key={category}

label={label}

value={`${formatNumber(a.insuranceRateByCategoryPct[category], 1)}% do preço`}

/>

))}

<Item

label="Reserva para manutenção corretiva"

value={`${formatNumber(a.correctiveMaintenanceReservePct, 0)}% da preventiva`}

/>

<Item

label="Anos sem acréscimo de manutenção"

value={formatNumber(a.maintenanceAgeFreeYears, 0)}

/>

<Item

label="Acréscimo de manutenção por ano"

value={`${formatNumber(a.maintenanceAgeIncreasePctPerYear, 1)}%`}

/>

</dl>

</>

)

}



function Item({ label, value }: { label: string; value: string }) {

return (

<div className="flex justify-between border-b border-ink-100 py-1">

<dt className="text-ink-700">{label}</dt>

<dd className="font-semibold">{value}</dd>

</div>

)

}



function ResultsTable({ items }: { items: SavedSimulation['results'][number]['payload'][] }) {

const sorted = [...items].sort((a, b) =>

`${a.vehicle.brand} ${a.vehicle.model}`.localeCompare(

`${b.vehicle.brand} ${b.vehicle.model}`,

'pt-BR',

),

)

return (

<table className="w-full min-w-[34rem] border-collapse text-left text-sm">

<caption className="sr-only">Opções salvas, em ordem alfabética</caption>

<thead>

<tr className="border-b border-ink-300">

<th scope="col" className="py-2 pr-3">

Veículo

</th>

<th scope="col" className="py-2 pr-3">

Preço FIPE

</th>

<th scope="col" className="py-2 pr-3">

Custo mensal

</th>

<th scope="col" className="py-2">

Aderência

</th>

</tr>

</thead>

<tbody>

{sorted.map((item) => (

<tr key={item.vehicle.id} className="border-b border-ink-100">

<th scope="row" className="py-2 pr-3 font-medium">

{item.vehicle.brand} {item.vehicle.model} {item.vehicle.modelYear}

</th>

<td className="py-2 pr-3">{formatBRL(item.costs.priceBRL)}</td>

<td className="py-2 pr-3">{formatBRL(item.costs.monthlyTotal)}</td>

<td className="py-2">{formatNumber(item.index, 0)} / 100</td>

</tr>

))}

</tbody>

</table>

)

}
