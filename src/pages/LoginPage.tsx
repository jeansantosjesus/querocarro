import { zodResolver } from '@hookform/resolvers/zod'

import { useState } from 'react'

import { useForm } from 'react-hook-form'

import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { Field } from '../components/ui/Field'

import { PageTitle } from '../components/ui/PageTitle'

import { useAuth } from '../features/auth/AuthContext'

import { useSimulation } from '../features/simulation/SimulationContext'

import { AUTH_MESSAGES } from '../services/auth/types'

import { signInSchema, type SignInValues } from '../schemas/auth'

function safeRedirect(from: unknown): string {
  // Apenas caminhos internos conhecidos: evita redirecionamento aberto.

  return typeof from === 'string' && /^\/[A-Za-z0-9/_-]*$/.test(from) && !from.startsWith('//')
    ? from
    : '/painel'
}

export function LoginPage() {
  const { signIn, status, sessionExpired, clearSessionExpired, enterDemo, serviceAvailable } =
    useAuth()

  const { startNew } = useSimulation()

  const navigate = useNavigate()

  const location = useLocation()

  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,

    handleSubmit,

    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),

    defaultValues: { email: '', password: '', remember: false },
  })

  const destination = safeRedirect((location.state as { from?: unknown } | null)?.from)

  if (status === 'authenticated') return <Navigate to={destination} replace />

  async function onSubmit(values: SignInValues) {
    setFormError(null)

    const result = await signIn(values)

    if (!result.ok) {
      setFormError(result.message)

      return
    }

    clearSessionExpired()

    navigate(destination, { replace: true })
  }

  function handleDemo() {
    enterDemo()

    startNew('demo')

    navigate('/painel', { replace: true })
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle title="Entrar" />

      <div className="mb-4 space-y-3">
        {sessionExpired ? <Alert tone="warn">{AUTH_MESSAGES.sessionExpired}</Alert> : null}

        {!serviceAvailable ? <Alert tone="warn">{AUTH_MESSAGES.unavailable}</Alert> : null}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="qc-card space-y-5 p-6">
        {formError ? <Alert tone="bad">{formError}</Alert> : null}

        <Field label="E-mail" required error={errors.email?.message}>
          {(props) => (
            <input
              {...props}

              type="email"

              className="qc-input"

              autoComplete="email"

              {...register('email')}
            />
          )}
        </Field>

        <Field label="Senha" required error={errors.password?.message}>
          {(props) => (
            <input
              {...props}

              type="password"

              className="qc-input"

              autoComplete="current-password"

              {...register('password')}
            />
          )}
        </Field>

        <div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1 size-5" {...register('remember')} />

            <span>
              Permanecer conectado neste dispositivo
              <span className="block text-ink-600">Não marque em computadores compartilhados.</span>
            </span>
          </label>
        </div>

        <button
          type="submit"

          className="qc-btn-primary w-full"

          disabled={isSubmitting || !serviceAvailable}
        >
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>

        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <Link to="/recuperar-senha" className="font-semibold text-brand-800 underline">
            Esqueci minha senha
          </Link>

          <Link to="/cadastro" className="font-semibold text-brand-800 underline">
            Criar conta
          </Link>
        </div>
      </form>

      <div className="qc-card mt-6 p-6">
        <h2 className="text-lg font-bold">Quer só conhecer?</h2>

        <p className="mt-1 text-ink-700">
          O modo demonstração usa dados fictícios e a base de veículos salva. Nada é salvo e nenhum
          dado seu é enviado; só as fotos dos carros são carregadas da Wikimedia Commons (você pode
          desligá-las no resultado).
        </p>

        <button type="button" className="qc-btn-secondary mt-4" onClick={handleDemo}>
          Experimentar a demonstração
        </button>
      </div>
    </div>
  )
}
