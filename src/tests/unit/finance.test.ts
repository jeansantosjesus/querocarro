import { DEFAULT_ASSUMPTIONS } from '../../config/assumptions'

import { SCENARIOS } from '../../config/scenarios'

import {
  computeVehicleCosts,
  calculateEffectiveConsumption,
  type CostContext,
} from '../../domain/finance/costs'

import {
  annualToMonthly,
  calculateAvailableMonthly,
  calculateCommitmentRatio,
  calculateEffectiveMonthlyLimit,
  calculateMonthlyKm,
  calculateRemainingMargin,
} from '../../domain/finance/indicators'

import {
  FinanceInputError,
  calculateMonthlyPayment,
  totalPaidWithInterest,
} from '../../domain/finance/loan'

import { REFERENCE_YEAR, makeInput, makeVehicle } from '../fixtures/factories'

function makeContext(overrides: Partial<CostContext> = {}): CostContext {
  const input = makeInput()

  return {
    finance: input.finance,

    usage: input.usage,

    purchaseMode: 'financiado',

    fuelPreference: 'indiferente',

    assumptions: DEFAULT_ASSUMPTIONS,

    scenario: SCENARIOS.equilibrado,

    referenceYear: REFERENCE_YEAR,

    registrationState: 'BA',

    condition: 'indiferente',

    manualIpvaRatePct: undefined,

    allowDemonstrativeTax: false,

    ...overrides,
  }
}

describe('cálculo da parcela (Tabela Price)', () => {
  it('calcula valor conhecido: R$ 10.000, 1% a.m., 12x', () => {
    expect(calculateMonthlyPayment(10000, 1, 12)).toBeCloseTo(888.4879, 3)
  })

  it('taxa zero divide o principal igualmente', () => {
    expect(calculateMonthlyPayment(12000, 0, 12)).toBe(1000)
  })

  it('principal zero (entrada cobre o valor) gera parcela zero', () => {
    expect(calculateMonthlyPayment(0, 1.5, 48)).toBe(0)
  })

  it('o total pago com juros é maior que o principal quando a taxa é positiva', () => {
    expect(totalPaidWithInterest(10000, 1, 12)).toBeGreaterThan(10000)

    expect(totalPaidWithInterest(10000, 0, 12)).toBeCloseTo(10000, 6)
  })

  it.each([
    ['principal negativo', -1, 1, 12],

    ['principal NaN', Number.NaN, 1, 12],

    ['taxa negativa', 1000, -0.5, 12],

    ['taxa infinita', 1000, Number.POSITIVE_INFINITY, 12],

    ['parcelas zero', 1000, 1, 0],

    ['parcelas fracionadas', 1000, 1, 10.5],

    ['parcelas negativas', 1000, 1, -3],
  ])('rejeita financiamento inválido: %s', (_label, principal, rate, n) => {
    expect(() => calculateMonthlyPayment(principal, rate, n)).toThrow(FinanceInputError)
  })
})

describe('indicadores financeiros derivados da renda', () => {
  it('comprometimento mensal = custo / renda líquida', () => {
    expect(calculateCommitmentRatio(2400, 12000)).toBeCloseTo(0.2, 10)
  })

  it('renda zero ou negativa não gera divisão por zero', () => {
    expect(calculateCommitmentRatio(1000, 0)).toBeNull()

    expect(calculateCommitmentRatio(1000, -50)).toBeNull()

    expect(calculateCommitmentRatio(Number.NaN, 5000)).toBeNull()
  })

  it('margem disponível e restante, inclusive com despesas superiores à renda', () => {
    const finance = makeInput({
      finance: { netIncome: 3000, fixedExpenses: 3500, otherDebts: 200 },
    }).finance

    const available = calculateAvailableMonthly(finance)

    expect(available).toBe(-700)

    expect(calculateRemainingMargin(available, 500)).toBe(-1200)
  })

  it('limite mensal efetivo nunca é negativo e respeita o percentual do cenário', () => {
    const noMargin = makeInput({ finance: { netIncome: 3000, fixedExpenses: 3500 } }).finance

    expect(calculateEffectiveMonthlyLimit(noMargin, SCENARIOS.equilibrado)).toBe(0)

    // Disponível 8.000. Equilibrado usa 35%: min(3.500, 2.800) = 2.800.

    // Conservador usa 25% e ainda aplica 80% de margem: 2.000 × 0,8 = 1.600.

    const finance = makeInput().finance

    expect(calculateEffectiveMonthlyLimit(finance, SCENARIOS.equilibrado)).toBe(2800)

    expect(calculateEffectiveMonthlyLimit(finance, SCENARIOS.conservador)).toBe(1600)
  })

  it('converte anual para mensal', () => {
    expect(annualToMonthly(1200)).toBe(100)
  })

  it('quilômetros mensais: calculados ou informados', () => {
    const usage = makeInput().usage

    expect(calculateMonthlyKm(usage)).toBeCloseTo((30 * 5 * 52) / 12, 6)

    expect(calculateMonthlyKm({ ...usage, monthlyKmOverride: 900 })).toBe(900)
  })
})

