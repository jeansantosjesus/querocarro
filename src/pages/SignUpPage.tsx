import { zodResolver } from '@hookform/resolvers/zod'

import { useState } from 'react'

import { useForm, useWatch } from 'react-hook-form'

import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { Field } from '../components/ui/Field'

import { PageTitle } from '../components/ui/PageTitle'

import { useAuth } from '../features/auth/AuthContext'

import { PasswordRequirements } from '../features/auth/PasswordRequirements'

import { signUpSchema, type SignUpValues } from '../schemas/auth'

export function SignUpPage() {
  const { signUp, status, serviceAvailable } = useAuth()

  const navigate = useNavigate()

  const [formError, setFormError] = useState<string | null>(null)

  const [confirmationSent, setConfirmationSent] = useState(false)

  const {
    register,

    handleSubmit,

    control,

    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),

    defaultValues: { name: '', email: '', password: '', confirmPassword: '', acceptPrivacy: false },
  })

  const password = useWatch({ control, name: 'password' }) ?? ''

  if (status === 'authenticated' && !confirmationSent) return <Navigate to="/painel" replace />

  async function onSubmit(values: SignUpValues) {
    setFormError(null)

    const result = await signUp({
      name: values.name,

      email: values.email,

      password: values.password,
    })

    if (!result.ok) {
      setFormError(result.message)

      return
    }

    if (result.data.needsEmailConfirmation) {
      setConfirmationSent(true)

      return
    }

    navigate('/painel', { replace: true })
  }

  if (confirmationSent) {
    return (
      <div className="mx-auto max-w-lg">
        <PageTitle title="Confirme seu e-mail" />

        <Alert tone="good" title="Quase lá!">
          Se o endereço informado puder ser cadastrado, enviamos uma mensagem com um link de
          confirmação. Abra o e-mail, confirme e depois entre no Quero Carro.
        </Alert>

        <p className="mt-6">
          <Link to="/entrar" className="qc-btn-primary">
            Ir para o login
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle
        title="Criar conta"

        subtitle="Pedimos apenas nome, e-mail e senha. Não solicitamos CPF, endereço, dados bancários ou de cartão."
      />

      {!serviceAvailable ? (
        <div className="mb-4">
          <Alert tone="warn" title="Cadastro indisponível neste ambiente">
            O serviço de autenticação não está configurado. Você pode explorar o{' '}
            <Link to="/entrar" className="font-semibold underline">
              modo demonstração
            </Link>
            .
          </Alert>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="qc-card space-y-5 p-6">
        {formError ? <Alert tone="bad">{formError}</Alert> : null}

        <Field label="Nome" required error={errors.name?.message}>
          {(props) => (
            <input {...props} className="qc-input" autoComplete="name" {...register('name')} />
          )}
        </Field>

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
            <>
              <input
                {...props}

                type="password"

                className="qc-input"

                autoComplete="new-password"

                {...register('password')}
              />

              <PasswordRequirements password={password} id="password-requirements" />
            </>
          )}
        </Field>

        <Field label="Confirmar senha" required error={errors.confirmPassword?.message}>
          {(props) => (
            <input
              {...props}

              type="password"

              className="qc-input"

              autoComplete="new-password"

              {...register('confirmPassword')}
            />
          )}
        </Field>

        <div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"

              className="mt-1 size-5"

              aria-invalid={Boolean(errors.acceptPrivacy)}

              {...register('acceptPrivacy')}
            />

            <span>
              Li e aceito o{' '}
              <Link to="/ajuda/privacidade" className="font-semibold text-brand-800 underline">
                aviso de privacidade
              </Link>{' '}
              e entendo que os resultados são estimativas, não aconselhamento financeiro.
            </span>
          </label>

          {errors.acceptPrivacy ? (
            <p className="qc-error" role="alert">
              {errors.acceptPrivacy.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"

          className="qc-btn-primary w-full"

          disabled={isSubmitting || !serviceAvailable}
        >
          {isSubmitting ? 'Criando conta…' : 'Criar conta'}
        </button>

        <p className="text-center text-sm text-ink-700">
          Já tem conta?{' '}
          <Link to="/entrar" className="font-semibold text-brand-800 underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  )
}
