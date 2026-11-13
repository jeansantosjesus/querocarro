import { useEffect, type ReactNode } from 'react'

interface PageTitleProps {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}

/** Título de página (h1). Atualiza o título do documento e leva o foco ao h1 na navegação. */
export function PageTitle({ title, subtitle, actions }: PageTitleProps) {
  useEffect(() => {
    document.title = `${title} · Quero Carro`
  }, [title])

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-ink-700">{subtitle}</p> : null}
      </div>
      {actions ? <div className="no-print flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
