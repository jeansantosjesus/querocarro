import { act, fireEvent, screen, within } from '@testing-library/react'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderApp } from '../fixtures/renderApp'



vi.setConfig({ testTimeout: 60_000 })



beforeEach(() => {

window.sessionStorage.clear()

window.localStorage.clear()

})



type App = Awaited<ReturnType<typeof renderApp>>



/** Entra no modo demonstração e percorre o assistente (dados fictícios pré-preenchidos) até o resultado. */

async function runDemoWizard(app: App) {

const { user } = app

await user.click(await screen.findByRole('button', { name: /Experimentar a demonstração/ }))

await user.click(await screen.findByRole('button', { name: /Começar com dados fictícios/ }))



expect(await screen.findByRole('heading', { level: 2, name: 'Objetivo' })).toBeInTheDocument()

for (const title of ['Finanças', 'Uso', 'Preferências', 'Pesos', 'Revisão']) {

await user.click(screen.getByRole('button', { name: 'Continuar' }))

expect(await screen.findByRole('heading', { level: 2, name: title })).toBeInTheDocument()

}

await user.click(screen.getByRole('button', { name: 'Calcular opções' }))

await screen.findByRole(

'heading',

{ level: 2, name: /Grupo de opções compatíveis/ },

{ timeout: 15_000 },

)

}



function cardTitles(): string[] {

return screen

.getAllByRole('article')

.map((card) => within(card).getByRole('heading', { level: 3 }).textContent ?? '')

}



function cardPrices(): number[] {

return screen.getAllByRole('article').map((card) => {

const label = within(card).getByText('Preço de referência (FIPE)')

const value = label.nextElementSibling?.textContent ?? ''

return Number(value.replace(/[^\d]/g, ''))

})

}



