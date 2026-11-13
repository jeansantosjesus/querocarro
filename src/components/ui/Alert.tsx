import type { ReactNode } from 'react'

type Tone = 'info' | 'warn' | 'bad' | 'good'

const TONE_CLASSES: Record<Tone, string> = {
  info: 'border-info-fg/30 bg-info-bg text-info-fg',
  warn: 'border-warn-fg/30 bg-warn-bg text-warn-fg',
  bad: 'border-bad-fg/30 bg-bad-bg text-bad-fg',
  good: 'border-good-fg/30 bg-good-bg text-good-fg',
}

const TONE_LABEL: Record<Tone, string> = {
  info: 'Informação',
  warn: 'Atenção',
  bad: 'Erro',
  good: 'Sucesso',
}

interface AlertProps {
  tone?: Tone
  title?: string
  children: ReactNode
  /** Erros e avisos importantes usam role="alert"; informativos usam role="status". */
  live?: boolean
}

export function Alert({ tone = 'info', title, children, live }: AlertProps) {
  const role = tone === 'bad' || live ? 'alert' : 'status'
  return (
    <div role={role} className={`rounded-xl border px-4 py-3 text-sm ${TONE_CLASSES[tone]}`}>
      <p className="font-semibold">
        <span className="sr-only">{TONE_LABEL[tone]}: </span>
        {title ?? null}
      </p>
      <div className={title ? 'mt-1' : ''}>{children}</div>
    </div>
  )
}
