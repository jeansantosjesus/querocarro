import { get, useFormContext } from 'react-hook-form'

import { Alert } from '../../../components/ui/Alert'

import { Field } from '../../../components/ui/Field'

import { VEHICLE_SHARE_LIMITS } from '../../../config/capacity'

import { INPUT_LIMITS } from '../../../config/limits'

import { BRAZILIAN_STATES, isBrazilianStateCode } from '../../../config/states'

import { stateHasUsableCatalogRule } from '../../../domain/finance/regionalTax'

import type { SimulationInput } from '../../../schemas/simulation'

import { formatBRL } from '../../../utils/format'

import { NumberField } from './NumberField'



export function StepFinance() {

const {

watch,

register,

formState: { errors },

} = useFormContext<SimulationInput>()

const purchaseMode = watch('objective.purchaseMode')

const registrationState = watch('registrationState')

const stateError = get(errors, 'registrationState') as { message?: string } | undefined

const hasCatalogRule =

typeof registrationState === 'string' &&

isBrazilianStateCode(registrationState) &&

stateHasUsableCatalogRule(registrationState)

const limitMode = watch('finance.limitMode')

const income = Number(watch('finance.netIncome'))

const fixed = Number(watch('finance.fixedExpenses'))

const other = Number(watch('finance.otherRecurringExpenses'))

const debts = Number(watch('finance.otherDebts'))

const monthlyReserve = Number(watch('finance.monthlyReserve'))

const available = [income, fixed, other, debts, monthlyReserve].every(Number.isFinite)

? income - fixed - other - debts - monthlyReserve

: null



return (

<div className="space-y-6">

<Alert tone="info" title="Seus dados financeiros ficam só nesta sessão">

Os valores abaixo são usados apenas para calcular indicadores derivados (como

comprometimento e margem). A renda não é critério de comparação entre veículos. Você escolhe

se quer salvar a simulação no histórico ao final.

</Alert>



<Field

label="Em qual estado o veículo será registrado?"

required

error={stateError?.message}

hint="O QC não escolhe o estado por você. Só a Bahia tem regra de demonstração. Nas outras UFs, informe a alíquota na revisão ou marque a estimativa abaixo."

>

{(props) => (

<select {...props} className="qc-input" {...register('registrationState')}>

<option value="">Selecione o estado</option>

{BRAZILIAN_STATES.map((state) => (

<option key={state.code} value={state.code}>

{state.code} — {state.name}

</option>

))}

</select>

)}

</Field>



{registrationState && !hasCatalogRule ? (

<div className="space-y-3">

<Alert tone="warn" title="Sem regra cadastrada para este estado">

Não há alíquota verificada nem de demonstração. O IPVA fica indisponível até você

informar o percentual na revisão ou marcar a estimativa de demonstração. Essa estimativa

não é a alíquota oficial do estado.

</Alert>

<label className="flex items-start gap-2 text-sm">

<input

type="checkbox"

className="mt-0.5 size-5"

{...register('allowDemonstrativeTax')}

/>

<span>Usar a estimativa de demonstração para o IPVA deste estado.</span>

</label>

</div>

) : null}



<fieldset className="space-y-6">

<legend className="text-lg font-bold">Mensal</legend>

<div className="grid gap-6 sm:grid-cols-2">

<NumberField

name="finance.netIncome"

label="Renda líquida mensal (R$)"

min={INPUT_LIMITS.income.min}

/>

<NumberField

name="finance.fixedExpenses"

label="Despesas fixas mensais (R$)"

min={0}

hint="Moradia, alimentação, contas etc."

/>

<NumberField

name="finance.otherRecurringExpenses"

label="Outras despesas recorrentes (R$)"

min={0}

hint="Use 0 se não houver. Entram na renda disponível."

/>

<NumberField

name="finance.otherDebts"

label="Outras dívidas mensais (R$)"

min={0}

hint="Parcelas já assumidas. Use 0 se não houver."

/>

<NumberField

name="finance.monthlyReserve"

label="Reserva mensal planejada (R$)"

min={0}

hint="Valor que você pretende guardar todo mês. É descontado da renda disponível."

/>

<NumberField

name="finance.safetyMarginMonthly"

label="Margem de segurança mensal (R$)"

min={0}

hint="Fica fora do orçamento do veículo."

/>

</div>

<fieldset className="space-y-3">

<legend className="font-semibold">Limite mensal do veículo</legend>

<label className="flex items-center gap-2 text-sm">

<input type="radio" value="informado" {...register('finance.limitMode')} />

Quero informar meu limite

</label>

<label className="flex items-center gap-2 text-sm">

<input type="radio" value="estimado" {...register('finance.limitMode')} />

Quero que o QC estime um limite

</label>

<NumberField

name="finance.maxMonthlyVehicleSpend"

label="Gasto mensal máximo desejado com o veículo (R$)"

min={1}

hint={

limitMode === 'estimado'

? 'Neste modo o QC ignora este valor e estima o limite pela renda disponível. Não é uma regra universal.'

: 'O QC usa o menor valor entre este limite e o calculado pela renda disponível.'

}

/>

<NumberField

name="finance.vehicleSharePct"

label="Percentual da renda disponível destinado ao veículo (%)"

optional

min={VEHICLE_SHARE_LIMITS.min}

max={VEHICLE_SHARE_LIMITS.max}

hint="Opcional. Em branco, usa a premissa do cenário: 40%, 35% ou 25%."

/>

</fieldset>

{available !== null ? (

<p className="rounded-xl bg-ink-100 p-3 text-sm" aria-live="polite">

Renda disponível estimada (renda − essenciais − outras despesas − dívidas − reserva

mensal): <strong>{formatBRL(available)}</strong>

{available <= 0

? ' — a pressão financeira é crítica e não há capacidade de compra positiva.'

: ''}

</p>

) : null}

</fieldset>
<fieldset className="space-y-6">

<legend className="text-lg font-bold">Entrada e reserva</legend>

<div className="grid gap-6 sm:grid-cols-2">

<NumberField

name="finance.downPayment"

label={

purchaseMode === 'avista'

? 'Valor total disponível para a compra (R$)'

: 'Valor disponível para entrada (R$)'

}

min={0}

hint={

purchaseMode === 'avista'

? 'Veículos com preço de referência acima deste valor não entram na análise.'

: 'Se for maior que o preço do veículo, usamos só o necessário.'

}

/>

<NumberField

name="finance.reserve"

label="Reserva de emergência a preservar (R$)"

min={0}

hint="Não pode ser usada na entrada, salvo se você confirmar abaixo."

/>

<NumberField

name="finance.accumulatedReserve"

label="Reserva acumulada (R$)"

min={0}

hint="Saldo disponível hoje. A entrada só usa o que sobra depois da reserva protegida."

/>

<NumberField

name="finance.reserveMonths"

label="Meses de despesas essenciais a proteger"

step="1"

min={0}

max={36}

hint="A proteção é o maior valor entre a reserva informada e despesas essenciais × meses."

/>

</div>

<label className="flex items-start gap-2 text-sm">

<input type="checkbox" className="mt-1" {...register('finance.useFullDownPayment')} />

<span>Usar a entrada informada mesmo que isso reduza a reserva protegida.</span>

</label>

</fieldset>



{purchaseMode === 'financiado' ? (

<fieldset className="space-y-6">

<legend className="text-lg font-bold">Financiamento (simulação)</legend>

<div className="grid gap-6 sm:grid-cols-3">

<NumberField

name="finance.installments"

label="Prazo (meses)"

step="1"

min={INPUT_LIMITS.installments.min}

max={INPUT_LIMITS.installments.max}

/>

<NumberField

name="finance.monthlyRatePct"

label="Taxa de juros (% ao mês)"

min={0}

max={INPUT_LIMITS.monthlyRatePct.max}

hint="Use a taxa de uma proposta real. 0 = sem juros."

/>

<NumberField

name="finance.maxInstallment"

label="Parcela máxima (R$, opcional)"

optional

min={0}

hint="Em branco = sem limite de parcela."

/>

</div>

</fieldset>

) : (

<Alert tone="info">

Compra à vista: não há parcela. O valor da entrada é usado como recurso para a compra.

</Alert>

)}

</div>

)

}
