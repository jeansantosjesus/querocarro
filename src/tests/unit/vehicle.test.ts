import {
  assessCatalogQuality,
  groupableCategories,
  validateVehicle,
} from '../../domain/vehicle/quality'

import { applyHardFilters } from '../../domain/vehicle/filters'

import { calculatePreferenceScore, calculateUsageFit } from '../../domain/vehicle/fit'

import { REFERENCE_YEAR, loadCatalogVehicles, makeInput, makeVehicle } from '../fixtures/factories'

describe('qualidade dos dados', () => {
  it('a base demonstrativa entregue não contém registros inválidos nem outliers', () => {
    const vehicles = loadCatalogVehicles()

    expect(vehicles.length).toBeGreaterThanOrEqual(20)

    expect(vehicles.length).toBeLessThanOrEqual(50)

    const assessment = assessCatalogQuality(vehicles, REFERENCE_YEAR)

    expect(assessment.excluded).toEqual([])

    expect(assessment.valid).toHaveLength(vehicles.length)
  })

  it('todos os veículos da base têm código FIPE real, mês de referência e origem salva', () => {
    for (const vehicle of loadCatalogVehicles()) {
      expect(vehicle.fipeCode).toMatch(/^\d{6}-\d$/)

      expect(vehicle.referenceMonth).toBe('2026-11')

      expect(vehicle.priceSource).toBe('fipe_referencia_salva')

      expect(vehicle.hasSupplement).toBe(true)
    }
  })

  it.each([
    ['preço zero', { priceBRL: 0 }, 'preco_invalido'],

    ['preço negativo', { priceBRL: -10 }, 'preco_invalido'],

    ['preço ausente', { priceBRL: null }, 'preco_invalido'],

    ['preço NaN', { priceBRL: Number.NaN }, 'preco_invalido'],

    ['consumo impossível (alto)', { urbanConsumption: 400 }, 'consumo_impossivel'],

    ['consumo impossível (zero)', { highwayConsumption: 0 }, 'consumo_impossivel'],

    ['manutenção negativa', { maintenanceAnnualBRL: -1 }, 'manutencao_invalida'],

    ['ano inválido (futuro distante)', { modelYear: 2099 }, 'ano_invalido'],

    ['ano inválido (antigo)', { modelYear: 1800 }, 'ano_invalido'],

    ['código FIPE ausente', { fipeCode: '' }, 'codigo_fipe_ausente'],

    ['sem identificação', { brand: '', model: ' ' }, 'sem_identificacao'],

    ['depreciação absurda', { depreciationAnnualPct: 150 }, 'depreciacao_invalida'],

    ['passageiros inválido', { seats: 0 }, 'passageiros_invalido'],
  ] as const)('registro com %s é excluído com motivo registrado', (_label, patch, code) => {
    const vehicle = makeVehicle(patch)

    expect(validateVehicle(vehicle, REFERENCE_YEAR).map((i) => i.code)).toContain(code)

    const assessment = assessCatalogQuality([vehicle], REFERENCE_YEAR)

    expect(assessment.valid).toHaveLength(0)

    expect(assessment.excluded[0]).toMatchObject({ stage: 'qualidade', code })
  })

  it('detecta duplicidade e mantém o primeiro registro', () => {
    const a = makeVehicle({ fipeCode: 'DUP' })

    const b = makeVehicle({ fipeCode: 'DUP' })

    const assessment = assessCatalogQuality([a, b], REFERENCE_YEAR)

    expect(assessment.valid).toHaveLength(1)

    expect(assessment.excluded[0]?.code).toBe('duplicado')
  })

  it('detecta outlier estatístico extremo de preço (com amostra suficiente)', () => {
    const normal = Array.from({ length: 12 }, (_, i) => makeVehicle({ priceBRL: 60000 + i * 1500 }))

    const outlier = makeVehicle({ priceBRL: 9_000_000, model: 'Outlier' })

    const assessment = assessCatalogQuality([...normal, outlier], REFERENCE_YEAR)

    expect(assessment.valid).toHaveLength(12)

    expect(assessment.excluded).toHaveLength(1)

    expect(assessment.excluded[0]).toMatchObject({
      code: 'outlier_estatistico',

      stage: 'qualidade',
    })

    expect(assessment.summary).toEqual({ outlier_estatistico: 1 })
  })

  it('não aplica detecção estatística com amostra pequena', () => {
    const few = [makeVehicle({ priceBRL: 50000 }), makeVehicle({ priceBRL: 9_000_000 })]

    expect(assessCatalogQuality(few, REFERENCE_YEAR).valid).toHaveLength(2)
  })

  it('híbrido e elétrico não são tratados como outliers de consumo dos flex', () => {
    const flex = Array.from({ length: 10 }, (_, i) =>
      makeVehicle({ urbanConsumption: 11 + (i % 3) * 0.5 }),
    )

    const hybrid = makeVehicle({ fuel: 'hibrido', urbanConsumption: 17 })

    expect(assessCatalogQuality([...flex, hybrid], REFERENCE_YEAR).excluded).toHaveLength(0)
  })

  it('um registro isolado não forma categoria de recomendação', () => {
    const vehicles = [
      makeVehicle({ category: 'hatch' }),

      makeVehicle({ category: 'hatch' }),

      makeVehicle({ category: 'picape' }),
    ]

    const { categories, isolated } = groupableCategories(vehicles)

    expect(categories).toEqual(['hatch'])

    expect(isolated).toHaveLength(1)

    expect(isolated[0]?.category).toBe('picape')
  })
})

