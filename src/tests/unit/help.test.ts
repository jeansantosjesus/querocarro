import { DEFAULT_ASSUMPTIONS } from '../../config/assumptions'

import { HELP_ARTICLE_SLUGS, HELP_ARTICLES, findHelpArticle } from '../../config/help'

import { WEIGHT_LIMITS } from '../../config/limits'

import { TAX_REFERENCE_DATE } from '../../config/regionalTax'

import { normalizeSearchText, searchHelp } from '../../features/help/search'



const TRAILING_IDS = [

'como-usado-no-qc',

'fontes-do-artigo',

'data-de-referencia',

'limitacoes-do-artigo',

]



function articleText(slug: string): string {

const article = findHelpArticle(slug)

if (!article) throw new Error(`artigo ausente: ${slug}`)

return [

article.title,

article.summary,

article.usage,

...article.sources,

...article.limitations,

...article.sections.flatMap((s) => [

s.title,

...s.paragraphs,

...(s.formulas ?? []),

...(s.items ?? []),

]),

].join('\n')

}



describe('conteúdo da central de ajuda', () => {

it('cada slug listado tem um artigo, e cada artigo tem slug listado', () => {

expect(HELP_ARTICLES.map((a) => a.slug).sort()).toEqual([...HELP_ARTICLE_SLUGS].sort())

expect(new Set(HELP_ARTICLES.map((a) => a.slug)).size).toBe(HELP_ARTICLES.length)

})



it('todo artigo traz uso no QC, fontes, data de referência e limitações', () => {

for (const article of HELP_ARTICLES) {

expect(article.summary.length).toBeGreaterThan(0)

expect(article.usage.length).toBeGreaterThan(0)

expect(article.sources.length).toBeGreaterThan(0)

expect(article.referenceDate.length).toBeGreaterThan(0)

expect(article.limitations.length).toBeGreaterThan(0)

expect(article.sections.length).toBeGreaterThan(0)

}

})



it('ids de seção são únicos e não colidem com os blocos finais', () => {

for (const article of HELP_ARTICLES) {

const ids = article.sections.map((s) => s.id)

expect(new Set(ids).size).toBe(ids.length)

for (const id of ids) expect(TRAILING_IDS).not.toContain(id)

}

})



it('números de regra vêm da configuração, não de texto fixo', () => {

expect(articleText('como-funciona')).toContain(`${WEIGHT_LIMITS.maxPerCriterion}%`)

expect(articleText('impostos')).toContain(`${DEFAULT_ASSUMPTIONS.ipvaRatePct}%`)

expect(articleText('impostos')).toContain(TAX_REFERENCE_DATE)

})



it('o texto do IPVA nunca afirma que a alíquota da Bahia é oficial', () => {

const text = articleText('impostos')

expect(text).toMatch(/não é uma regra oficial/)

expect(text).not.toMatch(/alíquota oficial da Bahia/i)

})



it('o TCO é explicado com o horizonte de 36 meses e a regra de dado ausente', () => {

const text = articleText('tco')

expect(text).toMatch(/36 meses/)

expect(text).toMatch(/indisponível/)

})

})



describe('busca local', () => {

it('normaliza maiúsculas e acentos', () => {

expect(normalizeSearchText('Financiamento')).toBe('financiamento')

expect(normalizeSearchText('Alíquota')).toBe('aliquota')

})



it('encontra o artigo pelo termo, sem acento e sem maiúscula', () => {

expect(searchHelp('ipva').map((h) => h.slug)).toContain('impostos')

expect(searchHelp('ALIQUOTA').map((h) => h.slug)).toContain('impostos')

expect(searchHelp('tco').map((h) => h.slug)).toContain('tco')

})



it('encontra fórmulas, financiamento e análises pelos termos do usuário', () => {

expect(searchHelp('price').map((h) => h.slug)).toContain('formulas')

expect(searchHelp('amortizacao').length).toBeGreaterThan(0)

expect(searchHelp('k-means').map((h) => h.slug)).toContain('analises')

})



it('aponta para a seção mais relevante', () => {

const [hit] = searchHelp('valor residual').filter((h) => h.slug === 'tco')

expect(hit?.sectionId).toBe('o-que-e')

})



it('com vários termos, todos precisam aparecer no mesmo artigo', () => {

expect(searchHelp('ipva licenciamento').map((h) => h.slug)).toContain('impostos')

// IPVA e k-means não aparecem juntos em nenhum artigo.

expect(searchHelp('ipva k-means')).toEqual([])

})



it('termo inexistente, vazio ou de uma letra não retorna nada', () => {

expect(searchHelp('zzzzqq')).toEqual([])

expect(searchHelp('')).toEqual([])

expect(searchHelp(' ')).toEqual([])

expect(searchHelp('a')).toEqual([])

})

})
