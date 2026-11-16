import { DEFAULT_ASSUMPTIONS } from '../../config/assumptions'

import { SCENARIOS } from '../../config/scenarios'

import {
  calculateInverseOptions,
  isDominated,
  type InverseCandidate,
  type InverseRequest,
} from '../../domain/finance/inverse'

import { makeInput, makeVehicle, REFERENCE_YEAR } from '../fixtures/factories'

function makeRequest(patch: Partial<InverseRequest> = {}): InverseRequest {
  const input = makeInput()

  return {
    vehicle: makeVehicle({ priceBRL: 60000 }),

    registrationState: 'BA',

    condition: 'indiferente',

    usage: input.usage,

    fuelPreference: 'indiferente',

    assumptions: DEFAULT_ASSUMPTIONS,

    scenario: SCENARIOS.equilibrado,

    referenceYear: REFERENCE_YEAR,

    horizonMonths: 36,

    allowDemonstrativeTax: true,

    finance: { ...input.finance, maxInstallment: null },

    hasIncome: true,

    purchaseModes: ['financiado', 'avista'],

    amortization: 'price',

    installmentOptions: [12, 36, 48],

    downPaymentOptions: [0, 12000, 30000],

    maxDownPayment: null,

    maxMonthlyTotal: null,

    personalized: null,

    ...patch,
  }
}

function candidateOf(
  result: ReturnType<typeof calculateInverseOptions>,

  id: string,
): InverseCandidate {
  const found = result.candidates.find((candidate) => candidate.id === id)

  if (!found) throw new Error(`candidato ${id} não encontrado`)

  return found
}

function candidate(patch: Partial<InverseCandidate>): InverseCandidate {
  return {
    id: 'x',

    purchaseMode: 'financiado',

    amortization: 'price',

    downPayment: 0,

    installments: 48,

    financed: 0,

    monthlyInstallment: 0,

    monthlyTotal: 0,

    interest: 0,

    tcoEconomic: 0,

    tcoCash: 0,

    referenceIncome: null,

    reserveAfter: null,

    marginAfter: null,

    status: 'viavel',

    reasons: [],

    personalized: false,

    ...patch,
  }
}

describe('simulação inversa: à vista e entrada', () => {
  it('à vista não tem financiamento, prazo nem parcela', () => {
    const result = calculateInverseOptions(
      makeRequest({ purchaseModes: ['avista'], hasIncome: false }),
    )

    const cash = result.candidates.find((item) => item.purchaseMode === 'avista')

    expect(cash).toBeDefined()

    expect(cash?.downPayment).toBe(60000)

    expect(cash?.installments).toBe(0)

    expect(cash?.financed).toBe(0)

    expect(cash?.monthlyInstallment).toBe(0)

    expect(result.scenarios.avista?.purchaseMode).toBe('avista')
  })

  it('à vista com renda: o preço inteiro usa a reserva protegida e é bloqueado sem autorização', () => {
    // Entrada disponível fora da reserva: 30.000. Pagar 60.000 à vista passaria da reserva.

    const result = calculateInverseOptions(makeRequest({ purchaseModes: ['avista'] }))

    const cash = result.candidates.find((item) => item.purchaseMode === 'avista')

    expect(cash?.status).toBe('inviavel')

    expect(cash?.reasons.map((r) => r.code)).toContain('reserva_violada')

    expect(result.scenarios.avista).toBeNull()
  })

  it('entrada igual ao valor não gera financiamento; a opção é à vista', () => {
    const result = calculateInverseOptions(
      makeRequest({
        downPaymentOptions: [0, 60000],

        purchaseModes: ['financiado', 'avista'],

        hasIncome: false,
      }),
    )

    const financedFullEntry = result.candidates.filter(
      (item) => item.purchaseMode === 'financiado' && item.downPayment >= 60000,
    )

    expect(financedFullEntry).toHaveLength(0)

    expect(result.scenarios.avista?.downPayment).toBe(60000)
  })

  it('entrada zero financia o preço inteiro', () => {
    const result = calculateInverseOptions(
      makeRequest({
        downPaymentOptions: [0],

        installmentOptions: [36],

        purchaseModes: ['financiado'],
      }),
    )

    const item = candidateOf(result, 'financiado:0:36')

    expect(item.financed).toBe(60000)

    expect(item.monthlyInstallment).toBeGreaterThan(0)
  })
})

