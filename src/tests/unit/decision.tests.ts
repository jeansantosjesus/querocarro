import { CRITERIA } from '../../config/criteria'

import { SCENARIOS } from '../../config/scenarios'

import { normalizeValues } from '../../domain/decision/normalize'

import { initialWeights, resolveScenario } from '../../domain/decision/scenarios'

import { SORT_OPTIONS, sortRecommendations, type SortKey } from '../../domain/decision/sort'

import {
  applyPriorities,
  rebalanceWeights,
  roundWeightsToHundred,
  sumWeights,
  weightDeltas,
  weightsAreValid,
} from '../../domain/decision/weights'

import {
  calculateProximityPenalty,
  rankByIndex,
  scoreCandidates,
  type ScoringCandidate,
} from '../../domain/decision/wsm'

import {
  CRITERION_IDS,
  type CriterionId,
  type RankedVehicle,
  type VehicleCosts,
  type Weights,
} from '../../types/decision'

import type { VehicleTco } from '../../types/tco'

import { makeVehicle } from '../fixtures/factories'

const NEUTRAL = { economia: 3, conforto: 3, desempenho: 3, manutencao: 3 }

function weights(partial: Partial<Weights>): Weights {
  const base = {} as Weights

  for (const id of CRITERION_IDS) base[id] = 0

  return { ...base, ...partial }
}

describe('normalização 0-100', () => {
  it('critério de CUSTO: menor valor recebe 100 e maior recebe 0', () => {
    const { normalized, stat } = normalizeValues([10, 20, 30], 'cost')

    expect(normalized).toEqual([100, 50, 0])

    expect(stat).toMatchObject({ min: 10, max: 30, count: 3, degenerate: false })
  })

  it('critério de BENEFÍCIO: maior valor recebe 100 e menor recebe 0', () => {
    const { normalized } = normalizeValues([10, 20, 30], 'benefit')

    expect(normalized).toEqual([0, 50, 100])
  })

  it('valores ausentes permanecem nulos e não entram em min/max', () => {
    const { normalized, stat } = normalizeValues([10, null, 30], 'cost')

    expect(normalized).toEqual([100, null, 0])

    expect(stat?.count).toBe(2)
  })

  it('critério sem variação (max = min) é marcado como degenerado e recebe 100', () => {
    const { normalized, stat } = normalizeValues([5, 5, 5], 'cost')

    expect(normalized).toEqual([100, 100, 100])

    expect(stat?.degenerate).toBe(true)
  })

  it('todos ausentes: sem estatística', () => {
    const { normalized, stat } = normalizeValues([null, null], 'benefit')

    expect(normalized).toEqual([null, null])

    expect(stat).toBeNull()
  })

  it('NaN/Infinity são tratados como ausentes e nunca contaminam o resultado', () => {
    const { normalized } = normalizeValues([10, Number.NaN, 30, Number.POSITIVE_INFINITY], 'cost')

    expect(normalized[1]).toBeNull()

    expect(normalized[3]).toBeNull()

    expect(normalized[0]).toBe(100)
  })

  it('outlier comprime os demais valores perto de 0 ou 100, mas permanece em 0-100', () => {
    const { normalized } = normalizeValues([10, 11, 12, 1000], 'cost')

    for (const value of normalized) {
      expect(value).not.toBeNull()

      expect(value!).toBeGreaterThanOrEqual(0)

      expect(value!).toBeLessThanOrEqual(100)
    }

    expect(normalized[0]).toBe(100)

    expect(normalized[3]).toBe(0)

    expect(normalized[1]!).toBeGreaterThan(99)
  })

  it('todos os critérios do modelo têm direção definida', () => {
    const costs = CRITERIA.filter((c) => c.direction === 'cost').map((c) => c.id)

    const benefits = CRITERIA.filter((c) => c.direction === 'benefit').map((c) => c.id)

    expect(costs).toEqual(['tco'])

    expect(benefits).toEqual(['incomeCommitment', 'usageFit', 'preference'])
  })

  it('a renda não é critério de comparação (apenas indicadores derivados)', () => {
    expect(CRITERIA.map((c) => c.id as string)).not.toContain('income')

    expect(CRITERIA.map((c) => c.id as string)).not.toContain('netIncome')
  })
})

