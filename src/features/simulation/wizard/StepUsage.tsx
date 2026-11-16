import { useFormContext } from 'react-hook-form'

import { Field } from '../../../components/ui/Field'

import { INPUT_LIMITS } from '../../../config/limits'

import { USAGE_MIX } from '../../../config/assumptions'

import type { SimulationInput } from '../../../schemas/simulation'

import { calculateMonthlyKm } from '../../../domain/finance/indicators'

import { formatNumber } from '../../../utils/format'

import { NumberField } from './NumberField'

const USAGE_LABELS = {
  urbano: 'Urbano',

  rodoviario: 'Rodoviário',

  misto: 'Misto',
} as const

export function StepUsage() {
  const {
    register,

    watch,

    formState: { errors },
  } = useFormContext<SimulationInput>()

  const kmPerDay = Number(watch('usage.kmPerDay'))

  const days = Number(watch('usage.daysPerWeek'))

  const override = watch('usage.monthlyKmOverride')

  const monthlyKm =
    Number.isFinite(kmPerDay) && Number.isFinite(days)
      ? calculateMonthlyKm({
          kmPerDay,

          daysPerWeek: days,

          monthlyKmOverride:
            typeof override === 'number' && Number.isFinite(override) ? override : null,
        } as SimulationInput['usage'])
      : null

  const err = errors.usage

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="qc-label">Tipo de uso predominante</legend>

        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(USAGE_LABELS) as Array<keyof typeof USAGE_LABELS>).map((type) => (
            <label
              key={type}

              className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-300 bg-white p-4 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"

                value={type}

                className="mt-1 size-5"

                {...register('usage.type')}
              />

              <span>
                <span className="block font-semibold">{USAGE_LABELS[type]}</span>

                <span className="block text-sm text-ink-700">
                  Consumo estimado com {Math.round(USAGE_MIX[type].urban * 100)}% urbano /{' '}
                  {Math.round(USAGE_MIX[type].highway * 100)}% estrada
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <NumberField
          name="usage.kmPerDay"

          label="Quilômetros por dia de uso"

          min={0}

          max={INPUT_LIMITS.kmPerDay.max}
        />

        <NumberField
          name="usage.daysPerWeek"

          label="Dias de uso por semana"

          step="1"

          min={1}

          max={7}
        />

        <NumberField
          name="usage.monthlyKmOverride"

          label="Quilometragem mensal (opcional)"

          optional

          min={0}

          max={INPUT_LIMITS.kmPerMonth.max}

          hint="Se preencher, substitui o cálculo por km/dia."
        />

        <NumberField
          name="usage.passengers"

          label="Passageiros habituais (incluindo você)"

          step="1"

          min={1}

          max={9}
        />
      </div>

      {monthlyKm !== null ? (
        <p className="rounded-xl bg-ink-100 p-3 text-sm" aria-live="polite">
          Quilometragem mensal estimada: <strong>{formatNumber(monthlyKm, 0)} km</strong>
        </p>
      ) : null}

      <Field label="Necessidade de porta-malas" error={err?.trunkNeed?.message}>
        {(props) => (
          <select {...props} className="qc-input" {...register('usage.trunkNeed')}>
            <option value="baixa">Baixa (compras pequenas)</option>

            <option value="media">Média (bagagem de viagem curta)</option>

            <option value="alta">Alta (família, carga, viagens longas)</option>
          </select>
        )}
      </Field>
    </div>
  )
}
