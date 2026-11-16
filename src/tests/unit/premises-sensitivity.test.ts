import { describe, expect, it } from 'vitest'

import {
  ASSUMPTIONS_REFERENCE_MONTH,
  DEFAULT_ASSUMPTIONS,
  resolveAssumptions,
} from '../../config/assumptions'

import { buildSimulationDraft } from '../../features/history/buildDraft'

import { buildPremises, referenceYearOf } from '../../domain/decision/premises'

import { runDecision } from '../../domain/decision/pipeline'

import {
  rankSensitivityEffects,
  vehicleSensitivity,
  type SensitivityContext,
} from '../../domain/decision/sensitivity'

import { scenarioSnapshotSchema, savedPremisesSchema } from '../../schemas/history'

import type { VehicleCatalog } from '../../types/vehicle'

import { REFERENCE_YEAR, loadCatalogVehicles, makeInput } from '../fixtures/factories'

const CATALOG_MONTH = '2026-11'

function contextFor(input: ReturnType<typeof makeInput>): SensitivityContext {
  return {
    purchaseMode: input.objective.purchaseMode,

    finance: input.finance,

    usage: input.usage,

    assumptions: resolveAssumptions(input.assumptionOverrides),

    referenceYear: REFERENCE_YEAR,
  }
}

function decide(input: ReturnType<typeof makeInput>) {
  return runDecision(input, loadCatalogVehicles(), { referenceYear: REFERENCE_YEAR })
}

describe('premissas gravadas com a simulação', () => {
  it('o ano de referência vem do mês FIPE; sem mês válido usa o ano informado', () => {
    expect(referenceYearOf(CATALOG_MONTH)).toBe(2026)

    expect(referenceYearOf(null, 2025)).toBe(2025)

    expect(referenceYearOf('', 2025)).toBe(2025)
  })

  it('sem ajustes, grava o conjunto padrão completo', () => {
    const premises = buildPremises(makeInput(), REFERENCE_YEAR)

    expect(premises.assumptions).toEqual(DEFAULT_ASSUMPTIONS)

    expect(premises.assumptionsReferenceMonth).toBe(ASSUMPTIONS_REFERENCE_MONTH)

    expect(premises.referenceYear).toBe(REFERENCE_YEAR)
  })

  it('um ajuste da pessoa aparece nas premissas e os demais padrões são mantidos', () => {
    const input = makeInput({ assumptionOverrides: { ipvaRatePct: 5 } })

    const premises = buildPremises(input, REFERENCE_YEAR)

    expect(premises.assumptions.ipvaRatePct).toBe(5)

    expect(premises.assumptions.maintenanceAgeFreeYears).toBe(
      DEFAULT_ASSUMPTIONS.maintenanceAgeFreeYears,
    )
  })

  it('o rascunho salvo traz as premissas no snapshot do cenário', () => {
    const input = makeInput()

    const result = decide(input)

    const catalog = {
      vehicles: loadCatalogVehicles(),

      referenceMonth: CATALOG_MONTH,

      referenceMonthLabel: 'novembro de 2026',

      version: 'test-catalog',
    } as VehicleCatalog

    const draft = buildSimulationDraft(input, result, catalog)

    expect(draft.scenarioSnapshot.premises).toEqual(buildPremises(input, REFERENCE_YEAR))
  })

  it('registros antigos sem premissas continuam válidos; premissas malformadas são recusadas', () => {
    const input = makeInput()

    const result = decide(input)

    const catalog = {
      vehicles: loadCatalogVehicles(),

      referenceMonth: CATALOG_MONTH,

      referenceMonthLabel: 'novembro de 2026',

      version: 'test-catalog',
    } as VehicleCatalog

    const snapshot = buildSimulationDraft(input, result, catalog).scenarioSnapshot

    const { premises: _omitted, ...legacy } = snapshot

    expect(scenarioSnapshotSchema.safeParse(legacy).success).toBe(true)

    expect(scenarioSnapshotSchema.safeParse(snapshot).success).toBe(true)

    const negativeIpva = {
      ...snapshot,

      premises: {
        ...snapshot.premises!,

        assumptions: { ...snapshot.premises!.assumptions, ipvaRatePct: -1 },
      },
    }

    expect(scenarioSnapshotSchema.safeParse(negativeIpva).success).toBe(false)

    expect(
      savedPremisesSchema.safeParse({ ...snapshot.premises!, referenceYear: 1900 }).success,
    ).toBe(false)
  })
})