describe('simulação inversa: taxa, Price e SAC', () => {
  it('taxa zero divide o financiado igualmente pelos prazos e não cobra juros', () => {
    const result = calculateInverseOptions(
      makeRequest({
        downPaymentOptions: [0],

        installmentOptions: [12],

        purchaseModes: ['financiado'],

        finance: { ...makeInput().finance, monthlyRatePct: 0, maxInstallment: null },
      }),
    )

    const item = candidateOf(result, 'financiado:0:12')

    expect(item.monthlyInstallment).toBeCloseTo(60000 / 12, 2)

    expect(item.interest).toBe(0)
  })

  it('SAC começa com parcela maior que a Price e paga menos juros no total', () => {
    const price = calculateInverseOptions(
      makeRequest({
        downPaymentOptions: [0],

        installmentOptions: [48],

        purchaseModes: ['financiado'],

        hasIncome: false,

        amortization: 'price',
      }),
    )

    const sac = calculateInverseOptions(
      makeRequest({
        downPaymentOptions: [0],

        installmentOptions: [48],

        purchaseModes: ['financiado'],

        hasIncome: false,

        amortization: 'sac',
      }),
    )

    const priceItem = candidateOf(price, 'financiado:0:48')

    const sacItem = candidateOf(sac, 'financiado:0:48')

    expect(sacItem.amortization).toBe('sac')

    expect(sacItem.monthlyInstallment).toBeGreaterThan(priceItem.monthlyInstallment)

    expect(sacItem.interest ?? 0).toBeLessThan(priceItem.interest ?? 0)
  })
})

describe('simulação inversa: renda, limites e ausência de solução', () => {
  it('sem renda funciona e avisa que não há avaliação de orçamento', () => {
    const result = calculateInverseOptions(
      makeRequest({
        hasIncome: false,

        finance: { ...makeInput().finance, netIncome: 0, maxInstallment: null },
      }),
    )

    expect(result.status).toBe('ok')

    expect(
      result.candidates.some((item) => item.reasons.some((r) => r.code.includes('renda'))),
    ).toBe(false)

    expect(result.premises.join(' ')).toContain('Sem renda informada')

    expect(result.scenarios.menorParcela).not.toBeNull()
  })

  it('renda insuficiente não recebe solução viável e explica o motivo', () => {
    const result = calculateInverseOptions(
      makeRequest({
        finance: {
          ...makeInput().finance,

          netIncome: 3000,

          fixedExpenses: 2800,

          maxInstallment: null,
        },
      }),
    )

    expect(result.status).toBe('sem_solucao')

    expect(result.options).toHaveLength(0)

    expect(result.candidates.every((item) => item.status !== 'viavel')).toBe(true)

    expect(Object.keys(result.rejectionCounts).length).toBeGreaterThan(0)

    expect(result.suggestions[0]).toMatch(/Nenhuma combinação/)
  })

  it('ausência de solução mantém todos os cenários vazios, sem esconder nada', () => {
    const result = calculateInverseOptions(makeRequest({ maxMonthlyTotal: 100 }))

    expect(result.status).toBe('sem_solucao')

    expect(result.scenarios.menorEntrada).toBeNull()

    expect(result.scenarios.menorParcela).toBeNull()

    expect(result.scenarios.menorCustoTotal).toBeNull()

    expect(result.scenarios.avista).toBeNull()

    expect(result.suggestions.join(' ')).not.toMatch(/oculta|esconder|empréstimo adicional/i)
  })

  it('entrada acima do disponível é recusada com a diferença', () => {
    const result = calculateInverseOptions(
      makeRequest({
        maxDownPayment: 12000,

        downPaymentOptions: [30000],

        purchaseModes: ['financiado'],
      }),
    )

    const item = candidateOf(result, 'financiado:30000:36')

    const reason = item.reasons.find((r) => r.code === 'entrada_acima_disponivel')

    expect(reason?.gap).toBe(18000)
  })

  it('usar a reserva protegida sem autorização bloqueia a combinação', () => {
    const result = calculateInverseOptions(
      makeRequest({ downPaymentOptions: [35000], purchaseModes: ['financiado'] }),
    )

    const item = candidateOf(result, 'financiado:35000:36')

    expect(item.reasons.map((r) => r.code)).toContain('reserva_violada')
  })
  it('cenário personalizado aparece mesmo quando não está na grade', () => {
    const result = calculateInverseOptions(
      makeRequest({
        downPaymentOptions: [0],

        purchaseModes: ['financiado'],

        personalized: { downPayment: 12345, installments: 30 },
      }),
    )

    expect(result.scenarios.personalizado?.id).toBe('financiado:12345:30')

    expect(result.scenarios.personalizado?.personalized).toBe(true)
  })

  it('renda de referência = custo mensal total ÷ limite do cenário', () => {
    const result = calculateInverseOptions(
      makeRequest({
        downPaymentOptions: [0],

        installmentOptions: [36],

        purchaseModes: ['financiado'],
      }),
    )

    const item = candidateOf(result, 'financiado:0:36')

    expect(item.monthlyTotal).not.toBeNull()

    expect(item.referenceIncome).toBeCloseTo(
      (item.monthlyTotal ?? 0) / SCENARIOS.equilibrado.maxIncomeCommitment,

      1,
    )

    expect(result.premises.join(' ')).toContain('não aprovação nem política de crédito')
  })
})

