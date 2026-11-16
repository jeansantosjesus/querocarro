import { runDecision } from '../../domain/decision/pipeline'

import { initialWeights } from '../../domain/decision/scenarios'

import { rebalanceWeights } from '../../domain/decision/weights'

import { RECOMMENDATION_LIMITS } from '../../config/limits'

import type { ScenarioId } from '../../types/decision'

import { REFERENCE_YEAR, loadCatalogVehicles, makeInput, makeVehicle } from '../fixtures/factories'

const NEUTRAL = { economia: 3, conforto: 3, desempenho: 3, manutencao: 3 }

const options = { referenceYear: REFERENCE_YEAR }

function inputFor(scenarioId: ScenarioId, overrides: Parameters<typeof makeInput>[0] = {}) {
  return makeInput({
    ...overrides,

    objective: { scenarioId, ...(overrides.objective ?? {}) },

    weights: initialWeights(scenarioId, NEUTRAL),
  })
}

describe('pipeline do SAD com a base demonstrativa completa', () => {
  const vehicles = loadCatalogVehicles()

  it('gera um grupo recomendado de 3 a 5 alternativas, sem eleger vencedor único', () => {
    const result = runDecision(makeInput(), vehicles, options)

    expect(result.noOptions).toBe(false)

    expect(result.group.length).toBeGreaterThanOrEqual(RECOMMENDATION_LIMITS.minGroupSize)

    expect(result.group.length).toBeLessThanOrEqual(RECOMMENDATION_LIMITS.maxGroupSize)

    expect(result.ranking.length).toBeGreaterThan(result.group.length)
  })

  it.each([3, 4, 5, 9, 1])('respeita o tamanho de grupo solicitado (%i) dentro de 3-5', (size) => {
    const result = runDecision(makeInput(), vehicles, { ...options, groupSize: size })

    expect(result.group.length).toBe(Math.min(Math.max(size, 3), 5))
  })

  it('é determinístico e reproduzível', () => {
    const first = runDecision(makeInput(), vehicles, options)

    const second = runDecision(makeInput(), [...vehicles].reverse(), options)

    expect(JSON.stringify(first.group.map((g) => [g.vehicle.id, g.index]))).toBe(
      JSON.stringify(second.group.map((g) => [g.vehicle.id, g.index])),
    )

    expect(JSON.stringify(runDecision(makeInput(), vehicles, options))).toBe(
      JSON.stringify(runDecision(makeInput(), vehicles, options)),
    )
  })

  it('o índice está sempre entre 0 e 100 e as contribuições explicam o índice base', () => {
    const result = runDecision(makeInput(), vehicles, options)

    for (const item of result.ranking) {
      expect(item.index).toBeGreaterThanOrEqual(0)

      expect(item.index).toBeLessThanOrEqual(100)

      const total = Object.values(item.contributions).reduce((sum, value) => sum + value, 0)

      expect(total).toBeCloseTo(item.baseIndex, 6)

      const weightTotal = Object.values(item.effectiveWeights).reduce(
        (sum, value) => sum + value,

        0,
      )

      expect(weightTotal).toBeCloseTo(100, 6)
    }
  })

  it('o ranking interno vem ordenado por índice decrescente com posições 1..n', () => {
    const { ranking } = runDecision(makeInput(), vehicles, options)

    ranking.forEach((item, position) => {
      expect(item.rank).toBe(position + 1)

      if (position > 0) expect(ranking[position - 1]!.index).toBeGreaterThanOrEqual(item.index)
    })
  })

  it('os três cenários produzem resultados distintos e o conservador é mais restritivo', () => {
    const economico = runDecision(inputFor('economico'), vehicles, options)

    const equilibrado = runDecision(inputFor('equilibrado'), vehicles, options)

    const conservador = runDecision(inputFor('conservador'), vehicles, options)

    expect(conservador.eligibleCount).toBeLessThanOrEqual(equilibrado.eligibleCount)

    expect(conservador.eligibleCount).toBeGreaterThan(0)

    expect(conservador.effectiveMonthlyLimit).toBeLessThan(equilibrado.effectiveMonthlyLimit)

    // Com o TCO dominando os pesos, os três cenários podem recomendar o mesmo grupo final.

    // Por isso a distinção é verificada no ranking (índices) e na elegibilidade, não no grupo.

    const scores = (r: typeof economico) => r.ranking.map((g) => g.index.toFixed(4)).join()

    expect(new Set([scores(economico), scores(equilibrado), scores(conservador)]).size).toBe(3)
  })

  it('alterar os pesos recalcula o ranking preservando os demais dados da simulação', () => {
    const base = makeInput()

    const heavyUsage = makeInput({ weights: rebalanceWeights(base.weights, 'usageFit', 60) })

    const a = runDecision(base, vehicles, options)

    const b = runDecision(heavyUsage, vehicles, options)

    expect(b.eligibleCount).toBe(a.eligibleCount)

    expect(b.ranking.map((r) => r.vehicle.id)).not.toEqual(a.ranking.map((r) => r.vehicle.id))
  })

  it('nenhum veículo acima do limite mensal efetivo ou da parcela máxima chega ao ranking', () => {
    const input = makeInput()

    const result = runDecision(input, vehicles, options)

    for (const item of result.ranking) {
      expect(item.costs.monthlyTotal!).toBeLessThanOrEqual(result.effectiveMonthlyLimit)

      expect(item.costs.monthlyInstallment).toBeLessThanOrEqual(input.finance.maxInstallment!)
    }
  })

  it('compra à vista só considera veículos dentro do valor disponível', () => {
    const input = makeInput({
      objective: { purchaseMode: 'avista' },

      finance: { downPayment: 60000, accumulatedReserve: 70000, maxMonthlyVehicleSpend: 3500 },
    })

    const result = runDecision(input, vehicles, options)

    expect(result.ranking.length).toBeGreaterThan(0)

    for (const item of result.ranking) {
      expect(item.costs.priceBRL).toBeLessThanOrEqual(60000)

      expect(item.costs.monthlyInstallment).toBe(0)
    }
  })

  it('cada alternativa traz pontos favoráveis e alertas explicáveis e respeitosos', () => {
    const result = runDecision(makeInput(), vehicles, options)

    for (const item of result.group) {
      expect(item.pros.length + item.alerts.length).toBeGreaterThan(0)

      const text = [...item.pros, ...item.alerts].map((e) => e.text).join(' ')

      expect(text).not.toMatch(/não pode comprar|só permite|único carro/i)
    }
  })

  it('exclusões ficam registradas com estágio, código e mensagem', () => {
    const result = runDecision(makeInput(), vehicles, options)

    expect(result.excluded.length).toBeGreaterThan(0)

    for (const record of result.excluded) {
      expect(record.vehicleId).toBeTruthy()

      expect(['qualidade', 'dados', 'filtro', 'viabilidade']).toContain(record.stage)

      expect(record.code).toBeTruthy()

      expect(record.message).toBeTruthy()
    }

    expect(result.eligibleCount + result.excluded.length).toBe(vehicles.length)
  })
})

