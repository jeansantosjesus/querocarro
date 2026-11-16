import { screen, waitFor, within } from '@testing-library/react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MemoryAuthService } from '../../mocks/memoryAuthService'

import { MemoryDatabase } from '../../repositories/memory'

import { TEST_USER, renderApp } from '../fixtures/renderApp'

import { makeInput } from '../fixtures/factories'

import { buildSimulationDraft } from '../../features/history/buildDraft'

import { runDecision } from '../../domain/decision/pipeline'

import { MockVehicleDataProvider } from '../../services/vehicles/MockVehicleDataProvider'



vi.setConfig({ testTimeout: 60_000 })



beforeEach(() => {

window.sessionStorage.clear()

window.localStorage.clear()

})



afterEach(() => {

vi.restoreAllMocks()

})



type App = Awaited<ReturnType<typeof renderApp>>



async function fillAndCalculate(app: App) {

const { user } = app

await user.click(await screen.findByRole('link', { name: 'Nova simulação' }))

await user.type(await screen.findByLabelText(/^Nome da simulação/), 'Primeiro carro')

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

await user.click(screen.getByRole('button', { name: 'Continuar' }))



for (const title of ['Preferências', 'Pesos', 'Revisão']) {

await screen.findByRole('heading', { level: 2, name: title })

await user.click(screen.getByRole('button', { name: /Continuar|Calcular opções/ }))

}

await screen.findByRole(

'heading',

{ level: 2, name: /Grupo de opções compatíveis/ },

{ timeout: 15_000 },

)

}



async function saveWithConsent(app: App) {

await app.user.click(await screen.findByLabelText(/Autorizo o QC a salvar/))

await app.user.click(screen.getByRole('button', { name: 'Salvar no histórico' }))

await screen.findByText('Simulação salva no histórico')

}



describe('salvar no histórico (usuário autenticado)', () => {

it('só salva após consentimento explícito', async () => {

const app = await renderApp({ route: '/', signedIn: true })

await fillAndCalculate(app)



await app.user.click(await screen.findByRole('button', { name: 'Salvar no histórico' }))

expect(await screen.findByText(/Marque a autorização para salvar/)).toBeInTheDocument()

expect(app.db.simulations.size).toBe(0)



await saveWithConsent(app)

expect(app.db.simulations.size).toBe(1)

const saved = [...app.db.simulations.values()][0]!

expect(saved.title).toBe('Primeiro carro')

expect(saved.userId).toBe('user-1')

expect(app.db.preferences.get('user-1')?.persistHistoryConsent).toBe(true)

})



it('lista, abre, duplica e exclui simulações salvas', async () => {

const app = await renderApp({ route: '/', signedIn: true })

await fillAndCalculate(app)

await saveWithConsent(app)



await app.user.click(screen.getByRole('link', { name: 'Abrir histórico' }))

expect(

await screen.findByRole('heading', { level: 1, name: 'Histórico de simulações' }),

).toBeInTheDocument()

expect(

await screen.findByRole('heading', { level: 2, name: 'Primeiro carro' }),

).toBeInTheDocument()



// Abrir

await app.user.click(screen.getByRole('link', { name: 'Abrir' }))

expect(

await screen.findByRole('heading', { level: 1, name: 'Primeiro carro' }),

).toBeInTheDocument()

expect(

screen.getByRole('heading', { level: 2, name: /Grupo de opções compatíveis/ }),

).toBeInTheDocument()

expect(screen.getByText(/Pesos utilizados/)).toBeInTheDocument()

expect(

screen.getByRole('heading', { level: 2, name: 'Premissas usadas no cálculo' }),

).toBeInTheDocument()

expect(screen.getByText('Mês das premissas de custo')).toBeInTheDocument()



// Duplicar leva ao assistente com o título "(cópia)"

await app.user.click(screen.getByRole('button', { name: 'Duplicar e editar' }))

expect(await screen.findByDisplayValue('Primeiro carro (cópia)')).toBeInTheDocument()



// Excluir

app.goTo('/historico')

await screen.findByRole('heading', { level: 2, name: 'Primeiro carro' })

vi.spyOn(window, 'confirm').mockReturnValue(true)

await app.user.click(screen.getByRole('button', { name: 'Excluir' }))

expect(await screen.findByText(/Você ainda não salvou simulações/)).toBeInTheDocument()

expect(app.db.simulations.size).toBe(0)

})



it('simulação salva antes do registro de premissas mostra o aviso, sem inventar valores', async () => {

const app = await renderApp({ route: '/', signedIn: true })

await fillAndCalculate(app)

await saveWithConsent(app)

for (const row of app.db.simulations.values()) {

delete row.scenarioSnapshot.premises

}



app.goTo('/historico')

await app.user.click(await screen.findByRole('link', { name: 'Abrir' }))

await screen.findByRole('heading', { level: 1, name: 'Primeiro carro' })

expect(screen.getByText(/salva antes do registro de premissas/)).toBeInTheDocument()

expect(screen.queryByText('Mês das premissas de custo')).not.toBeInTheDocument()

})



it('exporta JSON sem credenciais e gerado no navegador', async () => {

const app = await renderApp({ route: '/', signedIn: true })

await fillAndCalculate(app)

await saveWithConsent(app)

app.goTo('/historico')

await app.user.click(await screen.findByRole('link', { name: 'Abrir' }))

await screen.findByRole('heading', { level: 1, name: 'Primeiro carro' })



let exported = ''

const createObjectURL = vi.fn((blob: Blob) => {

void blob.text().then((text) => (exported = text))

return 'blob:test'

})

Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })

vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})



