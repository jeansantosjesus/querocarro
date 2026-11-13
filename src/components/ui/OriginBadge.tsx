import type { DataOrigin } from '../../types/provenance'

const ORIGIN_TEXT: Record<DataOrigin, string> = {
  fipe: 'FIPE',
  government: 'Fonte oficial',
  academic: 'Fonte acadêmica',
  user: 'Informado por você',
  estimated: 'Estimativa do QC',
  demonstration: 'Dado de demonstração',
  unavailable: 'Dado indisponível',
}

const ORIGIN_CLASSES: Record<DataOrigin, string> = {
  fipe: 'bg-info-bg text-info-fg',
  government: 'bg-good-bg text-good-fg',
  academic: 'bg-info-bg text-info-fg',
  user: 'bg-ink-100 text-ink-800',
  estimated: 'bg-warn-bg text-warn-fg',
  demonstration: 'bg-warn-bg text-warn-fg',
  unavailable: 'bg-bad-bg text-bad-fg',
}

interface OriginBadgeProps {
  origin: DataOrigin
  /** Texto do selo. Padrão: o nome da origem. */
  label?: string
}

/** Selo de origem do dado. O texto sempre aparece; a cor reforça, não substitui. */
export function OriginBadge({ origin, label }: OriginBadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORIGIN_CLASSES[origin]}`}
    >
      {label ?? ORIGIN_TEXT[origin]}
    </span>
  )
}
