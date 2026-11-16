/**

* Oráculos manuais: casos com resultado conhecido, calculado à mão.

* Cada valor esperado traz a conta. Se um teste falhar, o código está errado

* (ou a premissa mudou). Não ajuste o valor esperado para acompanhar o código.

*/

import { describe, expect, it } from 'vitest'

import { DEFAULT_ASSUMPTIONS, USAGE_MIX } from '../../config/assumptions'

import { SCENARIOS } from '../../config/scenarios'

import { acquisitionCapacity } from '../../domain/finance/capacity'

import { normalizeValues } from '../../domain/decision/normalize'

import { calculateProximityPenalty } from '../../domain/decision/wsm'

import { referenceIncomeFor } from '../../domain/finance/inverse'

import { calculateRegionalTaxes } from '../../domain/finance/regionalTax'

import {
  calculateEffectiveConsumption,
  computeVehicleCosts,
  type CostContext,
  type CostResult,
} from '../../domain/finance/costs'

import { calculateCommitmentRatio, calculateMonthlyKm } from '../../domain/finance/indicators'

import {
  FinanceInputError,
  calculateFinancedPrincipal,
  calculateMonthlyPayment,
} from '../../domain/finance/loan'

import { buildSchedule, calculateTco, residualValue } from '../../domain/finance/tco'

import { BAHIA_DEMONSTRATION_RULE, TAX_REFERENCE_DATE } from '../../config/regionalTax'

import type { RegionalTaxRule } from '../../types/regionalTax'

import type { TcoInput } from '../../types/tco'

import { REFERENCE_YEAR, makeInput, makeVehicle } from '../fixtures/factories'

// ---------- ajudantes ----------

function regionalRule(
  state: RegionalTaxRule['state'],

  overrides: Partial<RegionalTaxRule> = {},
): RegionalTaxRule {
  return {
    id: `${state}-ipva-oraculo`,

    state,

    tax: 'ipva',

    vehicleCondition: 'qualquer',

    propulsion: 'qualquer',

    ratePct: 4,

    fixedAmountBRL: null,

    exemptions: [],

    source: 'Fonte de teste (oráculo), não é dado oficial',

    legalBasis: 'Base legal de teste',

    fiscalYear: 2026,

    validFrom: '2026-01-01',

    validUntil: '2026-12-31',

    lastVerifiedAt: '2026-10-15',

    status: 'verificada',

    ...overrides,
  }
}

function costContext(overrides: Partial<CostContext> = {}): CostContext {
  const base = makeInput()

  return {
    finance: base.finance,

    usage: base.usage,

    purchaseMode: 'financiado',

    fuelPreference: 'indiferente',

    assumptions: DEFAULT_ASSUMPTIONS,

    scenario: SCENARIOS.economico,

    referenceYear: REFERENCE_YEAR,

    registrationState: 'BA',

    condition: 'indiferente',

    manualIpvaRatePct: undefined,

    allowDemonstrativeTax: true,

    ...overrides,
  }
}

function costsOf(result: CostResult) {
  if (!result.ok) throw new Error(`Esperado custo válido, veio: ${result.message}`)

  return result.costs
}

function tcoInput(overrides: Partial<TcoInput> = {}): TcoInput {
  return {
    priceBRL: 36000,

    purchaseMode: 'avista',

    downPayment: 0,

    monthlyRatePct: 0,

    installments: 0,

    ipvaAnnual: 1200,

    licensingAnnual: 200,

    insuranceAnnual: 2400,

    maintenanceAnnualAtStart: 1200,

    ageAtStart: 0,

    energyCostPerKm: 0.5,

    monthlyKm: 1000,

    depreciationAnnualPct: 10,

    extras: {},

    assumptions: {
      maintenanceAgeFreeYears: DEFAULT_ASSUMPTIONS.maintenanceAgeFreeYears,

      maintenanceAgeIncreasePctPerYear: DEFAULT_ASSUMPTIONS.maintenanceAgeIncreasePctPerYear,
    },

    ...overrides,
  }
}

// ---------- juros e Tabela Price ----------

