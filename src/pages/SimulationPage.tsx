import { zodResolver } from '@hookform/resolvers/zod'

import { useCallback, useEffect, useRef, useState } from 'react'

import { FormProvider, useForm, useWatch, type DefaultValues } from 'react-hook-form'

import { useLocation, useNavigate } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { PageTitle } from '../components/ui/PageTitle'

import { initialWeights } from '../domain/decision/scenarios'

import { useAuth } from '../features/auth/AuthContext'

import { useSimulation } from '../features/simulation/SimulationContext'

import { StepFinance } from '../features/simulation/wizard/StepFinance'

import { StepObjective } from '../features/simulation/wizard/StepObjective'

import { StepPreferences } from '../features/simulation/wizard/StepPreferences'

import { StepProcessing } from '../features/simulation/wizard/StepProcessing'

import { StepReview } from '../features/simulation/wizard/StepReview'

import { StepUsage } from '../features/simulation/wizard/StepUsage'

import { StepWeights } from '../features/simulation/wizard/StepWeights'

import { WIZARD_STEPS } from '../features/simulation/wizard/steps'

import { useCatalog } from '../features/vehicles/CatalogContext'

import { simulationInputSchema, type SimulationInput } from '../schemas/simulation'

const PROCESSING_INDEX = WIZARD_STEPS.findIndex((step) => step.id === 'processamento')

