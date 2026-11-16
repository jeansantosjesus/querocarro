import { useMemo, useState } from 'react'

import { Link, Navigate, useParams } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { PageTitle } from '../components/ui/PageTitle'

import {

calculateInverseOptions,

type InverseRequest,

type InverseResult,

} from '../domain/finance/inverse'

import { describeSource } from '../domain/decision/explain'

import { FinanceInputError } from '../domain/finance/loan'

import { InverseForm } from '../features/inverse/InverseForm'

import { InverseResults } from '../features/inverse/InverseResults'

import {

buildInverseRequest,

createInverseForm,

type InverseFormState,

} from '../features/inverse/inverseState'

import { vehicleDetailPath } from '../features/recommendations/paths'

import { useSimulation } from '../features/simulation/SimulationContext'

import { useCatalog } from '../features/vehicles/CatalogContext'

import { VehiclePhoto } from '../features/vehicles/images/VehiclePhoto'

import { formatBRL } from '../utils/format'



const VEHICLE_ID_PATTERN = /^[A-Za-z0-9_:-]{1,64}$/



type Outcome = { ok: true; result: InverseResult } | { ok: false; message: string }



function run(request: InverseRequest): Outcome {

try {

return { ok: true, result: calculateInverseOptions(request) }

} catch (error) {

if (error instanceof FinanceInputError) return { ok: false, message: error.message }

throw error

}

}



/** "Quero este carro": escolhe um veículo e busca combinações de entrada e prazo. */

export function InverseSimulationPage() {

const { id = '' } = useParams()

const { input } = useSimulation()

const { catalog } = useCatalog()



const [form, setForm] = useState<InverseFormState>(() => createInverseForm(input))

const [errors, setErrors] = useState<string[]>([])

const [request, setRequest] = useState<InverseRequest | null>(null)



const outcome = useMemo<Outcome | null>(() => (request ? run(request) : null), [request])



if (!catalog) return <Navigate to="/simulacao" replace />



const vehicle = VEHICLE_ID_PATTERN.test(id)

? catalog.vehicles.find((entry) => entry.id === id)

: undefined

if (!vehicle) {

return (

<div>

<PageTitle title="Veículo não encontrado" />

<Alert tone="warn">

Este veículo não está no catálogo carregado.{' '}

<Link to="/simulacao" className="font-semibold underline">

Voltar à simulação

</Link>

</Alert>

</div>

)

}



const referenceYear = Number(catalog.referenceMonth?.slice(0, 4)) || new Date().getFullYear()

const vehicleLabel = `${vehicle.brand} ${vehicle.model} ${vehicle.modelYear}`



const handleChange = (patch: Partial<InverseFormState>) =>

setForm((current) => ({ ...current, ...patch }))



const handleSubmit = () => {

const built = buildInverseRequest(form, { vehicle, referenceYear, input })

if (!built.ok) {

setErrors(built.errors)

setRequest(null)

return

}

setErrors([])

setRequest(built.request)

}



return (

<div className="space-y-8">

<PageTitle

title={`Quero este carro: ${vehicleLabel}`}

subtitle="Veja quais entradas e prazos seriam de maior aderência para comprar e manter este veículo. São estimativas, não aprovação de crédito."

actions={

<Link to={vehicleDetailPath(vehicle.id)} className="qc-btn-secondary">

Voltar ao veículo

</Link>

}

/>



<section

aria-labelledby="inverse-vehicle"

className="qc-card grid gap-5 p-6 md:grid-cols-[1fr_2fr]"

>

<h2 id="inverse-vehicle" className="sr-only">

Veículo escolhido

</h2>

<VehiclePhoto vehicle={vehicle} className="max-w-xs" />

<dl className="grid gap-3 text-sm sm:grid-cols-2">

<div>

<dt className="text-ink-600">Preço de referência</dt>

<dd className="text-lg font-bold">{formatBRL(vehicle.priceBRL)}</dd>

</div>

<div>

<dt className="text-ink-600">Preço de referência (origem)</dt>

<dd className="font-medium">{describeSource(vehicle)}</dd>

</div>

<div>

<dt className="text-ink-600">Combustível</dt>

<dd className="font-medium">{vehicle.fuel}</dd>

</div>

<div>

<dt className="text-ink-600">Ano-modelo</dt>

<dd className="font-medium">{vehicle.modelYear}</dd>

</div>

</dl>

</section>



<InverseForm form={form} errors={errors} onChange={handleChange} onSubmit={handleSubmit} />



{outcome === null ? null : outcome.ok ? (

request ? (

<InverseResults

result={outcome.result}

horizonMonths={request.horizonMonths}

vehicleLabel={vehicleLabel}

registrationState={request.registrationState}

hasIncome={request.hasIncome}

/>

) : null

) : (

<Alert tone="bad" title="Não foi possível calcular" live>

{outcome.message}

</Alert>

)}

</div>

)

}