describe('oráculos: juros, Tabela Price e SAC', () => {
  it('premissa: o IPVA padrão da estimativa é 4%', () => {
    expect(DEFAULT_ASSUMPTIONS.ipvaRatePct).toBe(4)
  })

  it('Price: P = 1000, 10% a.m., 2 parcelas. PMT = 1000·0,1·1,21/0,21 = 576,19', () => {
    expect(calculateMonthlyPayment(1000, 10, 2)).toBeCloseTo(576.19047619, 6)
  })

  it('Price sem juros: 1200 em 12 parcelas dá 100 cada', () => {
    expect(calculateMonthlyPayment(1200, 0, 12)).toBe(100)
  })

  it('Price: juros do 1º período = 10% de 1000 = 100; saldo zera na última parcela', () => {
    const rows = buildSchedule('price', 1000, 10, 2)

    expect(rows[0]?.interest).toBeCloseTo(100, 9)

    expect(rows[1]?.interest).toBeCloseTo(52.38095238, 6)

    expect(rows[1]?.closing).toBeCloseTo(0, 9)
  })

  it('SAC: amortização constante de 500; parcelas 600 e 550; juros somam 150', () => {
    const rows = buildSchedule('sac', 1000, 10, 2)

    expect(rows.map((row) => row.amortization)).toEqual([500, 500])

    expect(rows.map((row) => row.installment)).toEqual([600, 550])

    expect(rows.reduce((sum, row) => sum + row.interest, 0)).toBeCloseTo(150, 9)
  })

  it('inverso da Price: parcela 576,19 a 10% em 2 meses financia 1000', () => {
    expect(calculateFinancedPrincipal(576.19047619, 10, 2)).toBeCloseTo(1000, 3)
  })

  it('inverso sem juros: parcela 100 em 12 meses financia 1200', () => {
    expect(calculateFinancedPrincipal(100, 0, 12)).toBe(1200)
  })

  it('parcelas inválidas lançam erro explícito, nunca NaN', () => {
    expect(() => calculateMonthlyPayment(1000, 10, 0)).toThrow(FinanceInputError)
  })
})

// ---------- combustível, uso e custo mensal ----------

describe('oráculos: combustível, quilometragem e custo mensal', () => {
  it('consumo misto 50/50 entre 10 e 20 km/l: 1/(0,5/10 + 0,5/20) = 13,33', () => {
    expect(USAGE_MIX.misto).toEqual({ urban: 0.5, highway: 0.5 })

    expect(calculateEffectiveConsumption(10, 20, 'misto').value).toBeCloseTo(13.3333, 3)
  })

  it('consumo urbano 85/15 entre 10 e 20 km/l: 1/(0,85/10 + 0,15/20) = 10,81', () => {
    expect(calculateEffectiveConsumption(10, 20, 'urbano').value).toBeCloseTo(10.8108, 3)
  })

  it('só consumo urbano disponível: usa o urbano e registra nota', () => {
    const result = calculateEffectiveConsumption(10, null, 'misto')

    expect(result.value).toBe(10)

    expect(result.note).not.toBeNull()
  })

  it('sem nenhum consumo: fica ausente (null), não zero', () => {
    expect(calculateEffectiveConsumption(null, null, 'misto').value).toBeNull()
  })

  it('gasolina a R$ 6,00, 12 km/l, 1000 km por mês: R$ 0,50 por km e R$ 500 por mês', () => {
    const vehicle = makeVehicle({ fuel: 'gasolina', urbanConsumption: 12, highwayConsumption: 12 })

    const costs = costsOf(
      computeVehicleCosts(
        vehicle,

        costContext({
          assumptions: { ...DEFAULT_ASSUMPTIONS, gasolinePricePerLiter: 6 },

          scenario: {
            ...SCENARIOS.economico,

            multipliers: { insurance: 1, maintenance: 1, energy: 1 },
          },

          usage: { ...makeInput().usage, monthlyKmOverride: 1000 },
        }),
      ),
    )

    expect(costs.energyCostPerKm).toBeCloseTo(0.5, 9)

    expect(costs.energyMonthly).toBeCloseTo(500, 9)
  })

  it('quilometragem: 50 km/dia, 5 dias por semana = 50·5·52/12 = 1083,33 km por mês', () => {
    const usage = { ...makeInput().usage, monthlyKmOverride: null, kmPerDay: 50, daysPerWeek: 5 }

    expect(calculateMonthlyKm(usage)).toBeCloseTo(1083.3333, 3)
  })

  it('IPVA da Bahia (demonstração, 4%): veículo de R$ 36.000 paga R$ 1.440 ao ano', () => {
    const costs = costsOf(computeVehicleCosts(makeVehicle({ priceBRL: 36000 }), costContext()))

    expect(costs.ipvaAnnual).toBe(1440)
  })

  it('financiamento: entrada de 6.000 em carro de 36.000, 12x a 0%: financia 30.000 e parcela 2.500', () => {
    const costs = costsOf(
      computeVehicleCosts(
        makeVehicle({ priceBRL: 36000 }),

        costContext({
          finance: {
            ...makeInput().finance,

            downPayment: 6000,

            installments: 12,

            monthlyRatePct: 0,
          },
        }),
      ),
    )

    expect(costs.downPaymentUsed).toBe(6000)

    expect(costs.financedAmount).toBe(30000)

    expect(costs.monthlyInstallment).toBe(2500)
  })
  it('à vista: sem financiamento, entrada igual ao preço', () => {
    const costs = costsOf(
      computeVehicleCosts(
        makeVehicle({ priceBRL: 36000 }),

        costContext({ purchaseMode: 'avista' }),
      ),
    )

    expect(costs.financedAmount).toBe(0)

    expect(costs.monthlyInstallment).toBe(0)

    expect(costs.downPaymentUsed).toBe(36000)
  })
})

