/**
 * Composição do score financeiro e faixas de conforto.
 * São premissas do QC, não uma regra universal de orçamento.
 * A soma dos pesos internos é 100. O TCO continua sendo outro critério.
 */
export const FINANCIAL_SCORE_WEIGHTS = {
  /** Utilização do orçamento mensal do veículo. */
  utilization: 35,
  /** Custo mensal dividido pela renda disponível. */
  availableCommitment: 25,
  /** Preço dividido pela capacidade de aquisição. */
  priceCapacity: 20,
  /** Renda disponível que sobra depois do veículo. */
  margin: 10,
  /** A entrada não consome a reserva protegida. */
  reserve: 10,
} as const

/**
 * Frações do orçamento (ou de outra relação 0–1) em que o benefício satura.
 * Até `fullComfortShare` a nota fica em 100: renda extra não aumenta mais o score.
 * Daí até 100% a nota cai em linha reta até 0. Acima de 100% a opção é incompatível.
 */
export const COMFORT_BANDS = {
  fullComfortShare: 0.5,
  highShare: 0.75,
  attentionShare: 0.9,
  limitShare: 1,
} as const

export const RESERVE_MONTH_LIMITS = { min: 0, max: 36 } as const

/** Tolerância informada pela pessoa, em % da renda disponível. Null usa a premissa do cenário. */
export const VEHICLE_SHARE_LIMITS = { min: 5, max: 80 } as const
