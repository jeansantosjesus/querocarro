import { useEffect, useState } from 'react'

import { Link } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { PageTitle } from '../components/ui/PageTitle'

import { useAuth } from '../features/auth/AuthContext'

import { useRepositories } from '../features/history/RepositoriesContext'

import { useSimulation } from '../features/simulation/SimulationContext'

const CONFIRM_WORD = 'EXCLUIR'

export function ProfilePage() {
  const { user, signOut } = useAuth()

  const repositories = useRepositories()

  const { startNew } = useSimulation()

  const [consent, setConsent] = useState<boolean | null>(null)

  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)

  const [confirmText, setConfirmText] = useState('')

  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true

    if (!repositories) return

    repositories.preferences

      .get()

      .then((preferences) => {
        if (active) setConsent(preferences.persistHistoryConsent)
      })

      .catch(() => {
        if (active) setConsent(false)
      })

    return () => {
      active = false
    }
  }, [repositories])

  if (!user || !repositories) return null

  async function changeConsent(next: boolean) {
    if (!repositories) return

    setMessage(null)

    try {
      await repositories.preferences.update({ persistHistoryConsent: next })

      setConsent(next)

      setMessage({
        tone: 'good',

        text: next
          ? 'Salvamento no histórico autorizado.'
          : 'Salvamento no histórico desativado. O histórico existente foi mantido.',
      })
    } catch {
      setMessage({ tone: 'bad', text: 'Não foi possível atualizar a preferência agora.' })
    }
  }

  async function deleteHistory() {
    if (!repositories) return

    if (!window.confirm('Excluir todas as simulações salvas? Esta ação não pode ser desfeita.'))
      return

    setMessage(null)

    try {
      await repositories.simulations.removeAll()

      setMessage({ tone: 'good', text: 'Histórico excluído.' })
    } catch {
      setMessage({ tone: 'bad', text: 'Não foi possível excluir o histórico agora.' })
    }
  }

  async function deleteAccount() {
    if (!repositories || confirmText !== CONFIRM_WORD) return

    setBusy(true)

    setMessage(null)

    try {
      await repositories.profile.deleteAccount()

      startNew('blank')

      // A guarda de rota leva ao início ao encerrar a sessão de propósito.

      await signOut()
    } catch {
      setMessage({
        tone: 'bad',

        text: 'Não foi possível excluir a conta agora. Tente novamente mais tarde.',
      })

      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Perfil e privacidade" />

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <section aria-labelledby="prof-data" className="qc-card p-6">
        <h2 id="prof-data" className="text-xl font-bold">
          Seus dados
        </h2>

        <dl className="mt-3 text-sm">
          <div className="flex justify-between border-b border-ink-100 py-2">
            <dt className="text-ink-700">Nome</dt>

            <dd className="font-semibold">{user.displayName ?? '—'}</dd>
          </div>

          <div className="flex justify-between border-b border-ink-100 py-2">
            <dt className="text-ink-700">E-mail</dt>

            <dd className="font-semibold">{user.email}</dd>
          </div>
        </dl>

        <p className="mt-4">
          <Link to="/redefinir-senha" className="font-semibold text-brand-800 underline">
            Alterar senha
          </Link>
        </p>
      </section>

      <section aria-labelledby="prof-consent" className="qc-card p-6">
        <h2 id="prof-consent" className="text-xl font-bold">
          Histórico de simulações
        </h2>

        <label className="mt-3 flex items-start gap-3 text-sm">
          <input
            type="checkbox"

            className="mt-1 size-5"

            checked={consent === true}

            disabled={consent === null}

            onChange={(event) => void changeConsent(event.target.checked)}
          />

          <span>
            Permitir salvar minhas simulações (incluindo os valores financeiros informados) na minha
            conta. Você pode desativar a qualquer momento.
          </span>
        </label>

        <button type="button" className="qc-btn-danger mt-4" onClick={() => void deleteHistory()}>
          Excluir todo o meu histórico
        </button>
      </section>

      <section aria-labelledby="prof-delete" className="qc-card border-bad-fg/40 p-6">
        <h2 id="prof-delete" className="text-xl font-bold text-bad-fg">
          Excluir minha conta
        </h2>

        <p className="mt-2 text-sm text-ink-700">
          Remove o perfil, as preferências, todas as simulações salvas e o acesso. A ação é
          definitiva.
        </p>

        <div className="mt-4 max-w-sm">
          <label htmlFor="confirm-delete" className="qc-label">
            Digite {CONFIRM_WORD} para confirmar
          </label>

          <input
            id="confirm-delete"

            className="qc-input"

            value={confirmText}

            autoComplete="off"

            onChange={(event) => setConfirmText(event.target.value)}
          />
        </div>

        <button
          type="button"

          className="qc-btn-danger mt-4"

          disabled={confirmText !== CONFIRM_WORD || busy}

          onClick={() => void deleteAccount()}
        >
          {busy ? 'Excluindo…' : 'Excluir conta definitivamente'}
        </button>
      </section>
    </div>
  )
}
