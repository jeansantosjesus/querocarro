import type { CriterionDirection, NormalizationStat } from '../../types/decision'

export interface NormalizationResult {
  normalized: Array<number | null>
  stat: NormalizationStat | null
}

/**
 * Normalização min-max para a escala comum 0-100, sobre o conjunto de alternativas elegíveis.
 *
 *   benefício (maior é melhor): 100 * (x - min) / (max - min)
 *   custo     (menor é melhor): 100 * (max - x) / (max - min)
 *
 * - Valores ausentes (null/NaN) permanecem null: NUNCA viram zero.
 * - Se max = min (critério não discrimina), todos os valores presentes recebem 100 e a
 *   estatística é marcada como `degenerate`.
 */
export function normalizeValues(
  values: ReadonlyArray<number | null>,
  direction: CriterionDirection,
): NormalizationResult {
  const present = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  )
  if (present.length === 0) {
    return { normalized: values.map(() => null), stat: null }
  }
  const min = Math.min(...present)
  const max = Math.max(...present)
  const range = max - min
  const degenerate = range === 0

  const normalized = values.map((value) => {
    if (value === null || !Number.isFinite(value)) return null
    if (degenerate) return 100
    return direction === 'benefit' ? (100 * (value - min)) / range : (100 * (max - value)) / range
  })

  return { normalized, stat: { min, max, count: present.length, degenerate } }
}
