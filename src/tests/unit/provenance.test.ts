import { describe, expect, it } from 'vitest'

import { BAHIA_DEMONSTRATION_RULE } from '../../config/regionalTax'

import { GOVERNMENT_SOURCE_KEYS, PROVENANCE_ENTRIES } from '../../config/provenance'

import { buildDataReport, type DataReportInput } from '../../domain/provenance/report'

import { buildCatalog } from '../../services/vehicles/merge'

import type { RegionalTaxRule } from '../../types/regionalTax'

import { BRAZILIAN_STATE_CODES } from '../../types/regionalTax'

import { makeVehicle } from '../fixtures/factories'

const SUPPLEMENT_DATE = '2026-11-06'

function input(overrides: Partial<DataReportInput> = {}): DataReportInput {
  const vehicles = [makeVehicle()]

  return {
    catalog: buildCatalog({
      vehicles,

      sourceLabel: 'teste',

      versionTag: 'teste',

      warnings: [],

      retryable: false,

      now: new Date('2026-11-10T12:00:00Z'),
    }),

    rules: [BAHIA_DEMONSTRATION_RULE],

    states: BRAZILIAN_STATE_CODES,

    asOf: '2026-11-01',

    supplementUpdatedAt: SUPPLEMENT_DATE,

    ...overrides,
  }
}

function catalogWith(vehicles: ReturnType<typeof makeVehicle>[]) {
  return buildCatalog({
    vehicles,

    sourceLabel: 'teste',

    versionTag: 'teste',

    warnings: [],

    retryable: false,

    now: new Date('2026-11-10T12:00:00Z'),
  })
}

describe('registro de proveniência', () => {
  it('toda entrada de premissa ou demonstração sem URL declara que não tem fonte externa', () => {
    for (const [key, entry] of Object.entries(PROVENANCE_ENTRIES)) {
      if (entry.origin === 'estimated' || entry.origin === 'demonstration') {
        expect(entry.sourceUrl, key).toBeNull()
      }
    }
  })

  it('a FIPE aponta para a API oficial do QC e não afirma consumo ou manutenção', () => {
    expect(PROVENANCE_ENTRIES.fipe_online.sourceUrl).toBe('https://fipe.parallelum.com.br/api/v2')

    expect(PROVENANCE_ENTRIES.fipe_online.notes.join(' ')).toMatch(/não informa consumo/)
  })

  it('a base complementar é demonstração, não FIPE nem fonte oficial', () => {
    expect(PROVENANCE_ENTRIES.base_complementar.origin).toBe('demonstration')

    expect(PROVENANCE_ENTRIES.base_complementar.notes.join(' ')).toMatch(/Não vem da FIPE/)
  })

  it('IPVA sem regra verificada é indisponível, nunca zero', () => {
    expect(PROVENANCE_ENTRIES.ipva_sem_regra.origin).toBe('unavailable')

    expect(PROVENANCE_ENTRIES.ipva_sem_regra.sourceUrl).toBeNull()
  })

  it('não há fonte oficial cadastrada: a lista de fontes oficiais está vazia', () => {
    expect(GOVERNMENT_SOURCE_KEYS).toHaveLength(0)
  })

  it('depreciação e WSM são marcadas como fonte necessária, sem citação inventada', () => {
    expect(PROVENANCE_ENTRIES.base_complementar.notes.join(' ')).toMatch(
      /Depreciação: fonte necessária/,
    )

    expect(PROVENANCE_ENTRIES.metodo_multicriterio.notes.join(' ')).toMatch(/Fonte necessária/)
  })
})

