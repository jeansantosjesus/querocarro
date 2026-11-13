import { CRITERIA_BY_ID } from '../../config/criteria'
import {
  CRITERION_IDS,
  type CriterionId,
  type ExplanationItem,
  type FinancialIndicators,
} from '../../types/decision'
import type { Vehicle } from '../../types/vehicle'
import { formatBRL, formatDate, formatNumber, formatPercent } from '../../utils/format'
import { PRESSURE_LABELS } from '../analytics/classify'
import type { ScoredVehicle } from './wsm'

/** Critério precisa ter peso efetivo mínimo (pp) para gerar ponto favorável ou alerta. */
const MIN_RELEVANT_WEIGHT = 8
const FAVORABLE_THRESHOLD = 70
const ATTENTION_THRESHOLD = 30

const FAVORABLE_TEXT: Record<CriterionId, (item: ScoredVehicle) => string> = {
  tco: (item) =>
    `Custo total no horizonte de ${item.tco.criterionHorizonMonths} meses entre os menores do grupo (${formatBRL(item.tco.criterionValue)}).`,
  incomeCommitment: (item) =>
    `Situação financeira entre as melhores do grupo (${formatNumber(item.financial.financialScore, 0)} pontos).`,
  usageFit: () => 'Boa aderência ao tipo de uso, passageiros e porta-malas informados.',
  preference: () => 'Atende bem às preferências informadas.',
}

const ATTENTION_TEXT: Record<CriterionId, (item: ScoredVehicle) => string> = {
  tco: () => 'Custo total no horizonte acima do de boa parte das opções avaliadas.',
  incomeCommitment: () =>
    'Situação financeira mais apertada que a de boa parte das opções avaliadas.',
  usageFit: () => 'Aderência ao tipo de uso menor que a de outras opções.',
  preference: () => 'Atende parcialmente às preferências informadas.',
}
/** Pontos favoráveis e alertas, derivados deterministicamente dos valores normalizados. */
export function explainVehicle(item: ScoredVehicle): {
  pros: ExplanationItem[]
  alerts: ExplanationItem[]
} {
  const favorable = CRITERION_IDS.filter((id) => {
    const value = item.normalized[id]
    return (
      value !== null &&
      value >= FAVORABLE_THRESHOLD &&
      item.effectiveWeights[id] >= MIN_RELEVANT_WEIGHT
    )
  }).sort((a, b) => item.contributions[b] - item.contributions[a] || a.localeCompare(b))

  const attention = CRITERION_IDS.filter((id) => {
    const value = item.normalized[id]
    return (
      value !== null &&
      value <= ATTENTION_THRESHOLD &&
      item.effectiveWeights[id] >= MIN_RELEVANT_WEIGHT
    )
  }).sort((a, b) => item.effectiveWeights[b] - item.effectiveWeights[a] || a.localeCompare(b))

  const pros: ExplanationItem[] = favorable.slice(0, 3).map((id) => ({
    code: `favoravel_${id}`,
    text: FAVORABLE_TEXT[id](item),
    severity: 'favoravel',
  }))

  const alerts: ExplanationItem[] = attention.slice(0, 3).map((id) => ({
    code: `atencao_${id}`,
    text: ATTENTION_TEXT[id](item),
    severity: 'atencao',
  }))

  const pressure = item.financial.pressureLevel
  if (pressure === 'elevada' || pressure === 'critica') {
    alerts.unshift({
      code: 'pressao_financeira',
      text: `Pressão financeira estimada: ${PRESSURE_LABELS[pressure].toLowerCase()} (${formatPercent(item.financial.commitmentRatio)} da renda líquida).`,
      severity: 'atencao',
    })
  }
  const limitUsage = item.financial.limitUsageRatio
  if (limitUsage !== null && limitUsage >= 0.9) {
    alerts.push({
      code: 'proximo_limite',
      text: 'Custo mensal estimado próximo do limite definido nesta simulação.',
      severity: 'atencao',
    })
  }
  if (item.penalty > 0) {
    alerts.push({
      code: 'penalidade_cenario',
      text: `O cenário reduziu o índice em ${formatNumber(item.penalty)} pontos por proximidade do limite mensal.`,
      severity: 'atencao',
    })
  }
  if (item.missingCriteria.length > 0) {
    const names = item.missingCriteria
      .map((id) => CRITERIA_BY_ID[id].label.toLowerCase())
      .join(', ')
    alerts.push({
      code: 'dados_ausentes',
      text: `Informação não disponível para: ${names}. O peso foi redistribuído entre os demais critérios.`,
      severity: 'atencao',
    })
  }
  for (const note of item.costs.notes) {
    alerts.push({ code: 'nota_custos', text: note, severity: 'informativo' })
  }
  if (item.vehicle.priceSource === 'fipe_referencia_salva') {
    alerts.push({
      code: 'preco_referencia_salva',
      text: 'Preço baseado em referência FIPE salva, e não em consulta online.',
      severity: 'informativo',
    })
  }

  return { pros, alerts }
}

/** Frase única que resume o índice, para leitores de tela e relatórios. */
export function summarizeIndex(item: { index: number }): string {
  return `Aderência ao cenário: ${formatNumber(item.index, 0)} de 100`
}

export function describeFinancialStatus(financial: FinancialIndicators): string {
  if (financial.commitmentRatio === null || financial.pressureLevel === null) {
    return 'Comprometimento da renda não disponível.'
  }
  return `Pressão financeira ${PRESSURE_LABELS[financial.pressureLevel].toLowerCase()}: ${formatPercent(financial.commitmentRatio)} da renda líquida`
}

export function describeSource(vehicle: Vehicle): string {
  const origin =
    vehicle.priceSource === 'fipe_online' ? 'consulta FIPE online' : 'referência FIPE salva'
  return `${origin} (mês de referência ${vehicle.referenceMonthLabel ?? 'não disponível'})`
}

export function formatSavedDate(iso: string | null): string {
  return iso ? formatDate(iso) : 'data não disponível'
}