describe('pesos', () => {
  it('os pesos iniciais de cada cenário somam 100 e respeitam os limites', () => {
    for (const scenario of Object.values(SCENARIOS)) {
      expect(sumWeights(scenario.weights)).toBe(100)

      expect(weightsAreValid(scenario.weights)).toBe(true)
    }
  })

  it('cenário Econômico prioriza o custo total (TCO); reduz aderência e preferência', () => {
    const eco = SCENARIOS.economico.weights

    const balanced = SCENARIOS.equilibrado.weights

    expect(eco.tco).toBeGreaterThan(balanced.tco)

    expect(eco.usageFit).toBeLessThan(balanced.usageFit)

    expect(eco.preference).toBeLessThan(balanced.preference)
  })

  it('alterar um peso redistribui o restante mantendo a soma em 100 (todos os critérios, vários valores)', () => {
    const start = SCENARIOS.equilibrado.weights

    for (const id of CRITERION_IDS) {
      for (const requested of [0, 1, 7, 25, 40, 60, 90, -10, Number.NaN]) {
        const next = rebalanceWeights(start, id, requested)

        expect(sumWeights(next)).toBe(100)

        expect(weightsAreValid(next)).toBe(true)

        expect(Number.isInteger(next[id])).toBe(true)
      }
    }
  })

  it('peso acima do limite máximo é limitado', () => {
    const next = rebalanceWeights(SCENARIOS.equilibrado.weights, 'tco', 95)

    expect(next.tco).toBe(75)

    expect(sumWeights(next)).toBe(100)
  })

  it('a redistribuição é proporcional aos pesos dos demais critérios', () => {
    const start = weights({ tco: 40, incomeCommitment: 40, usageFit: 20 })

    const next = rebalanceWeights(start, 'tco', 20)

    expect(next.tco).toBe(20)

    expect(next.incomeCommitment).toBe(53)

    expect(next.usageFit).toBe(27)

    expect(sumWeights(next)).toBe(100)
  })

  it('é determinística', () => {
    const a = rebalanceWeights(SCENARIOS.conservador.weights, 'tco', 33)

    const b = rebalanceWeights(SCENARIOS.conservador.weights, 'tco', 33)

    expect(a).toEqual(b)
  })

  it('mostra quais critérios ganharam importância', () => {
    const base = SCENARIOS.equilibrado.weights

    const next = rebalanceWeights(base, 'usageFit', 30)

    const deltas = weightDeltas(next, base)

    expect(deltas.usageFit).toBe(18)

    const lost = CRITERION_IDS.filter((id) => deltas[id] < 0)

    expect(lost.length).toBeGreaterThan(0)
  })

  it('prioridades neutras preservam os pesos do cenário', () => {
    for (const scenario of Object.values(SCENARIOS)) {
      expect(applyPriorities(scenario.weights, NEUTRAL)).toEqual(scenario.weights)
    }
  })

  it('prioridade alta em economia aumenta o peso dos critérios de custo correspondentes', () => {
    const base = SCENARIOS.equilibrado.weights

    const next = applyPriorities(base, { ...NEUTRAL, economia: 5 })

    expect(next.incomeCommitment).toBeGreaterThan(base.incomeCommitment)

    expect(sumWeights(next)).toBe(100)
  })

  it('roundWeightsToHundred reescala valores arbitrários', () => {
    const scaled = roundWeightsToHundred(weights({ tco: 1, incomeCommitment: 1, usageFit: 1 }))

    expect(sumWeights(scaled)).toBe(100)

    expect(weightsAreValid(scaled)).toBe(true)
  })

  it('initialWeights combina cenário e prioridades', () => {
    expect(initialWeights('economico', NEUTRAL)).toEqual(SCENARIOS.economico.weights)
  })
})

