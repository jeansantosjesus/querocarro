import { CLUSTERING } from '../../config/analytics'
import { CATEGORY_LABEL } from '../../config/categoryLabels'
import type { AnalyticGroup, ClusteringSummary } from '../../types/analytics'
import type { VehicleCategory } from '../../types/vehicle'
import { formatBRL, formatNumber } from '../../utils/format'
import { mean, median, percentile, sampleStdDev } from '../../utils/stats'

/** Variáveis do agrupamento. Marca, modelo, renda e índice final ficam de fora por definição. */
export interface ClusterInput {
  id: string
  price: number | null
  monthlyTotal: number | null
  energyCostPerKm: number | null
  maintenanceAnnual: number | null
  depreciationAnnual: number | null
  usageFit: number | null
  category: VehicleCategory | null
}

export interface ClusteringResult {
  summary: ClusteringSummary
  /** id do veículo -> id do grupo. Veículos ausentes não foram agrupados. */
  assignments: Map<string, string>
}

const NUMERIC_FEATURES = [
  'price',
  'monthlyTotal',
  'energyCostPerKm',
  'maintenanceAnnual',
  'depreciationAnnual',
  'usageFit',
] as const

const CATEGORIES: readonly VehicleCategory[] = ['hatch', 'sedan', 'suv', 'picape', 'minivan']

const GROUP_LETTERS = 'ABCDEFGH'

/** Padronização z-score por coluna. Coluna constante vira zero (não diferencia ninguém). */
export function standardizeColumns(rows: readonly (readonly number[])[]): number[][] {
  const dims = rows[0]?.length ?? 0
  const stats = Array.from({ length: dims }, (_, column) => {
    const values = rows.map((row) => row[column] ?? 0)
    return { avg: mean(values) ?? 0, std: sampleStdDev(values) }
  })
  return rows.map((row) =>
    row.map((value, column) => {
      const stat = stats[column]
      if (!stat || stat.std === null || stat.std === 0) return 0
      return (value - stat.avg) / stat.std
    }),
  )
}

function squaredDistance(a: readonly number[], b: readonly number[]): number {
  let sum = 0
  for (let index = 0; index < a.length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0)
    sum += diff * diff
  }
  return sum
}

function columnMeans(rows: readonly (readonly number[])[]): number[] {
  const dims = rows[0]?.length ?? 0
  return Array.from({ length: dims }, (_, column) => mean(rows.map((row) => row[column] ?? 0)) ?? 0)
}

/**
 * K-Means com inicialização determinística (sem aleatoriedade): o primeiro centro é o ponto
 * mais próximo da média; os seguintes, o ponto mais distante dos centros já escolhidos.
 * Empates ficam com o menor índice. Retorna null se houver menos pontos distintos que `k`.
 */
export function kMeans(
  rows: readonly (readonly number[])[],
  k: number,
  maxIterations: number = CLUSTERING.maxIterations,
): { labels: number[]; centroids: number[][] } | null {
  if (k < 1 || rows.length < k) return null

  const overall = columnMeans(rows)
  let first = 0
  rows.forEach((row, index) => {
    if (squaredDistance(row, overall) < squaredDistance(rows[first] ?? row, overall)) first = index
  })
  const centroids: number[][] = [[...(rows[first] ?? [])]]
  while (centroids.length < k) {
    let best = -1
    let bestDistance = -1
    rows.forEach((row, index) => {
      const nearest = Math.min(...centroids.map((centroid) => squaredDistance(row, centroid)))
      if (nearest > bestDistance) {
        best = index
        bestDistance = nearest
      }
    })
    if (best < 0 || bestDistance <= 0) return null
    centroids.push([...(rows[best] ?? [])])
  }

  const labels = new Array<number>(rows.length).fill(-1)
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false
    rows.forEach((row, index) => {
      let nearest = 0
      let nearestDistance = Infinity
      centroids.forEach((centroid, cluster) => {
        const distance = squaredDistance(row, centroid)
        if (distance < nearestDistance) {
          nearest = cluster
          nearestDistance = distance
        }
      })
      if (labels[index] !== nearest) {
        labels[index] = nearest
        changed = true
      }
    })
    if (!changed) break
    centroids.forEach((_, cluster) => {
      const members = rows.filter((_, index) => labels[index] === cluster)
      if (members.length > 0) centroids[cluster] = columnMeans(members)
    })
  }
  return { labels, centroids }
}

/**
 * Silhueta média (-1 a 1). Ponto sozinho no grupo vale 0.
 * Retorna null com menos de 2 grupos não vazios.
 */
