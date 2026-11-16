import { useId } from 'react'

import { Link } from 'react-router-dom'

import { PRESSURE_LABELS } from '../../domain/analytics/classify'

import { describeSource } from '../../domain/decision/explain'

import type { RankedVehicle } from '../../types/decision'

import { VehiclePhoto } from '../vehicles/images/VehiclePhoto'

import { vehicleDetailPath } from './paths'

import { formatBRL, formatNumber, formatPercent } from '../../utils/format'



const FUEL_LABEL: Record<string, string> = {

flex: 'Flex',

gasolina: 'Gasolina',

etanol: 'Etanol',

diesel: 'Diesel',

hibrido: 'Híbrido',

eletrico: 'Elétrico',

}



interface VehicleCardProps {

item: RankedVehicle

selected: boolean

compareDisabled: boolean

onToggleCompare: (vehicleId: string) => void

}



/**

* Cartão de uma opção do grupo recomendado. Todos os cartões têm o mesmo peso visual:

* não há posição, medalha nem destaque de "melhor".

*/

export function VehicleCard({

item,

selected,

compareDisabled,

onToggleCompare,

}: VehicleCardProps) {

const headingId = useId()

const { vehicle, costs, financial } = item

const pressure = financial.pressureLevel ? PRESSURE_LABELS[financial.pressureLevel] : null



return (

<article aria-labelledby={headingId} className="qc-card flex flex-col p-5">

<VehiclePhoto vehicle={vehicle} className="mb-4" />

<header>

<h3 id={headingId} className="text-lg font-bold text-ink-900">

{vehicle.brand} {vehicle.model}

</h3>

<p className="text-sm text-ink-700">

Ano {vehicle.modelYear} ·{' '}

{vehicle.fuel ? FUEL_LABEL[vehicle.fuel] : 'Combustível não informado'}

{vehicle.transmission

? ` · ${vehicle.transmission === 'automatico' ? 'Automático' : 'Manual'}`

: ''}

</p>

</header>



<dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">

<div>

<dt className="text-ink-600">Preço de referência (FIPE)</dt>

<dd className="text-base font-semibold">{formatBRL(costs.priceBRL)}</dd>

</div>

<div>

<dt className="text-ink-600">Custo mensal estimado</dt>

<dd className="text-base font-semibold">{formatBRL(costs.monthlyTotal)}</dd>

</div>

<div>

<dt className="text-ink-600">Energia por km</dt>

<dd className="font-semibold">

{costs.energyCostPerKm === null

? 'Informação não disponível'

: formatBRL(costs.energyCostPerKm, { cents: true })}

</dd>

</div>

<div>

<dt className="text-ink-600">Comprometimento da renda</dt>

<dd className="font-semibold">{formatPercent(financial.commitmentRatio)}</dd>

</div>

</dl>



<div className="mt-4">

<div className="flex items-baseline justify-between text-sm">

<span className="text-ink-700">Aderência ao cenário</span>

<span className="font-bold tabular-nums">{formatNumber(item.index, 0)} / 100</span>

</div>

<div

role="meter"

aria-label={`Aderência ao cenário de ${vehicle.brand} ${vehicle.model}`}

aria-valuemin={0}

aria-valuemax={100}

aria-valuenow={Math.round(item.index)}

aria-valuetext={`${formatNumber(item.index, 0)} de 100`}

className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-200"

>

<div

className="h-full bg-brand-700"

style={{ width: `${Math.min(100, Math.max(0, item.index))}%` }}

/>

</div>

<p className="mt-1 text-xs text-ink-600">

Pressão financeira estimada: {pressure?.toLowerCase() ?? 'informação não disponível'}.

</p>

</div>



{item.pros.length > 0 ? (

<div className="mt-4">

<h4 className="text-sm font-semibold text-good-fg">Pontos favoráveis</h4>

<ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-800">

{item.pros.slice(0, 2).map((pro) => (

<li key={pro.code}>{pro.text}</li>

))}

</ul>

</div>

) : null}



{item.alerts.filter((alert) => alert.severity !== 'informativo').length > 0 ? (

<div className="mt-3">

<h4 className="text-sm font-semibold text-warn-fg">Pontos de atenção</h4>

<ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-800">

{item.alerts

.filter((alert) => alert.severity !== 'informativo')

.slice(0, 2)

.map((alert) => (

<li key={alert.code}>{alert.text}</li>

))}

</ul>

</div>

) : null}



<p className="mt-4 text-xs text-ink-600">Fonte do preço: {describeSource(vehicle)}.</p>



<footer className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">

<label className="flex items-center gap-2 text-sm">

<input

type="checkbox"

className="size-5"

checked={selected}

disabled={compareDisabled && !selected}

onChange​={() => onToggleCompare(vehicle.id)}

/>

Comparar

<span className="sr-only">

{vehicle.brand} {vehicle.model}

</span>

</label>

<Link to={vehicleDetailPath(vehicle.id)} className="qc-btn-secondary">

Ver detalhes

<span className="sr-only">

{' '}

de {vehicle.brand} {vehicle.model} {vehicle.modelYear}

</span>

</Link>

</footer>

</article>

)

}
