/**
 * Limites de validação e parâmetros operacionais centralizados.
 * Valores monetários em BRL. Taxa de juros em % ao mês.
 */
export const INPUT_LIMITS = {
  money: { min: 0, max: 10_000_000 },
  income: { min: 1, max: 1_000_000 },
  installments: { min: 1, max: 96 },
  monthlyRatePct: { min: 0, max: 15 },
  kmPerDay: { min: 0, max: 1000 },
  daysPerWeek: { min: 1, max: 7 },
  kmPerMonth: { min: 0, max: 30_000 },
  passengers: { min: 1, max: 9 },
  yearRange: { min: 1990, max: 2035 },
  titleMaxLength: 80,
  nameMaxLength: 80,
  brandListMax: 30,
  priority: { min: 1, max: 5 },
} as const

export const WEIGHT_LIMITS = {
  /** Peso máximo por critério, em pontos percentuais. */
  maxPerCriterion: 75,
  minPerCriterion: 0,
  total: 100,
} as const

export const RECOMMENDATION_LIMITS = {
  minGroupSize: 3,
  maxGroupSize: 5,
  defaultGroupSize: 4,
  maxCompare: 3,
} as const

export const DATA_QUALITY = {
  /** Mínimo de registros para aplicar detecção estatística de outliers. */
  minRecordsForOutlierDetection: 8,
  /** Multiplicador de IQR para outliers EXTREMOS. */
  iqrMultiplier: 3,
  consumptionKmPerLiter: { min: 3, max: 40 },
  consumptionKmPerKwh: { min: 2, max: 15 },
  maintenanceAnnual: { min: 0, max: 60_000 },
  depreciationPct: { min: 0, max: 40 },
  trunkLiters: { min: 0, max: 3000 },
  seats: { min: 1, max: 9 },
  yearMin: 1990,
  /** Fração máxima do peso total que pode estar ausente antes de excluir o veículo. */
  maxMissingWeightShare: 0.3,
  /** Mínimo de veículos para considerar um grupo de recomendação completo. */
  minGroupForFullRecommendation: 3,
  /** Mínimo de veículos numa categoria para exibi-la como categoria própria. */
  minVehiclesPerCategory: 2,
} as const
