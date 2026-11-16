import {
  migrateLegacyWeights,
  simulationInputSchema,
  weightsSchema,
} from '../../schemas/simulation'

import { makeInput } from '../fixtures/factories'

function issuesFor(input: unknown): string[] {
  const result = simulationInputSchema.safeParse(input)

  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
}

describe('validação da simulação com Zod', () => {
  it('aceita uma entrada válida', () => {
    expect(simulationInputSchema.safeParse(makeInput()).success).toBe(true)
  })

  it.each([
    ['renda zero', { finance: { netIncome: 0 } }, 'finance.netIncome'],

    ['renda negativa', { finance: { netIncome: -5000 } }, 'finance.netIncome'],

    ['despesa negativa', { finance: { fixedExpenses: -1 } }, 'finance.fixedExpenses'],

    ['entrada negativa', { finance: { downPayment: -100 } }, 'finance.downPayment'],

    ['reserva negativa', { finance: { reserve: -100 } }, 'finance.reserve'],

    ['valor não numérico (NaN)', { finance: { netIncome: Number.NaN } }, 'finance.netIncome'],

    ['valor infinito', { finance: { netIncome: Number.POSITIVE_INFINITY } }, 'finance.netIncome'],

    ['parcelas zero', { finance: { installments: 0 } }, 'finance.installments'],

    ['parcelas fracionadas', { finance: { installments: 12.5 } }, 'finance.installments'],

    ['parcelas excessivas', { finance: { installments: 500 } }, 'finance.installments'],

    ['taxa negativa', { finance: { monthlyRatePct: -1 } }, 'finance.monthlyRatePct'],

    ['taxa absurda', { finance: { monthlyRatePct: 80 } }, 'finance.monthlyRatePct'],

    ['parcela máxima negativa', { finance: { maxInstallment: -10 } }, 'finance.maxInstallment'],

    ['km por dia negativo', { usage: { kmPerDay: -5 } }, 'usage.kmPerDay'],

    ['dias por semana 0', { usage: { daysPerWeek: 0 } }, 'usage.daysPerWeek'],

    ['dias por semana 8', { usage: { daysPerWeek: 8 } }, 'usage.daysPerWeek'],

    ['passageiros 0', { usage: { passengers: 0 } }, 'usage.passengers'],

    ['passageiros 20', { usage: { passengers: 20 } }, 'usage.passengers'],

    ['título vazio', { objective: { title: ' ' } }, 'objective.title'],

    ['título longo demais', { objective: { title: 'x'.repeat(200) } }, 'objective.title'],

    [
      'cenário desconhecido',

      { objective: { scenarioId: 'hacker' as never } },

      'objective.scenarioId',
    ],

    [
      'prioridade fora do intervalo',

      { preferences: { priorities: { economia: 9 } } },

      'preferences.priorities.economia',
    ],
  ])('rejeita %s', (_label, patch, path) => {
    const issues = issuesFor(makeInput(patch as never))

    expect(issues.some((issue) => issue.startsWith(path))).toBe(true)
  })

  it('rejeita ano inicial maior que o final', () => {
    const issues = issuesFor(makeInput({ preferences: { yearMin: 2025, yearMax: 2020 } }))

    expect(issues.join(' ')).toMatch(/ano inicial/i)
  })

  it('rejeita a mesma marca em desejadas e não desejadas', () => {
    const issues = issuesFor(
      makeInput({ preferences: { wantedBrands: ['Fiat'], avoidedBrands: ['fiat'] } }),
    )

    expect(issues.join(' ')).toMatch(/Fiat/)
  })

  it('mensagens de erro são claras e em português', () => {
    const issues = issuesFor(makeInput({ finance: { netIncome: Number.NaN } }))

    expect(issues.join(' ')).toMatch(/número válido/i)
  })
})

describe('validação dos pesos', () => {
  const valid = makeInput().weights

  it('exige soma de 100%', () => {
    expect(weightsSchema.safeParse(valid).success).toBe(true)

    expect(weightsSchema.safeParse({ ...valid, tco: valid.tco + 5 }).success).toBe(false)
  })

  it('rejeita pesos acima do limite por critério', () => {
    const over = { tco: 80, incomeCommitment: 20, usageFit: 0, preference: 0 }

    expect(weightsSchema.safeParse(over).success).toBe(false)
  })

  it('rejeita pesos negativos', () => {
    const negative = { ...valid, tco: -5, incomeCommitment: valid.incomeCommitment + valid.tco + 5 }

    expect(weightsSchema.safeParse(negative).success).toBe(false)
  })

  it('rejeita critérios faltando ou valores não numéricos', () => {
    const { tco: _tco, ...incomplete } = valid

    expect(weightsSchema.safeParse(incomplete).success).toBe(false)

    expect(weightsSchema.safeParse({ ...valid, tco: 'abc' }).success).toBe(false)
  })

  it('converte pesos de simulações antigas: a soma dos cinco critérios de custo vira o TCO', () => {
    const legacy = {
      price: 10,

      monthlyCost: 25,

      consumption: 20,

      maintenance: 10,

      depreciation: 10,

      incomeCommitment: 15,

      usageFit: 5,

      preference: 5,
    }

    const migrated = migrateLegacyWeights(legacy)

    expect(migrated).toEqual({ tco: 75, incomeCommitment: 15, usageFit: 5, preference: 5 })

    expect(weightsSchema.safeParse(migrated).success).toBe(true)
  })

  it('pesos já no formato atual não são alterados pela conversão', () => {
    expect(migrateLegacyWeights(valid)).toBe(valid)
  })
})