// ---------- comprometimento, capacidade e renda de referência ----------

describe('oráculos: comprometimento, capacidade e renda de referência', () => {
  it('comprometimento: 3.000 de custo com renda de 10.000 = 30%', () => {
    expect(calculateCommitmentRatio(3000, 10000)).toBeCloseTo(0.3, 9)
  })

  it('comprometimento sem renda positiva é indisponível (null), nunca divisão por zero', () => {
    expect(calculateCommitmentRatio(3000, 0)).toBeNull()

    expect(calculateCommitmentRatio(3000, -5)).toBeNull()
  })

  it('capacidade financiada: entrada 5.000 + parcela 576,19 a 10% em 2 meses (≈1.000) = 6.000', () => {
    expect(
      acquisitionCapacity({
        purchaseMode: 'financiado',

        usableDownPayment: 5000,

        maxInstallment: 576.19047619,

        monthlyRatePct: 10,

        installments: 2,
      }),
    ).toBeCloseTo(6000, 1)
  })

  it('capacidade à vista: só a entrada usável', () => {
    expect(
      acquisitionCapacity({
        purchaseMode: 'avista',

        usableDownPayment: 5000,

        maxInstallment: 0,

        monthlyRatePct: 1.5,

        installments: 48,
      }),
    ).toBe(5000)
  })

  it('renda de referência: custo de 3.000 ÷ limite do cenário econômico (40%) = 7.500', () => {
    expect(referenceIncomeFor(3000, SCENARIOS.economico)).toBe(7500)
  })

  it('renda de referência sem limite no cenário é indisponível (null)', () => {
    expect(referenceIncomeFor(3000, { ...SCENARIOS.economico, maxIncomeCommitment: 0 })).toBeNull()
  })
})

// ---------- normalização e soma ponderada ----------

describe('oráculos: normalização min-max e penalização de proximidade', () => {
  it('benefício: [10, 20, 30] vira [0, 50, 100]', () => {
    expect(normalizeValues([10, 20, 30], 'benefit').normalized).toEqual([0, 50, 100])
  })

  it('custo: [10, 20, 30] vira [100, 50, 0] (menor é melhor)', () => {
    expect(normalizeValues([10, 20, 30], 'cost').normalized).toEqual([100, 50, 0])
  })

  it('ausente permanece ausente e não entra na escala', () => {
    expect(normalizeValues([10, null, 30], 'benefit').normalized).toEqual([0, null, 100])
  })

  it('critério sem variação: todos recebem 100 e a estatística marca degenerado', () => {
    const result = normalizeValues([5, 5], 'benefit')

    expect(result.normalized).toEqual([100, 100])

    expect(result.stat?.degenerate).toBe(true)
  })

  it('sem nenhum valor: tudo ausente', () => {
    const result = normalizeValues([null, null], 'cost')

    expect(result.normalized).toEqual([null, null])

    expect(result.stat).toBeNull()
  })

  it('penalização: a 90% do limite, com início em 80% e 10 pontos, subtrai 5', () => {
    expect(calculateProximityPenalty(900, 1000, { startShare: 0.8, maxPoints: 10 })).toBeCloseTo(
      5,

      9,
    )
  })

  it('penalização: abaixo do início não há desconto; acima do limite, o máximo', () => {
    const rule = { startShare: 0.8, maxPoints: 10 }

    expect(calculateProximityPenalty(800, 1000, rule)).toBe(0)

    expect(calculateProximityPenalty(1500, 1000, rule)).toBe(10)

    expect(calculateProximityPenalty(900, 1000, null)).toBe(0)
  })
})

// ---------- TCO ----------

