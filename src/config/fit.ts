import type { VehicleCategory } from '../types/vehicle'

/** Litros de porta-malas considerados adequados para cada nível de necessidade. */
export const TRUNK_REQUIRED_LITERS = { baixa: 200, media: 300, alta: 400 } as const

/** Aderência (0-100) de cada categoria ao tipo de uso. Valores demonstrativos e explicados na metodologia. */
export const USAGE_CATEGORY_FIT: Record<
  'urbano' | 'rodoviario' | 'misto',
  Record<VehicleCategory, number>
> = {
  urbano: { hatch: 100, sedan: 85, suv: 75, minivan: 70, picape: 55 },
  rodoviario: { hatch: 70, sedan: 100, suv: 95, minivan: 85, picape: 75 },
  misto: { hatch: 90, sedan: 95, suv: 90, minivan: 80, picape: 70 },
}

/** Pontos de aderência por lugar excedente (70 com a capacidade exata, 100 com +2 lugares). */
export const SEATS_FIT = { base: 70, perExtraSeat: 15 } as const
