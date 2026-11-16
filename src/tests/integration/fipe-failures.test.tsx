import { screen } from '@testing-library/react'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CatalogSource, ProviderFactory } from '../../features/vehicles/CatalogContext'

import { FipeError } from '../../services/fipe/errors'

import { MockVehicleDataProvider } from '../../services/vehicles/MockVehicleDataProvider'

import type { VehicleCatalog, VehicleDataProvider } from '../../types/vehicle'

import { renderApp } from '../fixtures/renderApp'

vi.setConfig({ testTimeout: 60_000 })

beforeEach(() => {
  window.sessionStorage.clear()

  window.localStorage.clear()
})

type App = Awaited<ReturnType<typeof renderApp>>

async function startDemoUntilProcessing(app: App) {
  const { user } = app

  await user.click(await screen.findByRole('button', { name: /Experimentar a demonstração/ }))

  await user.click(await screen.findByRole('button', { name: /Começar com dados fictícios/ }))

  await screen.findByRole('heading', { level: 2, name: 'Objetivo' })

  for (let i = 0; i < 5; i += 1) await user.click(screen.getByRole('button', { name: 'Continuar' }))

  await user.click(screen.getByRole('button', { name: 'Calcular opções' }))
}

function failingThenOk(error: FipeError): { factory: ProviderFactory; calls: CatalogSource[] } {
  const calls: CatalogSource[] = []

  let attempt = 0

  const factory: ProviderFactory = (source) => {
    calls.push(source)

    attempt += 1

    const provider: VehicleDataProvider =
      attempt === 1
        ? {
            id: 'falha',

            label: 'Falha simulada',

            loadCatalog: () => Promise.reject(error),
          }
        : new MockVehicleDataProvider()

    return provider
  }

  return { factory, calls }
}

describe('falhas da API FIPE', () => {
  it('limite de consultas (HTTP 429): mensagem amigável e nova tentativa', async () => {
    const { factory } = failingThenOk(new FipeError('rate_limit', 'HTTP 429', { status: 429 }))

    const app = await renderApp({ route: '/', providerFactory: factory })

    await startDemoUntilProcessing(app)

    expect(
      await screen.findByText(/limite de consultas à tabela FIPE foi atingido/i),
    ).toBeInTheDocument()

    expect(screen.queryByText(/FIPE:rate_limit/)).not.toBeInTheDocument() // sem detalhes técnicos

    await app.user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await screen.findByRole(
      'heading',

      { level: 2, name: /Grupo de opções compatíveis/ },

      { timeout: 15_000 },
    )
  })

  it.each([
    ['network', /Não foi possível conectar à tabela FIPE/],

    ['timeout', /demorou mais que o esperado/],

    ['invalid_response', /formato inesperado/],
  ] as const)('erro %s mostra mensagem específica e permite voltar', async (kind, message) => {
    const { factory } = failingThenOk(new FipeError(kind, 'detalhe interno'))

    const app = await renderApp({ route: '/', providerFactory: factory })

    await startDemoUntilProcessing(app)

    expect(await screen.findByText(message)).toBeInTheDocument()

    expect(screen.queryByText(/detalhe interno/)).not.toBeInTheDocument()

    await app.user.click(screen.getByRole('button', { name: 'Voltar à revisão' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Revisão' })).toBeInTheDocument()
  })

  it('o modo demonstração nunca consulta a FIPE ao vivo', async () => {
    const calls: CatalogSource[] = []

    const factory: ProviderFactory = (source) => {
      calls.push(source)

      return new MockVehicleDataProvider()
    }

    const app = await renderApp({ route: '/', providerFactory: factory })

    await startDemoUntilProcessing(app)

    await screen.findByRole(
      'heading',

      { level: 2, name: /Grupo de opções compatíveis/ },

      { timeout: 15_000 },
    )

    expect(calls).toEqual(['saved'])
  })

  it('consulta parcial: avisa que parte dos preços é referência salva e permite tentar de novo', async () => {
    const full = await new MockVehicleDataProvider().loadCatalog()

    const partial: VehicleCatalog = {
      ...full,

      liveStatus: 'parcial',

      onlineCount: 20,

      snapshotCount: full.vehicles.length - 20,

      retryable: true,
    }

    const online: VehicleCatalog = {
      ...full,

      liveStatus: 'online',

      onlineCount: full.vehicles.length,

      snapshotCount: 0,

      retryable: false,
    }

    let calls = 0

    const factory: ProviderFactory = () => ({
      id: 'live',

      label: 'FIPE simulada',

      loadCatalog: async () => {
        calls += 1

        return calls === 1 ? partial : online
      },
    })

    const app = await renderApp({ route: '/', signedIn: true, providerFactory: factory })

    const { user } = app

    await user.click(await screen.findByRole('link', { name: 'Nova simulação' }))

    await user.type(await screen.findByLabelText(/^Nome da simulação/), 'Teste parcial')

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await screen.findByRole('heading', { level: 2, name: 'Finanças' })

    await user.type(screen.getByLabelText(/^Renda líquida/), '12000')

    await user.type(screen.getByLabelText(/^Despesas fixas/), '4000')

    await user.type(screen.getByLabelText(/^Gasto mensal máximo/), '3500')

    await user.type(screen.getByLabelText(/^Valor disponível para entrada/), '30000')

    await user.type(screen.getByLabelText(/^Reserva acumulada/), '40000')

    await user.selectOptions(
      screen.getByRole('combobox', { name: /Em qual estado o veículo será registrado/ }),

      'BA',
    )

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await screen.findByRole('heading', { level: 2, name: 'Uso' })

    await user.type(screen.getByLabelText(/^Quilômetros por dia/), '30')

    for (let i = 0; i < 3; i += 1)
      await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await screen.findByRole('heading', { level: 2, name: 'Revisão' })

    await user.click(screen.getByRole('button', { name: 'Calcular opções' }))

    expect(
      await screen.findByText(
        /Parte dos preços usa a referência FIPE salva/,

        {},

        { timeout: 15_000 },
      ),
    ).toBeInTheDocument()

    expect(screen.getByText(/20 online/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await vi.waitFor(() =>
      expect(
        screen.queryByText(/Parte dos preços usa a referência FIPE salva/),
      ).not.toBeInTheDocument(),
    )
  })
})
