import type { CriterionDirection, CriterionId } from '../types/decision'

export interface CriterionMeta {
  id: CriterionId
  label: string
  direction: CriterionDirection
  unit: string
  description: string
}

/**
 * Critérios do modelo multicritério (Weighted Sum Model).
 * - custo: quanto MENOR, melhor
 * - benefício: quanto MAIOR, melhor
 * A renda NÃO é critério: ela só gera indicadores derivados (ex.: comprometimento).
 */
export const CRITERIA: readonly CriterionMeta[] = [
  {
    id: 'tco',
    label: 'Custo total no horizonte (TCO)',
    direction: 'cost',
    unit: 'R$ no horizonte',
    description:
      'Preço menos valor residual, mais juros, IPVA, licenciamento, seguro, energia e manutenção no horizonte padrão de 36 meses. Inclui os custos de preço, consumo, manutenção e depreciação, que não são critérios separados.',
  },
  {
    id: 'incomeCommitment',
    label: 'Situação financeira',
    direction: 'benefit',
    unit: 'pontos (0-100)',
    description:
      'Score de orçamento, renda disponível, preço frente à capacidade, folga e reserva. Satura em 100 quando o custo fica em até 50% do referencial: renda maior não aumenta mais a nota. O comprometimento da renda continua visível como indicador, e não é um critério separado do TCO.',
  },
  {
    id: 'usageFit',
    label: 'Aderência ao tipo de uso',
    direction: 'benefit',
    unit: 'pontos (0-100)',
    description:
      'Adequação a passageiros, porta-malas, tipo de uso (urbano/rodoviário) e categoria do veículo.',
  },
  {
    id: 'preference',
    label: 'Preferências do usuário',
    direction: 'benefit',
    unit: 'pontos (0-100)',
    description: 'Atendimento a marcas desejadas, combustível, câmbio, faixa de ano e condição.',
  },
] as const

export const CRITERIA_BY_ID: Record<CriterionId, CriterionMeta> = Object.fromEntries(
  CRITERIA.map((criterion) => [criterion.id, criterion]),
) as Record<CriterionId, CriterionMeta>
