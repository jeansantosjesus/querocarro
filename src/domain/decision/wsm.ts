import { CRITERIA } from '../../config/criteria'
import { DATA_QUALITY } from '../../config/limits'
import type { ScenarioDefinition } from '../../config/scenarios'
import {
  CRITERION_IDS,
  type CriterionId,
  type ExclusionRecord,
  type FinancialIndicators,
  type NormalizationStat,
  type RankedVehicle,
  type VehicleCosts,
  type Weights,
} from '../../types/decision'
import type { VehicleTco } from '../../types/tco'
import type { Vehicle } from '../../types/vehicle'
import { clamp } from '../../utils/stats'
import { vehicleLabel } from '../vehicle/quality'
import { normalizeValues } from './normalize'

export interface ScoringCandidate {
  vehicle: Vehicle
  costs: VehicleCosts
  financial: FinancialIndicators
  tco: VehicleTco
  criteria: Record<CriterionId, number | null>
}

export type ScoredVehicle = Omit<RankedVehicle, 'rank' | 'pros' | 'alerts' | 'analytics'>

export interface ScoringOutput {
  scored: ScoredVehicle[]
  excluded: ExclusionRecord[]
  stats: Record<CriterionId, NormalizationStat | null>
  /** Critérios sem nenhum valor no conjunto (não aplicáveis): ficam fora do cálculo para todos. */
  inactive: CriterionId[]
}

function emptyRecord<T>(value: T): Record<CriterionId, T> {
  const record = {} as Record<CriterionId, T>
  for (const id of CRITERION_IDS) record[id] = value
  return record
}

/** Penalização de cenários conservadores para opções próximas do limite mensal efetivo. */
export function calculateProximityPenalty(
  monthlyTotal: number | null,
  effectiveMonthlyLimit: number,
  rule: ScenarioDefinition['proximityPenalty'],
): number {
  if (!rule || monthlyTotal === null || effectiveMonthlyLimit <= 0) return 0
  const ratio = monthlyTotal / effectiveMonthlyLimit
  if (ratio <= rule.startShare) return 0
  const progress = clamp((ratio - rule.startShare) / (1 - rule.startShare), 0, 1)
  return rule.maxPoints * progress
}

/**
 * Soma ponderada (Weighted Sum Model):
 *
 *   índice(v) = Σ_c  peso_efetivo_c(v)/100 × valor_normalizado_c(v)
 *
 * onde peso_efetivo é o peso do critério renormalizado entre os critérios disponíveis
 * para o veículo (soma 100). Critérios ausentes não viram zero: saem do cálculo e seu
 * peso é redistribuído proporcionalmente. Se o peso ausente exceder o limite configurado,
 * o veículo é excluído com motivo registrado.
 *
 * Determinístico: mesma entrada => mesma saída.
 */
export function scoreCandidates(
  candidates: readonly ScoringCandidate[],
  weights: Weights,
  scenario: ScenarioDefinition,
  effectiveMonthlyLimit: number,
): ScoringOutput {
  const stats = emptyRecord<NormalizationStat | null>(null)
  const normalizedByCriterion = emptyRecord<Array<number | null>>([])

  for (const criterion of CRITERIA) {
    const values = candidates.map((candidate) => candidate.criteria[criterion.id])
    const { normalized, stat } = normalizeValues(values, criterion.direction)
    normalizedByCriterion[criterion.id] = normalized
    stats[criterion.id] = stat
  }

  const inactive = CRITERION_IDS.filter((id) => stats[id] === null)
  const active = CRITERION_IDS.filter((id) => stats[id] !== null)
  const activeWeightTotal = active.reduce((sum, id) => sum + weights[id], 0)

  const scored: ScoredVehicle[] = []
  const excluded: ExclusionRecord[] = []

  candidates.forEach((candidate, position) => {
    const normalized = emptyRecord<number | null>(null)
    for (const id of CRITERION_IDS) {
      normalized[id] = normalizedByCriterion[id][position] ?? null
    }

    const available = active.filter((id) => normalized[id] !== null)
    const missing = active.filter((id) => normalized[id] === null)
    const availableWeight = available.reduce((sum, id) => sum + weights[id], 0)
    const missingWeight = missing.reduce((sum, id) => sum + weights[id], 0)

    const label = vehicleLabel(candidate.vehicle)

    if (activeWeightTotal <= 0 || availableWeight <= 0) {
      excluded.push({
        vehicleId: candidate.vehicle.id,
        label,
        stage: 'dados',
        code: 'sem_criterios_ponderados',
        message: 'Os pesos definidos não recaem sobre critérios aplicáveis a esta alternativa.',
      })
      return
    }
    if (missingWeight / activeWeightTotal > DATA_QUALITY.maxMissingWeightShare) {
      excluded.push({
        vehicleId: candidate.vehicle.id,
        label,
        stage: 'dados',
        code: 'dados_insuficientes',
        message: 'Informações insuficientes para avaliar os critérios mais importantes.',
      })
      return
    }

    const effectiveWeights = emptyRecord(0)
    const contributions = emptyRecord(0)
    let baseIndex = 0
    for (const id of available) {
      const effective = (weights[id] / availableWeight) * 100
      effectiveWeights[id] = effective
      const contribution = (effective / 100) * (normalized[id] ?? 0)
      contributions[id] = contribution
      baseIndex += contribution
    }

    const penalty = calculateProximityPenalty(
      candidate.costs.monthlyTotal,
      effectiveMonthlyLimit,
      scenario.proximityPenalty,
    )

    scored.push({
      vehicle: candidate.vehicle,
      costs: candidate.costs,
      financial: candidate.financial,
      tco: candidate.tco,
      criteria: candidate.criteria,
      normalized,
      effectiveWeights,
      contributions,
      missingCriteria: missing,
      baseIndex,
      penalty,
      index: Math.max(baseIndex - penalty, 0),
    })
  })

  return { scored, excluded, stats, inactive }
}

/** Ordena pelo índice (desc) com desempate determinístico pelo id do veículo. */
export function rankByIndex<T extends { index: number; vehicle: Vehicle }>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      b.index - a.index || (a.vehicle.id < b.vehicle.id ? -1 : a.vehicle.id > b.vehicle.id ? 1 : 0),
  )
}
