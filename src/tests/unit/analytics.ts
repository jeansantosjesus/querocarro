import { ADHERENCE_THRESHOLDS, CLUSTERING, PRESSURE_THRESHOLDS } from '../../config/analytics'

import { classifyAdherence, classifyPressure } from '../../domain/analytics/classify'

import {
  clusterVehicles,
  kMeans,
  silhouetteScore,
  standardizeColumns,
  type ClusterInput,
} from '../../domain/analytics/cluster'

import { calculateTcoComposition, summarizeDecision } from '../../domain/analytics/summary'

import { calculateRegionalTaxes } from '../../domain/finance/regionalTax'

import { runDecision } from '../../domain/decision/pipeline'

import type { VehicleCosts } from '../../types/decision'

import {
  coefficientOfVariation,
  distributionByBands,
  mean,
  median,
  sampleStdDev,
  summarize,
} from '../../utils/stats'

import { REFERENCE_YEAR, loadCatalogVehicles, makeInput } from '../fixtures/factories'

const options = { referenceYear: REFERENCE_YEAR }

describe('sumarização', () => {
  it('conjunto vazio não inventa valores', () => {
    const summary = summarize([])

    expect(summary.count).toBe(0)

    expect(summary.mean).toBeNull()

    expect(summary.median).toBeNull()

    expect(summary.stdDev).toBeNull()

    expect(summary.range).toBeNull()
  })

  it('registro único: média e mediana iguais, sem desvio padrão', () => {
    const summary = summarize([42])

    expect(summary.mean).toBe(42)

    expect(summary.median).toBe(42)

    expect(summary.range).toBe(0)

    expect(summary.stdDev).toBeNull()

    expect(summary.coefficientOfVariation).toBeNull()
  })

  it('ausentes são contados à parte e nunca entram como zero', () => {
    const summary = summarize([10, null, 20, undefined, Number.NaN, 30])

    expect(summary.count).toBe(3)

    expect(summary.missing).toBe(3)

    expect(summary.mean).toBe(20)

    expect(summary.min).toBe(10)
  })

  it('duplicados entram normalmente e geram desvio zero', () => {
    const summary = summarize([5, 5, 5, 5])

    expect(summary.stdDev).toBe(0)

    expect(summary.coefficientOfVariation).toBe(0)

    expect(summary.q1).toBe(5)

    expect(summary.q3).toBe(5)
  })

  it('com outlier, a mediana fica estável e a média se desloca', () => {
    const values = [100, 110, 120, 130, 10_000]

    expect(median(values)).toBe(120)

    expect(mean(values)).toBeGreaterThan(2000)
  })

  it('calcula valores conhecidos', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9]

    expect(mean(values)).toBe(5)

    expect(median(values)).toBe(4.5)

    expect(sampleStdDev(values)).toBeCloseTo(2.13809, 5)

    expect(coefficientOfVariation(values)).toBeCloseTo(0.42762, 5)
  })

  it('coeficiente de variação indisponível com média zero', () => {
    expect(coefficientOfVariation([-1, 1])).toBeNull()
  })

  it('distribuição por faixa conta cada valor uma vez, em [inferior, superior)', () => {
    const bands = distributionByBands([1, 2, 3, 4, 5, null], [2, 4])

    expect(bands.map((band) => band.count)).toEqual([1, 2, 2])

    expect(bands.reduce((sum, band) => sum + band.share, 0)).toBeCloseTo(1, 10)

    expect(distributionByBands([], [1]).map((band) => band.count)).toEqual([0, 0])
  })
})

function makeCosts(overrides: Partial<VehicleCosts> = {}): VehicleCosts {
  return {
    priceBRL: 60_000,

    downPaymentUsed: 20_000,

    financedAmount: 40_000,

    monthlyInstallment: 1_000,

    ipvaAnnual: 2_400,

    licensingAnnual: 120,

    insuranceAnnual: 3_000,

    maintenanceAnnual: 1_200,

    energyMonthly: 400,

    energyCostPerKm: 0.4,

    depreciationAnnual: 3_600,

    monthlyTotal: 1_000 + 200 + 10 + 250 + 100 + 400 + 300,

    monthlyCash: null,

    annualTotal: null,

    effectiveConsumption: 12,

    monthlyKm: 1_000,

    usedFuelLabel: 'gasolina',

    notes: [],

    regionalTax: calculateRegionalTaxes({
      state: 'BA',

      priceBRL: 60_000,

      condition: 'indiferente',

      fuel: 'flex',

      asOf: '2026-11-01',

      manualRatePct: undefined,

      allowDemonstrativeEstimate: false,

      demonstrativeRatePct: 4,
    }),

    ...overrides,
  }
}

describe('composição do TCO', () => {
  it('participações somam 100% do custo mensal', () => {
    const composition = calculateTcoComposition(makeCosts())

    expect(composition).not.toBeNull()

    const total = composition!.components.reduce((sum, item) => sum + item.share, 0)

    expect(total).toBeCloseTo(1, 10)

    expect(composition!.components.find((item) => item.id === 'installment')?.share).toBeCloseTo(
      1000 / 2260,

      10,
    )
  })

  it('componente ausente impede a composição (não completa com zero)', () => {
    expect(calculateTcoComposition(makeCosts({ insuranceAnnual: null }))).toBeNull()

    expect(calculateTcoComposition(makeCosts({ monthlyTotal: null }))).toBeNull()
  })
})