describe('casos-limite do pipeline', () => {
  const vehicles = loadCatalogVehicles()

  it('renda zero: nenhuma recomendação forçada', () => {
    const input = makeInput({ finance: { netIncome: 0 } })

    const result = runDecision(input, vehicles, options)

    expect(result.noOptions).toBe(true)

    expect(result.group).toEqual([])
  })

  it('despesas superiores à renda: sem margem mensal, sem recomendação forçada', () => {
    const input = makeInput({ finance: { netIncome: 3000, fixedExpenses: 4500, otherDebts: 500 } })

    const result = runDecision(input, vehicles, options)

    expect(result.noOptions).toBe(true)

    expect(result.effectiveMonthlyLimit).toBe(0)

    expect(result.excluded.some((e) => e.code === 'renda_disponivel_negativa')).toBe(true)
  })

  it('entrada superior ao preço: sem parcela e sem erro', () => {
    const input = makeInput({
      finance: { downPayment: 500000, accumulatedReserve: 510000, maxInstallment: null },
    })

    const result = runDecision(input, vehicles, options)

    expect(result.ranking.length).toBeGreaterThan(0)

    for (const item of result.ranking) expect(item.costs.monthlyInstallment).toBe(0)
  })

  it('taxa zero funciona de ponta a ponta', () => {
    const result = runDecision(makeInput({ finance: { monthlyRatePct: 0 } }), vehicles, options)

    expect(result.ranking.length).toBeGreaterThan(0)

    for (const item of result.ranking) expect(Number.isFinite(item.index)).toBe(true)
  })
  it('financiamento inválido: veículos são excluídos com motivo, sem NaN', () => {
    const result = runDecision(makeInput({ finance: { installments: 0 } }), vehicles, options)

    expect(result.noOptions).toBe(true)

    expect(result.excluded.some((e) => e.code === 'financiamento_invalido')).toBe(true)
  })

  it('ausência de veículos compatíveis: informa e oferece ajustes transparentes', () => {
    // Nenhum veículo da base custa menos de R$ 40 mil: a faixa de preço elimina todos.

    const input = makeInput({ objective: { maxPurchasePrice: 40000 } })

    const result = runDecision(input, vehicles, options)

    expect(result.noOptions).toBe(true)

    expect(result.group).toEqual([])

    const ids = result.suggestions.map((s) => s.id)

    expect(ids).toContain('aumentar_faixa_preco')

    for (const suggestion of result.suggestions) expect(suggestion.wouldYield).toBeGreaterThan(0)
  })

  it('sugere rever o gasto mensal quando o limite elimina as opções', () => {
    const input = makeInput({ finance: { maxMonthlyVehicleSpend: 1200, maxInstallment: 600 } })

    const result = runDecision(input, vehicles, options)

    expect(result.noOptions).toBe(true)

    expect(result.suggestions.map((s) => s.id)).toContain('rever_gasto_mensal')
  })

  it('sugere remover filtros opcionais quando um filtro obrigatório elimina as opções', () => {
    const input = makeInput({
      finance: { maxMonthlyVehicleSpend: 1500, maxInstallment: 600 },

      preferences: { transmission: 'automatico', requireTransmission: true },
    })

    const result = runDecision(input, vehicles, options)

    expect(result.noOptions).toBe(true)

    expect(result.suggestions.map((s) => s.id)).toContain('remover_filtros_opcionais')
  })

  it('sugestões não alteram os dados da simulação', () => {
    const input = makeInput({ objective: { maxPurchasePrice: 40000 } })

    const snapshot = JSON.stringify(input)

    runDecision(input, vehicles, options)

    expect(JSON.stringify(input)).toBe(snapshot)
  })

  it('registros inválidos não participam do ranking e têm o motivo registrado', () => {
    const bad = makeVehicle({ fipeCode: 'BAD-1', priceBRL: -5 })

    const noCode = makeVehicle({ fipeCode: '', model: 'Sem código' })

    const result = runDecision(makeInput(), [...vehicles, bad, noCode], options)

    expect(result.ranking.some((r) => r.vehicle.id === bad.id)).toBe(false)

    expect(result.excluded.find((e) => e.vehicleId === bad.id)?.code).toBe('preco_invalido')

    expect(result.excluded.find((e) => e.vehicleId === noCode.id)?.code).toBe('codigo_fipe_ausente')
  })

  it('outlier extremo na base é excluído e não distorce a normalização', () => {
    const outlier = makeVehicle({ fipeCode: 'OUT-1', priceBRL: 40_000_000 })

    const withOutlier = runDecision(makeInput(), [...vehicles, outlier], options)

    const without = runDecision(makeInput(), vehicles, options)

    expect(withOutlier.excluded.find((e) => e.vehicleId === outlier.id)?.code).toBe(
      'outlier_estatistico',
    )

    expect(withOutlier.ranking.map((r) => [r.vehicle.id, r.index])).toEqual(
      without.ranking.map((r) => [r.vehicle.id, r.index]),
    )
  })

  it('dados ausentes: veículo sem consumo é excluído por custo incompleto e nunca assume zero', () => {
    const missing = makeVehicle({
      fipeCode: 'MISS-1',

      urbanConsumption: null,

      highwayConsumption: null,
    })

    const result = runDecision(makeInput(), [...vehicles, missing], options)

    expect(result.ranking.some((r) => r.vehicle.id === missing.id)).toBe(false)

    expect(result.excluded.find((e) => e.vehicleId === missing.id)?.code).toBe(
      'custo_mensal_incompleto',
    )
  })

  it('dado ausente em critério não monetário (porta-malas, categoria) redistribui pesos e alerta', () => {
    const partial = makeVehicle({
      fipeCode: 'PART-1',

      priceBRL: 52000,

      trunkLiters: null,

      category: null,

      seats: 5,
    })

    const result = runDecision(makeInput(), [...vehicles, partial], options)

    const item = result.ranking.find((r) => r.vehicle.id === partial.id)

    expect(item).toBeDefined()

    expect(item!.criteria.usageFit).not.toBeNull() // calculado só com lugares

    expect(Number.isFinite(item!.index)).toBe(true)
  })

  it('empate de scores é resolvido deterministicamente e sem NaN', () => {
    const twins = [
      makeVehicle({ fipeCode: 'TWIN-B', model: 'B' }),

      makeVehicle({ fipeCode: 'TWIN-A', model: 'A' }),

      makeVehicle({ fipeCode: 'TWIN-C', model: 'C' }),
    ]

    const result = runDecision(makeInput(), twins, options)

    expect(result.ranking.map((r) => r.vehicle.fipeCode)).toEqual(['TWIN-A', 'TWIN-B', 'TWIN-C'])

    expect(new Set(result.ranking.map((r) => r.index)).size).toBe(1)

    const reversed = runDecision(makeInput(), [...twins].reverse(), options)

    expect(reversed.ranking.map((r) => r.vehicle.fipeCode)).toEqual(['TWIN-A', 'TWIN-B', 'TWIN-C'])
  })

  it('catálogo vazio não quebra e não força recomendação', () => {
    const result = runDecision(makeInput(), [], options)

    expect(result.noOptions).toBe(true)

    expect(result.ranking).toEqual([])
  })

  it('com menos de três alternativas elegíveis, não cria um grupo artificial', () => {
    const few = [makeVehicle({ fipeCode: 'F1' }), makeVehicle({ fipeCode: 'F2' })]

    const result = runDecision(makeInput(), few, options)

    expect(result.group).toHaveLength(2)

    expect(result.eligibleCount).toBeLessThan(RECOMMENDATION_LIMITS.minGroupSize)
  })

  it('o cenário conservador penaliza opções próximas do limite', () => {
    const result = runDecision(inputFor('conservador'), loadCatalogVehicles(), options)

    expect(result.ranking.some((r) => r.penalty > 0)).toBe(true)

    for (const item of result.ranking) expect(item.index).toBeLessThanOrEqual(item.baseIndex + 1e-9)
  })

  it('o mesmo limite voluntário não faz a renda alta preferir o carro caro', () => {
    const cheap = makeVehicle({ fipeCode: 'BARATO', priceBRL: 50000 })

    const expensive = makeVehicle({ fipeCode: 'CARO', priceBRL: 220000 })

    const common = {
      fixedExpenses: 4000,

      otherDebts: 0,

      downPayment: 30000,

      reserve: 10000,

      accumulatedReserve: 50000,

      maxMonthlyVehicleSpend: 3500,

      maxInstallment: null as number | null,
    }

    const low = runDecision(
      makeInput({ finance: { ...common, netIncome: 15000, limitMode: 'informado' } }),

      [cheap, expensive],

      options,
    )

    const high = runDecision(
      makeInput({ finance: { ...common, netIncome: 100000, limitMode: 'informado' } }),

      [cheap, expensive],

      options,
    )

    const lowCheap = low.ranking.find((item) => item.vehicle.fipeCode === 'BARATO')

    const highCheap = high.ranking.find((item) => item.vehicle.fipeCode === 'BARATO')

    expect(lowCheap).toBeTruthy()

    expect(highCheap).toBeTruthy()

    expect(highCheap!.financial.financialScore).toBeCloseTo(lowCheap!.financial.financialScore!, 4)

    expect(highCheap!.financial.commitmentRatio!).toBeLessThan(lowCheap!.financial.commitmentRatio!)

    const estimatedLow = runDecision(
      makeInput({ finance: { ...common, netIncome: 15000, limitMode: 'estimado' } }),

      [cheap, expensive],

      options,
    )

    const estimatedHigh = runDecision(
      makeInput({ finance: { ...common, netIncome: 100000, limitMode: 'estimado' } }),

      [cheap, expensive],

      options,
    )

    expect(estimatedLow.excluded.some((item) => item.vehicleId === expensive.id)).toBe(true)

    expect(estimatedLow.ranking.some((item) => item.vehicle.id === expensive.id)).toBe(false)

    const highRanking = estimatedHigh.ranking

    const cheapRank = highRanking.find((item) => item.vehicle.fipeCode === 'BARATO')

    const expensiveRank = highRanking.find((item) => item.vehicle.fipeCode === 'CARO')

    expect(cheapRank).toBeTruthy()

    if (expensiveRank) expect(cheapRank!.index).toBeGreaterThanOrEqual(expensiveRank.index)
  })
  it('a pressão financeira e a margem restante são indicadores derivados da renda', () => {
    const result = runDecision(makeInput(), loadCatalogVehicles(), options)

    for (const item of result.ranking) {
      expect(item.financial.commitmentRatio).toBeCloseTo(item.costs.monthlyTotal! / 12000, 8)

      expect(item.financial.remainingMargin).toBeCloseTo(8000 - item.costs.monthlyTotal!, 6)

      expect(item.financial.pressureLevel).not.toBeNull()
    }
  })
})
