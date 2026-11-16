import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { PageTitle } from '../components/ui/PageTitle'

import { resolveAssumptions } from '../config/assumptions'

import { CRITERIA } from '../config/criteria'

import { RECOMMENDATION_LIMITS } from '../config/limits'

import { getScenarioDefinition } from '../config/scenarios'

import { referenceYearOf } from '../domain/decision/premises'

import { initialWeights } from '../domain/decision/scenarios'

import { SORT_OPTIONS, sortRecommendations, type SortKey } from '../domain/decision/sort'

import { SaveSimulationPanel } from '../features/history/SaveSimulationPanel'

import { CalculationPanel } from '../features/recommendations/CalculationPanel'

import { vehicleDetailPath } from '../features/recommendations/paths'

import { SensitivityPanel } from '../features/recommendations/SensitivityPanel'

import { VehicleCard } from '../features/recommendations/VehicleCard'

import { WeightsEditor } from '../features/recommendations/WeightsEditor'

import { useSimulation } from '../features/simulation/SimulationContext'

import { useCatalog } from '../features/vehicles/CatalogContext'

import { VehiclePhotosToggle } from '../features/vehicles/images/VehiclePhoto'

import { DISCLAIMERS } from '../config/copy'

import type { ExclusionStage } from '../types/decision'

import { formatBRL, formatNumber, formatReferenceMonth } from '../utils/format'



const STAGE_LABEL: Record<ExclusionStage, string> = {

qualidade: 'Qualidade dos dados',

dados: 'Dados insuficientes',

filtro: 'Filtros e preferências obrigatórias',

viabilidade: 'Viabilidade financeira do cenário',

}



