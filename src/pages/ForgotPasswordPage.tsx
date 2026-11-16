import { useEffect, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { PageTitle } from '../components/ui/PageTitle'

import { getScenarioDefinition } from '../config/scenarios'

import { useAuth } from '../features/auth/AuthContext'

import { useRepositories } from '../features/history/RepositoriesContext'

import { useSimulation } from '../features/simulation/SimulationContext'

import type { SavedSimulationSummary } from '../types/history'

import { formatDateTime } from '../utils/format'



export function DashboardPage() {

const { user, isDemo } = useAuth()

const repositories = useRepositories()

const { input, hasCalculated, startNew } = useSimulation()

const navigate = useNavigate()

const [recent, setRecent] = useState<SavedSimulationSummary[]>([])



useEffect(() => {

let active = true

if (!repositories) return

repositories.simulations

.list()

.then((items) => {

if (active) setRecent(items.slice(0, 3))

})

.catch(() => {

if (active) setRecent([])

})

return () => {

active = false

}

}, [repositories])



function startFresh() {

startNew(isDemo && !user ? 'demo' : 'blank')

navigate('/simulacao')

}



return (

<div className="space-y-8">

<PageTitle

title={user ? `Olá, ${user.displayName ?? 'bem-vindo(a)'}` : 'Demonstração'}

subtitle="Monte uma simulação e veja opções de veículos compatíveis com os parâmetros que você definir."

/>



{isDemo && !user ? (

<Alert tone="info" title="Você está no modo demonstração">

Os dados são fictícios e permanecem apenas nesta página. Para salvar simulações, crie uma

conta.

</Alert>

) : null}



<div className="grid gap-5 md:grid-cols-2">

<section aria-labelledby="dash-new" className="qc-card p-6">

<h2 id="dash-new" className="text-xl font-bold">

Nova simulação

</h2>

<p className="mt-2 text-sm text-ink-700">

Oito etapas guiadas: objetivo, finanças, uso, preferências, pesos, revisão, cálculo e

resultado.

</p>

<button type="button" className="qc-btn-primary mt-4" onClick={startFresh}>

{isDemo && !user ? 'Começar com dados fictícios' : 'Começar'}

</button>

</section>



<section aria-labelledby="dash-current" className="qc-card p-6">

<h2 id="dash-current" className="text-xl font-bold">

Simulação em andamento

</h2>

{input && hasCalculated ? (

<>

<p className="mt-2 text-sm text-ink-700">

“{input.objective.title}” · cenário{' '}

{getScenarioDefinition(input.objective.scenarioId).label}

</p>

<Link to="/resultado" className="qc-btn-secondary mt-4">

Ver resultado

</Link>

</>

) : (

<p className="mt-2 text-sm text-ink-700">

Nenhuma simulação calculada nesta sessão. Os dados da simulação atual ficam só na

memória do navegador.

</p>

)}

</section>

</div>



{user ? (

<section aria-labelledby="dash-recent">

<div className="mb-3 flex items-center justify-between gap-3">

<h2 id="dash-recent" className="text-xl font-bold">

Simulações recentes

</h2>

<Link to="/historico" className="font-semibold text-brand-800 underline">

Ver todo o histórico

</Link>

</div>

{recent.length === 0 ? (

<p className="text-sm text-ink-700">Você ainda não salvou simulações.</p>

) : (

<ul className="space-y-2">

{recent.map((item) => (

<li

key={item.id}

className="qc-card flex flex-wrap items-center justify-between gap-3 p-4"

>

<span>

<span className="font-semibold">{item.title}</span>

<span className="block text-sm text-ink-700">

{formatDateTime(item.createdAt)}

</span>

</span>

<Link to={`/historico/${item.id}`} className="qc-btn-secondary">

Abrir

</Link>

</li>

))}

</ul>

)}

</section>

) : null}

</div>

)

}
