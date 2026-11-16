import { z } from 'zod'

import {
  migrateLegacyWeights,
  SCENARIO_IDS,
  simulationInputSchema,
  weightsSchema,
} from './simulation'

/**

* Validação do que volta do banco. Nada vindo do Supabase é confiado sem verificação:

* `inputs` é revalidado com o mesmo esquema do formulário e o `payload` dos resultados

* precisa ter, no mínimo, a estrutura usada pela interface.

*/

const rate = z.number().finite().min(0).max(1000)

const assumptionsSnapshotSchema = z.object({
  gasolinePricePerLiter: z.number().finite().min(0).max(100),

  ethanolPricePerLiter: z.number().finite().min(0).max(100),

  dieselPricePerLiter: z.number().finite().min(0).max(100),

  electricityPricePerKwh: z.number().finite().min(0).max(100),

  ethanolConsumptionFactor: z.number().finite().min(0).max(2),

  ipvaRatePct: z.number().finite().min(0).max(100),

  licensingAnnualBRL: z.number().finite().min(0).max(100000),

  insuranceRateByCategoryPct: z.object({
    baixo: rate,

    medio: rate,

    alto: rate,

    muito_alto: rate,
  }),

  correctiveMaintenanceReservePct: rate,

  maintenanceAgeFreeYears: z.number().finite().min(0).max(100),

  maintenanceAgeIncreasePctPerYear: rate,
})

export const savedPremisesSchema = z.object({
  assumptionsReferenceMonth: z.string().min(1).max(10),

  referenceYear: z.number().int().min(2000).max(2100),

  assumptions: assumptionsSnapshotSchema,
})

export const scenarioSnapshotSchema = z.object({
  scenarioId: z.enum(SCENARIO_IDS),

  modelVersion: z.string().min(1).max(40),

  multipliers: z.object({
    insurance: z.number().min(0).max(5),

    maintenance: z.number().min(0).max(5),

    energy: z.number().min(0).max(5),
  }),

  monthlyLimitShare: z.number().min(0).max(1.5),

  maxIncomeCommitment: z.number().min(0).max(1),

  /** Opcional: simulações antigas não têm premissas registradas. */

  premises: savedPremisesSchema.optional(),
})

const rankedPayloadSchema = z.looseObject({
  vehicle: z.looseObject({
    id: z.string().min(1),

    fipeCode: z.string(),

    brand: z.string(),

    model: z.string(),

    modelYear: z.number(),
  }),

  costs: z.looseObject({ priceBRL: z.number() }),

  financial: z.looseObject({}),

  criteria: z.looseObject({}),

  normalized: z.looseObject({}),

  effectiveWeights: z.looseObject({}),

  contributions: z.looseObject({}),

  index: z.number(),

  rank: z.number(),

  pros: z.array(z.looseObject({ text: z.string() })),

  alerts: z.array(z.looseObject({ text: z.string() })),
})

export const savedResultRowSchema = z.object({
  vehicle_fipe_code: z.string(),

  vehicle_year_id: z.string(),

  compatibility_index: z.coerce.number(),

  in_recommended_group: z.boolean(),

  rank: z.number().int(),

  payload: rankedPayloadSchema,
})

/**

* Converte, antes da validação, os pesos de simulações salvas com os critérios antigos.

* Não altera linhas já no formato atual.

*/

/**

* Simulações antigas não tinham reserva acumulada. A migração usa entrada + reserva a preservar

* como saldo, para a entrada já informada continuar utilizável. Não inventa alíquota nem renda.

*/

function migrateFinance(finance: unknown): unknown {
  if (typeof finance !== 'object' || finance === null) return finance

  const row = finance as Record<string, unknown>

  const down = typeof row.downPayment === 'number' ? row.downPayment : 0

  const reserve = typeof row.reserve === 'number' ? row.reserve : 0

  return {
    otherRecurringExpenses: 0,

    monthlyReserve: 0,

    reserveMonths: 0,

    safetyMarginMonthly: 0,

    limitMode: 'informado',

    vehicleSharePct: null,

    useFullDownPayment: false,

    accumulatedReserve: down + reserve,

    ...row,
  }
}

export function migrateStoredSimulationRow(row: unknown): unknown {
  if (typeof row !== 'object' || row === null) return row

  const record = row as Record<string, unknown>

  const inputs = record.inputs

  const inputRecord =
    typeof inputs === 'object' && inputs !== null ? (inputs as Record<string, unknown>) : null

  return {
    ...record,

    weights: migrateLegacyWeights(record.weights),

    inputs: inputRecord
      ? {
          ...inputRecord,

          weights: migrateLegacyWeights(inputRecord.weights),

          finance: migrateFinance(inputRecord.finance),
        }
      : inputs,
  }
}

export const simulationRowSchema = z.object({
  id: z.string().min(1),

  title: z.string(),

  scenario_id: z.enum(SCENARIO_IDS),

  inputs: simulationInputSchema,

  weights: weightsSchema,

  scenario_snapshot: scenarioSnapshotSchema,

  fipe_reference_month: z.string().nullable(),

  fipe_reference_month_label: z.string().nullable(),

  catalog_version: z.string(),

  created_at: z.string(),
})

export const simulationSummaryRowSchema = z.object({
  id: z.string().min(1),

  title: z.string(),

  scenario_id: z.enum(SCENARIO_IDS),

  created_at: z.string(),

  fipe_reference_month: z.string().nullable(),

  fipe_reference_month_label: z.string().nullable(),

  simulation_results: z.array(z.object({ count: z.number() })).optional(),
})

export const profileRowSchema = z.object({
  id: z.string(),

  display_name: z.string(),

  privacy_accepted_at: z.string().nullable(),
})

export const preferencesRowSchema = z.object({
  persist_history_consent: z.boolean(),

  default_scenario: z.enum(SCENARIO_IDS).nullable(),
})