export function ResultPage() {

const {

input,

result,

sortKey,

groupSize,

compareIds,

savedId,

setSortKey,

setGroupSize,

toggleCompare,

clearCompare,

updateWeights,

applySuggestion,

setWeightsCustomized,

markSaved,

} = useSimulation()

const { catalog, load, status, source } = useCatalog()

const navigate = useNavigate()



if (!input || !result || !catalog) {

return <Navigate to="/simulacao" replace />

}



const scenario = getScenarioDefinition(input.objective.scenarioId)

const sortedGroup = sortRecommendations(result.group, sortKey)

const groupIds = new Set(result.group.map((item) => item.vehicle.id))

const others = sortRecommendations(

result.ranking.filter((item) => !groupIds.has(item.vehicle.id)),

sortKey,

)

const referenceWeights = initialWeights(input.objective.scenarioId, input.preferences.priorities)

const compareDisabled = compareIds.length >= RECOMMENDATION_LIMITS.maxCompare

const excludedByStage = (Object.keys(STAGE_LABEL) as ExclusionStage[])

.map((stage) => ({ stage, items: result.excluded.filter((record) => record.stage === stage) }))

.filter((entry) => entry.items.length > 0)

const liveRequested = input.useLiveFipe



return (

<div className="space-y-8">

<PageTitle

title={input.objective.title}

subtitle={

<>

Opções compatíveis com os parâmetros desta simulação · cenário {scenario.label} · preços

FIPE de {formatReferenceMonth(catalog.referenceMonth, catalog.referenceMonthLabel)}

</>

}

actions={

<>

<Link to="/simulacao" className="qc-btn-secondary">

Editar parâmetros

</Link>

<button type="button" className="qc-btn-secondary" onClick={() => window.print()}>

Imprimir / salvar PDF

</button>

</>

}

/>



<div className="space-y-3">

{liveRequested && catalog.liveStatus !== 'online' ? (

<Alert tone="warn" title="Parte dos preços usa a referência FIPE salva">

Não foi possível consultar todos os preços online agora ({catalog.onlineCount} online,{' '}

{catalog.snapshotCount} da referência salva).

{catalog.retryable ? (

<>

{' '}

<button

type="button"

className="font-semibold underline"

onClick={() => void load('live', { force: true })}

disabled={status === 'loading'}

>

{status === 'loading' ? 'Consultando…' : 'Tentar novamente'}

</button>

</>

) : null}

</Alert>

) : null}

{!liveRequested || source === 'saved' ? (

<Alert tone="info">

Os preços vêm da referência FIPE salva em{' '}

{formatReferenceMonth(catalog.referenceMonth, catalog.referenceMonthLabel)}.

</Alert>

) : null}

<Alert tone="info" title="Dados complementares são estimativas">

{DISCLAIMERS.demonstrativeData}

</Alert>

</div>



<p className="text-sm text-ink-700">{result.budgetPremise}</p>

{result.budgetAlerts.map((alert) => (

<Alert key={alert} tone="warn">

{alert}

</Alert>

))}



<section aria-labelledby="how-result-title" className="qc-card p-5 text-sm">

<h2 id="how-result-title" className="text-lg font-bold">

Como ler este resultado

</h2>

<p className="mt-2 text-ink-800">

O grupo reúne opções compatíveis, sem apontar um vencedor. Cada opção é comparada pelos

critérios do cenário {scenario.label}:{' '}

{CRITERIA.map(

(criterion) => `${criterion.label.toLowerCase()} ${scenario.weights[criterion.id]}%`,

).join(', ')}

.

</p>

<p className="mt-2 text-ink-800">

Os principais custos são a parcela, o IPVA, o seguro, a energia e a manutenção. O custo

total no horizonte de 36 meses é o critério de custo.

</p>

<Link

to="/ajuda/metodologia"

className="mt-3 inline-block font-semibold text-brand-800 underline"

>

Como chegamos a este resultado

</Link>

</section>



{result.noOptions ? (

<section aria-labelledby="no-options" className="qc-card p-6">

<h2 id="no-options" className="text-xl font-bold">

Nenhuma opção atingiu os parâmetros mínimos deste cenário.

</h2>

<p className="mt-2 text-ink-700">

Isso depende dos valores informados e das margens do cenário {scenario.label}; não é uma

avaliação sobre você. Veja ajustes que fariam diferença e aplique o que fizer sentido.

</p>

{result.suggestions.length > 0 ? (

<ul className="mt-4 space-y-3">

{result.suggestions.map((suggestion) => (

<li

key={suggestion.id}

className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-100 p-4"

>

<span>

{suggestion.label}

<span className="block text-sm text-ink-700">

Resultaria em {suggestion.wouldYield}{' '}

{suggestion.wouldYield === 1 ? 'opção' : 'opções'}.

</span>

</span>

<button

type="button"

className="qc-btn-primary"

onClick={() => applySuggestion(suggestion.id)}

>

Aplicar este ajuste

</button>

</li>

))}

</ul>

) : (

<p className="mt-4 text-ink-700">

Nenhum ajuste isolado produziu opções. Revise os parâmetros ou escolha outro cenário.

</p>

)}
<p className="mt-4">

<button

type="button"

className="qc-btn-secondary"

onClick={() => navigate('/simulacao')}

>

Revisar parâmetros

</button>

</p>

</section>

) : (

<section aria-labelledby="group-title">

<div className="mb-4 flex flex-wrap items-end justify-between gap-4">

<div>

<h2 id="group-title" className="text-xl font-bold">

Grupo de opções compatíveis ({result.group.length})

</h2>

<p className="max-w-3xl text-sm text-ink-700">

Estas opções têm o mesmo destaque. A ordem inicial é alfabética: não existe

“vencedor”, e a escolha depende do que importa para você. Avaliadas{' '}

{result.evaluatedCount}; elegíveis {result.eligibleCount}.

</p>

</div>

<div className="no-print flex flex-wrap gap-4">

<div>

<label htmlFor="sort" className="qc-label">

Ordenar por

</label>

<select

id="sort"

className="qc-input"

value={sortKey}

onChange={(event) => setSortKey(event.target.value as SortKey)}

>

{SORT_OPTIONS.map((option) => (

<option key={option.key} value={option.key}>

{option.label}

</option>

))}

</select>

</div>

<div>

<label htmlFor="group-size" className="qc-label">

Tamanho do grupo

</label>

<select

id="group-size"

className="qc-input"

value={groupSize}

onChange={(event) => setGroupSize(Number(event.target.value))}

>

{[3, 4, 5].map((size) => (

<option key={size} value={size}>

{size} opções

</option>

))}

</select>

</div>

</div>

</div>



{result.group.length < RECOMMENDATION_LIMITS.minGroupSize ? (

<div className="mb-4">

<Alert tone="warn">

Menos de {RECOMMENDATION_LIMITS.minGroupSize} opções atingiram os parâmetros desta

simulação.

</Alert>

</div>

) : null}



<div className="mb-4">

<VehiclePhotosToggle />

</div>



<p className="sr-only" role="status">

Lista ordenada por {SORT_OPTIONS.find((option) => option.key === sortKey)?.label}.

</p>



<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

{sortedGroup.map((item) => (

<VehicleCard

key={item.vehicle.id}

item={item}

selected={compareIds.includes(item.vehicle.id)}

compareDisabled={compareDisabled}

onToggleCompare={toggleCompare}

/>

))}

</div>



<div className="no-print mt-5 flex flex-wrap items-center gap-3">

<Link

to="/comparar"

aria-disabled={compareIds.length < 2}

onClick={(event) => {

if (compareIds.length < 2) event.preventDefault()

}}

className={`qc-btn-primary ${compareIds.length < 2 ? 'pointer-events-none opacity-60' : ''}`}

>

Comparar selecionados ({compareIds.length}/{RECOMMENDATION_LIMITS.maxCompare})

</Link>

{compareIds.length > 0 ? (

<button type="button" className="qc-btn-ghost" onClick={clearCompare}>

Limpar seleção

</button>

) : (

<span className="text-sm text-ink-600">

Selecione 2 ou 3 opções para comparar lado a lado.

</span>

)}

</div>

</section>

)}



<section aria-labelledby="weights-title" className="qc-card no-print p-6">

<h2 id="weights-title" className="text-xl font-bold">

Ajustar a importância dos critérios

</h2>

<p className="mb-5 mt-1 max-w-3xl text-sm text-ink-700">

Mova os controles e o resultado é recalculado na hora. Aumentar um critério reduz

proporcionalmente os outros, mantendo a soma em 100%.

</p>

<WeightsEditor

weights={input.weights}

reference={referenceWeights}

compact

onChange={updateWeights}

onReset={() => {

updateWeights(referenceWeights)

setWeightsCustomized(false)

}}

/>

</section>



<CalculationPanel result={result} />



{result.group.length > 0 ? (

<SensitivityPanel

items={sortedGroup}

context={{

purchaseMode: input.objective.purchaseMode,

finance: input.finance,

usage: input.usage,

assumptions: resolveAssumptions(input.assumptionOverrides),

referenceYear: referenceYearOf(catalog.referenceMonth),

}}

/>

) : null}



{others.length > 0 ? (

<details className="qc-card p-5">

<summary className="cursor-pointer text-lg font-bold">

Outras opções elegíveis ({others.length})

</summary>

<div className="mt-4 overflow-x-auto">

<table className="w-full min-w-[34rem] border-collapse text-left text-sm">

<caption className="sr-only">Opções elegíveis fora do grupo exibido</caption>

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

<th scope="col" className="py-2 pr-3">

Aderência

</th>

<th scope="col" className="py-2">

<span className="sr-only">Ações</span>

</th>

</tr>

</thead>

<tbody>

{others.map((item) => (

<tr key={item.vehicle.id} className="border-b border-ink-100">

<th scope="row" className="py-2 pr-3 font-medium">

{item.vehicle.brand} {item.vehicle.model} {item.vehicle.modelYear}

</th>

<td className="py-2 pr-3">{formatBRL(item.costs.priceBRL)}</td>

<td className="py-2 pr-3">{formatBRL(item.costs.monthlyTotal)}</td>

<td className="py-2 pr-3">{formatNumber(item.index, 0)} / 100</td>

<td className="py-2">

<Link

to={vehicleDetailPath(item.vehicle.id)}

className="font-semibold text-brand-800 underline"

>

Ver detalhes

<span className="sr-only">

{' '}

de {item.vehicle.brand} {item.vehicle.model}

</span>

</Link>

</td>

</tr>

))}

</tbody>

</table>

</div>

</details>

) : null}
{excludedByStage.length > 0 ? (

<details className="qc-card p-5">

<summary className="cursor-pointer text-lg font-bold">

Por que {result.excluded.length}{' '}

{result.excluded.length === 1 ? 'veículo não aparece' : 'veículos não aparecem'}?

</summary>

<div className="mt-4 space-y-4 text-sm">

{excludedByStage.map(({ stage, items }) => (

<div key={stage}>

<h3 className="font-semibold">

{STAGE_LABEL[stage]} ({items.length})

</h3>

<ul className="mt-1 list-disc space-y-1 pl-5 text-ink-700">

{items.slice(0, 8).map((record) => (

<li key={`${record.vehicleId}-${record.code}`}>

{record.label}: {record.message}

{record.gap != null

? ` Exigido ${formatBRL(record.required ?? 0)}, disponível ${formatBRL(record.available ?? 0)}, diferença ${formatBRL(record.gap)}.`

: ''}

</li>

))}

{items.length > 8 ? <li>… e mais {items.length - 8}.</li> : null}

</ul>

</div>

))}

</div>

</details>

) : null}



<SaveSimulationPanel

input={input}

result={result}

catalog={catalog}

savedId={savedId}

onSaved={markSaved}

/>



<p className="text-sm text-ink-600">{DISCLAIMERS.short}</p>

</div>

)

}
