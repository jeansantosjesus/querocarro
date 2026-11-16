import { UNAVAILABLE_TEXT } from './text'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',

  currency: 'BRL',

  maximumFractionDigits: 0,
})

const currencyCents = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const decimal1 = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,

  minimumFractionDigits: 1,
})

const decimal2 = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,

  minimumFractionDigits: 2,
})

const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

export function formatBRL(value: number | null | undefined, options?: { cents?: boolean }): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return UNAVAILABLE_TEXT

  return (options?.cents ? currencyCents : currency).format(value)
}

export function formatNumber(value: number | null | undefined, digits: 0 | 1 | 2 = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return UNAVAILABLE_TEXT

  if (digits === 0) return integer.format(value)

  return (digits === 1 ? decimal1 : decimal2).format(value)
}

/** `ratio` em fração (0.25 => "25,0%"). */

export function formatPercent(ratio: number | null | undefined, digits: 0 | 1 = 1): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return UNAVAILABLE_TEXT

  return `${formatNumber(ratio * 100, digits)}%`
}

export function formatPoints(value: number): string {
  return `${decimal1.format(value)} pts`
}

/** "2026-11" -> "11/2026"; aceita rótulo original como fallback. */

export function formatReferenceMonth(month: string | null, fallbackLabel?: string | null): string {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, mm] = month.split('-')

    return `${mm}/${year}`
  }

  return fallbackLabel ?? UNAVAILABLE_TEXT
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return UNAVAILABLE_TEXT

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function formatDate(iso: string): string {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return UNAVAILABLE_TEXT

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}
