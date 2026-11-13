/**
 * Parâmetros do motor de TCO por horizonte. Premissas do projeto, não fontes oficiais.
 */
export const TCO_HORIZONS = [12, 24, 36, 48, 60] as const
export type TcoHorizon = (typeof TCO_HORIZONS)[number]

/** Horizonte usado pelo critério de custo total no ranking. */
export const DEFAULT_TCO_HORIZON: TcoHorizon = 36

export const EXTRA_COST_LABELS = {
  documentation: 'Documentação',
  transfer: 'Transferência',
  parking: 'Estacionamento',
  cleaning: 'Limpeza',
  tolls: 'Pedágios',
  options: 'Opcionais',
} as const