describe('filtros do usuário', () => {
  const input = makeInput()

  it('passa quando nada restringe', () => {
    expect(applyHardFilters(makeVehicle(), input, REFERENCE_YEAR)).toBeNull()
  })

  it('respeita marcas não desejadas sem diferenciar acentos e maiúsculas', () => {
    const filtered = makeInput({ preferences: { avoidedBrands: ['CITROEN'] } })

    expect(
      applyHardFilters(makeVehicle({ brand: 'Citroën' }), filtered, REFERENCE_YEAR)?.code,
    ).toBe('marca_nao_desejada')
  })

  it('respeita a faixa de anos', () => {
    const filtered = makeInput({ preferences: { yearMin: 2022, yearMax: 2024 } })

    expect(applyHardFilters(makeVehicle({ modelYear: 2021 }), filtered, REFERENCE_YEAR)?.code).toBe(
      'ano_abaixo_faixa',
    )

    expect(applyHardFilters(makeVehicle({ modelYear: 2025 }), filtered, REFERENCE_YEAR)?.code).toBe(
      'ano_acima_faixa',
    )

    expect(applyHardFilters(makeVehicle({ modelYear: 2023 }), filtered, REFERENCE_YEAR)).toBeNull()
  })

  it('exige capacidade de passageiros e não confirma quando o dado não existe', () => {
    const family = makeInput({ usage: { passengers: 6 } })

    expect(applyHardFilters(makeVehicle({ seats: 5 }), family, REFERENCE_YEAR)?.code).toBe(
      'passageiros_insuficientes',
    )

    expect(applyHardFilters(makeVehicle({ seats: null }), family, REFERENCE_YEAR)?.code).toBe(
      'passageiros_indisponivel',
    )

    expect(applyHardFilters(makeVehicle({ seats: 7 }), family, REFERENCE_YEAR)).toBeNull()
  })

  it('aplica faixa de preço máxima', () => {
    const filtered = makeInput({ objective: { maxPurchasePrice: 60000 } })

    expect(applyHardFilters(makeVehicle({ priceBRL: 65000 }), filtered, REFERENCE_YEAR)?.code).toBe(
      'acima_faixa_preco',
    )
  })

  it('combustível, câmbio e condição só eliminam quando marcados como obrigatórios', () => {
    const soft = makeInput({
      preferences: { fuel: 'eletrico', transmission: 'automatico' },

      objective: { condition: 'novo' },
    })

    expect(applyHardFilters(makeVehicle(), soft, REFERENCE_YEAR)).toBeNull()

    const hard = makeInput({
      preferences: {
        fuel: 'eletrico',

        transmission: 'automatico',

        requireFuel: true,

        requireTransmission: true,

        requireCondition: true,
      },

      objective: { condition: 'novo' },
    })

    // A condição é verificada antes do combustível: usa um modelo recente para isolar o combustível.

    expect(
      applyHardFilters(makeVehicle({ fuel: 'flex', modelYear: 2026 }), hard, REFERENCE_YEAR)?.code,
    ).toBe('combustivel_diferente')

    expect(
      applyHardFilters(makeVehicle({ fuel: 'eletrico', modelYear: 2020 }), hard, REFERENCE_YEAR)
        ?.code,
    ).toBe('condicao_diferente')

    const electricManual = makeVehicle({
      fuel: 'eletrico',

      transmission: 'manual',

      modelYear: 2026,
    })

    expect(applyHardFilters(electricManual, hard, REFERENCE_YEAR)?.code).toBe('cambio_diferente')

    const electricAuto = makeVehicle({
      fuel: 'eletrico',

      transmission: 'automatico',

      modelYear: 2020,
    })

    expect(applyHardFilters(electricAuto, hard, REFERENCE_YEAR)?.code).toBe('condicao_diferente')

    const ok = makeVehicle({ fuel: 'eletrico', transmission: 'automatico', modelYear: 2026 })

    expect(applyHardFilters(ok, hard, REFERENCE_YEAR)).toBeNull()
  })
  it('flex atende à exigência de gasolina ou etanol', () => {
    const hard = makeInput({ preferences: { fuel: 'etanol', requireFuel: true } })

    expect(applyHardFilters(makeVehicle({ fuel: 'flex' }), hard, REFERENCE_YEAR)).toBeNull()
  })

  it('dado ausente em atributo exigido impede a confirmação', () => {
    const hard = makeInput({ preferences: { transmission: 'manual', requireTransmission: true } })

    expect(applyHardFilters(makeVehicle({ transmission: null }), hard, REFERENCE_YEAR)?.code).toBe(
      'cambio_indisponivel',
    )
  })
})