describe('modo demonstração: assistente e resultado', () => {

it('pede a UF de registro; a demonstração começa na Bahia e permite alterar', async () => {

const app = await renderApp({ route: '/' })

await app.user.click(await screen.findByRole('button', { name: /Experimentar a demonstração/ }))

await app.user.click(await screen.findByRole('button', { name: /Começar com dados fictícios/ }))

await app.user.click(screen.getByRole('button', { name: 'Continuar' }))

const select = await screen.findByRole('combobox', {

name: /Em qual estado o veículo será registrado/,

})

expect(select).toHaveValue('BA')

await app.user.selectOptions(select, 'SP')

expect(select).toHaveValue('SP')

expect(screen.getByRole('checkbox', { name: /estimativa de demonstração/ })).toBeInTheDocument()

})



it('percorre as 8 etapas e mostra um GRUPO de 3 a 5 opções com o mesmo destaque', async () => {

const app = await renderApp({ route: '/' })

await runDemoWizard(app)



const cards = screen.getAllByRole('article')

expect(cards.length).toBeGreaterThanOrEqual(3)

expect(cards.length).toBeLessThanOrEqual(5)



// Sem hierarquia visual: nenhum cartão tem posição, medalha ou "melhor"

for (const card of cards) {

expect(

within(card).queryByText(/^#?\d+º|melhor opção|recomendad[oa] n[ºo]|vencedor/i),

).not.toBeInTheDocument()

}

// Ordem inicial alfabética

const titles = cardTitles()

const sorted = [...titles].sort((a, b) => a.localeCompare(b, 'pt-BR'))

expect(titles).toEqual(sorted)



// Linguagem respeitosa e avisos obrigatórios

const text = document.body.textContent ?? ''

expect(text).not.toMatch(/Você não pode comprar/i)

expect(text).not.toMatch(/Sua renda só permite/i)

expect(text).not.toMatch(/único carro que cabe/i)

expect(text).toMatch(/não constituem aconselhamento financeiro/i)

expect(text).toMatch(/Pressão financeira estimada/i)

expect(screen.getByText(/Como o QC calculou este resultado/)).toBeInTheDocument()



// Sensibilidade: uma premissa por vez, sem apontar vencedor

expect(

screen.getByRole('heading', { level: 2, name: 'Sensibilidade do custo total' }),

).toBeInTheDocument()

expect(screen.getAllByText('Caso base').length).toBeGreaterThan(0)

expect(screen.getAllByText('Seguro +20%').length).toBeGreaterThan(0)

expect(text).toMatch(/Não é uma previsão/)

const options = within(screen.getByRole('combobox', { name: 'Veículo' }))

.getAllByRole('option')

.map((option) => option.textContent ?? '')

expect(options.map((option) => option.replace(/ \d{4}$/, ''))).toEqual(titles)

})



it('no demo nada é oferecido para salvar e nada vai ao armazenamento local', async () => {

const app = await renderApp({ route: '/' })

await runDemoWizard(app)

expect(screen.getByText(/Modo demonstração: nada é salvo/)).toBeInTheDocument()

expect(screen.queryByRole('button', { name: /Salvar no histórico/ })).not.toBeInTheDocument()



// Dados financeiros nunca persistem em localStorage

const stored = JSON.stringify({ ...window.localStorage })

expect(stored).not.toMatch(/12000|netIncome|fixedExpenses/)

expect(JSON.stringify({ ...window.sessionStorage })).not.toMatch(/12000|netIncome/)

expect(app.db.simulations.size).toBe(0)

})



it('reordena por menor preço sem recalcular o grupo', async () => {

const app = await renderApp({ route: '/' })

await runDemoWizard(app)

const before = new Set(cardTitles())



await app.user.selectOptions(screen.getByLabelText('Ordenar por'), 'menor_preco')



const prices = cardPrices()

expect(prices).toEqual([...prices].sort((a, b) => a - b))

expect(new Set(cardTitles())).toEqual(before)

})



it('altera o tamanho do grupo entre 3 e 5', async () => {

const app = await renderApp({ route: '/' })

await runDemoWizard(app)

await app.user.selectOptions(screen.getByLabelText('Tamanho do grupo'), '3')
expect(screen.getAllByRole('article')).toHaveLength(3)

await app.user.selectOptions(screen.getByLabelText('Tamanho do grupo'), '5')

expect(screen.getAllByRole('article')).toHaveLength(5)

})



it('pesos: soma sempre 100%, recalcula na hora e mostra o que ganhou importância', async () => {

const app = await renderApp({ route: '/' })

await runDemoWizard(app)



const slider = screen.getByRole('slider', { name: /Custo total no horizonte/ })

const before = Number((slider as HTMLInputElement).value)

fireEvent.change(slider, { target: { value: String(before + 5) } })



expect((slider as HTMLInputElement).value).toBe(String(before + 5))

const sliders = screen.getAllByRole('slider') as HTMLInputElement[]

expect(sliders.reduce((sum, input) => sum + Number(input.value), 0)).toBe(100)

expect(screen.getByText(/Soma dos pesos: 100%/)).toBeInTheDocument()

expect(screen.getByText(/Ganharam importância: Custo total no horizonte/)).toBeInTheDocument()



// O tipo de critério (custo/benefício) é anunciado ao usuário

expect(screen.getAllByText(/Critério de custo \(menor é melhor\)/).length).toBeGreaterThan(0)



// Restaurar volta ao padrão do cenário

await app.user.click(screen.getByRole('button', { name: /Restaurar pesos do cenário/ }))

expect((slider as HTMLInputElement).value).toBe(String(before))

})



it('o limite de 75% por critério é respeitado', async () => {

const app = await renderApp({ route: '/' })

await runDemoWizard(app)

const slider = screen.getByRole('slider', {

name: /Custo total no horizonte/,

}) as HTMLInputElement

fireEvent.change(slider, { target: { value: '80' } })

expect(Number(slider.value)).toBeLessThanOrEqual(75)

const sliders = screen.getAllByRole('slider') as HTMLInputElement[]

expect(sliders.every((input) => Number(input.value) <= 75)).toBe(true)

expect(sliders.reduce((sum, input) => sum + Number(input.value), 0)).toBe(100)

})



it('compara de 2 a 3 opções, destaca o melhor valor por critério sem declarar vencedor geral', async () => {

const app = await renderApp({ route: '/' })

await runDemoWizard(app)



const compareButton = screen.getByRole('link', { name: /Comparar selecionados/ })

expect(compareButton).toHaveAttribute('aria-disabled', 'true')



const boxes = screen.getAllByRole('checkbox', { name: /Comparar/ })

for (const box of boxes.slice(0, 3)) await app.user.click(box)

// O quarto fica bloqueado (máximo de 3)

expect(boxes[3]).toBeDisabled()



await app.user.click(screen.getByRole('link', { name: /Comparar selecionados \(3\/3\)/ }))

expect(

await screen.findByRole('heading', { level: 1, name: 'Comparar opções' }),

).toBeInTheDocument()

const table = screen.getByRole('table')

expect(within(table).getAllByText('★', { exact: false }).length).toBeGreaterThan(0)

expect(screen.getAllByText(/Melhor valor entre os comparados/).length).toBeGreaterThan(0)

expect(screen.getByText(/Isso não indica um vencedor geral/)).toBeInTheDocument()

})



it('detalhe do veículo: custo com origem e premissa, notas por critério e fontes', async () => {

const app = await renderApp({ route: '/' })

await runDemoWizard(app)



await app.user.click(screen.getAllByRole('link', { name: /Ver detalhes/ })[0]!)

expect(

await screen.findByRole('heading', { level: 2, name: 'Composição do custo' }),

).toBeInTheDocument()

expect(

screen.getByRole('heading', { name: 'Origem dos dados deste veículo' }),

).toBeInTheDocument()

expect(screen.getAllByText('FIPE (referência salva)').length).toBeGreaterThan(0)

expect(screen.getAllByText('Dado de demonstração').length).toBeGreaterThan(0)



const costTable = screen.getAllByRole('table')[0]!

for (const header of [

'Origem',

'Premissa',

'Periodicidade',

'Referência',

'Confiabilidade',

'Ajustável',

]) {

expect(within(costTable).getByRole('columnheader', { name: header })).toBeInTheDocument()

}

expect(

screen.getByRole('heading', { level: 2, name: 'Fontes e limitações' }),

).toBeInTheDocument()

expect(

screen.getByRole('heading', { level: 2, name: 'Desempenho por critério' }),

).toBeInTheDocument()

expect(screen.getAllByText(/Estimativa demonstrativa do QC/).length).toBeGreaterThan(0)



const analytics = screen

.getByRole('heading', { level: 2, name: 'Análise complementar' })

.closest('section')!

expect(within(analytics).getByText('Grupo analítico')).toBeInTheDocument()

expect(within(analytics).getByText('Aderência ao uso')).toBeInTheDocument()

expect(within(analytics).getByText('Pressão financeira')).toBeInTheDocument()

expect(within(analytics).getByText(/não indica qualidade/)).toBeInTheDocument()

expect(within(analytics).getByText(/Não alteram o índice/)).toBeInTheDocument()

expect(within(analytics).getByText('Parcela do financiamento')).toBeInTheDocument()

})



it.each(['%3Cscript%3Ealert(1)%3C%2Fscript%3E', 'NAO-EXISTE%3A0000-0', 'x'.repeat(200)])(

'id de veículo inválido ou inexistente (%s) mostra aviso sem quebrar a página',

async (badId) => {

const app = await renderApp({ route: '/' })

await runDemoWizard(app)



act(() => app.goTo(`/veiculo/${badId}`))



expect(

await screen.findByRole('heading', { level: 1, name: 'Veículo não encontrado' }),

).toBeInTheDocument()

expect(document.querySelector('script[src], script:not([type])')).toBeNull()

},

)

})



describe('validação do assistente', () => {

it('rascunho em branco: título, renda e gasto são obrigatórios', async () => {

const app = await renderApp({ route: '/', signedIn: true })

const { user } = app

await user.click(await screen.findByRole('link', { name: 'Nova simulação' }))

await screen.findByRole('heading', { level: 2, name: 'Objetivo' })



await user.click(screen.getByRole('button', { name: 'Continuar' }))

expect(await screen.findByText(/Dê um nome para a simulação/)).toBeInTheDocument()

expect(screen.getByRole('heading', { level: 2, name: 'Objetivo' })).toBeInTheDocument()



await user.type(screen.getByLabelText(/^Nome da simulação/), 'Primeiro carro')

await user.click(screen.getByRole('button', { name: 'Continuar' }))

expect(await screen.findByRole('heading', { level: 2, name: 'Finanças' })).toBeInTheDocument()



// Valores inválidos: renda zero/negativa e campo vazio

await user.click(screen.getByRole('button', { name: 'Continuar' }))

expect(await screen.findAllByText(/Informe um número válido/)).not.toHaveLength(0)

expect(

screen.getByText(/Selecione o estado em que o veículo será registrado/),

).toBeInTheDocument()



await user.type(screen.getByLabelText(/^Renda líquida/), '-50')

await user.click(screen.getByRole('button', { name: 'Continuar' }))

expect((await screen.findAllByText(/Informe um valor entre/)).length).toBeGreaterThan(0)

expect(screen.getByRole('heading', { level: 2, name: 'Finanças' })).toBeInTheDocument()

})



it('voltar não perde os dados já preenchidos', async () => {

const app = await renderApp({ route: '/', signedIn: true })

const { user } = app

await user.click(await screen.findByRole('link', { name: 'Nova simulação' }))

await user.type(await screen.findByLabelText(/^Nome da simulação/), 'Meu rascunho')

await user.click(screen.getByRole('button', { name: 'Continuar' }))

await screen.findByRole('heading', { level: 2, name: 'Finanças' })

await user.type(screen.getByLabelText(/^Renda líquida/), '9000')

await user.click(screen.getByRole('button', { name: 'Voltar' }))

expect(await screen.findByDisplayValue('Meu rascunho')).toBeInTheDocument()

await user.click(screen.getByRole('button', { name: 'Continuar' }))

expect(await screen.findByDisplayValue('9000')).toBeInTheDocument()

})

})