export function silhouetteScore(
  rows: readonly (readonly number[])[],
  labels: readonly number[],
): number | null {
  const clusters = [...new Set(labels)]
  if (clusters.length < 2) return null
  const scores = rows.map((row, index) => {
    const own = labels[index]
    const distancesTo = (cluster: number) => {
      const distances = rows
        .map((other, otherIndex) =>
          labels[otherIndex] === cluster && otherIndex !== index
            ? Math.sqrt(squaredDistance(row, other))
            : null,
        )
        .filter((value): value is number => value !== null)
      return distances
    }
    const ownDistances = own === undefined ? [] : distancesTo(own)
    if (ownDistances.length === 0) return 0
    const a = mean(ownDistances) ?? 0
    const b = Math.min(
      ...clusters
        .filter((cluster) => cluster !== own)
        .map((cluster) => mean(distancesTo(cluster)) ?? Infinity),
    )
    const denominator = Math.max(a, b)
    return denominator === 0 || !Number.isFinite(denominator) ? 0 : (b - a) / denominator
  })
  return mean(scores)
}

function relativeToMedian(value: number | null, reference: number | null): string {
  if (value === null || reference === null || reference === 0) return 'sem referência'
  const diff = (value - reference) / Math.abs(reference)
  if (Math.abs(diff) <= CLUSTERING.nearMedianTolerance) return 'próximo da mediana do conjunto'
  return diff < 0 ? 'abaixo da mediana do conjunto' : 'acima da mediana do conjunto'
}

function predominantCategory(members: readonly ClusterInput[]): string {
  const counts = new Map<VehicleCategory, number>()
  for (const member of members) {
    if (member.category) counts.set(member.category, (counts.get(member.category) ?? 0) + 1)
  }
  let best: VehicleCategory | null = null
  for (const category of CATEGORIES) {
    const count = counts.get(category) ?? 0
    if (count > 0 && (best === null || count > (counts.get(best) ?? 0))) best = category
  }
  return best ? CATEGORY_LABEL[best] : 'não disponível'
}

function isComplete(input: ClusterInput): boolean {
  return (
    input.category !== null &&
    NUMERIC_FEATURES.every((feature) => {
      const value = input[feature]
      return value !== null && Number.isFinite(value)
    })
  )
}

function toRow(input: ClusterInput): number[] {
  return NUMERIC_FEATURES.map((feature) => input[feature] ?? 0)
}

function buildKMeansGroups(
  members: readonly ClusterInput[],
  labels: readonly number[],
  k: number,
  all: readonly ClusterInput[],
): { groups: AnalyticGroup[]; assignments: Map<string, string> } {
  const overallTco = median(all.map((item) => item.monthlyTotal ?? 0))
  const overallPrice = median(all.map((item) => item.price ?? 0))
  const clusters = Array.from({ length: k }, (_, cluster) =>
    members.filter((_, index) => labels[index] === cluster),
  )
    .filter((items) => items.length > 0)
    .map((items) => ({ items, tco: median(items.map((item) => item.monthlyTotal ?? 0)) ?? 0 }))
    .sort((a, b) => a.tco - b.tco || (a.items[0]?.id ?? '').localeCompare(b.items[0]?.id ?? ''))

  const assignments = new Map<string, string>()
  const groups = clusters.map(({ items, tco }, position) => {
    const id = GROUP_LETTERS[position] ?? String(position + 1)
    for (const item of items) assignments.set(item.id, id)
    const price = median(items.map((item) => item.price ?? 0))
    return {
      id,
      label: `Grupo analítico ${id}`,
      size: items.length,
      description:
        `TCO mensal ${relativeToMedian(tco, overallTco)}; preço ${relativeToMedian(price, overallPrice)}; ` +
        `categoria predominante: ${predominantCategory(items)}.`,
    }
  })
  return { groups, assignments }
}

