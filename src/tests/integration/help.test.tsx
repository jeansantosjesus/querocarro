import { screen } from '@testing-library/react'

import { describe, expect, it } from 'vitest'

import { renderApp } from '../fixtures/renderApp'



describe('central de ajuda', () => {

it('índice lista os artigos com link para cada um', async () => {

await renderApp({ route: '/ajuda' })

expect(

await screen.findByRole('heading', { level: 1, name: 'Central de ajuda' }),

).toBeInTheDocument()

expect(screen.getByRole('link', { name: 'Fórmulas' })).toHaveAttribute(

'href',

'/ajuda/formulas',

)

expect(screen.getByRole('link', { name: 'Impostos e regionalização' })).toBeInTheDocument()

})



it('a busca mostra resultados e leva ao artigo', async () => {

const { user } = await renderApp({ route: '/ajuda' })

await user.type(

await screen.findByRole('searchbox', { name: /Buscar na central de ajuda/ }),

'ipva',

)

// Há o card do índice e o resultado da busca, com o mesmo nome: o resultado tem a âncora da seção.

const links = await screen.findAllByRole('link', { name: /Impostos e regionalização/ })

const result = links.find((link) => link.getAttribute('href')?.includes('#ipva-por-uf'))

expect(result).toBeDefined()

expect(result).toHaveAttribute('href', '/ajuda/impostos#ipva-por-uf')

})



it('busca sem resultado explica e sugere outro termo', async () => {

const { user } = await renderApp({ route: '/ajuda' })

await user.type(

await screen.findByRole('searchbox', { name: /Buscar na central de ajuda/ }),

'zzzzqq',

)

expect(await screen.findByText(/Nenhum resultado para/)).toBeInTheDocument()

})



it('artigo de fórmulas mostra as fórmulas com descrição textual', async () => {

await renderApp({ route: '/ajuda/formulas' })

expect(await screen.findByRole('heading', { level: 1, name: 'Fórmulas' })).toBeInTheDocument()

expect(

screen.getByRole('heading', { level: 2, name: 'Parcela pela Tabela Price' }),

).toBeInTheDocument()

expect(

screen.getAllByRole('heading', { level: 2, name: 'Como isso é usado no QC' }).length,

).toBeGreaterThan(0)

})



it('artigo mostra fontes, data de referência e limitações', async () => {

await renderApp({ route: '/ajuda/tco' })

await screen.findByRole('heading', { level: 1 })

expect(screen.getByRole('heading', { level: 2, name: 'Fontes' })).toBeInTheDocument()

expect(

screen.getByRole('heading', { level: 2, name: 'Data de referência' }),

).toBeInTheDocument()

expect(screen.getByRole('heading', { level: 2, name: 'Limitações' })).toBeInTheDocument()

})



it('artigo inexistente mostra aviso e volta à central', async () => {

await renderApp({ route: '/ajuda/nao-existe' })

expect(

await screen.findByRole('heading', { level: 1, name: 'Artigo não encontrado' }),

).toBeInTheDocument()

})



it('o endereço antigo /metodologia#privacidade leva ao artigo de privacidade', async () => {

await renderApp({ route: '/metodologia#privacidade' })

expect(

await screen.findByRole('heading', { level: 1, name: 'Privacidade e segurança' }),

).toBeInTheDocument()

})



it('o endereço antigo /metodologia sem âncora leva ao artigo de metodologia', async () => {

await renderApp({ route: '/metodologia' })

expect(

await screen.findByRole('heading', { level: 1, name: 'Metodologia' }),

).toBeInTheDocument()

})

})
