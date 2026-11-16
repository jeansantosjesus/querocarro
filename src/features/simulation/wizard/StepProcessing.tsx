import { Alert } from '../../../components/ui/Alert'

import { Spinner } from '../../../components/ui/Spinner'

import { useCatalog } from '../../vehicles/CatalogContext'



interface StepProcessingProps {

onRetry: () => void

onBack: () => void

validationError: string | null

}



export function StepProcessing({ onRetry, onBack, validationError }: StepProcessingProps) {

const { status, progress, error } = useCatalog()

const percent =

progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null



if (validationError) {

return (

<div className="space-y-4">

<Alert tone="bad" title="Revise os dados informados">

{validationError}

</Alert>

<button type="button" className="qc-btn-secondary" onClick​={onBack}>

Voltar e corrigir

</button>

</div>

)

}



if (status === 'error') {

return (

<div className="space-y-4">

<Alert tone="bad" title="Não foi possível carregar os veículos">

{error}

</Alert>

<div className="flex flex-wrap gap-3">

<button type="button" className="qc-btn-primary" onClick​={onRetry}>

Tentar novamente

</button>

<button type="button" className="qc-btn-secondary" onClick​={onBack}>

Voltar à revisão

</button>

</div>

</div>

)

}



return (

<div className="space-y-4">

<Spinner label="Consultando preços e calculando as opções compatíveis…" />

{percent !== null ? (

<div>

<div

role="progressbar"

aria-label="Consulta de preços"

aria-valuemin={0}

aria-valuemax={100}

aria-valuenow={percent}

className="h-3 w-full overflow-hidden rounded-full bg-ink-200"

>

<div

className="h-full bg-brand-700 transition-[width]"

style={{ width: `${percent}%` }}

/>

</div>

<p className="mt-2 text-sm text-ink-700">

{progress?.done} de {progress?.total} veículos consultados

</p>

</div>

) : null}

</div>

)

}
