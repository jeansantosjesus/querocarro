import type { RankedVehicle } from '../../types/decision'
import { compareText } from '../../utils/text'

export const SORT_OPTIONS = [
  { key: 'alfabetica', label: 'Ordem alfabética' },
  { key: 'menor_preco', label: 'Menor preço' },
  { key: 'menor_custo_mensal', label: 'Menor custo mensal estimado' },
  { key: 'menor_consumo', label: 'Menor consumo (custo de energia por km)' },
  { key: 'menor_manutencao', label: 'Menor custo de manutenção' },
  { key: 'menor_depreciacao', label: 'Menor depreciação estimada' },
  { key: 'maior_compatibilidade', label: 'Maior compatibilidade' },
  { key: 'ano', label: 'Ano do veículo (mais recente primeiro)' },
] as const

export type SortKey = (typeof SORT_OPTIONS)[number]['key']

function nameOf(item: RankedVehicle): string {
  return `${item.vehicle.brand} ${item.vehicle.model}`
}

/** Valores ausentes (null) vão sempre para o fim; desempate alfabético e depois por id. */
function compareNullable(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return (a - b) * direction
}

/**
 * Ordenação escolhida pelo usuário. Função pura: devolve uma nova lista.
 * A apresentação inicial NÃO precisa seguir o índice de compatibilidade.
 */
export function sortRecommendations(
  items: readonly RankedVehicle[],
  key: SortKey,
): RankedVehicle[] {
  const primary = (a: RankedVehicle, b: RankedVehicle): number => {
    switch (key) {
      case 'alfabetica':
        return compareText(nameOf(a), nameOf(b))
      case 'menor_preco':
        return compareNullable(a.costs.priceBRL, b.costs.priceBRL, 1)
      case 'menor_custo_mensal':
        return compareNullable(a.costs.monthlyTotal, b.costs.monthlyTotal, 1)
      case 'menor_consumo':
        return compareNullable(a.costs.energyCostPerKm, b.costs.energyCostPerKm, 1)
      case 'menor_manutencao':
        return compareNullable(a.costs.maintenanceAnnual, b.costs.maintenanceAnnual, 1)
      case 'menor_depreciacao':
        return compareNullable(a.costs.depreciationAnnual, b.costs.depreciationAnnual, 1)
      case 'maior_compatibilidade':
        return compareNullable(a.index, b.index, -1)
      case 'ano':
        return compareNullable(a.vehicle.modelYear, b.vehicle.modelYear, -1)
    }
  }
  return [...items].sort(
    (a, b) =>
      primary(a, b) || compareText(nameOf(a), nameOf(b)) || compareText(a.vehicle.id, b.vehicle.id),
  )
}
