/** Percentil com interpolação linear. `values` não precisa estar ordenado. */

export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)

  const position = (sorted.length - 1) * Math.min(Math.max(p, 0), 1)

  const lower = Math.floor(position)

  const upper = Math.ceil(position)

  const lowerValue = sorted[lower]

  const upperValue = sorted[upper]

  if (lowerValue === undefined || upperValue === undefined) return null

  return lowerValue + (upperValue - lowerValue) * (position - lower)
}

export interface IqrFences {
  q1: number

  q3: number

  iqr: number

  lower: number

  upper: number
}

/** Cercas de Tukey. `k = 1.5` (suave) ou `k = 3` (extremo). Retorna null se IQR = 0. */

export function iqrFences(values: readonly number[], k: number): IqrFences | null {
  const q1 = percentile(values, 0.25)

  const q3 = percentile(values, 0.75)

  if (q1 === null || q3 === null) return null

  const iqr = q3 - q1

  if (iqr <= 0) return null

  return { q1, q3, iqr, lower: q1 - k * iqr, upper: q3 + k * iqr }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Separa valores numéricos finitos dos ausentes (null, undefined, NaN, Infinity). */

export function splitFinite(values: readonly (number | null | undefined)[]): {
  values: number[]

  missing: number
} {
  const finite: number[] = []

  let missing = 0

  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) finite.push(value)
    else missing += 1
  }

  return { values: finite, missing }
}

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function median(values: readonly number[]): number | null {
  return percentile(values, 0.5)
}

/** Desvio padrão amostral (n - 1). Retorna null com menos de 2 valores. */

export function sampleStdDev(values: readonly number[]): number | null {
  if (values.length < 2) return null

  const avg = mean(values)

  if (avg === null) return null

  const squares = values.reduce((sum, value) => sum + (value - avg) ** 2, 0)

  return Math.sqrt(squares / (values.length - 1))
}

/** Desvio padrão / média. Retorna null se a média for zero ou o desvio indisponível. */

export function coefficientOfVariation(values: readonly number[]): number | null {
  const avg = mean(values)

  const std = sampleStdDev(values)

  if (avg === null || std === null || avg === 0) return null

  return std / Math.abs(avg)
}

export interface StatSummary {
  count: number

  missing: number

  min: number | null

  max: number | null

  range: number | null

  mean: number | null

  median: number | null

  q1: number | null

  q3: number | null

  stdDev: number | null

  coefficientOfVariation: number | null
}

/** Resumo descritivo. Ausentes são contados em `missing` e nunca entram como zero. */

export function summarize(values: readonly (number | null | undefined)[]): StatSummary {
  const { values: finite, missing } = splitFinite(values)

  const min = finite.length > 0 ? Math.min(...finite) : null

  const max = finite.length > 0 ? Math.max(...finite) : null

  return {
    count: finite.length,

    missing,

    min,

    max,

    range: min !== null && max !== null ? max - min : null,

    mean: mean(finite),

    median: median(finite),

    q1: percentile(finite, 0.25),

    q3: percentile(finite, 0.75),

    stdDev: sampleStdDev(finite),

    coefficientOfVariation: coefficientOfVariation(finite),
  }
}

export interface DistributionBand {
  /** Limite inferior inclusivo; null = sem limite. */

  lower: number | null

  /** Limite superior exclusivo; null = sem limite. */

  upper: number | null

  count: number

  share: number
}

/**

* Contagem por faixa. `edges` são os cortes em ordem crescente; geram `edges.length + 1` faixas

* no formato [lower, upper). Ausentes são ignorados.

*/

export function distributionByBands(
  values: readonly (number | null | undefined)[],

  edges: readonly number[],
): DistributionBand[] {
  const { values: finite } = splitFinite(values)

  const sortedEdges = [...edges].sort((a, b) => a - b)

  const bounds = [null, ...sortedEdges, null]

  const bands: DistributionBand[] = []

  for (let index = 0; index < bounds.length - 1; index += 1) {
    const lower = bounds[index] ?? null

    const upper = bounds[index + 1] ?? null

    const count = finite.filter(
      (value) => (lower === null || value >= lower) && (upper === null || value < upper),
    ).length

    bands.push({ lower, upper, count, share: finite.length > 0 ? count / finite.length : 0 })
  }

  return bands
}