describe('sensibilidade do custo total (motor de TCO)', () => {
  it('o caso base reproduz o TCO já mostrado no ranking, para todos os veículos', () => {
    const input = makeInput()

    const result = decide(input)

    const context = contextFor(input)

    expect(result.ranking.length).toBeGreaterThan(0)

    for (const item of result.ranking) {
      const base = vehicleSensitivity(item, context)[0]!

      expect(base.driver).toBeNull()

      expect(base.result.economic.total).toBe(item.tco.byHorizon[36].price.economic.total)
    }
  })

  it('manutenção, seguro e energia variam de forma linear: +20% soma 20% do próprio componente', () => {
    const input = makeInput()

    const result = decide(input)

    const context = contextFor(input)

    const item = result.ranking.find(
      (ranked) =>
        ranked.tco.byHorizon[36].price.economic.maintenance !== null &&
        ranked.tco.byHorizon[36].price.economic.insurance !== null &&
        ranked.tco.byHorizon[36].price.economic.energy !== null,
    )

    expect(item).toBeDefined()

    const cases = vehicleSensitivity(item!, context)

    const econ = item!.tco.byHorizon[36].price.economic

    const base = cases[0]!.result.economic.total!

    const delta = (label: string) =>
      cases.find((c) => c.label === label)!.result.economic.total! - base

    expect(delta('Manutenção +20%')).toBeCloseTo(0.2 * econ.maintenance!, 6)

    expect(delta('Seguro +20%')).toBeCloseTo(0.2 * econ.insurance!, 6)

    expect(delta('Combustível/energia +20%')).toBeCloseTo(0.2 * econ.energy!, 6)

    expect(delta('Manutenção −20%')).toBeCloseTo(-0.2 * econ.maintenance!, 6)
  })

  it('na compra à vista, entrada, taxa e prazo não alteram o custo', () => {
    const input = makeInput({
      objective: { purchaseMode: 'avista' },

      finance: { downPayment: 300000, accumulatedReserve: 400000 },
    })

    const result = decide(input)

    expect(result.ranking.length).toBeGreaterThan(0)

    const item = result.ranking[0]!

    const cases = vehicleSensitivity(item, contextFor(input))

    const base = cases[0]!.result.economic.total!

    for (const label of [
      'Entrada −20%',

      'Entrada +20%',

      'Taxa −1 p.p. ao mês',

      'Taxa +1 p.p. ao mês',

      'Prazo −12 parcelas',

      'Prazo +12 parcelas',
    ]) {
      expect(cases.find((c) => c.label === label)!.result.economic.total).toBeCloseTo(base, 6)
    }
  })

  it('o ranking de efeitos exclui o caso base e ordena do maior para o menor efeito absoluto', () => {
    const input = makeInput()

    const result = decide(input)

    const cases = vehicleSensitivity(result.ranking[0]!, contextFor(input))

    const effects = rankSensitivityEffects(cases)

    expect(effects).toHaveLength(cases.length - 1)

    expect(effects.map((effect) => effect.label)).not.toContain('Caso base')

    for (let i = 1; i < effects.length; i += 1) {
      expect(Math.abs(effects[i - 1]!.delta ?? 0)).toBeGreaterThanOrEqual(
        Math.abs(effects[i]!.delta ?? 0),
      )
    }
  })
})