await app.user.click(screen.getByRole('button', { name: 'Exportar JSON' }))

await waitFor(() => expect(exported).not.toBe(''))

const data = JSON.parse(exported) as { title: string; results: unknown[] }

expect(data.title).toBe('Primeiro carro')

expect(data.results.length).toBeGreaterThan(3)

expect(exported).not.toContain(TEST_USER.password)

})



it('compara duas simulações salvas', async () => {

const db = new MemoryDatabase()

const auth = new MemoryAuthService()

await auth.signUp({

name: TEST_USER.name,

email: TEST_USER.email,

password: TEST_USER.password,

})

const repos = db.repositoriesFor('user-1')

await repos.preferences.update({ persistHistoryConsent: true })

const vehicles = new MockVehicleDataProvider()

const catalog = await vehicles.loadCatalog()

const make = (title: string, scenarioId: 'economico' | 'conservador') => {

const input = makeInput({ objective: { title, scenarioId } })

return buildSimulationDraft(

input,

runDecision(input, catalog.vehicles, { referenceYear: 2026 }),

catalog,

)

}

await repos.simulations.save(make('Cenário A', 'economico'))

await repos.simulations.save(make('Cenário B', 'conservador'))
const app = await renderApp({ route: '/historico', auth, db })

await screen.findByRole('heading', { level: 2, name: 'Cenário A' })

await app.user.click(screen.getByLabelText(/Selecionar “Cenário A”/))

await app.user.click(screen.getByLabelText(/Selecionar “Cenário B”/))

await app.user.click(screen.getByRole('link', { name: /Comparar 2 simulações \(2\/2\)/ }))



expect(

await screen.findByRole('heading', { level: 1, name: 'Comparar simulações' }),

).toBeInTheDocument()

const table = screen.getAllByRole('table')[0]!

expect(within(table).getByText('Econômico')).toBeInTheDocument()

expect(within(table).getByText('Conservador')).toBeInTheDocument()

})

})



describe('isolamento entre usuários na interface', () => {

it('outro usuário não abre a simulação pelo id', async () => {

const db = new MemoryDatabase()

const auth = new MemoryAuthService()



await auth.signUp({ name: 'Alice', email: 'alice@example.com', password: 'SenhaForte123' })

const alice = db.repositoriesFor('user-1')

await alice.preferences.update({ persistHistoryConsent: true })

const catalog = await new MockVehicleDataProvider().loadCatalog()

const input = makeInput({ objective: { title: 'Segredo da Alice' } })

const saved = await alice.simulations.save(

buildSimulationDraft(

input,

runDecision(input, catalog.vehicles, { referenceYear: 2026 }),

catalog,

),

)

await auth.signOut()

await auth.signUp({ name: 'Bob', email: 'bob@example.com', password: 'SenhaForte123' })



await renderApp({ route: `/historico/${saved.id}`, auth, db })

expect(

await screen.findByRole('heading', { level: 1, name: 'Simulação não encontrada' }),

).toBeInTheDocument()

expect(document.body.textContent).not.toContain('Segredo da Alice')

})



it('id fora do formato UUID é rejeitado sem consultar o banco', async () => {

await renderApp({ route: '/historico/1%20OR%201%3D1', signedIn: true })

expect(

await screen.findByRole('heading', { level: 1, name: 'Simulação não encontrada' }),

).toBeInTheDocument()

})

})



describe('perfil: privacidade e exclusão', () => {

it('permite revogar o consentimento e excluir todo o histórico', async () => {

const app = await renderApp({ route: '/', signedIn: true })

await fillAndCalculate(app)

await saveWithConsent(app)



app.goTo('/perfil')

const checkbox = await screen.findByRole('checkbox', {

name: /Permitir salvar minhas simulações/,

})

await waitFor(() => expect(checkbox).toBeChecked())

await app.user.click(checkbox)

await waitFor(() => expect(app.db.preferences.get('user-1')?.persistHistoryConsent).toBe(false))



vi.spyOn(window, 'confirm').mockReturnValue(true)

await app.user.click(screen.getByRole('button', { name: /Excluir todo o meu histórico/ }))

await waitFor(() => expect(app.db.simulations.size).toBe(0))

})



it('excluir a conta exige digitar a confirmação e remove os dados', async () => {

const app = await renderApp({ route: '/', signedIn: true })

await fillAndCalculate(app)

await saveWithConsent(app)

app.goTo('/perfil')



const deleteButton = await screen.findByRole('button', {

name: /Excluir conta definitivamente/,

})

expect(deleteButton).toBeDisabled()

await app.user.type(screen.getByLabelText(/Digite EXCLUIR/), 'excluir')

expect(deleteButton).toBeDisabled()

await app.user.clear(screen.getByLabelText(/Digite EXCLUIR/))

await app.user.type(screen.getByLabelText(/Digite EXCLUIR/), 'EXCLUIR')

expect(deleteButton).toBeEnabled()

await app.user.click(deleteButton)



expect(

await screen.findByRole('heading', { level: 1, name: 'Quero Carro' }),

).toBeInTheDocument()

expect(app.db.simulations.size).toBe(0)

expect(app.db.preferences.size).toBe(0)

})

})