function candidate(
  id: string,

  criteria: Partial<Record<CriterionId, number | null>>,

  monthlyTotal: number | null = 1000,
): ScoringCandidate {
  const full = {} as Record<CriterionId, number | null>

  for (const criterionId of CRITERION_IDS) full[criterionId] = criteria[criterionId] ?? null

  return {
    vehicle: makeVehicle({ fipeCode: id }),

    costs: { monthlyTotal } as VehicleCosts,

    financial: {
      commitmentRatio: 0.2,

      limitUsageRatio: null,

      availableMonthly: 5000,

      remainingMargin: 4000,

      priceToPurchasePowerRatio: null,

      availableCommitment: null,

      coverageIndex: null,

      acquisitionCapacity: null,

      acquisitionMargin: null,

      affordabilityClass: null,

      financialScore: null,

      financialContributions: null,

      pressureLevel: 'moderada',
    },
    tco: {
      criterionHorizonMonths: 36,

      criterionValue: full.tco,

      byHorizon: {} as VehicleTco['byHorizon'],
    },

    criteria: full,
  }
}

describe('soma ponderada (Weighted Sum Model)', () => {
  const twoCriteria = weights({ tco: 60, usageFit: 40 })

  it('calcula índice = Σ peso × valor normalizado e as contribuições somam o índice base', () => {
    const output = scoreCandidates(
      [
        candidate('A', { tco: 100, usageFit: 20 }),

        candidate('B', { tco: 200, usageFit: 80 }),

        candidate('C', { tco: 150, usageFit: 50 }),
      ],

      twoCriteria,

      SCENARIOS.equilibrado,

      5000,
    )

    const byCode = Object.fromEntries(output.scored.map((s) => [s.vehicle.fipeCode, s]))

    // A: preço (custo) = 100; adequação (benefício) = 0 -> 0,6*100 + 0,4*0 = 60

    expect(byCode.A!.index).toBeCloseTo(60, 8)

    // B: preço = 0; adequação = 100 -> 40

    expect(byCode.B!.index).toBeCloseTo(40, 8)

    // C: preço = 50; adequação = 50 -> 50

    expect(byCode.C!.index).toBeCloseTo(50, 8)

    for (const item of output.scored) {
      const total = CRITERION_IDS.reduce((sum, id) => sum + item.contributions[id], 0)

      expect(total).toBeCloseTo(item.baseIndex, 8)
    }
  })

  it('alterar pesos altera o ranking de forma coerente', () => {
    const list = [
      candidate('A', { tco: 100, usageFit: 20 }),

      candidate('B', { tco: 200, usageFit: 80 }),
    ]

    const cheapFirst = rankByIndex(
      scoreCandidates(list, weights({ tco: 60, usageFit: 40 }), SCENARIOS.equilibrado, 5000).scored,
    )

    const fitFirst = rankByIndex(
      scoreCandidates(
        list,

        weights({ tco: 20, usageFit: 60, incomeCommitment: 20 }),

        SCENARIOS.equilibrado,

        5000,
      ).scored,
    )

    expect(cheapFirst[0]!.vehicle.fipeCode).toBe('A')

    expect(fitFirst[0]!.vehicle.fipeCode).toBe('B')
  })

  it('critério ausente em um veículo redistribui o peso entre os disponíveis (sem assumir zero)', () => {
    const output = scoreCandidates(
      [
        candidate('A', { tco: 100, usageFit: 20, preference: 10 }),

        candidate('B', { tco: 200, usageFit: 80, preference: 90 }),

        candidate('C', { tco: 150, usageFit: 50, preference: null }),
      ],

      weights({ tco: 50, usageFit: 40, preference: 10 }),

      SCENARIOS.equilibrado,

      5000,
    )

    const c = output.scored.find((s) => s.vehicle.fipeCode === 'C')!

    expect(c.missingCriteria).toEqual(['preference'])

    expect(c.effectiveWeights.preference).toBe(0)

    expect(c.effectiveWeights.tco + c.effectiveWeights.usageFit).toBeCloseTo(100, 8)

    expect(c.effectiveWeights.tco).toBeCloseTo((50 / 90) * 100, 8)
  })

  it('critério sem nenhum valor no conjunto é "não aplicável" para todos', () => {
    const output = scoreCandidates(
      [candidate('A', { tco: 1, preference: null }), candidate('B', { tco: 2, preference: null })],

      weights({ tco: 90, preference: 10 }),

      SCENARIOS.equilibrado,

      5000,
    )

    expect(output.inactive).toContain('preference')

    expect(output.scored).toHaveLength(2)

    expect(output.scored[0]!.missingCriteria).toEqual([])
  })

  it('exclui o veículo quando falta mais que o limite de peso e registra o motivo', () => {
    const output = scoreCandidates(
      [
        candidate('A', { tco: 1, usageFit: 10 }),

        candidate('B', { tco: 2, usageFit: 20 }),

        candidate('C', { tco: null, usageFit: 30 }),
      ],

      weights({ tco: 70, usageFit: 30 }),

      SCENARIOS.equilibrado,

      5000,
    )

    expect(output.scored.map((s) => s.vehicle.fipeCode)).toEqual(['A', 'B'])

    expect(output.excluded).toHaveLength(1)

    expect(output.excluded[0]).toMatchObject({ code: 'dados_insuficientes', stage: 'dados' })
  })

  it('pesos que recaem apenas em critérios inexistentes excluem todos, com motivo', () => {
    const output = scoreCandidates(
      [candidate('A', { tco: 1 }), candidate('B', { tco: 2 })],

      weights({ preference: 100 }),

      SCENARIOS.equilibrado,

      5000,
    )

    expect(output.scored).toHaveLength(0)

    expect(output.excluded.every((e) => e.code === 'sem_criterios_ponderados')).toBe(true)
  })

  it('empate de índices é resolvido de forma determinística pelo identificador', () => {
    const tied = scoreCandidates(
      [candidate('Z', { tco: 10, usageFit: 10 }), candidate('A', { tco: 10, usageFit: 10 })],

      twoCriteria,

      SCENARIOS.equilibrado,

      5000,
    ).scored

    expect(tied[0]!.index).toBe(tied[1]!.index)

    expect(rankByIndex(tied).map((s) => s.vehicle.fipeCode)).toEqual(['A', 'Z'])

    expect(rankByIndex([...tied].reverse()).map((s) => s.vehicle.fipeCode)).toEqual(['A', 'Z'])
  })

  it('é determinístico: mesma entrada produz exatamente a mesma saída', () => {
    const list = [
      candidate('A', { tco: 100, usageFit: 20 }),

      candidate('B', { tco: 200, usageFit: 80 }),

      candidate('C', { tco: 150, usageFit: 50 }),
    ]

    const first = scoreCandidates(list, twoCriteria, SCENARIOS.equilibrado, 5000)

    const second = scoreCandidates(list, twoCriteria, SCENARIOS.equilibrado, 5000)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})

describe('cenário conservador: penalização próxima ao limite', () => {
  const rule = SCENARIOS.conservador.proximityPenalty

  it('não penaliza abaixo do início da faixa', () => {
    expect(calculateProximityPenalty(600, 1000, rule)).toBe(0)

    expect(calculateProximityPenalty(700, 1000, rule)).toBe(0)
  })

  it('penaliza progressivamente até o máximo no limite', () => {
    const mid = calculateProximityPenalty(850, 1000, rule)

    const top = calculateProximityPenalty(1000, 1000, rule)

    expect(mid).toBeGreaterThan(0)

    expect(top).toBeCloseTo(rule!.maxPoints, 8)

    expect(mid).toBeLessThan(top)
  })

  it('cenários sem regra ou valores ausentes não penalizam', () => {
    expect(calculateProximityPenalty(990, 1000, null)).toBe(0)

    expect(calculateProximityPenalty(null, 1000, rule)).toBe(0)

    expect(calculateProximityPenalty(900, 0, rule)).toBe(0)
  })

  it('o índice final nunca fica negativo', () => {
    const output = scoreCandidates(
      [candidate('A', { tco: 1, usageFit: 0 }, 1000), candidate('B', { tco: 2, usageFit: 1 }, 100)],

      weights({ tco: 50, usageFit: 50 }),

      SCENARIOS.conservador,

      1000,
    )

    for (const item of output.scored) expect(item.index).toBeGreaterThanOrEqual(0)
  })
})

describe('cenários', () => {
  it('conservador usa margem de segurança maior e limita o comprometimento', () => {
    const conservative = SCENARIOS.conservador

    expect(conservative.multipliers.insurance).toBeGreaterThan(1)

    expect(conservative.multipliers.maintenance).toBeGreaterThan(1)

    expect(conservative.monthlyLimitShare).toBeLessThan(1)

    expect(conservative.maxIncomeCommitment).toBeLessThan(SCENARIOS.equilibrado.maxIncomeCommitment)

    expect(conservative.proximityPenalty).not.toBeNull()
  })

  it('cenário personalizado aplica a margem escolhida', () => {
    const scenario = resolveScenario({ scenarioId: 'personalizado', customMarginMultiplier: 1.2 })

    expect(scenario.multipliers.insurance).toBe(1.2)

    expect(scenario.monthlyLimitShare).toBeCloseTo(1 / 1.2, 8)

    const plain = resolveScenario({ scenarioId: 'economico', customMarginMultiplier: 1.4 })

    expect(plain.id).toBe('economico')

    expect(plain.multipliers.insurance).toBe(1)
  })
})

function ranked(
  id: string,

  brand: string,

  patch: {
    price?: number | null

    monthly?: number | null

    energy?: number | null

    maintenance?: number | null

    depreciation?: number | null

    index?: number

    year?: number
  },
): RankedVehicle {
  return {
    vehicle: makeVehicle({ fipeCode: id, brand, model: id, modelYear: patch.year ?? 2023 }),

    costs: {
      priceBRL: patch.price === undefined ? 50000 : patch.price,

      monthlyTotal: patch.monthly === undefined ? 2000 : patch.monthly,

      energyCostPerKm: patch.energy === undefined ? 0.5 : patch.energy,

      maintenanceAnnual: patch.maintenance === undefined ? 2000 : patch.maintenance,

      depreciationAnnual: patch.depreciation === undefined ? 4000 : patch.depreciation,
    } as VehicleCosts,

    index: patch.index ?? 50,
  } as RankedVehicle
}

describe('ordenação', () => {
  const items = [
    ranked('c', 'Fiat', {
      price: 70000,

      monthly: 2500,

      energy: 0.6,

      maintenance: 1500,

      depreciation: 5000,

      index: 60,

      year: 2021,
    }),

    ranked('a', 'Toyota', {
      price: 90000,

      monthly: 2100,

      energy: 0.4,

      maintenance: 2500,

      depreciation: 3000,

      index: 90,

      year: 2025,
    }),

    ranked('b', 'Honda', {
      price: 50000,

      monthly: 3000,

      energy: 0.8,

      maintenance: 1000,

      depreciation: 7000,

      index: 40,

      year: 2023,
    }),
  ]

  const ids = (list: RankedVehicle[]) => list.map((i) => i.vehicle.fipeCode)

  it.each([
    ['alfabetica', ['c', 'b', 'a']],

    ['menor_preco', ['b', 'c', 'a']],

    ['menor_custo_mensal', ['a', 'c', 'b']],

    ['menor_consumo', ['a', 'c', 'b']],

    ['menor_manutencao', ['b', 'c', 'a']],

    ['menor_depreciacao', ['a', 'c', 'b']],

    ['maior_compatibilidade', ['a', 'c', 'b']],

    ['ano', ['a', 'b', 'c']],
  ] satisfies Array<[SortKey, string[]]>)('ordena por %s', (key, expected) => {
    expect(ids(sortRecommendations(items, key))).toEqual(expected)
  })

  it('oferece as oito formas de ordenação exigidas', () => {
    expect(SORT_OPTIONS).toHaveLength(8)
  })

  it('valores ausentes vão para o fim e a entrada não é alterada', () => {
    const withNull = [...items, ranked('z', 'Audi', { price: null })]

    const original = ids(withNull)

    expect(ids(sortRecommendations(withNull, 'menor_preco')).at(-1)).toBe('z')

    expect(ids(withNull)).toEqual(original)
  })

  it('é estável e determinística em empates', () => {
    const tie = [ranked('y', 'Fiat', { price: 1 }), ranked('x', 'Fiat', { price: 1 })]

    expect(ids(sortRecommendations(tie, 'menor_preco'))).toEqual(['x', 'y'])

    expect(ids(sortRecommendations([...tie].reverse(), 'menor_preco'))).toEqual(['x', 'y'])
  })
})
