import { useCallback, useEffect, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { PageTitle } from '../components/ui/PageTitle'

import { Spinner } from '../components/ui/Spinner'

import { getScenarioDefinition } from '../config/scenarios'

import { useRepositories } from '../features/history/RepositoriesContext'

import { useSimulation } from '../features/simulation/SimulationContext'

import type { SavedSimulationSummary } from '../types/history'

import { formatDateTime, formatReferenceMonth } from '../utils/format'

export function HistoryPage() {
  const repositories = useRepositories()

  const { loadInput } = useSimulation()

  const navigate = useNavigate()

  const [items, setItems] = useState<SavedSimulationSummary[] | null>(null)

  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<string[]>([])

  const [confirmAll, setConfirmAll] = useState(false)

  const [busyId, setBusyId] = useState<string | null>(null)

  const [reloadKey, setReloadKey] = useState(0)

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let active = true

    if (!repositories) return

    repositories.simulations

      .list()

      .then((list) => {
        if (!active) return

        setError(null)

        setItems(list)
      })

      .catch(() => {
        if (!active) return

        setError('Não foi possível carregar o histórico agora. Tente novamente.')

        setItems([])
      })

    return () => {
      active = false
    }
  }, [repositories, reloadKey])

  if (!repositories) {
    return (
      <div>
        <PageTitle title="Histórico" />

        <Alert tone="info">O histórico está disponível apenas para usuários com conta.</Alert>
      </div>
    )
  }

  async function duplicate(id: string) {
    if (!repositories) return

    setBusyId(id)

    try {
      const saved = await repositories.simulations.get(id)

      if (!saved) {
        setError('Simulação não encontrada.')

        return
      }

      loadInput({
        ...saved.inputs,

        objective: { ...saved.inputs.objective, title: `${saved.title} (cópia)`.slice(0, 80) },
      })

      navigate('/simulacao')
    } catch {
      setError('Não foi possível duplicar esta simulação.')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id: string, title: string) {
    if (!repositories) return

    if (!window.confirm(`Excluir a simulação “${title}”? Esta ação não pode ser desfeita.`)) return

    setBusyId(id)

    try {
      await repositories.simulations.remove(id)

      setSelected((current) => current.filter((value) => value !== id))

      refresh()
    } catch {
      setError('Não foi possível excluir esta simulação.')
    } finally {
      setBusyId(null)
    }
  }

  async function removeAll() {
    if (!repositories) return

    try {
      await repositories.simulations.removeAll()

      setSelected([])

      setConfirmAll(false)

      refresh()
    } catch {
      setError('Não foi possível excluir o histórico.')
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id)

      return current.length >= 2 ? [current[1] as string, id] : [...current, id]
    })
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Histórico de simulações"

        subtitle="Somente você tem acesso a estas simulações. Exclua o que quiser, quando quiser."

        actions={
          <Link to="/simulacao" className="qc-btn-primary">
            Nova simulação
          </Link>
        }
      />

      {error ? <Alert tone="bad">{error}</Alert> : null}

      {items === null ? <Spinner label="Carregando histórico…" /> : null}

      {items !== null && items.length === 0 && !error ? (
        <Alert tone="info">
          Você ainda não salvou simulações. Ao concluir uma simulação, escolha “Salvar no
          histórico”.
        </Alert>
      ) : null}

      {items !== null && items.length > 0 ? (
        <>
          <div className="no-print flex flex-wrap items-center gap-3">
            <Link
              to={`/historico/comparar?a=${selected[0] ?? ''}&b=${selected[1] ?? ''}`}

              aria-disabled={selected.length !== 2}

              onClick={(event) => {
                if (selected.length !== 2) event.preventDefault()
              }}

              className={`qc-btn-secondary ${selected.length !== 2 ? 'pointer-events-none opacity-60' : ''}`}
            >
              Comparar 2 simulações ({selected.length}/2)
            </Link>

            {confirmAll ? (
              <span className="flex flex-wrap items-center gap-2" role="alert">
                Excluir TODO o histórico?
                <button type="button" className="qc-btn-danger" onClick={() => void removeAll()}>
                  Sim, excluir tudo
                </button>
                <button
                  type="button"

                  className="qc-btn-secondary"

                  onClick={() => setConfirmAll(false)}
                >
                  Cancelar
                </button>
              </span>
            ) : (
              <button type="button" className="qc-btn-danger" onClick={() => setConfirmAll(true)}>
                Excluir todo o histórico
              </button>
            )}
          </div>

          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}

                className="qc-card flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"

                    className="no-print mt-1 size-5"

                    checked={selected.includes(item.id)}

                    onChange={() => toggle(item.id)}

                    aria-label={`Selecionar “${item.title}” para comparação`}
                  />

                  <div>
                    <h2 className="text-lg font-bold">{item.title}</h2>

                    <p className="text-sm text-ink-700">
                      Salva em {formatDateTime(item.createdAt)} · cenário{' '}
                      {getScenarioDefinition(item.scenarioId).label} · FIPE{' '}
                      {formatReferenceMonth(item.fipeReferenceMonth, item.fipeReferenceMonthLabel)}{' '}
                      · {item.resultCount} opções avaliadas
                    </p>
                  </div>
                </div>

                <div className="no-print flex flex-wrap gap-2">
                  <Link to={`/historico/${item.id}`} className="qc-btn-secondary">
                    Abrir
                  </Link>

                  <button
                    type="button"

                    className="qc-btn-secondary"

                    disabled={busyId === item.id}

                    onClick={() => void duplicate(item.id)}
                  >
                    Duplicar
                  </button>

                  <button
                    type="button"

                    className="qc-btn-danger"

                    disabled={busyId === item.id}

                    onClick={() => void remove(item.id, item.title)}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
