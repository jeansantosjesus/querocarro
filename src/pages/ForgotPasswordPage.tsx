import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../components/ui/Alert'
import { PageTitle } from '../components/ui/PageTitle'
import { useAuth } from '../features/auth/AuthContext'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Ocorreu um erro ao enviar o e-mail de recuperação.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <PageTitle
        title="Recuperar senha"
        subtitle="Informe seu e-mail cadastrado para receber as instruções de redefinição."
      />

      {error ? (
        <Alert tone="error" title="Atenção">
          {error}
        </Alert>
      ) : null}

      {success ? (
        <div className="space-y-4">
          <Alert tone="success" title="E-mail enviado!">
            Se houver uma conta associada a <strong>{email}</strong>, você receberá um link para
            redefinir sua senha em instantes.
          </Alert>
          <Link to="/login" className="qc-btn-primary block text-center">
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="qc-card space-y-4 p-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-900">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-ink-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="seu.email@exemplo.com"
            />
          </div>

          <button type="submit" disabled={loading} className="qc-btn-primary w-full justify-center">
            {loading ? 'Enviando...' : 'Enviar instruções'}
          </button>

          <div className="text-center text-sm">
            <Link to="/login" className="font-semibold text-brand-800 underline">
              Voltar ao login
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
