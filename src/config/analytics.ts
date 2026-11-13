/**
 * Parâmetros das análises complementares. Nenhum deles altera o índice multicritério.
 * Todos são premissas configuráveis do projeto: as fontes consultadas não definem esses limites.
 */

/** Limite inferior (inclusivo) de cada faixa de aderência, sobre a nota de uso 0-100. */
export const ADHERENCE_THRESHOLDS = {
  muitoAlta: 85,
  alta: 70,
  moderada: 50,
  baixa: 30,
} as const

/** Fração da renda líquida comprometida (limite superior inclusivo de cada faixa). */
export const PRESSURE_THRESHOLDS = {
  baixa: 0.2,
  moderada: 0.3,
  elevada: 0.4,
} as const

export const CLUSTERING = {
  kMin: 2,
  kMax: 4,
  /** Tamanho mínimo de cada grupo do K-Means; abaixo disso o k é descartado. */
  minPerCluster: 5,
  /** Silhueta média mínima para aceitar o K-Means; abaixo disso usa faixas de TCO. */
  minSilhouette: 0.25,
  maxIterations: 100,
  /** Mínimo de veículos para formar as faixas de TCO (tercis). */
  minForBands: 3,
  /** Diferença relativa até a qual um valor é descrito como "próximo da mediana". */
  nearMedianTolerance: 0.05,
} as const