function buildTcoBands(items: readonly ClusterInput[]): {
  groups: AnalyticGroup[]
  assignments: Map<string, string>
} {
  const values = items.map((item) => item.monthlyTotal ?? 0)
  const lowerCut = percentile(values, 1 / 3) ?? 0
  const upperCut = percentile(values, 2 / 3) ?? 0
  const bands = [
    {
      label: 'Faixa inferior de TCO mensal',
      description: `TCO mensal até ${formatBRL(lowerCut)} (primeiro terço do conjunto).`,
      test: (value: number) => value <= lowerCut,
    },
    {
      label: 'Faixa intermediária de TCO mensal',
      description: `TCO mensal acima de ${formatBRL(lowerCut)} e até ${formatBRL(upperCut)}.`,
      test: (value: number) => value > lowerCut && value <= upperCut,
    },
    {
      label: 'Faixa superior de TCO mensal',
      description: `TCO mensal acima de ${formatBRL(upperCut)} (último terço do conjunto).`,
      test: (value: number) => value > upperCut,
    },
  ]
  const assignments = new Map<string, string>()
  const groups: AnalyticGroup[] = []
  for (const band of bands) {
    const members = items.filter((item) => band.test(item.monthlyTotal ?? 0))
    if (members.length === 0) continue
    const id = GROUP_LETTERS[groups.length] ?? String(groups.length + 1)
    for (const member of members) assignments.set(member.id, id)
    groups.push({ id, label: band.label, size: members.length, description: band.description })
  }
  return { groups, assignments }
}

/**
 * Agrupamento descritivo das alternativas elegíveis. Usa K-Means quando há amostra e estrutura
 * suficientes; caso contrário, faixas de TCO mensal (tercis). Não altera o índice nem o ranking.
 * A entrada é ordenada por id, então a ordem recebida não muda o resultado.
 */
export function clusterVehicles(inputs: readonly ClusterInput[]): ClusteringResult {
  const sorted = [...inputs].sort((a, b) => a.id.localeCompare(b.id))
  const complete = sorted.filter(isComplete)
  const unassignedCount = sorted.length - complete.length
  const minSample = CLUSTERING.kMin * CLUSTERING.minPerCluster

  let best: { k: number; labels: number[]; silhouette: number } | null = null
  if (complete.length >= minSample) {
    const numeric = standardizeColumns(complete.map(toRow))
    const rows = numeric.map((row, index) => [
      ...row,
      ...CATEGORIES.map((category) => (complete[index]?.category === category ? 1 : 0)),
    ])
    for (let k = CLUSTERING.kMin; k <= CLUSTERING.kMax; k += 1) {
      if (complete.length < k * CLUSTERING.minPerCluster) break
      const result = kMeans(rows, k)
      if (!result) continue
      const sizes = Array.from(
        { length: k },
        (_, cluster) => result.labels.filter((label) => label === cluster).length,
      )
      if (sizes.some((size) => size < CLUSTERING.minPerCluster)) continue
      const silhouette = silhouetteScore(rows, result.labels)
      if (silhouette !== null && (best === null || silhouette > best.silhouette)) {
        best = { k, labels: result.labels, silhouette }
      }
    }
  }

  if (best && best.silhouette >= CLUSTERING.minSilhouette) {
    const { groups, assignments } = buildKMeansGroups(complete, best.labels, best.k, complete)
    return {
      summary: {
        method: 'kmeans',
        k: best.k,
        silhouette: best.silhouette,
        reason: `K-Means com ${best.k} grupos, escolhido pela maior silhueta (${formatNumber(best.silhouette, 2)}) entre ${CLUSTERING.kMin} e ${CLUSTERING.kMax} grupos.`,
        groups,
        unassignedCount,
      },
      assignments,
    }
  }

  const withTco = sorted.filter(
    (item) => item.monthlyTotal !== null && Number.isFinite(item.monthlyTotal),
  )
  if (withTco.length < CLUSTERING.minForBands) {
    return {
      summary: {
        method: 'indisponivel',
        k: null,
        silhouette: null,
        reason: `Agrupamento indisponível: são necessárias ao menos ${CLUSTERING.minForBands} alternativas com custo mensal estimado.`,
        groups: [],
        unassignedCount: sorted.length,
      },
      assignments: new Map(),
    }
  }

  const reason =
    complete.length < minSample
      ? `Amostra insuficiente para K-Means (${complete.length} alternativas com dados completos; mínimo de ${minSample}). Foram usadas faixas de TCO mensal (tercis).`
      : best
        ? `Estrutura de grupos fraca no K-Means (silhueta ${formatNumber(best.silhouette, 2)}, abaixo de ${formatNumber(CLUSTERING.minSilhouette, 2)}). Foram usadas faixas de TCO mensal (tercis).`
        : `Não foi possível formar grupos com ao menos ${CLUSTERING.minPerCluster} alternativas cada. Foram usadas faixas de TCO mensal (tercis).`
  const { groups, assignments } = buildTcoBands(withTco)
  return {
    summary: {
      method: 'faixas_tco',
      k: groups.length,
      silhouette: best?.silhouette ?? null,
      reason,
      groups,
      unassignedCount: sorted.length - withTco.length,
    },
    assignments,
  }
}
