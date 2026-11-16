import type { CostLine } from '../../domain/finance/estimates'

import { formatBRL, formatReferenceMonth } from '../../utils/format'

import { ORIGIN_LABEL, PERIODICITY_LABEL, RELIABILITY_LABEL } from './labels'



/** Tabela de custos. Cada estimativa mostra origem, premissa, periodicidade, referência, confiabilidade e se é ajustável. */

export function CostBreakdownTable({ lines }: { lines: CostLine[] }) {

return (

<div className="space-y-3">

<div className="hidden overflow-x-auto md:block">

<table className="w-full min-w-[56rem] border-collapse text-left text-sm">

<caption className="sr-only">

Composição do custo com origem e premissas de cada valor

</caption>

<thead>

<tr className="border-b border-ink-300">

<th scope="col" className="py-2 pr-3">

Item

</th>

<th scope="col" className="py-2 pr-3">

Valor

</th>

<th scope="col" className="py-2 pr-3">

Periodicidade

</th>

<th scope="col" className="py-2 pr-3">

Origem

</th>

<th scope="col" className="py-2 pr-3">

Premissa

</th>

<th scope="col" className="py-2 pr-3">

Referência

</th>

<th scope="col" className="py-2 pr-3">

Confiabilidade

</th>

<th scope="col" className="py-2">

Ajustável

</th>

</tr>

</thead>

<tbody>

{lines.map((line) => (

<tr

key={line.key}

className={`border-b border-ink-100 align-top ${line.key === 'total' ? 'bg-ink-100 font-semibold' : ''}`}

>

<th scope="row" className="py-2 pr-3 font-medium">

{line.meta.label}

</th>

<td className="py-2 pr-3 tabular-nums">

{formatBRL(line.amount, { cents: true })}

</td>

<td className="py-2 pr-3">{PERIODICITY_LABEL[line.meta.periodicity]}</td>

<td className="py-2 pr-3">{ORIGIN_LABEL[line.meta.origin]}</td>

<td className="py-2 pr-3 text-ink-700">{line.meta.assumption}</td>

<td className="py-2 pr-3">{formatReferenceMonth(line.meta.reference)}</td>

<td className="py-2 pr-3">{RELIABILITY_LABEL[line.meta.reliability]}</td>

<td className="py-2">{line.meta.adjustable ? 'Sim' : 'Não'}</td>

</tr>

))}

</tbody>

</table>

</div>



<ul className="space-y-3 md:hidden">

{lines.map((line) => (

<li key={line.key} className="rounded-xl border border-ink-200 p-3 text-sm">

<p className="font-semibold">

{line.meta.label}: {formatBRL(line.amount, { cents: true })}

</p>

<p className="text-ink-700">{line.meta.assumption}</p>

<p className="mt-1 text-ink-600">

{PERIODICITY_LABEL[line.meta.periodicity]} · {ORIGIN_LABEL[line.meta.origin]} · ref.{' '}

{formatReferenceMonth(line.meta.reference)} · confiabilidade{' '}

{RELIABILITY_LABEL[line.meta.reliability].toLowerCase()} ·{' '}

{line.meta.adjustable ? 'ajustável' : 'não ajustável'}

</p>

</li>

))}

</ul>

</div>

)

}
