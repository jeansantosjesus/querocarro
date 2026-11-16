import { useEffect, useState } from 'react'

import { Link } from 'react-router-dom'

import { Alert } from '../../components/ui/Alert'

import { ConsentRequiredError } from '../../repositories/types'

import type { SimulationInput } from '../../schemas/simulation'

import type { DecisionResult } from '../../types/decision'

import type { VehicleCatalog } from '../../types/vehicle'

import { useAuth } from '../auth/AuthContext'

import { buildSimulationDraft } from './buildDraft'

import { useRepositories } from './RepositoriesContext'



interface SaveSimulationPanelProps {

input: SimulationInput

result: DecisionResult

catalog: VehicleCatalog

savedId: string | null

onSaved: (id: string) => void

}



/** Salvar no histórico: só com consentimento explícito e apenas para usuários autenticados. */

export function SaveSimulationPanel({

input,

result,

catalog,

savedId,

onSaved,

}: SaveSimulationPanelProps) {

const { isDemo, status } = useAuth()

const repositories = useRepositories()

const [consent, setConsent] = useState<boolean | null>(null)

const [accepted, setAccepted] = useState(false)

const [saving, setSaving] = useState(false)

const [error, setError] = useState<string | null>(null)



useEffect(() => {

let active = true

if (!repositories) return

repositories.preferences

.get()

.then((preferences) => {

if (active) setConsent(preferences.persistHistoryConsent)

})

.catch(() => {

if (active) setConsent(false)

})

return () => {

active = false

}

}, [repositories])



if (isDemo && status !== 'authenticated') {

return (

<Alert tone="info">

Modo demonstração: nada é salvo. Crie uma conta para guardar simulações no histórico, se

quiser.

</Alert>

)

}

if (!repositories) return null



async function save() {

if (!repositories) return

setSaving(true)

setError(null)

try {

if (!consent) {

if (!accepted) {

setError('Marque a autorização para salvar esta simulação.')

return

}

await repositories.preferences.update({ persistHistoryConsent: true })

setConsent(true)

}

const saved = await repositories.simulations.save(

buildSimulationDraft(input, result, catalog),

)

onSaved(saved.id)

} catch (caught) {

setError(

caught instanceof ConsentRequiredError

? caught.message

: 'Não foi possível salvar agora. Tente novamente em instantes.',

)

} finally {

setSaving(false)

}

}



if (savedId) {

return (

<Alert tone="good" title="Simulação salva no histórico">

<Link to="/historico" className="font-semibold underline">

Abrir histórico

</Link>

</Alert>

)

}



return (

<section aria-labelledby="save-title" className="qc-card no-print p-5">

<h2 id="save-title" className="text-lg font-bold">

Salvar esta simulação

</h2>

<p className="mt-1 text-sm text-ink-700">

O histórico é opcional. Você pode excluir qualquer simulação, ou todo o histórico, quando

quiser.

</p>

{error ? (

<div className="mt-3">

<Alert tone="bad">{error}</Alert>

</div>

) : null}

{consent === false ? (

<label className="mt-3 flex items-start gap-3 text-sm">

<input

type="checkbox"

className="mt-1 size-5"

checked={accepted}

onChange={(event) => setAccepted(event.target.checked)}

/>

<span>

Autorizo o QC a salvar, na minha conta, os dados desta simulação, incluindo os valores

financeiros que informei e o resultado. Entendo que posso excluí-los depois.

</span>

</label>

) : null}

<button

type="button"

className="qc-btn-primary mt-4"

onClick={() => void save()}

disabled={saving || consent === null}

>

{saving ? 'Salvando…' : 'Salvar no histórico'}

</button>

</section>

)

}
