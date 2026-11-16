import { Alert } from '../../components/ui/Alert'

import { DISCLAIMERS } from '../../config/copy'

import type { TcoHorizon } from '../../config/tco'

import type {

InverseCandidate,

InverseResult,

InverseScenarioKey,

} from '../../domain/finance/inverse'

import { formatBRL } from '../../utils/format'



const SCENARIO_LABELS: Record<InverseScenarioKey, { title: string; hint: string }> = {

menorEntrada: {

title: 'Menor entrada',

hint: 'Exige o menor valor de entrada entre as opções viáveis.',

},

menorParcela: {

title: 'Menor parcela',

hint: 'Compromete menos por mês entre as opções viáveis.',

},

menorCustoTotal: {

title: 'Menor custo total',

hint: 'Menor TCO econômico no horizonte escolhido.',

},

avista: { title: 'À vista', hint: 'Pagamento integral, sem financiamento, quando viável.' },

personalizado: { title: 'Combinação personalizada', hint: 'A combinação que você pediu.' },

}



function formLabel(candidate: InverseCandidate): string {

if (candidate.purchaseMode === 'avista') return 'À vista'

return candidate.amortization === 'sac' ? 'Financiado (SAC)' : 'Financiado (Price)'

}



function termText(candidate: InverseCandidate): string {

return candidate.purchaseMode === 'avista' ? 'Não se aplica' : `${candidate.installments} meses`

}



function installmentText(candidate: InverseCandidate): string {

return candidate.purchaseMode === 'avista'

? 'Não se aplica'

: formatBRL(candidate.monthlyInstallment)

}



function Summary({

candidate,

horizonMonths,

}: {

candidate: InverseCandidate

horizonMonths: TcoHorizon

}) {

const feasibilityNote =

candidate.status === 'viavel' ? null : (

<ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-800">

{candidate.reasons.map((reason) => (

<li key={reason.code + reason.message}>{reason.message}</li>

))}

</ul>

)

return (

<>

<dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">

<div className="flex justify-between gap-2">

<dt className="text-ink-600">Forma</dt>

<dd className="font-medium">{formLabel(candidate)}</dd>

</div>

<div className="flex justify-between gap-2">

<dt className="text-ink-600">Entrada</dt>

<dd className="font-medium">{formatBRL(candidate.downPayment)}</dd>

</div>

<div className="flex justify-between gap-2">

<dt className="text-ink-600">Prazo</dt>

<dd className="font-medium">{termText(candidate)}</dd>

</div>

<div className="flex justify-between gap-2">

<dt className="text-ink-600">Valor financiado</dt>

<dd className="font-medium">{formatBRL(candidate.financed)}</dd>

</div>

<div className="flex justify-between gap-2">

<dt className="text-ink-600">Parcela</dt>

<dd className="font-medium">{installmentText(candidate)}</dd>

</div>

<div className="flex justify-between gap-2">

<dt className="text-ink-600">Juros no horizonte</dt>

<dd className="font-medium">{formatBRL(candidate.interest)}</dd>

</div>

<div className="flex justify-between gap-2">

<dt className="text-ink-600">Custo mensal total</dt>

<dd className="font-medium">{formatBRL(candidate.monthlyTotal)}</dd>

</div>

<div className="flex justify-between gap-2">

<dt className="text-ink-600">TCO econômico ({horizonMonths} meses)</dt>

<dd className="font-medium">{formatBRL(candidate.tcoEconomic)}</dd>

</div>

<div className="flex justify-between gap-2">

<dt className="text-ink-600">TCO de caixa ({horizonMonths} meses)</dt>

<dd className="font-medium">{formatBRL(candidate.tcoCash)}</dd>

</div>

<div className="flex justify-between gap-2">

<dt className="text-ink-600">Renda de referência</dt>

<dd className="font-medium">

{candidate.referenceIncome === null

? 'Não se aplica'

: formatBRL(candidate.referenceIncome)}

</dd>

</div>

<div className="flex justify-between gap-2">

<dt className="text-ink-600">Reserva acumulada que sobra</dt>

<dd className="font-medium">

{candidate.reserveAfter === null

? 'Sem renda informada'

: formatBRL(candidate.reserveAfter)}

</dd>

</div>

<div className="flex justify-between gap-2">

<dt className="text-ink-600">Renda livre depois do veículo</dt>

<dd className="font-medium">

{candidate.marginAfter === null

? 'Sem renda informada'

: formatBRL(candidate.marginAfter)}

</dd>

</div>

</dl>

{feasibilityNote}

</>

)

}



function ScenarioCard({

scenarioKey,

candidate,

horizonMonths,

}: {

scenarioKey: InverseScenarioKey

candidate: InverseCandidate | null

horizonMonths: TcoHorizon

}) {

const label = SCENARIO_LABELS[scenarioKey]

return (

<article className="qc-card p-5" aria-labelledby={`scenario-${scenarioKey}`}>

<h3 id={`scenario-${scenarioKey}`} className="text-lg font-bold">

{label.title}

</h3>

<p className="text-sm text-ink-700">{label.hint}</p>

{candidate ? (

<Summary candidate={candidate} horizonMonths={horizonMonths} />

) : (

<p className="mt-3 text-sm text-ink-700">Nenhuma combinação viável para este cenário.</p>

)}

</article>

)

}