const REVIEW_INDEX = WIZARD_STEPS.findIndex((step) => step.id === 'revisao')

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function SimulationPage() {
  const { draft, setDraft, weightsCustomized, commitInput } = useSimulation()

  const { isDemo } = useAuth()

  const { load } = useCatalog()

  const navigate = useNavigate()

  const form = useForm<SimulationInput>({
    resolver: zodResolver(simulationInputSchema),

    defaultValues: draft as DefaultValues<SimulationInput>,

    mode: 'onTouched',
  })

  const location = useLocation()

  const [stepIndex, setStepIndex] = useState(() => {
    const requested = (location.state as { step?: string } | null)?.step

    const index = WIZARD_STEPS.findIndex((item) => item.id === requested)

    // Só é permitido abrir uma etapa já validada (até a revisão).

    return index >= 0 && index <= REVIEW_INDEX ? index : 0
  })

  const [stepError, setStepError] = useState(false)

  const [validationError, setValidationError] = useState<string | null>(null)

  const headingRef = useRef<HTMLHeadingElement>(null)

  const runId = useRef(0)

  // Guarda o rascunho (em memória) ao sair da página, para voltar sem perder dados.

  const getValues = form.getValues

  useEffect(() => () => setDraft(getValues() as SimulationInput), [getValues, setDraft])

  // Enquanto o usuário não personalizou os pesos, eles acompanham cenário e prioridades.

  const scenarioId = useWatch({ control: form.control, name: 'objective.scenarioId' })

  const economia = useWatch({ control: form.control, name: 'preferences.priorities.economia' })

  const conforto = useWatch({ control: form.control, name: 'preferences.priorities.conforto' })

  const desempenho = useWatch({ control: form.control, name: 'preferences.priorities.desempenho' })

  const manutencao = useWatch({ control: form.control, name: 'preferences.priorities.manutencao' })

  useEffect(() => {
    if (weightsCustomized) return

    const clamp = (value: unknown) => Math.min(5, Math.max(1, Math.round(finiteOr(value, 3))))

    form.setValue(
      'weights',

      initialWeights(scenarioId, {
        economia: clamp(economia),

        conforto: clamp(conforto),

        desempenho: clamp(desempenho),

        manutencao: clamp(manutencao),
      }),
    )
  }, [scenarioId, economia, conforto, desempenho, manutencao, weightsCustomized, form])

  useEffect(() => {
    headingRef.current?.focus()
  }, [stepIndex])

  const step = WIZARD_STEPS[stepIndex]

  const buildInput = useCallback(
    () =>
      simulationInputSchema.safeParse({
        ...form.getValues(),

        useLiveFipe: isDemo ? false : form.getValues('useLiveFipe'),
      }),

    [form, isDemo],
  )

  const process = useCallback(async () => {
    const current = ++runId.current

    const parsed = buildInput()

    // Entrada inválida: a mensagem é definida ao sair da revisão (goNext).

    if (!parsed.success) return

    const catalog = await load(parsed.data.useLiveFipe ? 'live' : 'saved')

    if (current !== runId.current || !catalog) return

    commitInput(parsed.data)

    navigate('/resultado', { replace: true })
  }, [buildInput, load, commitInput, navigate])

  useEffect(() => {
    if (stepIndex === PROCESSING_INDEX) void process()

    return () => {
      runId.current += 1
    }
  }, [stepIndex, process])

  async function goNext() {
    if (!step) return

    const valid = await form.trigger(step.fields, { shouldFocus: true })

    setStepError(!valid)

    if (!valid) return

    setDraft(form.getValues() as SimulationInput)

    if (stepIndex === REVIEW_INDEX && !buildInput().success) {
      setValidationError(
        'Alguns campos estão ausentes ou inválidos. Volte às etapas anteriores e confira os valores destacados.',
      )
    }

    setStepIndex((index) => Math.min(index + 1, WIZARD_STEPS.length - 1))
  }

  function goBack() {
    setStepError(false)

    setDraft(form.getValues() as SimulationInput)

    setStepIndex((index) => Math.max(index - 1, 0))
  }

  if (!step) return null

  const isProcessing = stepIndex === PROCESSING_INDEX

  const progressValue = Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100)

  return (
    <div>
      <PageTitle
        title="Nova simulação"

        subtitle="Responda às etapas para ver opções compatíveis com os parâmetros desta simulação."
      />

      <nav aria-label="Progresso da simulação" className="mb-6">
        <p className="mb-2 text-sm font-semibold text-ink-800">
          Etapa {stepIndex + 1} de {WIZARD_STEPS.length}: {step.title}
        </p>

        <div
          role="progressbar"

          aria-label="Progresso"

          aria-valuemin={0}

          aria-valuemax={100}

          aria-valuenow={progressValue}

          className="h-2 w-full overflow-hidden rounded-full bg-ink-200"
        >
          <div className="h-full bg-brand-700" style={{ width: `${progressValue}%` }} />
        </div>

        <ol className="mt-3 hidden flex-wrap gap-2 text-xs sm:flex">
          {WIZARD_STEPS.map((item, index) => (
            <li
              key={item.id}

              aria-current={index === stepIndex ? 'step' : undefined}

              className={`rounded-full px-3 py-1 ${
                index === stepIndex
                  ? 'bg-brand-700 font-semibold text-white'
                  : index < stepIndex
                    ? 'bg-brand-100 text-brand-900'
                    : 'bg-ink-100 text-ink-700'
              }`}
            >
              {index + 1}. {item.title}
              {index < stepIndex ? <span className="sr-only"> (concluída)</span> : null}
            </li>
          ))}
        </ol>
      </nav>

      <FormProvider {...form}>
        <form
          noValidate

          onSubmit={(event) => {
            event.preventDefault()

            if (!isProcessing) void goNext()
          }}

          className="qc-card p-6"
        >
          <h2 ref={headingRef} tabIndex={-1} className="mb-5 text-xl font-bold focus:outline-none">
            {step.title}
          </h2>

          {stepError ? (
            <div className="mb-5">
              <Alert tone="bad">Revise os campos destacados antes de continuar.</Alert>
            </div>
          ) : null}
          {step.id === 'objetivo' ? <StepObjective /> : null}

          {step.id === 'financas' ? <StepFinance /> : null}

          {step.id === 'uso' ? <StepUsage /> : null}

          {step.id === 'preferencias' ? <StepPreferences /> : null}

          {step.id === 'pesos' ? <StepWeights /> : null}

          {step.id === 'revisao' ? <StepReview /> : null}

          {step.id === 'processamento' ? (
            <StepProcessing
              validationError={validationError}

              onRetry={() => void process()}

              onBack={() => {
                setStepIndex(validationError ? 0 : REVIEW_INDEX)

                setValidationError(null)
              }}
            />
          ) : null}

          {!isProcessing ? (
            <div className="mt-8 flex flex-wrap justify-between gap-3">
              <button
                type="button"

                className="qc-btn-secondary"

                onClick={goBack}

                disabled={stepIndex === 0}
              >
                Voltar
              </button>

              <button type="submit" className="qc-btn-primary">
                {stepIndex === REVIEW_INDEX ? 'Calcular opções' : 'Continuar'}
              </button>
            </div>
          ) : null}
        </form>
      </FormProvider>
    </div>
  )
}
