import { screen } from '@testing-library/react'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { axe } from 'vitest-axe'

import { renderApp } from '../fixtures/renderApp'



vi.setConfig({ testTimeout: 60_000 })



beforeEach(() => {

window.sessionStorage.clear()

window.localStorage.clear()

})



type App = Awaited<ReturnType<typeof renderApp>>



/** Demonstração até o resultado e o detalhe do primeiro veículo. */

async function openFirstVehicleDetail(app: App) {

const { user } = app

await user.click(await screen.findByRole('button', { name: /Experimentar a demonstração/ }))

await user.click(await screen.findByRole('button', { name: /Começar com dados fictícios/ }))

await screen.findByRole('heading', { level: 2, name: 'Objetivo' })

for (let step = 0; step < 5; step += 1) {

await user.click(screen.getByRole('button', { name: 'Continuar' }))

}

await user.click(screen.getByRole('button', { name: 'Calcular opções' }))

await screen.findByRole(

'heading',

{ level: 2, name: /Grupo de opções compatíveis/ },

{ timeout: 15_000 },

)

await user.click(screen.getAllByRole('link', { name: /Ver detalhes/ })[0]!)

await screen.findByRole('heading', { level: 2, name: 'Composição do custo' })

}



describe('Quero este carro (simulação inversa)', () => {

it('a partir do detalhe, abre o formulário e mostra cenários com a renda da simulação', async () => {

const app = await renderApp()

await openFirstVehicleDetail(app)



await app.user.click(

screen.getByRole('link', { name: /Quero este carro: ver condições de compra/ }),

)

expect(

await screen.findByRole('heading', { level: 1, name: /Quero este carro:/ }),

).toBeInTheDocument()



// A renda da demonstração vem pré-preenchida; nada de renda é inventada.

expect(screen.getByLabelText(/Renda líquida mensal/)).toHaveValue(12000)



await app.user.click(screen.getByRole('button', { name: 'Buscar condições para este carro' }))

expect(await screen.findByRole('heading', { level: 2, name: 'Cenários' })).toBeInTheDocument()

for (const title of [

'Menor entrada',

'Menor parcela',

'Menor custo total',

'À vista',

'Combinação personalizada',

]) {

expect(screen.getByRole('heading', { level: 3, name: title })).toBeInTheDocument()

}

expect(

screen.getByRole('heading', { level: 2, name: 'Premissas e fontes' }),

).toBeInTheDocument()



// Mesmas regras desativadas na suíte de acessibilidade (jsdom não calcula cores).

const results = await axe(app.container, {

rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },

})

expect(results.violations.map((v) => v.id)).toEqual([])

})



it('campo obrigatório vazio mostra o erro, sem calcular com zero', async () => {

const app = await renderApp()

await openFirstVehicleDetail(app)

await app.user.click(

screen.getByRole('link', { name: /Quero este carro: ver condições de compra/ }),

)

await screen.findByRole('heading', { level: 1, name: /Quero este carro:/ })



await app.user.clear(screen.getByLabelText(/Renda líquida mensal/))

await app.user.click(screen.getByRole('button', { name: 'Buscar condições para este carro' }))



expect(await screen.findByRole('alert')).toHaveTextContent('Revise os campos antes de calcular')

expect(screen.getByText(/Informe a renda líquida mensal/)).toBeInTheDocument()

expect(screen.queryByRole('heading', { level: 2, name: 'Cenários' })).not.toBeInTheDocument()

})



it('sem renda informada, o resultado avisa que não há avaliação de orçamento', async () => {

const app = await renderApp()

await openFirstVehicleDetail(app)

await app.user.click(

screen.getByRole('link', { name: /Quero este carro: ver condições de compra/ }),

)

await screen.findByRole('heading', { level: 1, name: /Quero este carro:/ })



await app.user.click(screen.getByLabelText(/Não quero informar renda/))

await app.user.click(screen.getByRole('button', { name: 'Buscar condições para este carro' }))



expect(await screen.findByRole('heading', { level: 2, name: 'Cenários' })).toBeInTheDocument()

expect(screen.getByText(/Sem renda: sem avaliação de orçamento/)).toBeInTheDocument()

expect(screen.getByText(/Sem renda informada: o QC não avalia orçamento/)).toBeInTheDocument()

})

})
