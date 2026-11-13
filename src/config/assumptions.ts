import type { InsuranceCategory } from '../types/vehicle'

/**
 * Premissas de custo (todas estimativas configuráveis, NÃO oficiais).
 * O usuário pode ajustar manualmente os itens marcados como ajustáveis.
 */
export const ASSUMPTIONS_REFERENCE_MONTH = '2026-11'

export interface Assumptions {
  gasolinePricePerLiter: number
  ethanolPricePerLiter: number
  dieselPricePerLiter: number
  electricityPricePerKwh: number
  /** Etanol rende, em média, uma fração do km/l da gasolina. */
  ethanolConsumptionFactor: number
  ipvaRatePct: number
  licensingAnnualBRL: number
  insuranceRateByCategoryPct: Record<InsuranceCategory, number>
  /** Reserva para manutenção corretiva, como % da manutenção preventiva anual. */
  correctiveMaintenanceReservePct: number
  /** Anos de uso sem acréscimo de manutenção. */
  maintenanceAgeFreeYears: number
  /** Acréscimo anual (em %) sobre a manutenção para cada ano além do período livre. */
  maintenanceAgeIncreasePctPerYear: number
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  gasolinePricePerLiter: 6.2,
  ethanolPricePerLiter: 4.3,
  dieselPricePerLiter: 6.1,
  electricityPricePerKwh: 0.9,
  ethanolConsumptionFactor: 0.7,
  ipvaRatePct: 4,
  licensingAnnualBRL: 160,
  insuranceRateByCategoryPct: {
    baixo: 3.5,
    medio: 4.5,
    alto: 6,
    muito_alto: 8,
  },
  correctiveMaintenanceReservePct: 25,
  maintenanceAgeFreeYears: 3,
  maintenanceAgeIncreasePctPerYear: 4,
}

/** Subconjunto que o usuário pode ajustar manualmente na simulação. */
export type AssumptionOverrides = Partial<
  Pick<
    Assumptions,
    | 'gasolinePricePerLiter'
    | 'ethanolPricePerLiter'
    | 'dieselPricePerLiter'
    | 'electricityPricePerKwh'
    | 'ipvaRatePct'
    | 'licensingAnnualBRL'
  >
>

/** Proporção de uso urbano / rodoviário por perfil de utilização. */
export const USAGE_MIX = {
  urbano: { urban: 0.85, highway: 0.15 },
  rodoviario: { urban: 0.15, highway: 0.85 },
  misto: { urban: 0.5, highway: 0.5 },
} as const

export const WEEKS_PER_MONTH = 52 / 12

/** Limites razoáveis para os ajustes manuais de premissas. */
export const ASSUMPTION_OVERRIDE_LIMITS = {
  fuelPrice: { min: 0.1, max: 30 },
  electricityPrice: { min: 0.05, max: 10 },
  ipvaRatePct: { min: 0, max: 10 },
  licensingAnnualBRL: { min: 0, max: 5000 },
} as const

export function resolveAssumptions(overrides?: AssumptionOverrides | null): Assumptions {
  if (!overrides) return DEFAULT_ASSUMPTIONS
  const cleaned: Partial<Assumptions> = {}
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      ;(cleaned as Record<string, number>)[key] = value
    }
  }
  return { ...DEFAULT_ASSUMPTIONS, ...cleaned }
}