describe('resumo da decisão', () => {
  it('conjunto vazio de elegíveis', () => {
    const summary = summarizeDecision(0, [], [])

    expect(summary.eligibleCount).toBe(0)

    expect(summary.monthlyTotal.count).toBe(0)

    expect(summary.monthlyTotalBands).toEqual([])
  })

  it('soma elegíveis e excluídos por etapa', () => {
    const summary = summarizeDecision(
      3,

      [makeCosts()],

      [
        { vehicleId: 'a', label: 'A', stage: 'filtro', code: 'x', message: 'x' },

        { vehicleId: 'b', label: 'B', stage: 'dados', code: 'y', message: 'y' },
      ],
    )

    expect(summary.excludedByStage).toEqual({ qualidade: 0, dados: 1, filtro: 1, viabilidade: 0 })

    expect(summary.eligibleCount + summary.excludedCount).toBe(3)
  })
})

describe('classificação: aderência', () => {
  it.each([
    [100, 'muito_alta'],

    [ADHERENCE_THRESHOLDS.muitoAlta, 'muito_alta'],

    [ADHERENCE_THRESHOLDS.muitoAlta - 0.01, 'alta'],

    [ADHERENCE_THRESHOLDS.alta, 'alta'],

    [ADHERENCE_THRESHOLDS.alta - 0.01, 'moderada'],

    [ADHERENCE_THRESHOLDS.moderada, 'moderada'],

    [ADHERENCE_THRESHOLDS.moderada - 0.01, 'baixa'],

    [ADHERENCE_THRESHOLDS.baixa, 'baixa'],

    [ADHERENCE_THRESHOLDS.baixa - 0.01, 'incompativel'],

    [0, 'incompativel'],
  ])('nota %s -> %s', (value, expected) => {
    expect(classifyAdherence(value)).toBe(expected)
  })

  it('sem nota, não classifica como incompatível', () => {
    expect(classifyAdherence(null)).toBeNull()

    expect(classifyAdherence(Number.NaN)).toBeNull()
  })
})

