import { useState } from 'react'

import { stateName } from '../../config/states'

import type { RegionalTaxCalculation, TaxConfidence } from '../../types/regionalTax'

import { formatBRL, formatNumber } from '../../utils/format'



const CONFIDENCE_LABEL: Record<TaxConfidence, string> = {

oficial: 'Oficial',

demonstracao: 'Dado de demonstração',

manual: 'Informado nesta simulação',

indisponivel: 'Informação não disponível',

}



/** IPVA da UF de registro: valor anual, equivalente mensal e a memória do cálculo. */

export function RegionalTaxSection({ tax }: { tax: RegionalTaxCalculation }) {

const [open, setOpen] = useState(false)



return (

<section aria-labelledby="ipva-title" className="qc-card p-6">

<h2 id="ipva-title" className="text-xl font-bold">

IPVA em {stateName(tax.state)} ({tax.state})

</h2>

<dl className="mt-4 grid gap-4 sm:grid-cols-3">

<div>

<dt className="text-sm text-ink-600">Valor anual</dt>

<dd className="text-xl font-bold">{formatBRL(tax.annualBRL, { cents: true })}</dd>

</div>

<div>

<dt className="text-sm text-ink-600">Equivalente mensal</dt>

<dd className="text-xl font-bold">{formatBRL(tax.monthlyBRL, { cents: true })}</dd>

</div>

<div>

<dt className="text-sm text-ink-600">Confiança</dt>

<dd className="text-xl font-bold">{CONFIDENCE_LABEL[tax.confidence]}</dd>

</div>

</dl>

<button

type="button"

className="qc-btn-secondary mt-4"

aria-expanded={open}

aria-controls="ipva-explanation"

onClick={() => setOpen((current) => !current)}

>

Entenda o cálculo

</button>

{open ? (

<div id="ipva-explanation" className="mt-4 space-y-3 text-sm text-ink-800">

<p>{tax.explanation}</p>

<dl className="grid gap-2 sm:grid-cols-2">

<div>

<dt className="text-ink-600">Base</dt>

<dd>{formatBRL(tax.baseBRL, { cents: true })}</dd>

</div>

<div>

<dt className="text-ink-600">Alíquota</dt>

<dd>

{tax.ratePct === null

? 'Informação não disponível'

: `${formatNumber(tax.ratePct, 2)}%`}

</dd>

</div>

<div>

<dt className="text-ink-600">Fonte</dt>

<dd>{tax.source}</dd>

</div>

<div>

<dt className="text-ink-600">Exercício</dt>

<dd>{tax.fiscalYear ?? 'Informação não disponível'}</dd>

</div>

</dl>

{tax.alerts.length > 0 ? (

<ul className="list-disc pl-5">

{tax.alerts.map((item) => (

<li key={`${item.code}-${item.message}`}>{item.message}</li>

))}

</ul>

) : null}

</div>

) : null}

</section>

)

}