describe('oráculos: valor residual e TCO', () => {
  it('residual linear: 70.000 com depreciação de 8% ao ano em 36 meses = 70.000·(1 − 0,08·3) = 53.200', () => {
    expect(residualValue(70000, 8, 36).value).toBeCloseTo(53200, 6)
  })

  it('residual sem depreciação informada é ausente (null), não zero', () => {
    expect(residualValue(70000, null, 36).value).toBeNull()
  })

  it('à vista, 12 meses: econômico = 14.600 e caixa = 47.000; caixa − residual = econômico', () => {
    // Residual 36.000·(1−0,10) = 32.400, perda = 3.600.

    // Tributos 1.400 (IPVA 1.200 + licenciamento 200), seguro 2.400, energia 6.000, manutenção 1.200.

    // Econômico = 3.600 + 1.400 + 2.400 + 6.000 + 1.200 = 14.600.

    // Caixa = entrada 36.000 + 1.400 + 2.400 + 6.000 + 1.200 = 47.000.

    const result = calculateTco(tcoInput(), 12, 'price')

    expect(result.economic.total).toBeCloseTo(14600, 6)

    expect(result.cash.total).toBeCloseTo(47000, 6)

    expect(result.cash.netResidualPosition).toBeCloseTo(32400, 6)

    expect(result.cash.total! - result.cash.netResidualPosition!).toBeCloseTo(
      result.economic.total!,

      6,
    )
  })

  it('financiado, 1.000 a 10% em 2 parcelas, horizonte 24, sem outros custos e sem depreciação: juros = 152,38', () => {
    // Juros = 2 · 576,19 − 1.000 = 152,38. Caixa = soma das parcelas = 1.152,38.

    const result = calculateTco(
      tcoInput({
        priceBRL: 1000,

        purchaseMode: 'financiado',

        downPayment: 0,

        monthlyRatePct: 10,

        installments: 2,

        ipvaAnnual: 0,

        licensingAnnual: 0,

        insuranceAnnual: 0,

        maintenanceAnnualAtStart: 0,

        energyCostPerKm: 0,

        depreciationAnnualPct: 0,
      }),

      24,

      'price',
    )

    expect(result.economic.total).toBeCloseTo(152.38, 2)

    expect(result.cash.total).toBeCloseTo(1152.38, 2)

    expect(result.interestPaid).toBeCloseTo(152.38, 2)
  })
})

// ---------- imposto regional (IPVA por UF) ----------

describe('oráculos: imposto regional', () => {
  const asOf = TAX_REFERENCE_DATE

  const query = {
    priceBRL: 50000,

    condition: 'usado' as const,

    fuel: 'gasolina' as const,

    asOf,

    manualRatePct: undefined,

    allowDemonstrativeEstimate: false,

    demonstrativeRatePct: DEFAULT_ASSUMPTIONS.ipvaRatePct,
  }

  it('regra verificada de 4% sobre R$ 50.000: R$ 2.000 ao ano e R$ 166,67 ao mês', () => {
    const provider = {
      getRules: (state: RegionalTaxRule['state']) => (state === 'SP' ? [regionalRule('SP')] : []),
    }

    const result = calculateRegionalTaxes({ ...query, state: 'SP' }, provider)

    expect(result.annualBRL).toBe(2000)

    expect(result.monthlyBRL).toBe(166.67)
  })

  it('mudar a UF recalcula: RJ com 2% dá R$ 1.000 para o mesmo veículo', () => {
    const provider = {
      getRules: (state: RegionalTaxRule['state']) => {
        if (state === 'SP') return [regionalRule('SP', { ratePct: 4 })]

        if (state === 'RJ') return [regionalRule('RJ', { ratePct: 2 })]

        return []
      },
    }

    expect(calculateRegionalTaxes({ ...query, state: 'SP' }, provider).annualBRL).toBe(2000)

    expect(calculateRegionalTaxes({ ...query, state: 'RJ' }, provider).annualBRL).toBe(1000)
  })

  it('regra vencida não é aplicada: no exercício seguinte o imposto fica ausente, não zero', () => {
    const provider = { getRules: () => [regionalRule('SP')] }

    const result = calculateRegionalTaxes({ ...query, state: 'SP', asOf: '2027-02-01' }, provider)

    expect(result.annualBRL).toBeNull()

    expect(result.rule).not.toBeNull()
  })

  it('UF sem regra: IPVA ausente (null) e nenhuma regra registrada', () => {
    const result = calculateRegionalTaxes({ ...query, state: 'MG' }, { getRules: () => [] })

    expect(result.annualBRL).toBeNull()

    expect(result.rule).toBeNull()
  })

  it('preço ausente: base e IPVA ausentes, nunca zero', () => {
    const result = calculateRegionalTaxes(
      { ...query, state: 'SP', priceBRL: null },

      { getRules: () => [regionalRule('SP')] },
    )

    expect(result.baseBRL).toBeNull()

    expect(result.annualBRL).toBeNull()
  })

  it('Bahia, regra de demonstração: aplica 4% e rotula a confiança como demonstração', () => {
    const provider = { getRules: () => [BAHIA_DEMONSTRATION_RULE] }

    const result = calculateRegionalTaxes({ ...query, state: 'BA' }, provider)

    expect(result.annualBRL).toBe(2000)

    expect(result.confidence).toBe('demonstracao')
  })
})