describe('simulação inversa: reserva e margem', () => {
  it('com renda, mostra a reserva que sobra e a renda livre depois do veículo', () => {
    const result = calculateInverseOptions(
      makeRequest({
        downPaymentOptions: [10000],

        installmentOptions: [36],

        purchaseModes: ['financiado'],
      }),
    )

    const item = candidateOf(result, 'financiado:10000:36')

    // Renda 12.000 − essenciais 4.000 = 8.000 disponíveis; reserva acumulada 40.000 − entrada 10.000.

    expect(item.reserveAfter).toBe(30000)

    expect(item.marginAfter).toBeCloseTo(8000 - (item.monthlyTotal ?? 0), 2)
  })

  it('sem renda, reserva e margem ficam nulas (não viram zero)', () => {
    const result = calculateInverseOptions(
      makeRequest({ hasIncome: false, downPaymentOptions: [0] }),
    )

    const item = candidateOf(result, 'financiado:0:36')

    expect(item.reserveAfter).toBeNull()

    expect(item.marginAfter).toBeNull()
  })
})

describe('simulação inversa: dominância', () => {
  it('alternativa dominada: outra igual ou melhor em entrada, parcela e custo, e melhor em uma', () => {
    const a = candidate({
      id: 'a',

      downPayment: 10000,

      monthlyInstallment: 900,

      tcoEconomic: 70000,
    })

    const b = candidate({
      id: 'b',

      downPayment: 10000,

      monthlyInstallment: 800,

      tcoEconomic: 70000,
    })

    expect(isDominated(a, b)).toBe(true)

    expect(isDominated(b, a)).toBe(false)
  })

  it('empate completo não é dominância', () => {
    const a = candidate({
      id: 'a',

      downPayment: 10000,

      monthlyInstallment: 900,

      tcoEconomic: 70000,
    })

    const b = candidate({
      id: 'b',

      downPayment: 10000,

      monthlyInstallment: 900,

      tcoEconomic: 70000,
    })

    expect(isDominated(a, b)).toBe(false)

    expect(isDominated(b, a)).toBe(false)
  })

  it('as opções devolvidas nunca são dominadas entre si', () => {
    const result = calculateInverseOptions(makeRequest())

    for (const option of result.options) {
      for (const other of result.options) {
        if (other !== option) expect(isDominated(option, other)).toBe(false)
      }
    }
  })
})

describe('simulação inversa: UF, condição e determinismo', () => {
  it('mudança de UF sem regra de IPVA torna o custo indisponível, nunca zero', () => {
    const result = calculateInverseOptions(
      makeRequest({
        registrationState: 'SP',

        allowDemonstrativeTax: false,

        purchaseModes: ['avista'],
      }),
    )

    const cash = result.candidates[0]

    expect(cash?.status).toBe('indisponivel')

    expect(cash?.reasons[0]?.code).toBe('ipva_indisponivel')

    expect(cash?.monthlyTotal).toBeNull()
  })

  it('novo e usado passam pelo cálculo sem alterar os valores de custo numa UF sem regra específica', () => {
    const novo = calculateInverseOptions(
      makeRequest({ condition: 'novo', downPaymentOptions: [0] }),
    )

    const usado = calculateInverseOptions(
      makeRequest({ condition: 'usado', downPaymentOptions: [0] }),
    )

    const a = candidateOf(novo, 'financiado:0:36')

    const b = candidateOf(usado, 'financiado:0:36')

    expect(a.monthlyTotal).toBe(b.monthlyTotal)

    expect(novo.premises.join(' ')).toContain('novo')

    expect(usado.premises.join(' ')).toContain('usado')
  })

  it('mesma entrada gera o mesmo resultado, independente da ordem das formas de compra', () => {
    const first = calculateInverseOptions(makeRequest({ purchaseModes: ['financiado', 'avista'] }))

    const again = calculateInverseOptions(makeRequest({ purchaseModes: ['financiado', 'avista'] }))

    const reversed = calculateInverseOptions(
      makeRequest({ purchaseModes: ['avista', 'financiado'] }),
    )

    expect(again).toEqual(first)

    expect(reversed.options).toEqual(first.options)

    expect(reversed.scenarios).toEqual(first.scenarios)
  })
})
