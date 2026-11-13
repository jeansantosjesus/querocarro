import { ADHERENCE_THRESHOLDS, PRESSURE_THRESHOLDS } from '../../config/analytics'
import type { AdherenceLevel, PressureLevel } from '../../types/analytics'

/** Faixa de aderência ao uso a partir da nota 0-100. Sem nota, retorna null (nunca "incompatível"). */
export function classifyAdherence(usageFit: number | null): AdherenceLevel | null {
  if (usageFit === null || !Number.isFinite(usageFit)) return null
  if (usageFit >= ADHERENCE_THRESHOLDS.muitoAlta) return 'muito_alta'
  if (usageFit >= ADHERENCE_THRESHOLDS.alta) return 'alta'
  if (usageFit >= ADHERENCE_THRESHOLDS.moderada) return 'moderada'
  if (usageFit >= ADHERENCE_THRESHOLDS.baixa) return 'baixa'
  return 'incompativel'
}

/** Pressão financeira estimada, por faixa de comprometimento da renda líquida. */
export function classifyPressure(commitmentRatio: number | null): PressureLevel | null {
  if (commitmentRatio === null || !Number.isFinite(commitmentRatio)) return null
  if (commitmentRatio <= PRESSURE_THRESHOLDS.baixa) return 'baixa'
  if (commitmentRatio <= PRESSURE_THRESHOLDS.moderada) return 'moderada'
  if (commitmentRatio <= PRESSURE_THRESHOLDS.elevada) return 'elevada'
  return 'critica'
}

export const ADHERENCE_LABELS: Record<AdherenceLevel, string> = {
  muito_alta: 'Muito alta',
  alta: 'Alta',
  moderada: 'Moderada',
  baixa: 'Baixa',
  incompativel: 'Incompatível',
}

export const PRESSURE_LABELS: Record<PressureLevel, string> = {
  baixa: 'Baixa',
  moderada: 'Moderada',
  elevada: 'Elevada',
  critica: 'Crítica',
}
