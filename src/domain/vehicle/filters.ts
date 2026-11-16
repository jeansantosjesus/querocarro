import type { SimulationInput } from '../../schemas/simulation'

import type { Vehicle } from '../../types/vehicle'

import { normalizeText } from '../../utils/text'

export interface FilterRejection {
  code: string

  message: string
}

/**

* "Novo" = ano-modelo igual ou posterior a (ano de referência - 1).

* Regra simples e documentada: a FIPE não informa quilometragem.

*/

export function isRecentVehicle(vehicle: Vehicle, referenceYear: number): boolean {
  return vehicle.modelYear >= referenceYear - 1
}

export function brandMatches(brand: string, list: readonly string[]): boolean {
  const target = normalizeText(brand)

  return list.some((item) => normalizeText(item) === target)
}

/**

* Filtros eliminatórios definidos pelo usuário. Retorna null quando o veículo passa.

* Se um atributo necessário ao filtro não existe ("Informação não disponível"),

* o veículo não pode ser confirmado e é excluído com motivo explícito.

*/

export function applyHardFilters(
  vehicle: Vehicle,

  input: Pick<SimulationInput, 'objective' | 'preferences' | 'usage'>,

  referenceYear: number,
): FilterRejection | null {
  const { objective, preferences, usage } = input

  if (brandMatches(vehicle.brand, preferences.avoidedBrands)) {
    return { code: 'marca_nao_desejada', message: 'Marca indicada como não desejada.' }
  }

  if (preferences.yearMin !== null && vehicle.modelYear < preferences.yearMin) {
    return { code: 'ano_abaixo_faixa', message: 'Ano-modelo abaixo da faixa aceitável.' }
  }

  if (preferences.yearMax !== null && vehicle.modelYear > preferences.yearMax) {
    return { code: 'ano_acima_faixa', message: 'Ano-modelo acima da faixa aceitável.' }
  }

  if (vehicle.seats === null) {
    return {
      code: 'passageiros_indisponivel',

      message: 'Quantidade de passageiros não disponível para confirmar a necessidade informada.',
    }
  }

  if (vehicle.seats < usage.passengers) {
    return {
      code: 'passageiros_insuficientes',

      message: 'Capacidade de passageiros menor que a necessária.',
    }
  }

  if (
    objective.maxPurchasePrice !== null &&
    vehicle.priceBRL !== null &&
    vehicle.priceBRL > objective.maxPurchasePrice
  ) {
    return {
      code: 'acima_faixa_preco',

      message: 'Preço de referência acima da faixa de preço definida.',
    }
  }

  if (preferences.requireCondition && objective.condition !== 'indiferente') {
    const recent = isRecentVehicle(vehicle, referenceYear)

    if ((objective.condition === 'novo') !== recent) {
      return {
        code: 'condicao_diferente',

        message:
          objective.condition === 'novo' ? 'Não é um modelo recente.' : 'É um modelo recente.',
      }
    }
  }

  if (preferences.requireFuel && preferences.fuel !== 'indiferente') {
    if (vehicle.fuel === null) {
      return {
        code: 'combustivel_indisponivel',

        message: 'Combustível não disponível para o filtro.',
      }
    }

    const compatible =
      vehicle.fuel === preferences.fuel ||
      (vehicle.fuel === 'flex' &&
        (preferences.fuel === 'gasolina' || preferences.fuel === 'etanol'))

    if (!compatible) {
      return { code: 'combustivel_diferente', message: 'Combustível diferente do exigido.' }
    }
  }

  if (preferences.requireTransmission && preferences.transmission !== 'indiferente') {
    if (vehicle.transmission === null) {
      return { code: 'cambio_indisponivel', message: 'Câmbio não disponível para o filtro.' }
    }

    if (vehicle.transmission !== preferences.transmission) {
      return { code: 'cambio_diferente', message: 'Câmbio diferente do exigido.' }
    }
  }

  return null
}