describe('classificação: pressão financeira', () => {
  it.each([
    [0, 'baixa'],

    [PRESSURE_THRESHOLDS.baixa, 'baixa'],

    [PRESSURE_THRESHOLDS.baixa + 0.0001, 'moderada'],

    [PRESSURE_THRESHOLDS.moderada, 'moderada'],

    [PRESSURE_THRESHOLDS.moderada + 0.0001, 'elevada'],

    [PRESSURE_THRESHOLDS.elevada, 'elevada'],

    [PRESSURE_THRESHOLDS.elevada + 0.0001, 'critica'],

    [2, 'critica'],
  ])('comprometimento %s -> %s', (value, expected) => {
    expect(classifyPressure(value)).toBe(expected)
  })

  it('sem comprometimento calculável, retorna null', () => {
    expect(classifyPressure(null)).toBeNull()

    expect(classifyPressure(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('padronização e K-Means', () => {
  it('padroniza colunas para média 0 e desvio 1; coluna constante vira 0', () => {
    const rows = standardizeColumns([
      [1, 7],

      [2, 7],

      [3, 7],
    ])

    expect(mean(rows.map((row) => row[0]!))).toBeCloseTo(0, 10)

    expect(sampleStdDev(rows.map((row) => row[0]!))).toBeCloseTo(1, 10)

    expect(rows.map((row) => row[1])).toEqual([0, 0, 0])
  })

  it('separa grupos evidentes e é determinístico', () => {
    const rows = [[0], [0.1], [0.2], [10], [10.1], [10.2]]

    const first = kMeans(rows, 2)

    const second = kMeans(rows, 2)

    expect(first).toEqual(second)

    expect(new Set(first!.labels.slice(0, 3)).size).toBe(1)

    expect(new Set(first!.labels.slice(3)).size).toBe(1)

    expect(first!.labels[0]).not.toBe(first!.labels[3])

    expect(silhouetteScore(rows, first!.labels)).toBeGreaterThan(0.9)
  })

  it('com menos pontos distintos que k, não força grupos', () => {
    expect(kMeans([[1], [1], [1]], 2)).toBeNull()

    expect(kMeans([[1]], 2)).toBeNull()
  })
  it('silhueta indisponível com um único grupo', () => {
    expect(silhouetteScore([[1], [2]], [0, 0])).toBeNull()
  })
})

function clusterInput(
  id: string,

  tco: number,

  price: number,

  overrides: Partial<ClusterInput> = {},
) {
  return {
    id,

    price,

    monthlyTotal: tco,

    energyCostPerKm: tco / 5000,

    maintenanceAnnual: tco,

    depreciationAnnual: price / 10,

    usageFit: 80,

    category: 'hatch',

    ...overrides,
  } satisfies ClusterInput
}

function separatedSample(): ClusterInput[] {
  const cheap = Array.from({ length: 6 }, (_, index) =>
    clusterInput(`c${index}`, 1500 + index * 10, 50_000 + index * 500),
  )

  const expensive = Array.from({ length: 6 }, (_, index) =>
    clusterInput(`e${index}`, 4500 + index * 10, 180_000 + index * 500, { category: 'suv' }),
  )

  return [...cheap, ...expensive]
}

describe('agrupamento das alternativas', () => {
  it('com estrutura clara e amostra suficiente, usa K-Means com silhueta', () => {
    const result = clusterVehicles(separatedSample())

    expect(result.summary.method).toBe('kmeans')

    expect(result.summary.k).toBe(2)

    expect(result.summary.silhouette).toBeGreaterThanOrEqual(CLUSTERING.minSilhouette)

    expect(result.assignments.get('c0')).toBe('A')

    expect(result.assignments.get('e0')).toBe('B')

    expect(result.summary.groups.map((group) => group.size)).toEqual([6, 6])
  })

  it('é estável quando a ordem da entrada muda', () => {
    const forward = clusterVehicles(separatedSample())

    const reversed = clusterVehicles([...separatedSample()].reverse())

    expect([...reversed.assignments.entries()].sort()).toEqual(
      [...forward.assignments.entries()].sort(),
    )

    expect(reversed.summary).toEqual(forward.summary)
  })

  it('amostra insuficiente usa faixas de TCO (tercis) e explica o motivo', () => {
    const sample = separatedSample().slice(0, CLUSTERING.kMin * CLUSTERING.minPerCluster - 1)

    const result = clusterVehicles(sample)

    expect(result.summary.method).toBe('faixas_tco')

    expect(result.summary.reason).toContain('Amostra insuficiente')

    expect(result.assignments.size).toBe(sample.length)
  })

  it('veículo com dado ausente fica sem grupo no K-Means', () => {
    const sample = [
      ...separatedSample(),

      clusterInput('x', 2000, 60_000, { maintenanceAnnual: null }),
    ]

    const result = clusterVehicles(sample)

    expect(result.summary.method).toBe('kmeans')

    expect(result.assignments.has('x')).toBe(false)

    expect(result.summary.unassignedCount).toBe(1)
  })

  it('menos de três alternativas: agrupamento indisponível', () => {
    const result = clusterVehicles([clusterInput('a', 1000, 1), clusterInput('b', 2000, 2)])

    expect(result.summary.method).toBe('indisponivel')

    expect(result.assignments.size).toBe(0)

    expect(clusterVehicles([]).summary.method).toBe('indisponivel')
  })

  it('valores duplicados não quebram as faixas', () => {
    const sample = Array.from({ length: 4 }, (_, index) => clusterInput(`d${index}`, 1000, 50_000))

    const result = clusterVehicles(sample)

    expect(result.summary.method).toBe('faixas_tco')

    expect(result.assignments.size).toBe(4)

    expect(result.summary.groups.every((group) => group.size > 0)).toBe(true)
  })
})

describe('integração com o pipeline', () => {
  const vehicles = loadCatalogVehicles()

  it('análises não alteram o ranking: ordem segue o índice e o grupo é o topo do ranking', () => {
    const result = runDecision(makeInput(), vehicles, options)

    for (let index = 1; index < result.ranking.length; index += 1) {
      expect(result.ranking[index - 1]!.index).toBeGreaterThanOrEqual(result.ranking[index]!.index)
    }

    expect(result.group.map((item) => item.vehicle.id)).toEqual(
      result.ranking.slice(0, result.group.length).map((item) => item.vehicle.id),
    )
  })

  it('cada veículo tem índice, grupo analítico, aderência, pressão e TCO separados', () => {
    const result = runDecision(makeInput(), vehicles, options)

    const groupIds = new Set(result.analytics.clustering.groups.map((group) => group.id))

    for (const item of result.ranking) {
      if (item.analytics.groupId !== null) expect(groupIds.has(item.analytics.groupId)).toBe(true)

      expect(item.analytics.tcoComposition).not.toBeNull()

      expect(item.financial.pressureLevel).not.toBeNull()
    }

    const assigned = result.ranking.filter((item) => item.analytics.groupId !== null).length

    expect(assigned).toBe(
      result.analytics.clustering.groups.reduce((sum, group) => sum + group.size, 0),
    )
  })

  it('o resumo fecha: elegíveis + excluídos = avaliados', () => {
    const { summary } = runDecision(makeInput(), vehicles, options).analytics

    expect(summary.eligibleCount + summary.excludedCount).toBe(summary.evaluatedCount)

    expect(summary.monthlyTotal.count).toBe(summary.eligibleCount)
  })

  it('agrupamento determinístico com a base invertida', () => {
    const first = runDecision(makeInput(), vehicles, options)

    const second = runDecision(makeInput(), [...vehicles].reverse(), options)

    expect(second.analytics.clustering).toEqual(first.analytics.clustering)

    const byId = (items: typeof first.ranking) =>
      Object.fromEntries(items.map((item) => [item.vehicle.id, item.analytics.groupId]))

    expect(byId(second.ranking)).toEqual(byId(first.ranking))
  })
})
