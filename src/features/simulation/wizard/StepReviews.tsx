import { useFormContext } from 'react-hook-form'

import { Alert } from '../../../components/ui/Alert'

import { DEFAULT_ASSUMPTIONS } from '../../../config/assumptions'

import { getScenarioDefinition } from '../../../config/scenarios'

import { calculateAvailableMonthly, calculateMonthlyKm } from '../../../domain/finance/indicators'

import type { SimulationInput } from '../../../schemas/simulation'

import { formatBRL, formatNumber } from '../../../utils/format'

import { useAuth } from '../../auth/AuthContext'

import { NumberField } from './NumberField'



function Row({ label, value }: { label: string; value: string }) {

return (

<div className="flex justify-between gap-4 border-b border-ink-100 py-2 text-sm">

<dt className="text-ink-700">{label}</dt>

<dd className="text-right font-semibold">{value}</dd>

</div>

)

}



export function StepReview() {

const { getValues, register } = useFormContext<SimulationInput>()

const { isDemo } = useAuth()

const values = getValues()

const { objective, finance, usage, preferences } = values

const scenario = getScenarioDefinition(objective.scenarioId)

const available = calculateAvailableMonthly(finance)

const monthlyKm = calculateMonthlyKm(usage)



return (

<div className="space-y-8">

<p className="text-ink-700">

Revise os dados. Você pode voltar a qualquer etapa sem perder o que já preencheu.

</p>



<div className="grid gap-6 md:grid-cols-2">

<section aria-labelledby="rev-obj" className="qc-card p-5">

<h3 id="rev-obj" className="mb-2 text-lg font-bold">

Objetivo

</h3>

<dl>

<Row label="Simulação" value={objective.title} />

<Row label="Cenário" value={scenario.label} />

<Row

label="Forma de compra"

value={objective.purchaseMode === 'avista' ? 'À vista' : 'Financiado'}

/>

<Row

label="Condição"

value={

objective.condition === 'indiferente'

? 'Indiferente'

: objective.condition === 'novo'

? 'Novos'

: 'Usados'

}

/>

<Row

label="Preço máximo"

value={

objective.maxPurchasePrice === null

? 'Sem limite'

: formatBRL(objective.maxPurchasePrice)

}

/>

</dl>

</section>



<section aria-labelledby="rev-fin" className="qc-card p-5">

<h3 id="rev-fin" className="mb-2 text-lg font-bold">

Finanças

</h3>

<dl>

<Row label="Renda líquida" value={formatBRL(finance.netIncome)} />

<Row label="Disponível por mês" value={formatBRL(available)} />

<Row label="Gasto máximo desejado" value={formatBRL(finance.maxMonthlyVehicleSpend)} />

<Row

label={objective.purchaseMode === 'avista' ? 'Valor para compra' : 'Entrada'}

value={formatBRL(finance.downPayment)}

/>

{objective.purchaseMode === 'financiado' ? (

<>

<Row label="Prazo" value={`${finance.installments} meses`} />

<Row label="Juros" value={`${formatNumber(finance.monthlyRatePct, 2)}% ao mês`} />

</>

) : null}

</dl>

</section>



<section aria-labelledby="rev-use" className="qc-card p-5">

<h3 id="rev-use" className="mb-2 text-lg font-bold">

Uso

</h3>

<dl>

<Row label="Tipo de uso" value={usage.type} />

<Row label="Quilometragem mensal" value={`${formatNumber(monthlyKm, 0)} km`} />

<Row label="Passageiros" value={String(usage.passengers)} />

<Row label="Porta-malas" value={usage.trunkNeed} />

</dl>

</section>



<section aria-labelledby="rev-pref" className="qc-card p-5">

<h3 id="rev-pref" className="mb-2 text-lg font-bold">

Preferências

</h3>

<dl>

<Row label="Combustível" value={preferences.fuel} />

<Row label="Câmbio" value={preferences.transmission} />

<Row label="Marcas desejadas" value={preferences.wantedBrands.join(', ') || '—'} />

<Row label="Marcas evitadas" value={preferences.avoidedBrands.join(', ') || '—'} />

</dl>

</section>

</div>



<details className="qc-card p-5">

<summary className="cursor-pointer font-semibold">

Ajustar premissas de custo (opcional)

</summary>

<p className="qc-hint mb-4 mt-2">

Os valores abaixo são estimativas padrão do QC. Deixe em branco para usá-los ou informe

valores mais próximos da sua realidade.

</p>

<div className="grid gap-6 sm:grid-cols-2">

<NumberField

override

name="assumptionOverrides.gasolinePricePerLiter"

label="Gasolina (R$/litro)"

placeholder={String(DEFAULT_ASSUMPTIONS.gasolinePricePerLiter)}

/>

<NumberField

override

name="assumptionOverrides.ethanolPricePerLiter"

label="Etanol (R$/litro)"

placeholder={String(DEFAULT_ASSUMPTIONS.ethanolPricePerLiter)}

/>

<NumberField

override

name="assumptionOverrides.dieselPricePerLiter"

label="Diesel (R$/litro)"

placeholder={String(DEFAULT_ASSUMPTIONS.dieselPricePerLiter)}

/>

<NumberField

override

name="assumptionOverrides.electricityPricePerKwh"

label="Energia elétrica (R$/kWh)"

placeholder={String(DEFAULT_ASSUMPTIONS.electricityPricePerKwh)}

/>

<NumberField

override

name="assumptionOverrides.ipvaRatePct"

label="IPVA (% do valor ao ano)"

hint="Se preenchido, substitui a regra do estado. Não é uma alíquota oficial."

placeholder={String(DEFAULT_ASSUMPTIONS.ipvaRatePct)}

/>

<NumberField

override

name="assumptionOverrides.licensingAnnualBRL"

label="Licenciamento (R$/ano)"

placeholder={String(DEFAULT_ASSUMPTIONS.licensingAnnualBRL)}

/>

</div>

</details>



<section className="qc-card p-5" aria-labelledby="rev-data">

<h3 id="rev-data" className="mb-2 text-lg font-bold">

Fonte dos preços

</h3>

{isDemo ? (

<Alert tone="info">

No modo demonstração, o QC usa a base de preços FIPE salva (sem consultar a internet).

</Alert>

) : (

<label className="flex items-start gap-3 text-sm">

<input type="checkbox" className="mt-1 size-5" {...register('useLiveFipe')} />

<span>

Consultar a API FIPE agora (preços atualizados)

<span className="block text-ink-600">

Faz cerca de 36 consultas à API pública; os dados ficam em cache por 24 horas. Se a

API falhar ou atingir o limite, usamos a referência salva e avisamos você.

</span>

</span>

</label>

)}

</section>

</div>

)

}
