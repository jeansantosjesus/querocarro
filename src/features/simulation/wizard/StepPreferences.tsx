import { useFormContext } from 'react-hook-form'

import { Field } from '../../../components/ui/Field'

import { INPUT_LIMITS } from '../../../config/limits'

import type { SimulationInput } from '../../../schemas/simulation'

import { NumberField } from './NumberField'

import { brandList } from './numeric'

const FUEL_LABELS: Record<string, string> = {
  indiferente: 'Indiferente',

  flex: 'Flex',

  gasolina: 'Gasolina',

  etanol: 'Etanol',

  diesel: 'Diesel',

  hibrido: 'Híbrido',

  eletrico: 'Elétrico',
}

const PRIORITY_FIELDS = [
  {
    key: 'economia',

    label: 'Folga na renda',

    hint: 'Aumenta a importância da situação financeira: orçamento, capacidade e reserva.',
  },

  {
    key: 'conforto',

    label: 'Conforto e espaço',

    hint: 'Aumenta a importância da aderência ao uso.',
  },

  {
    key: 'manutencao',

    label: 'Custo total (TCO)',

    hint: 'Aumenta a importância do custo total no horizonte: parcela, juros, impostos, seguro, energia, manutenção e depreciação.',
  },

  {
    key: 'desempenho',

    label: 'Desempenho e gosto pessoal',

    hint: 'Aumenta a importância das preferências informadas.',
  },
] as const

export function StepPreferences() {
  const {
    register,

    watch,

    formState: { errors },
  } = useFormContext<SimulationInput>()

  const err = errors.preferences

  const fuel = watch('preferences.fuel')

  const transmission = watch('preferences.transmission')

  const condition = watch('objective.condition')

  return (
    <div className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-lg font-bold">Combustível e câmbio</legend>

        <p className="text-sm text-ink-700">
          Por padrão, preferências apenas <strong>influenciam</strong> a pontuação. Marque
          “obrigatório” para excluir as opções que não atendem.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Field label="Combustível" error={err?.fuel?.message}>
              {(props) => (
                <select {...props} className="qc-input" {...register('preferences.fuel')}>
                  {Object.entries(FUEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            {fuel !== 'indiferente' ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"

                  className="size-5"

                  {...register('preferences.requireFuel')}
                />
                Obrigatório
              </label>
            ) : null}
          </div>

          <div className="space-y-2">
            <Field label="Câmbio" error={err?.transmission?.message}>
              {(props) => (
                <select {...props} className="qc-input" {...register('preferences.transmission')}>
                  <option value="indiferente">Indiferente</option>

                  <option value="manual">Manual</option>

                  <option value="automatico">Automático</option>
                </select>
              )}
            </Field>

            {transmission !== 'indiferente' ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"

                  className="size-5"

                  {...register('preferences.requireTransmission')}
                />
                Obrigatório
              </label>
            ) : null}
          </div>
        </div>

        {condition !== 'indiferente' ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"

              className="size-5"

              {...register('preferences.requireCondition')}
            />
            Tratar a condição escolhida ({condition === 'novo' ? 'novos' : 'usados'}) como
            obrigatória
          </label>
        ) : null}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-bold">Ano do modelo</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <NumberField
            name="preferences.yearMin"

            label="Ano mínimo (opcional)"

            optional

            step="1"

            min={INPUT_LIMITS.yearRange.min}

            max={INPUT_LIMITS.yearRange.max}
          />

          <NumberField
            name="preferences.yearMax"

            label="Ano máximo (opcional)"

            optional

            step="1"

            min={INPUT_LIMITS.yearRange.min}

            max={INPUT_LIMITS.yearRange.max}
          />
        </div>

        {err?.yearMin?.message ? <p className="qc-error">{err.yearMin.message}</p> : null}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-bold">Marcas</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Marcas desejadas"

            hint="Separe por vírgula. Ex.: Fiat, Volkswagen. Apenas aumenta a pontuação."

            error={(err?.wantedBrands as { message?: string } | undefined)?.message}
          >
            {(props) => (
              <input
                {...props}

                className="qc-input"

                {...register('preferences.wantedBrands', brandList)}
              />
            )}
          </Field>

          <Field
            label="Marcas que prefere evitar"

            hint="Separe por vírgula. Essas marcas são removidas da análise."

            error={(err?.avoidedBrands as { message?: string } | undefined)?.message}
          >
            {(props) => (
              <input
                {...props}

                className="qc-input"

                {...register('preferences.avoidedBrands', brandList)}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-bold">O que é mais importante para você?</legend>

        <p className="text-sm text-ink-700">
          De 1 (menos) a 5 (mais). Esses controles ajustam os pesos sugeridos; você poderá
          refiná-los na próxima etapa.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {PRIORITY_FIELDS.map((priority) => (
            <NumberField
              key={priority.key}

              name={`preferences.priorities.${priority.key}`}

              label={`${priority.label} (1 a 5)`}

              hint={priority.hint}

              step="1"

              min={1}

              max={5}
            />
          ))}
        </div>
      </fieldset>
    </div>
  )
}
