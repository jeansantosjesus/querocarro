import { HELP_ARTICLES, type HelpArticle, type HelpSection } from '../../config/help'

export interface HelpSearchHit {
  slug: HelpArticle['slug']

  title: string

  sectionId: string | null

  sectionTitle: string | null

  snippet: string
}

const MIN_TERM_LENGTH = 2

const SNIPPET_LENGTH = 180

/** Minúsculas e sem acento, para "financiamento" casar com "Financiamento". */

export function normalizeSearchText(value: string): string {
  return value

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')

    .toLowerCase()
}

function sectionStrings(section: HelpSection): string[] {
  return [
    section.title,

    ...section.paragraphs,

    ...(section.formulas ?? []),

    ...(section.items ?? []),
  ]
}

function articleStrings(article: HelpArticle): string[] {
  return [
    article.title,

    article.summary,

    article.keywords.join(' '),

    article.usage,

    ...article.sources,

    ...article.limitations,
  ]
}

function containsAll(texts: readonly string[], terms: readonly string[]): boolean {
  const haystack = normalizeSearchText(texts.join(' \n '))

  return terms.every((term) => haystack.includes(term))
}

function snippetFor(texts: readonly string[], terms: readonly string[]): string {
  const first = terms[0] ?? ''

  const text = texts.find((item) => normalizeSearchText(item).includes(first)) ?? texts[0] ?? ''

  return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH).trimEnd()}…` : text
}

/**

* Busca local e sem backend. Todos os termos (ignorando maiúsculas e acentos)

* precisam aparecer no mesmo artigo. Cada resultado aponta para a seção mais relevante.

*/

export function searchHelp(
  query: string,

  articles: readonly HelpArticle[] = HELP_ARTICLES,
): HelpSearchHit[] {
  const terms = normalizeSearchText(query)
    .trim()

    .split(/\s+/)

    .filter((term) => term.length >= MIN_TERM_LENGTH)

  if (terms.length === 0) return []

  const hits: HelpSearchHit[] = []

  for (const article of articles) {
    const everything = [...articleStrings(article), ...article.sections.flatMap(sectionStrings)]

    if (!containsAll(everything, terms)) continue

    const section =
      article.sections.find((item) => containsAll(sectionStrings(item), terms)) ??
      article.sections.find((item) => containsAll(sectionStrings(item), [terms[0] ?? '']))

    hits.push({
      slug: article.slug,

      title: article.title,

      sectionId: section?.id ?? null,

      sectionTitle: section?.title ?? null,

      snippet: section
        ? snippetFor(sectionStrings(section), terms)
        : snippetFor(articleStrings(article), terms),
    })
  }

  return hits
}