describe('consumo efetivo', () => {
  it('usa média harmônica ponderada pelo tipo de uso', () => {
    const mixed = calculateEffectiveConsumption(10, 15, 'misto')

    expect(mixed.value).toBeCloseTo(1 / (0.5 / 10 + 0.5 / 15), 8)

    const urban = calculateEffectiveConsumption(10, 15, 'urbano')

    const highway = calculateEffectiveConsumption(10, 15, 'rodoviario')

    expect(urban.value!).toBeLessThan(mixed.value!)

    expect(highway.value!).toBeGreaterThan(mixed.value!)
  })

  it('usa o consumo disponível com aviso e não assume zero quando falta um deles', () => {
    const result = calculateEffectiveConsumption(10, null, 'misto')

    expect(result.value).toBe(10)

    expect(result.note).toMatch(/não disponível/)

    expect(calculateEffectiveConsumption(null, null, 'misto').value).toBeNull()
  })
})

describe('custo mensal total', () => {
  it('segue exatamente a fórmula do SAD', () => {
    const vehicle = makeVehicle({ priceBRL: 80000 })

    const context = makeContext()

    const result = computeVehicleCosts(vehicle, context)

    expect(result.ok).toBe(true)

    if (!result.ok) return

    const c = result.costs

    const installment = calculateMonthlyPayment(80000 - 30000, 1.5, 48)

    expect(c.monthlyInstallment).toBeCloseTo(installment, 8)

    expect(c.ipvaAnnual).toBeCloseTo(80000 * 0.04, 8)

    if (c.ipvaAnnual === null) return

    expect(c.licensingAnnual).toBe(160)

    expect(c.insuranceAnnual).toBeCloseTo(80000 * 0.045, 8)

    const expected =
      c.monthlyInstallment +
      c.ipvaAnnual / 12 +
      c.licensingAnnual / 12 +
      c.insuranceAnnual! / 12 +
      c.maintenanceAnnual! / 12 +
      c.energyMonthly! +
      c.depreciationAnnual! / 12

    expect(c.monthlyTotal).toBeCloseTo(expected, 8)

    expect(c.annualTotal).toBeCloseTo(expected * 12, 6)

    expect(c.monthlyCash).toBeCloseTo(expected - c.depreciationAnnual! / 12, 8)
  })

  it('compra à vista não tem parcela', () => {
    const result = computeVehicleCosts(
      makeVehicle({ priceBRL: 50000 }),

      makeContext({ purchaseMode: 'avista' }),
    )

    expect(result.ok && result.costs.monthlyInstallment).toBe(0)

    expect(result.ok && result.costs.financedAmount).toBe(0)
  })

  it('entrada superior ao preço zera o financiamento e registra nota', () => {
    const finance = { ...makeInput().finance, downPayment: 200000 }

    const result = computeVehicleCosts(makeVehicle({ priceBRL: 60000 }), makeContext({ finance }))

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.costs.financedAmount).toBe(0)

    expect(result.costs.downPaymentUsed).toBe(60000)

    expect(result.costs.monthlyInstallment).toBe(0)

    expect(result.costs.notes.join(' ')).toMatch(/entrada informada cobre/i)
  })

  it('taxa de juros zero funciona', () => {
    const finance = { ...makeInput().finance, monthlyRatePct: 0 }

    const result = computeVehicleCosts(makeVehicle({ priceBRL: 78000 }), makeContext({ finance }))

    expect(result.ok && result.costs.monthlyInstallment).toBeCloseTo((78000 - 30000) / 48, 8)
  })

  it('financiamento inválido devolve erro explicativo em vez de NaN', () => {
    const finance = { ...makeInput().finance, installments: 0 }

    const result = computeVehicleCosts(makeVehicle(), makeContext({ finance }))

    expect(result.ok).toBe(false)

    if (!result.ok) expect(result.code).toBe('financiamento_invalido')
  })
  it('preço ausente, zero ou negativo é recusado', () => {
    for (const priceBRL of [null, 0, -100]) {
      const result = computeVehicleCosts(makeVehicle({ priceBRL }), makeContext())

      expect(result.ok).toBe(false)
    }
  })

  it('dado ausente NÃO vira zero: total mensal fica indisponível', () => {
    const noConsumption = computeVehicleCosts(
      makeVehicle({ urbanConsumption: null, highwayConsumption: null }),

      makeContext(),
    )

    expect(noConsumption.ok && noConsumption.costs.energyMonthly).toBeNull()

    expect(noConsumption.ok && noConsumption.costs.monthlyTotal).toBeNull()

    const noInsurance = computeVehicleCosts(makeVehicle({ insuranceCategory: null }), makeContext())

    expect(noInsurance.ok && noInsurance.costs.insuranceAnnual).toBeNull()

    expect(noInsurance.ok && noInsurance.costs.monthlyTotal).toBeNull()

    const noDepreciation = computeVehicleCosts(
      makeVehicle({ depreciationAnnualPct: null }),

      makeContext(),
    )

    expect(noDepreciation.ok && noDepreciation.costs.depreciationAnnual).toBeNull()
  })

  it('etanol em veículo flex usa preço do etanol e consumo reduzido', () => {
    const gasoline = computeVehicleCosts(makeVehicle(), makeContext())

    const ethanol = computeVehicleCosts(makeVehicle(), makeContext({ fuelPreference: 'etanol' }))

    expect(gasoline.ok && ethanol.ok).toBe(true)

    if (!gasoline.ok || !ethanol.ok) return

    const expectedRatio =
      DEFAULT_ASSUMPTIONS.ethanolPricePerLiter /
      DEFAULT_ASSUMPTIONS.ethanolConsumptionFactor /
      DEFAULT_ASSUMPTIONS.gasolinePricePerLiter

    expect(ethanol.costs.energyCostPerKm! / gasoline.costs.energyCostPerKm!).toBeCloseTo(
      expectedRatio,

      6,
    )
  })

  it('veículo elétrico usa preço da eletricidade (km/kWh)', () => {
    const result = computeVehicleCosts(
      makeVehicle({
        fuel: 'eletrico',

        consumptionUnit: 'km/kWh',

        urbanConsumption: 8,

        highwayConsumption: 7,
      }),

      makeContext(),
    )

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.costs.usedFuelLabel).toBe('eletricidade')

    expect(result.costs.energyCostPerKm!).toBeLessThan(0.2)
  })

  it('o cenário conservador aumenta seguro, manutenção e energia', () => {
    const balanced = computeVehicleCosts(makeVehicle(), makeContext())

    const conservative = computeVehicleCosts(
      makeVehicle(),

      makeContext({ scenario: SCENARIOS.conservador }),
    )

    expect(balanced.ok && conservative.ok).toBe(true)

    if (!balanced.ok || !conservative.ok) return

    expect(conservative.costs.insuranceAnnual! / balanced.costs.insuranceAnnual!).toBeCloseTo(
      1.25,

      8,
    )

    expect(conservative.costs.maintenanceAnnual! / balanced.costs.maintenanceAnnual!).toBeCloseTo(
      1.3,

      8,
    )

    expect(conservative.costs.energyCostPerKm! / balanced.costs.energyCostPerKm!).toBeCloseTo(
      1.1,

      8,
    )

    expect(conservative.costs.monthlyTotal!).toBeGreaterThan(balanced.costs.monthlyTotal!)
  })

  it('a manutenção aumenta com a idade do veículo após o período livre', () => {
    const recent = computeVehicleCosts(makeVehicle({ modelYear: 2025 }), makeContext())

    const old = computeVehicleCosts(makeVehicle({ modelYear: 2018 }), makeContext())

    expect(recent.ok && old.ok).toBe(true)

    if (!recent.ok || !old.ok) return

    expect(old.costs.maintenanceAnnual!).toBeGreaterThan(recent.costs.maintenanceAnnual!)
  })

  it('premissas ajustadas manualmente alteram o resultado', () => {
    const base = computeVehicleCosts(makeVehicle(), makeContext())

    const adjusted = computeVehicleCosts(makeVehicle(), makeContext({ manualIpvaRatePct: 2 }))

    expect(base.ok && adjusted.ok).toBe(true)

    if (!base.ok || !adjusted.ok) return

    expect(base.costs.ipvaAnnual).not.toBeNull()

    expect(adjusted.costs.ipvaAnnual).toBeCloseTo((base.costs.ipvaAnnual ?? 0) / 2, 8)
  })
})