interface InverseResultsProps {

result: InverseResult

horizonMonths: TcoHorizon

vehicleLabel: string

registrationState: string

hasIncome: boolean

}



/** Resultado da simulação inversa: cenários, tabela, ausência de solução, premissas e fontes. */

export function InverseResults({

result,

horizonMonths,

vehicleLabel,

registrationState,

hasIncome,

}: InverseResultsProps) {

const scenarioKeys = Object.keys(SCENARIO_LABELS) as InverseScenarioKey[]

const reasonCounts = Object.entries(result.rejectionCounts).sort((a, b) => b[1] - a[1])



return (

<div className="space-y-6">

<section aria-labelledby="inverse-summary" className="qc-card p-6">

<h2 id="inverse-summary" className="text-xl font-bold">

Condições para {vehicleLabel}

</h2>

<p className="mt-1 text-sm text-ink-700">

UF {registrationState}. {result.candidates.length} combinações avaliadas,{' '}

{result.options.length} viáveis e não dominadas.{' '}

{hasIncome ? 'Com renda informada.' : 'Sem renda: sem avaliação de orçamento.'}

</p>

</section>



{result.status === 'sem_solucao' ? (

<Alert tone="warn" title="Nenhuma combinação atende às restrições" live>

<p>

Nenhuma das combinações avaliadas passou nas restrições informadas. Veja os motivos e os

ajustes possíveis abaixo.

</p>

{reasonCounts.length > 0 ? (

<ul className="mt-2 list-disc pl-5 text-sm">

{reasonCounts.map(([code, count]) => (

<li key={code}>

{code.replace(/_/g, ' ')}: {count} combinação(ões)

</li>

))}

</ul>

) : null}

{result.suggestions.length > 0 ? (

<ul className="mt-3 list-disc pl-5">

{result.suggestions.map((suggestion) => (

<li key={suggestion}>{suggestion}</li>

))}

</ul>

) : null}

</Alert>

) : null}
<section aria-labelledby="inverse-scenarios" className="space-y-4">

<h2 id="inverse-scenarios" className="text-xl font-bold">

Cenários

</h2>

<div className="grid gap-4 md:grid-cols-2">

{scenarioKeys.map((key) => (

<ScenarioCard

key={key}

scenarioKey={key}

candidate={result.scenarios[key]}

horizonMonths={horizonMonths}

/>

))}

</div>

</section>



<section aria-labelledby="inverse-table" className="qc-card p-6">

<h2 id="inverse-table" className="text-xl font-bold">

Combinações viáveis

</h2>

{result.options.length === 0 ? (

<p className="mt-2 text-sm text-ink-700">Nenhuma combinação viável para mostrar.</p>

) : (

<div className="mt-4 overflow-x-auto">

<table className="w-full min-w-[40rem] border-collapse text-left text-sm">

<caption className="sr-only">

Combinações viáveis e não dominadas, com custos e renda de referência

</caption>

<thead>

<tr className="border-b border-ink-300">

<th scope="col" className="py-2 pr-3">

Forma

</th>

<th scope="col" className="py-2 pr-3">

Entrada

</th>

<th scope="col" className="py-2 pr-3">

Prazo

</th>

<th scope="col" className="py-2 pr-3">

Parcela

</th>

<th scope="col" className="py-2 pr-3">

Juros

</th>

<th scope="col" className="py-2 pr-3">

TCO econômico

</th>

<th scope="col" className="py-2">

Renda de referência

</th>

</tr>

</thead>

<tbody>

{result.options.map((option) => (

<tr key={option.id} className="border-b border-ink-100">

<td className="py-2 pr-3">{formLabel(option)}</td>

<td className="py-2 pr-3">{formatBRL(option.downPayment)}</td>

<td className="py-2 pr-3">{termText(option)}</td>

<td className="py-2 pr-3">{installmentText(option)}</td>

<td className="py-2 pr-3">{formatBRL(option.interest)}</td>

<td className="py-2 pr-3">{formatBRL(option.tcoEconomic)}</td>

<td className="py-2">

{option.referenceIncome === null

? 'Não se aplica'

: formatBRL(option.referenceIncome)}

</td>

</tr>

))}

</tbody>

</table>

</div>

)}

<p className="mt-3 text-sm text-ink-700">

Renda de referência = custo mensal total ÷ limite de comprometimento do cenário. É uma

conta de referência, não aprovação nem política de crédito.

</p>

</section>



<section aria-labelledby="inverse-premises" className="qc-card p-6">

<h2 id="inverse-premises" className="text-xl font-bold">

Premissas e fontes

</h2>

<ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-800">

{result.premises.map((premise) => (

<li key={premise}>{premise}</li>

))}

<li>{DISCLAIMERS.demonstrativeData}</li>

{DISCLAIMERS.items.map((text) => (

<li key={text}>{text}</li>

))}

</ul>

</section>

</div>

)

}
