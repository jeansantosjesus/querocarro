import { screen } from '@testing-library/react'

import { axe } from 'vitest-axe'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderApp } from '../fixtures/renderApp'

vi.setConfig({ testTimeout: 60_000 })

beforeEach(() => {
  window.sessionStorage.clear()

  window.localStorage.clear()
})

// jsdom não calcula layout/cores: regras dependentes disso são desativadas aqui

// e verificadas manualmente (ver docs/test-plan.md).

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } }

async function expectNoViolations(container: HTMLElement) {
  const results = await axe(container, AXE_OPTIONS)

  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`,
  )

  expect(summary).toEqual([])
}

describe('acessibilidade (axe)', () => {
  it('página inicial', async () => {
    const { container } = await renderApp({ route: '/' })

    await screen.findByRole('heading', { level: 1 })

    await expectNoViolations(container)
  })

  it('login', async () => {
    const { container } = await renderApp({ route: '/entrar' })

    await screen.findByRole('heading', { level: 1 })

    await expectNoViolations(container)
  })

  it('cadastro', async () => {
    const { container } = await renderApp({ route: '/cadastro' })

    await screen.findByRole('heading', { level: 1 })

    await expectNoViolations(container)
  })

  it('recuperação de senha', async () => {
    const { container } = await renderApp({ route: '/recuperar-senha' })

    await screen.findByRole('heading', { level: 1 })

    await expectNoViolations(container)
  })

  it('central de ajuda', async () => {
    const { container } = await renderApp({ route: '/ajuda' })

    await screen.findByRole('heading', { level: 1, name: 'Central de ajuda' })

    await expectNoViolations(container)
  })

  it('artigo da central de ajuda (metodologia)', async () => {
    const { container } = await renderApp({ route: '/ajuda/metodologia' })

    await screen.findByRole('heading', { level: 1, name: 'Metodologia' })

    await expectNoViolations(container)
  })

  it('painel (autenticado)', async () => {
    const { container } = await renderApp({ route: '/painel', signedIn: true })

    await screen.findByRole('heading', { level: 1 })

    await expectNoViolations(container)
  })

  it('assistente: etapa de objetivo e etapa de pesos', async () => {
    const app = await renderApp({ route: '/' })

    await app.user.click(await screen.findByRole('button', { name: /Experimentar a demonstração/ }))

    await app.user.click(await screen.findByRole('button', { name: /Começar com dados fictícios/ }))

    await screen.findByRole('heading', { level: 2, name: 'Objetivo' })

    await expectNoViolations(app.container)

    for (const title of ['Finanças', 'Uso', 'Preferências', 'Pesos']) {
      await app.user.click(screen.getByRole('button', { name: 'Continuar' }))

      await screen.findByRole('heading', { level: 2, name: title })
    }

    await expectNoViolations(app.container)
  })

  it('resultado e comparador (demo)', async () => {
    const app = await renderApp({ route: '/' })

    await app.user.click(await screen.findByRole('button', { name: /Experimentar a demonstração/ }))

    await app.user.click(await screen.findByRole('button', { name: /Começar com dados fictícios/ }))

    await screen.findByRole('heading', { level: 2, name: 'Objetivo' })

    for (const title of ['Finanças', 'Uso', 'Preferências', 'Pesos', 'Revisão']) {
      await app.user.click(screen.getByRole('button', { name: 'Continuar' }))

      await screen.findByRole('heading', { level: 2, name: title })
    }

    await app.user.click(screen.getByRole('button', { name: 'Calcular opções' }))

    await screen.findByRole(
      'heading',

      { level: 2, name: /Grupo de opções compatíveis/ },

      { timeout: 15_000 },
    )

    await expectNoViolations(app.container)
  })

  it('detalhe do veículo com selos de origem (demo)', async () => {
    const app = await renderApp({ route: '/' })

    await app.user.click(await screen.findByRole('button', { name: /Experimentar a demonstração/ }))

    await app.user.click(await screen.findByRole('button', { name: /Começar com dados fictícios/ }))

    await screen.findByRole('heading', { level: 2, name: 'Objetivo' })

    for (const title of ['Finanças', 'Uso', 'Preferências', 'Pesos', 'Revisão']) {
      await app.user.click(screen.getByRole('button', { name: 'Continuar' }))

      await screen.findByRole('heading', { level: 2, name: title })
    }

    await app.user.click(screen.getByRole('button', { name: 'Calcular opções' }))

    await screen.findByRole(
      'heading',

      { level: 2, name: /Grupo de opções compatíveis/ },

      { timeout: 15_000 },
    )

    await app.user.click(screen.getAllByRole('link', { name: /Ver detalhes/ })[0]!)

    await screen.findByRole('heading', { level: 2, name: 'Composição do custo' })

    await expectNoViolations(app.container)
  })
})
