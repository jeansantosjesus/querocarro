import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Alert } from '../components/ui/Alert'
import { Field } from '../components/ui/Field'
import { PageTitle } from '../components/ui/PageTitle'
import { useAuth } from '../features/auth/AuthContext'
import { AUTH_MESSAGES } from '../services/auth/types'
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas/auth'

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null)
    const result = await requestPasswordReset(values.email)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle
        title="Recuperar senha"
        subtitle="Informe seu e-mail para receber um link de redefinição."
      />

      {sent ? (
        <Alert tone="good">{AUTH_MESSAGES.resetSent}</Alert>
      ) : (
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
          <button type="submit" className="qc-btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando…' : 'Enviar link de redefinição'}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm">
        <Link to="/entrar" className="font-semibold text-brand-800 underline">
          Voltar ao login
        </Link>
      </p>
    </div>
  )
}