describe('relatório técnico de dados', () => {
  it('conta cobertura por campo: ausente conta como ausente, nunca como zero', () => {
    const report = buildDataReport(
      input({
        catalog: catalogWith([
          makeVehicle({ urbanConsumption: null, maintenanceAnnualBRL: null }),

          makeVehicle({ urbanConsumption: 12, maintenanceAnnualBRL: 1800 }),
        ]),
      }),
    )

    const urban = report.coverageByField.find((item) => item.field === 'urbanConsumption')

    expect(urban).toEqual({ field: 'urbanConsumption', available: 1, missing: 1, total: 2 })

    const maintenance = report.coverageByField.find((item) => item.field === 'maintenanceAnnualBRL')

    expect(maintenance?.missing).toBe(1)
  })

  it('separa veículos com e sem base complementar', () => {
    const report = buildDataReport(
      input({
        catalog: catalogWith([
          makeVehicle({ hasSupplement: true }),

          makeVehicle({ hasSupplement: false }),
        ]),
      }),
    )

    expect(report.vehiclesWithSupplement).toBe(1)

    expect(report.vehiclesWithoutSupplement).toBe(1)
  })

  it('detecta registros inválidos com o motivo', () => {
    const bad = makeVehicle({ priceBRL: 0 })

    const badYear = makeVehicle({ modelYear: 2099 })

    const badMonth = makeVehicle({ referenceMonth: '2026/11' })

    const badId = makeVehicle({ id: 'fora-do-padrao' })

    const report = buildDataReport(input({ catalog: catalogWith([bad, badYear, badMonth, badId]) }))

    const reasonsOf = (id: string) =>
      report.invalidRecords.find((item) => item.id === id)?.reasons ?? []

    expect(reasonsOf(bad.id)).toContain('preco_invalido')

    expect(reasonsOf(badYear.id)).toContain('ano_invalido')

    expect(reasonsOf(badMonth.id)).toContain('mes_invalido')

    expect(reasonsOf('fora-do-padrao')).toContain('id_inconsistente')
  })

  it('marca a segunda ocorrência de um id como duplicada', () => {
    const first = makeVehicle({ fipeCode: 'DUP-1', fipeYearId: '2020-1' })

    const second = { ...makeVehicle({ fipeCode: 'DUP-1', fipeYearId: '2020-1' }) }

    const report = buildDataReport(input({ catalog: catalogWith([first, second]) }))

    expect(report.invalidRecords).toEqual([{ id: first.id, reasons: ['id_duplicado'] }])
  })

  it('preço ausente não é registro inválido: entra na cobertura como ausente', () => {
    const report = buildDataReport(
      input({ catalog: catalogWith([makeVehicle({ priceBRL: null })]) }),
    )

    expect(report.invalidRecords).toHaveLength(0)

    expect(report.coverageByField.find((item) => item.field === 'priceBRL')?.missing).toBe(1)
  })

  it('UF com regra de demonstração não conta como verificada; UF sem regra fica sem regra', () => {
    const report = buildDataReport(input())

    const ba = report.stateCoverage.find((item) => item.state === 'BA')

    const sp = report.stateCoverage.find((item) => item.state === 'SP')

    expect(ba?.status).toBe('demonstracao')

    expect(sp?.status).toBe('sem_regra')

    expect(report.statesWithoutVerifiedRule).toEqual(expect.arrayContaining(['BA', 'SP']))

    expect(report.statesWithoutVerifiedRule).toHaveLength(27)
  })

  it('regra vencida na data de referência aparece como vencida e UF pendente', () => {
    const report = buildDataReport(input({ asOf: '2027-02-01' }))

    expect(report.expiredRules.map((rule) => rule.id)).toContain(BAHIA_DEMONSTRATION_RULE.id)

    expect(report.stateCoverage.find((item) => item.state === 'BA')?.status).toBe(
      'pendente_ou_vencida',
    )
  })

  it('regra pendente aparece na lista de pendências', () => {
    const pending: RegionalTaxRule = {
      ...BAHIA_DEMONSTRATION_RULE,

      id: 'mg-pendente',

      state: 'MG',

      status: 'pendente',
    }

    const report = buildDataReport(input({ rules: [pending] }))

    expect(report.pendingRules).toEqual([{ id: 'mg-pendente', state: 'MG' }])
  })

  it('regras sem data de verificação são listadas', () => {
    const report = buildDataReport(input())

    expect(report.rulesWithoutVerification).toEqual([BAHIA_DEMONSTRATION_RULE.id])
  })

  it('lista as chaves de valores sem fonte externa, incluindo premissas e base complementar', () => {
    const keys = buildDataReport(input()).valuesWithoutExternalSource

    expect(keys).toEqual(
      expect.arrayContaining(['premissas_custo', 'base_complementar', 'ipva_demonstracao_ba']),
    )

    expect(keys).not.toContain('fipe_online')
  })

  it('é determinístico: a mesma entrada produz o mesmo relatório', () => {
    const first = buildDataReport(input())

    const second = buildDataReport(input())

    expect(second).toEqual(first)
  })
})
