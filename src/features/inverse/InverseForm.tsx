import type { FormEvent } from 'react'

import { Alert } from '../../components/ui/Alert'

import { Field } from '../../components/ui/Field'

import { INVERSE_INSTALLMENT_OPTIONS } from '../../config/inverse'

import { BRAZILIAN_STATES } from '../../config/states'

import { TCO_HORIZONS } from '../../config/tco'

import type { InverseFormState } from './inverseState'

interface InverseFormProps {
  form: InverseFormState

  errors: string[]

  onChange: (patch: Partial<InverseFormState>) => void

  onSubmit: () => void
}

function NumberInput({
  label,

  value,

  onValue,

  hint,

  required,

  step = 'any',
}: {
  label: string

  value: string

  onValue: (value: string) => void

  hint?: string

  required?: boolean

  step?: string
}) {
  return (
    <Field label={label} hint={hint} required={required}>
      {(props) => (
        <input
          {...props}

          type="number"

          inputMode="decimal"

          step={step}

          min={0}

          className="qc-input"

          value={value}

          onChange={(event) => onValue(event.target.value)}
        />
      )}
    </Field>
  )
}

/** Formulário da simulação inversa. Campos vazios são ausentes, nunca zero. */

export function InverseForm({ form, errors, onChange, onSubmit }: InverseFormProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    onSubmit()
  }

  const toggleInstallment = (months: number) => {
    const selected = form.installments.includes(months)
      ? form.installments.filter((item) => item !== months)
      : [...form.installments, months]

    onChange({ installments: selected })
  }

  return (
    <form
      onSubmit={handleSubmit}

      noValidate

      className="qc-card space-y-6 p-6"

      aria-label="Condições da compra"
    >
      {errors.length > 0 ? (
        <Alert tone="bad" title="Revise os campos antes de calcular" live>
          <ul className="list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Veículo e registro</legend>

        <Field
          label="UF de registro"

          required

          hint="O QC não escolhe a UF por você. Só a Bahia tem regra de demonstração; nas outras, o IPVA fica indisponível, salvo alíquota informada."
        >
          {(props) => (
            <select
              {...props}

              className="qc-input"

              value={form.registrationState}

              onChange={(event) =>
                onChange({
                  registrationState: event.target.value as InverseFormState['registrationState'],
                })
              }
            >
              <option value="">Selecione o estado</option>

              {BRAZILIAN_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.code} — {state.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Condição</legend>

          {(
            [
              ['novo', 'Novo'],

              ['usado', 'Usado'],

              ['indiferente', 'Tanto faz'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"

                name="condition"

                value={value}

                checked={form.condition === value}

                onChange={() => onChange({ condition: value })}
              />

              {label}
            </label>
          ))}
        </fieldset>

        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"

            className="mt-0.5 size-5"

            checked={form.allowDemonstrativeTax}

            onChange={(event) => onChange({ allowDemonstrativeTax: event.target.checked })}
          />

          <span>
            Usar a estimativa de demonstração para o IPVA deste estado (quando existir, não é a
            alíquota oficial).
          </span>
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Forma de compra e financiamento</legend>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"

              checked={form.purchaseFinanced}

              onChange={(event) => onChange({ purchaseFinanced: event.target.checked })}
            />
            Financiado
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"

              checked={form.purchaseCash}

              onChange={(event) => onChange({ purchaseCash: event.target.checked })}
            />
            À vista
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Amortização (financiamento)</legend>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"

              name="amortization"

              value="price"

              checked={form.amortization === 'price'}

              onChange={() => onChange({ amortization: 'price' })}
            />
            Price (parcelas fixas)
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"

              name="amortization"

              value="sac"

              checked={form.amortization === 'sac'}

              onChange={() => onChange({ amortization: 'sac' })}
            />
            SAC (parcelas decrescentes)
          </label>
        </fieldset>

        <Field label="Horizonte do custo total (TCO)" required>
          {(props) => (
            <select
              {...props}

              className="qc-input"

              value={form.horizonMonths}

              onChange={(event) =>
                onChange({
                  horizonMonths: Number(event.target.value) as InverseFormState['horizonMonths'],
                })
              }
            >
              {TCO_HORIZONS.map((months) => (
                <option key={months} value={months}>
                  {months} meses
                </option>
              ))}
            </select>
          )}
        </Field>

        <NumberInput
          label="Taxa mensal de juros (%)"

          value={form.monthlyRatePct}

          onValue={(value) => onChange({ monthlyRatePct: value })}

          hint="Use 0 se não houver juros."

          required
        />

        <fieldset className="space-y-2 sm:col-span-2">
          <legend className="text-sm font-medium">Prazos a comparar (meses)</legend>

          <div className="flex flex-wrap gap-4">
            {INVERSE_INSTALLMENT_OPTIONS.map((months) => (
              <label key={months} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"

                  checked={form.installments.includes(months)}

                  onChange={() => toggleInstallment(months)}
                />
                {months}x
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Renda e orçamento</legend>

        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"

            className="mt-0.5 size-5"

            checked={!form.hasIncome}

            onChange={(event) => onChange({ hasIncome: !event.target.checked })}
          />

          <span>
            Não quero informar renda. Nesse caso o QC não avalia orçamento, capacidade nem reserva;
            só os limites que você informar abaixo são aplicados.
          </span>
        </label>

        {form.hasIncome ? (
          <>
            <NumberInput
              label="Renda líquida mensal (R$)"

              value={form.netIncome}

              onValue={(value) => onChange({ netIncome: value })}

              required
            />

            <NumberInput
              label="Despesas essenciais mensais (R$)"

              value={form.fixedExpenses}

              onValue={(value) => onChange({ fixedExpenses: value })}

              required

              hint="Moradia, alimentação, transporte, saúde e contas. Use 0 se não houver."
            />

            <NumberInput
              label="Outras despesas recorrentes (R$)"

              value={form.otherRecurringExpenses}

              onValue={(value) => onChange({ otherRecurringExpenses: value })}

              required

              hint="Use 0 se não houver."
            />

            <NumberInput
              label="Dívidas mensais (R$)"

              value={form.otherDebts}

              onValue={(value) => onChange({ otherDebts: value })}

              required

              hint="Parcelas de outras dívidas. Use 0 se não houver."
            />

            <NumberInput
              label="Reserva mensal (R$)"

              value={form.monthlyReserve}

              onValue={(value) => onChange({ monthlyReserve: value })}

              required

              hint="Quanto você separa por mês. Use 0 se não separar."
            />

            <NumberInput
              label="Reserva acumulada (R$)"

              value={form.accumulatedReserve}

              onValue={(value) => onChange({ accumulatedReserve: value })}

              required

              hint="Dinheiro guardado hoje, que pode ser usado como entrada."
            />

            <NumberInput
              label="Reserva mínima a preservar (R$)"

              value={form.reserve}

              onValue={(value) => onChange({ reserve: value })}

              required

              hint="O QC não usa esse valor para decidir por você. Use 0 se não houver."
            />
          </>
        ) : null}

        <NumberInput
          label="Teto de entrada disponível (R$)"

          value={form.maxDownPayment}

          onValue={(value) => onChange({ maxDownPayment: value })}

          hint="Vazio = sem teto informado."
        />

        <NumberInput
          label="Teto da parcela (R$)"

          value={form.maxInstallment}

          onValue={(value) => onChange({ maxInstallment: value })}

          hint="Vazio = sem teto informado."
        />

        <NumberInput
          label="Teto do custo mensal total (R$)"

          value={form.maxMonthlyTotal}

          onValue={(value) => onChange({ maxMonthlyTotal: value })}

          hint="Vazio = sem teto informado."
        />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Combinação personalizada (opcional)</legend>

        <NumberInput
          label="Entrada desejada (R$)"

          value={form.personalDownPayment}

          onValue={(value) => onChange({ personalDownPayment: value })}

          hint="Preencha com o prazo para avaliar uma combinação específica."
        />

        <NumberInput
          label="Prazo desejado (meses)"

          value={form.personalInstallments}

          onValue={(value) => onChange({ personalInstallments: value })}

          step="1"
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="qc-btn-primary">
          Buscar condições para este carro
        </button>
      </div>
    </form>
  )
}
