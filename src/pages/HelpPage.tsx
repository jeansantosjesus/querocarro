import { useEffect, useId, useState, type ReactNode } from 'react'

import { Link, Navigate, useLocation, useParams } from 'react-router-dom'

import { PageTitle } from '../components/ui/PageTitle'

import { findHelpArticle, HELP_ARTICLES, type HelpArticle } from '../config/help'

import { searchHelp } from '../features/help/search'

/** Em HashRouter, âncoras internas não rolam sozinhas. */

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView()
}

function useHashScroll() {
  const { hash } = useLocation()

  useEffect(() => {
    const anchor = hash.replace('#', '')

    if (anchor) scrollToSection(anchor)
  }, [hash])
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="qc-card scroll-mt-4 p-6">
      <h2 id={`${id}-title`} className="mb-3 text-xl font-bold">
        {title}
      </h2>

      <div className="space-y-3 text-sm text-ink-800">{children}</div>
    </section>
  )
}

function HelpSearch() {
  const [query, setQuery] = useState('')

  const inputId = useId()

  const hits = query.trim() ? searchHelp(query) : []

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="block text-sm font-semibold">
        Buscar na central de ajuda
      </label>

      <input
        id={inputId}

        type="search"

        className="qc-input w-full"

        placeholder="Ex.: TCO, IPVA, financiamento, Price"

        value={query}

        onChange={(event) => setQuery(event.target.value)}
      />

      {query.trim() ? (
        <div aria-live="polite">
          {hits.length === 0 ? (
            <p className="text-sm text-ink-700">
              Nenhum resultado para “{query.trim()}”. Tente outro termo, como TCO, IPVA ou
              financiamento.
            </p>
          ) : (
            <>
              <p className="text-sm text-ink-700">
                {hits.length} {hits.length === 1 ? 'resultado' : 'resultados'}
              </p>

              <ul className="mt-2 space-y-3">
                {hits.map((hit) => (
                  <li key={hit.slug} className="qc-card p-4">
                    <Link
                      to={`/ajuda/${hit.slug}${hit.sectionId ? `#${hit.sectionId}` : ''}`}

                      className="font-semibold text-brand-800 underline"
                    >
                      {hit.title}

                      {hit.sectionTitle ? `: ${hit.sectionTitle}` : ''}
                    </Link>

                    <p className="mt-1 text-sm text-ink-700">{hit.snippet}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function HelpIndexPage() {
  return (
    <div className="space-y-6">
      <PageTitle
        title="Central de ajuda"

        subtitle="Explicações em linguagem simples sobre como o QC calcula, o que usa e o que não faz."
      />

      <HelpSearch />

      <section aria-labelledby="articles-title">
        <h2 id="articles-title" className="mb-3 text-xl font-bold">
          Artigos
        </h2>

        <ul className="grid gap-4 sm:grid-cols-2">
          {HELP_ARTICLES.map((article) => (
            <li key={article.slug} className="qc-card p-5">
              <Link
                to={`/ajuda/${article.slug}`}

                className="text-lg font-bold text-brand-800 underline"
              >
                {article.title}
              </Link>

              <p className="mt-2 text-sm text-ink-700">{article.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ArticleBody({ article }: { article: HelpArticle }) {
  return (
    <>
      {article.sections.map((section) => (
        <Section key={section.id} id={section.id} title={section.title}>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          {section.formulas?.map((formula) => (
            <p key={formula} className="rounded-xl bg-ink-100 p-3 font-mono text-sm">
              {formula}
            </p>
          ))}

          {section.items ? (
            <ul className="list-disc space-y-1 pl-5">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </Section>
      ))}

      <Section id="como-usado-no-qc" title="Como isso é usado no QC">
        <p>{article.usage}</p>
      </Section>

      <Section id="fontes-do-artigo" title="Fontes">
        <ul className="list-disc space-y-1 pl-5">
          {article.sources.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ul>
      </Section>

      <Section id="data-de-referencia" title="Data de referência">
        <p>{article.referenceDate}</p>
      </Section>

      <Section id="limitacoes-do-artigo" title="Limitações">
        <ul className="list-disc space-y-1 pl-5">
          {article.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </Section>
    </>
  )
}

export function HelpArticlePage() {
  const { slug = '' } = useParams()

  const article = findHelpArticle(slug)

  useHashScroll()

  if (!article) {
    return (
      <div className="space-y-4">
        <PageTitle title="Artigo não encontrado" />

        <p className="text-ink-700">Esse assunto não existe na central de ajuda.</p>

        <Link to="/ajuda" className="font-semibold text-brand-800 underline">
          Voltar à central de ajuda
        </Link>
      </div>
    )
  }

  const localSections = article.sections.map((section) => ({
    id: section.id,

    title: section.title,
  }))

  const trailing = [
    { id: 'como-usado-no-qc', title: 'Como isso é usado no QC' },

    { id: 'fontes-do-artigo', title: 'Fontes' },

    { id: 'data-de-referencia', title: 'Data de referência' },

    { id: 'limitacoes-do-artigo', title: 'Limitações' },
  ]

  return (
    <div className="space-y-6">
      <nav aria-label="Trilha de navegação" className="text-sm">
        <Link to="/ajuda" className="font-semibold text-brand-800 underline">
          Central de ajuda
        </Link>

        <span aria-hidden="true"> / </span>

        <span>{article.title}</span>
      </nav>

      <PageTitle title={article.title} subtitle={article.summary} />

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          <nav aria-label="Nesta página" className="qc-card p-4 text-sm">
            <p className="mb-2 font-semibold">Nesta página</p>

            <ul className="space-y-2">
              {[...localSections, ...trailing].map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}

                    onClick={(event) => {
                      event.preventDefault()

                      scrollToSection(item.id)
                    }}

                    className="text-brand-800 underline"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Outros artigos" className="qc-card p-4 text-sm">
            <p className="mb-2 font-semibold">Outros artigos</p>

            <ul className="space-y-2">
              {HELP_ARTICLES.filter((item) => item.slug !== article.slug).map((item) => (
                <li key={item.slug}>
                  <Link to={`/ajuda/${item.slug}`} className="text-brand-800 underline">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          <HelpSearch />

          <ArticleBody article={article} />
        </div>
      </div>
    </div>
  )
}
/** Links antigos para /metodologia. Âncoras que têm artigo próprio vão para ele. */

export function MethodologyRedirect() {
  const { hash } = useLocation()

  const anchor = hash.replace('#', '')

  const target = findHelpArticle(anchor) ? `/ajuda/${anchor}` : '/ajuda/metodologia'

  return <Navigate replace to={target} />
}
