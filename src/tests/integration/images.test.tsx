import { fireEvent, screen, waitFor, within } from '@testing-library/react'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VehicleImage, VehicleImageProvider } from '../../services/images/types'

import { renderApp } from '../fixtures/renderApp'



vi.setConfig({ testTimeout: 60_000 })



beforeEach(() => {

window.sessionStorage.clear()

window.localStorage.clear()

})



type App = Awaited<ReturnType<typeof renderApp>>



async function runDemoWizard(app: App) {

const { user } = app

await user.click(await screen.findByRole('button', { name: /Experimentar a demonstração/ }))

await user.click(await screen.findByRole('button', { name: /Começar com dados fictícios/ }))

await screen.findByRole('heading', { level: 2, name: 'Objetivo' })

for (const title of ['Finanças', 'Uso', 'Preferências', 'Pesos', 'Revisão']) {

await user.click(screen.getByRole('button', { name: 'Continuar' }))

await screen.findByRole('heading', { level: 2, name: title })

}

await user.click(screen.getByRole('button', { name: 'Calcular opções' }))

await screen.findByRole(

'heading',

{ level: 2, name: /Grupo de opções compatíveis/ },

{ timeout: 15_000 },

)

}



function fakeImage(name: string): VehicleImage {

return {

url: `https://upload.wikimedia.org/thumb/${encodeURIComponent(name)}.jpg`,

pageUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(name)}.jpg`,

title: `${name}.jpg`,

author: 'Autora Teste',

license: 'CC BY-SA 4.0',

licenseUrl: null,

}

}



function providerWith(

resolve: (brand: string, model: string) => VehicleImage | null,

): VehicleImageProvider & { find: ReturnType<typeof vi.fn> } {

return {

id: 'fake',

find: vi.fn(async (query: { brand: string; model: string }) =>

resolve(query.brand, query.model),

),

}

}



describe('fotos dos carros no resultado', () => {

it('mostra foto com autor, licença e link; todos os cartões têm o mesmo quadro', async () => {

const provider = providerWith((brand, model) => fakeImage(`${brand} ${model}`))

const app = await renderApp({ route: '/', imageProvider: provider })

await runDemoWizard(app)



const cards = screen.getAllByRole('article')

await waitFor(() =>

expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(cards.length),

)



for (const card of cards) {

const photo = within(card).getByRole('img', { name: /Foto ilustrativa de/ })

expect(photo).toHaveAttribute(

'src',

expect.stringMatching(/^https:\/\/upload\.wikimedia\.org\//),

)

expect(photo).toHaveAttribute('referrerpolicy', 'no-referrer')

expect(within(card).getByText(/Autora Teste/)).toBeInTheDocument()

expect(within(card).getByText(/CC BY-SA 4\.0/)).toBeInTheDocument()

expect(within(card).getByText(/pode ser de outra versão ou ano/)).toBeInTheDocument()

const link = within(card).getByRole('link', { name: /Wikimedia Commons/ })

expect(link).toHaveAttribute(

'href',

expect.stringMatching(/^https:\/\/commons\.wikimedia\.org\//),

)

expect(link).toHaveAttribute('rel', 'noopener noreferrer')

expect(link).toHaveAttribute('target', '_blank')

}

// O provedor recebe só marca, modelo e ano (nada do usuário)

for (const [query] of provider.find.mock.calls) {

expect(Object.keys(query as object).sort()).toEqual(['brand', 'model', 'modelYear'])

}

})



it('sem foto, mostra a ilustração genérica da categoria, sem imagem externa', async () => {

const app = await renderApp({ route: '/', imageProvider: providerWith(() => null) })

await runDemoWizard(app)



const cards = screen.getAllByRole('article')

await waitFor(() =>

expect(screen.getAllByText(/Ilustração genérica/).length).toBeGreaterThanOrEqual(

cards.length,

),

)

expect(screen.queryByRole('img', { name: /Foto ilustrativa/ })).not.toBeInTheDocument()

expect(document.querySelectorAll('img[src^="http"]')).toHaveLength(0)

})



it('se a imagem não carregar, volta para a ilustração genérica', async () => {

const app = await renderApp({

route: '/',

imageProvider: providerWith((brand, model) => fakeImage(`${brand} ${model}`)),

})

await runDemoWizard(app)



const card = screen.getAllByRole('article')[0]!

const photo = await within(card).findByRole('img', { name: /Foto ilustrativa/ })

fireEvent.error(photo)

await waitFor(() =>

expect(within(card).queryByRole('img', { name: /Foto ilustrativa/ })).not.toBeInTheDocument(),

)

expect(within(card).getByText(/Ilustração genérica/)).toBeInTheDocument()

})



it('o usuário pode desligar as fotos e nenhuma nova busca é feita', async () => {

const provider = providerWith((brand, model) => fakeImage(`${brand} ${model}`))

const app = await renderApp({ route: '/', imageProvider: provider })

await runDemoWizard(app)

await waitFor(() => expect(screen.getAllByRole('img').length).toBeGreaterThan(0))



const toggle = screen.getByRole('checkbox', { name: /Mostrar fotos dos carros/ })

expect(toggle).toBeChecked()

await app.user.click(toggle)



expect(screen.queryByRole('img', { name: /Foto ilustrativa/ })).not.toBeInTheDocument()

expect(screen.getAllByText(/Ilustração genérica/).length).toBeGreaterThan(0)

})



it('sem provedor configurado (testes/offline) não há foto nem o controle', async () => {

const app = await renderApp({ route: '/' })

await runDemoWizard(app)

expect(

screen.queryByRole('checkbox', { name: /Mostrar fotos dos carros/ }),

).not.toBeInTheDocument()

expect(screen.getAllByText(/Ilustração genérica/).length).toBeGreaterThan(0)

})



it('a página de detalhe também mostra a foto', async () => {

const app = await renderApp({

route: '/',

imageProvider: providerWith((brand, model) => fakeImage(`${brand} ${model}`)),

})

await runDemoWizard(app)

const card = screen.getAllByRole('article')[0]!

await app.user.click(within(card).getByRole('link', { name: /Ver detalhes/ }))

await screen.findByRole('heading', { level: 2, name: /Indicadores financeiros estimados/ })

expect(await screen.findByRole('img', { name: /Foto ilustrativa/ })).toBeInTheDocument()

})

})
