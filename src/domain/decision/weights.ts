import { WEIGHT_LIMITS } from '../../config/limits'
import { PRIORITY_EFFECT } from '../../config/scenarios'
import { CRITERION_IDS, type CriterionId, type Weights } from '../../types/decision'

const EPS = 1e-9

export function sumWeights(weights: Weights): number {
  return CRITERION_IDS.reduce((sum, id) => sum + weights[id], 0)
}

export function weightsAreValid(weights: Weights): boolean {
  return (
    Math.abs(sumWeights(weights) - WEIGHT_LIMITS.total) < 0.01 &&
    CRITERION_IDS.every(
      (id) =>
        Number.isFinite(weights[id]) &&
        weights[id] >= WEIGHT_LIMITS.minPerCriterion &&
        weights[id] <= WEIGHT_LIMITS.maxPerCriterion,
    )
  )
}

/**
 * Distribui `total` (inteiro) proporcionalmente a `shares`, respeitando `caps` e
 * devolvendo inteiros que somam exatamente `total` (maior resto, desempate pelo menor índice).
 * Determinístico.
 */
export function distribute(
  total: number,
  shares: readonly number[],
  caps: readonly number[],
): number[] {
  const n = shares.length
  const result: number[] = new Array<number>(n).fill(0)
  const capped = new Array<boolean>(n).fill(false)
  let remaining = total

  for (;;) {
    const active = result.map((_, index) => index).filter((index) => !capped[index])
    if (active.length === 0) break
    const shareSum = active.reduce((sum, index) => sum + (shares[index] ?? 0), 0)
    const allocation = (index: number) =>
      shareSum > 0 ? ((shares[index] ?? 0) / shareSum) * remaining : remaining / active.length
    const overflow = active.filter((index) => allocation(index) > (caps[index] ?? Infinity) + EPS)
    if (overflow.length === 0) {
      for (const index of active) result[index] = allocation(index)
      break
    }
    for (const index of overflow) {
      const cap = caps[index] ?? 0
      result[index] = cap
      capped[index] = true
      remaining -= cap
    }
  }

  // Arredondamento por maior resto
  const floors = result.map((value) => Math.floor(value + EPS))
  let leftover = total - floors.reduce((sum, value) => sum + value, 0)
  const order = result
    .map((value, index) => ({ index, frac: value - Math.floor(value + EPS) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index)
  for (const { index } of order) {
    if (leftover <= 0) break
    if ((floors[index] ?? 0) + 1 <= (caps[index] ?? Infinity)) {
      floors[index] = (floors[index] ?? 0) + 1
      leftover -= 1
    }
  }
  return floors
}

function toRecord(values: readonly number[]): Weights {
  const record = {} as Weights
  CRITERION_IDS.forEach((id, index) => {
    record[id] = values[index] ?? 0
  })
  return record
}

const CAPS = CRITERION_IDS.map(() => WEIGHT_LIMITS.maxPerCriterion)

/** Escala pesos quaisquer (não negativos) para inteiros que somam 100. */
export function roundWeightsToHundred(weights: Weights): Weights {
  const shares = CRITERION_IDS.map((id) => Math.max(weights[id], 0))
  return toRecord(distribute(WEIGHT_LIMITS.total, shares, CAPS))
}

/**
 * Altera o peso de UM critério e redistribui a diferença entre os demais,
 * proporcionalmente, mantendo a soma em 100% e os limites por critério.
 */
export function rebalanceWeights(
  current: Weights,
  changed: CriterionId,
  requested: number,
): Weights {
  const value = Math.round(
    Math.min(
      Math.max(Number.isFinite(requested) ? requested : 0, WEIGHT_LIMITS.minPerCriterion),
      WEIGHT_LIMITS.maxPerCriterion,
    ),
  )
  const others = CRITERION_IDS.filter((id) => id !== changed)
  const distributed = distribute(
    WEIGHT_LIMITS.total - value,
    others.map((id) => Math.max(current[id], 0)),
    others.map(() => WEIGHT_LIMITS.maxPerCriterion),
  )
  const next = { ...current, [changed]: value } as Weights
  others.forEach((id, index) => {
    next[id] = distributed[index] ?? 0
  })
  return next
}

export type Priorities = {
  economia: number
  conforto: number
  desempenho: number
  manutencao: number
}

/**
 * Ajusta os pesos do cenário conforme as prioridades (1-5) e reescala para 100.
 * Com todas as prioridades neutras (3), devolve os pesos originais.
 */
export function applyPriorities(base: Weights, priorities: Priorities): Weights {
  const factors = {} as Record<CriterionId, number>
  for (const id of CRITERION_IDS) factors[id] = 1

  for (const [key, criteria] of Object.entries(PRIORITY_EFFECT.mapping) as Array<
    [keyof Priorities, readonly CriterionId[]]
  >) {
    const factor = Math.max(
      1 + (priorities[key] - PRIORITY_EFFECT.neutral) * PRIORITY_EFFECT.stepPct,
      0.05,
    )
    for (const id of criteria) factors[id] = factors[id] * factor
  }

  const scaled = {} as Weights
  for (const id of CRITERION_IDS) scaled[id] = base[id] * factors[id]
  return roundWeightsToHundred(scaled)
}

/** Diferença (em pontos percentuais) entre os pesos atuais e uma referência. */
export function weightDeltas(current: Weights, reference: Weights): Record<CriterionId, number> {
  const deltas = {} as Record<CriterionId, number>
  for (const id of CRITERION_IDS) deltas[id] = current[id] - reference[id]
  return deltas
}
