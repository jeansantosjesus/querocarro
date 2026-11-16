import { CRITERIA } from '../../config/criteria'

import { DATA_QUALITY } from '../../config/limits'

import { getScenarioDefinition } from '../../config/scenarios'

import { CRITERION_IDS, type DecisionResult } from '../../types/decision'

import { formatNumber } from '../../utils/format'



function formatStat(value: number, unit: string): string {

return `${formatNumber(value, unit.startsWith('R$/km') ? 2 : unit === 'R$' || unit.startsWith('R$/') ? 0 : 1)} ${unit}`

}



/** "Como o QC calculou este resultado": método, fórmula, pesos e faixas usadas. */

export function CalculationPanel({ result }: { result: DecisionResult }) {

const scenario = getScenarioDefinition(result.scenarioId)

return (

<details className="qc-card p-5">

<summary className="cursor-pointer text-lg font-bold">

Como o QC calculou este resultado

</summary>

<div className="mt-4 space-y-4 text-sm text-ink-800">

<p>

O QC usa um método determinístico e transparente, o{' '}

<strong>Modelo de Soma Ponderada</strong> (Weighted Sum Model). Não há inteligência

artificial generativa: com os mesmos dados, o resultado é sempre o mesmo.

</p>

<ol className="list-decimal space-y-2 pl-5">

<li>

Os veículos passam por filtros (qualidade dos dados, preferências obrigatórias e

viabilidade financeira do cenário <strong>{scenario.label}</strong>).

</li>

<li>

Cada critério é convertido em uma nota de 0 a 100 entre as opções elegíveis

(normalização mín–máx):

<ul className="mt-1 list-disc pl-5">

<li>

critérios de custo (menor é melhor): nota = (máximo − valor) ÷ (máximo − mínimo) ×

100;

</li>

<li>

critérios de benefício (maior é melhor): nota = (valor − mínimo) ÷ (máximo − mínimo)

× 100.

</li>

</ul>

</li>

<li>

O índice é a soma ponderada:{' '}

<strong>Índice = Σ (peso do critério × nota do critério) ÷ 100</strong>, com pesos que

somam 100%.

</li>

<li>

Se faltar um dado de um veículo, o critério é ignorado e o peso é redistribuído entre os

demais (se o dado ausente representar mais de{' '}

{Math.round(DATA_QUALITY.maxMissingWeightShare * 100)}% do peso total, o veículo é

excluído e o motivo é registrado).

</li>

{scenario.proximityPenalty ? (

<li>

No cenário {scenario.label}, opções acima de{' '}

{Math.round(scenario.proximityPenalty.startShare * 100)}% do limite mensal têm até{' '}

{scenario.proximityPenalty.maxPoints} pontos descontados do índice.

</li>

) : null}

<li>Em caso de empate, a ordem usa o nome do veículo (determinístico).</li>

</ol>

<p>

O índice mostra <em>aderência ao cenário e aos pesos escolhidos</em>. Ele não indica “o

melhor carro”: use-o como apoio para comparar alternativas.

</p>



<div className="overflow-x-auto">

<table className="w-full min-w-[32rem] border-collapse text-left">

<caption className="mb-2 text-left font-semibold">

Critérios, pesos e faixas desta simulação

</caption>

<thead>

<tr className="border-b border-ink-300">

<th scope="col" className="py-2 pr-3">

Critério

</th>

<th scope="col" className="py-2 pr-3">

Tipo

</th>

<th scope="col" className="py-2 pr-3">

Peso

</th>

<th scope="col" className="py-2">

Faixa entre as opções elegíveis

</th>

</tr>

</thead>

<tbody>

{CRITERIA.filter((criterion) => CRITERION_IDS.includes(criterion.id)).map(

(criterion) => {

const stat = result.stats[criterion.id]

return (

<tr key={criterion.id} className="border-b border-ink-100">

<th scope="row" className="py-2 pr-3 font-medium">

{criterion.label}

</th>

<td className="py-2 pr-3">

{criterion.direction === 'cost' ? 'Custo' : 'Benefício'}

</td>

<td className="py-2 pr-3">{result.weights[criterion.id]}%</td>

<td className="py-2">

{stat === null

? 'Não aplicável (sem dados)'

: `${formatStat(stat.min, criterion.unit)} a ${formatStat(stat.max, criterion.unit)}`}

</td>

</tr>

)

},

)}

</tbody>

</table>

</div>

<p className="text-ink-600">Versão do modelo: {result.modelVersion}.</p>

</div>

</details>

)

}
