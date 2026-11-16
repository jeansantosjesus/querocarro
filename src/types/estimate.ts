import type { ValueOrigin } from './vehicle'

export type Periodicity = 'mensal' | 'anual' | 'unico' | 'por_km'

export type Reliability = 'alta' | 'media' | 'baixa'

/** Metadados exigidos para todo valor estimado exibido ao usuário. */

export interface EstimateMeta {
  label: string

  origin: ValueOrigin

  assumption: string

  periodicity: Periodicity

  /** Data ou mês de referência (YYYY-MM ou YYYY-MM-DD). */

  reference: string

  reliability: Reliability

  adjustable: boolean
}