describe('aderência ao uso e preferências', () => {
  const usage = makeInput().usage

  it('aderência usa apenas subíndices disponíveis e retorna null sem nenhum dado', () => {
    const empty = makeVehicle({ seats: null, trunkLiters: null, category: null })

    expect(calculateUsageFit(empty, usage)).toBeNull()

    const partial = makeVehicle({ seats: null, trunkLiters: 400, category: null })

    expect(calculateUsageFit(partial, usage)).toBe(100)
  })

  it('hatch aderente ao uso urbano; sedã ao rodoviário', () => {
    const urban = { ...usage, type: 'urbano' as const }

    const highway = { ...usage, type: 'rodoviario' as const }

    const hatch = makeVehicle({ category: 'hatch' })

    const sedan = makeVehicle({ category: 'sedan' })

    expect(calculateUsageFit(hatch, urban)!).toBeGreaterThan(calculateUsageFit(sedan, urban)!)

    expect(calculateUsageFit(sedan, highway)!).toBeGreaterThan(calculateUsageFit(hatch, highway)!)
  })

  it('porta-malas insuficiente reduz a aderência', () => {
    const big = makeVehicle({ trunkLiters: 500 })

    const small = makeVehicle({ trunkLiters: 100 })

    expect(calculateUsageFit(big, usage)!).toBeGreaterThan(calculateUsageFit(small, usage)!)
  })

  it('preferência é null quando o usuário não informou nenhuma (critério não aplicável)', () => {
    expect(calculatePreferenceScore(makeVehicle(), makeInput(), REFERENCE_YEAR)).toBeNull()
  })

  it('preferência mede atendimento às escolhas informadas', () => {
    const input = makeInput({
      preferences: { wantedBrands: ['Toyota'], transmission: 'automatico' },
    })

    expect(
      calculatePreferenceScore(
        makeVehicle({ brand: 'Toyota', transmission: 'automatico' }),

        input,

        REFERENCE_YEAR,
      ),
    ).toBe(100)

    expect(
      calculatePreferenceScore(
        makeVehicle({ brand: 'Toyota', transmission: 'manual' }),

        input,

        REFERENCE_YEAR,
      ),
    ).toBe(50)

    expect(
      calculatePreferenceScore(
        makeVehicle({ brand: 'Fiat', transmission: 'manual' }),

        input,

        REFERENCE_YEAR,
      ),
    ).toBe(0)
  })
})
