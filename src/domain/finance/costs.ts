import { USAGE_MIX, type Assumptions } from '../../config/assumptions'
import { TAX_REFERENCE_DATE } from '../../config/regionalTax'
import type { ScenarioDefinition } from '../../config/scenarios'
import type { FinanceInput, UsageInput } from '../../schemas/simulation'
import type { VehicleCosts } from '../../types/decision'
import type { BrazilianStateCode } from '../../types/regionalTax'
import type { Fuel, Vehicle } from '../../types/vehicle'
import { calculateRegionalTaxes } from './regionalTax'
import { annualToMonthly, calculateMonthlyKm } from './indicators'
import { FinanceInputError, calculateMonthlyPayment } from './loan'

/** Idade do veículo no ano de referência (nunca negativa). */
export function vehicleAge(vehicle: Vehicle, referenceYear: number): number {
  return Math.max(referenceYear - vehicle.modelYear, 0)
}

/**
 * Fator multiplicador da manutenção por idade: 1 nos primeiros anos livres e
 * cresce `maintenanceAgeIncreasePctPerYear`% ao ano depois deles.
 */
export function maintenanceAgeFactor(
  age: number,
  assumptions: Pick<Assumptions, 'maintenanceAgeFreeYears' | 'maintenanceAgeIncreasePctPerYear'>,
): number {
  const extraYears = Math.max(age - assumptions.maintenanceAgeFreeYears, 0)
  return 1 + extraYears * (assumptions.maintenanceAgeIncreasePctPerYear / 100)
}

export interface CostContext {
  finance: FinanceInput
  usage: UsageInput
  purchaseMode: 'avista' | 'financiado'
  /** Preferência de combustível do usuário (usada para escolher entre gasolina e etanol em flex). */
  fuelPreference: 'indiferente' | Fuel
  assumptions: Assumptions
  scenario: ScenarioDefinition
  /** Ano de referência para calcular a idade do veículo. */
  referenceYear: number
  /** UF de registro informada. O cálculo não escolhe uma UF sozinho. */
  registrationState: BrazilianStateCode
  condition: 'novo' | 'usado' | 'indiferente'
  /** Definido só quando a pessoa preenche a alíquota na simulação. */
  manualIpvaRatePct: number | undefined
  allowDemonstrativeTax: boolean
  taxAsOf?: string
}

export type CostResult =
  { ok: true; costs: VehicleCosts } | { ok: false; code: string; message: string }

interface EnergyChoice {
  pricePerUnit: number
  /** Fator aplicado sobre o consumo base (ex.: etanol rende menos). */
  consumptionFactor: number
  label: string
}

function chooseEnergy(
  vehicle: Vehicle,
  fuelPreference: CostContext['fuelPreference'],
  assumptions: Assumptions,
): EnergyChoice | null {
  switch (vehicle.fuel) {
    case 'flex':
      if (fuelPreference === 'etanol') {
        return {
          pricePerUnit: assumptions.ethanolPricePerLiter,
          consumptionFactor: assumptions.ethanolConsumptionFactor,
          label: 'etanol',
        }
      }
      return {
        pricePerUnit: assumptions.gasolinePricePerLiter,
        consumptionFactor: 1,
        label: 'gasolina',
      }
    case 'gasolina':
    case 'hibrido':
      return {
        pricePerUnit: assumptions.gasolinePricePerLiter,
        consumptionFactor: 1,
        label: 'gasolina',
      }
    case 'etanol':
      return {
        pricePerUnit: assumptions.ethanolPricePerLiter,
        consumptionFactor: assumptions.ethanolConsumptionFactor,
        label: 'etanol',
      }
    case 'diesel':
      return {
        pricePerUnit: assumptions.dieselPricePerLiter,
        consumptionFactor: 1,
        label: 'diesel',
      }
    case 'eletrico':
      return {
        pricePerUnit: assumptions.electricityPricePerKwh,
        consumptionFactor: 1,
        label: 'eletricidade',
      }
    default:
      return null
  }
}

/**
 * Consumo efetivo pela média harmônica ponderada (km por unidade de energia):
 *   1 / (wUrbano / consumoUrbano + wRodoviario / consumoRodoviario)
 * Se apenas um dos consumos existir, usa o disponível e registra uma nota.
 */
export function calculateEffectiveConsumption(
  urban: number | null,
  highway: number | null,
  usageType: UsageInput['type'],
): { value: number | null; note: string | null } {
  const mix = USAGE_MIX[usageType]
  const hasUrban = urban !== null && urban > 0
  const hasHighway = highway !== null && highway > 0
  if (hasUrban && hasHighway) {
    return { value: 1 / (mix.urban / urban + mix.highway / highway), note: null }
  }
  if (hasUrban) {
    return { value: urban, note: 'Consumo rodoviário não disponível: foi usado o consumo urbano.' }
  }
  if (hasHighway) {
    return {
      value: highway,
      note: 'Consumo urbano não disponível: foi usado o consumo rodoviário.',
    }
  }
  return { value: null, note: null }
}

/**
 * Calcula todos os componentes de custo de um veículo.
 * Componentes ausentes permanecem null (nunca viram zero) e impedem o total mensal.
 *
 * custo_mensal_total =
 *   parcela + ipva/12 + licenciamento/12 + seguro/12 + manutenção/12 + combustível + depreciação/12
 */
export function computeVehicleCosts(vehicle: Vehicle, context: CostContext): CostResult {
  const { finance, usage, purchaseMode, assumptions, scenario } = context
  const notes: string[] = []

  if (vehicle.priceBRL === null || !Number.isFinite(vehicle.priceBRL) || vehicle.priceBRL <= 0) {
    return {
      ok: false,
      code: 'preco_invalido',
      message: 'Preço de referência indisponível ou inválido.',
    }
  }
  const price = vehicle.priceBRL

  // Aquisição
  let downPaymentUsed: number
  let financedAmount: number
  let monthlyInstallment: number
  if (purchaseMode === 'avista') {
    downPaymentUsed = price
    financedAmount = 0
    monthlyInstallment = 0
  } else {
    downPaymentUsed = Math.min(finance.downPayment, price)
    financedAmount = price - downPaymentUsed
    try {
      monthlyInstallment = calculateMonthlyPayment(
        financedAmount,
        finance.monthlyRatePct,
        finance.installments,
      )
    } catch (error) {
      const message = error instanceof FinanceInputError ? error.message : 'Financiamento inválido.'
      return { ok: false, code: 'financiamento_invalido', message }
    }
    if (financedAmount === 0) {
      notes.push('A entrada informada cobre o valor do veículo: não há parcela estimada.')
    }
  }

  // IPVA pela UF informada. Sem regra utilizável, o valor fica ausente (não vira zero).
  const regionalTax = calculateRegionalTaxes({
    state: context.registrationState,
    priceBRL: price,
    condition: context.condition,
    fuel: vehicle.fuel,
    asOf: context.taxAsOf ?? TAX_REFERENCE_DATE,
    manualRatePct: context.manualIpvaRatePct,
    allowDemonstrativeEstimate: context.allowDemonstrativeTax,
    demonstrativeRatePct: assumptions.ipvaRatePct,
  })
  const ipvaAnnual = regionalTax.annualBRL
  for (const item of regionalTax.alerts) notes.push(item.message)
  // Licenciamento segue estimativa nacional configurável: não há regra por UF.
  const licensingAnnual = assumptions.licensingAnnualBRL

  // Seguro
  let insuranceAnnual: number | null = null
  if (vehicle.insuranceCategory !== null) {
    const rate = assumptions.insuranceRateByCategoryPct[vehicle.insuranceCategory]
    insuranceAnnual = (price * rate * scenario.multipliers.insurance) / 100
  } else {
    notes.push('Categoria de seguro: informação não disponível.')
  } // Manutenção (preventiva + reserva corretiva, com acréscimo por idade)
  let maintenanceAnnual: number | null = null
  if (vehicle.maintenanceAnnualBRL !== null && vehicle.maintenanceAnnualBRL >= 0) {
    const age = vehicleAge(vehicle, context.referenceYear)
    maintenanceAnnual =
      vehicle.maintenanceAnnualBRL *
      (1 + assumptions.correctiveMaintenanceReservePct / 100) *
      maintenanceAgeFactor(age, assumptions) *
      scenario.multipliers.maintenance
  } else {
    notes.push('Manutenção: informação não disponível.')
  }

  // Energia
  const monthlyKm = calculateMonthlyKm(usage)
  const energy = chooseEnergy(vehicle, context.fuelPreference, assumptions)
  const consumption = calculateEffectiveConsumption(
    vehicle.urbanConsumption,
    vehicle.highwayConsumption,
    usage.type,
  )
  if (consumption.note) notes.push(consumption.note)

  let energyCostPerKm: number | null = null
  let energyMonthly: number | null = null
  let effectiveConsumption: number | null = null
  if (energy && consumption.value !== null) {
    effectiveConsumption = consumption.value * energy.consumptionFactor
    energyCostPerKm = (energy.pricePerUnit / effectiveConsumption) * scenario.multipliers.energy
    energyMonthly = energyCostPerKm * monthlyKm
  } else {
    notes.push('Consumo: informação não disponível.')
  }

  // Depreciação
  let depreciationAnnual: number | null = null
  if (vehicle.depreciationAnnualPct !== null && vehicle.depreciationAnnualPct >= 0) {
    depreciationAnnual = (price * vehicle.depreciationAnnualPct) / 100
  } else {
    notes.push('Depreciação: informação não disponível.')
  }

  // Totais (nulos se faltar qualquer componente)
  let monthlyTotal: number | null = null
  let monthlyCash: number | null = null
  let annualTotal: number | null = null
  if (
    ipvaAnnual !== null &&
    insuranceAnnual !== null &&
    maintenanceAnnual !== null &&
    energyMonthly !== null &&
    depreciationAnnual !== null
  ) {
    monthlyCash =
      monthlyInstallment +
      annualToMonthly(ipvaAnnual) +
      annualToMonthly(licensingAnnual) +
      annualToMonthly(insuranceAnnual) +
      annualToMonthly(maintenanceAnnual) +
      energyMonthly
    monthlyTotal = monthlyCash + annualToMonthly(depreciationAnnual)
    annualTotal = monthlyTotal * 12
  }

  return {
    ok: true,
    costs: {
      priceBRL: price,
      downPaymentUsed,
      financedAmount,
      monthlyInstallment,
      ipvaAnnual,
      licensingAnnual,
      regionalTax,
      insuranceAnnual,
      maintenanceAnnual,
      energyMonthly,
      energyCostPerKm,
      depreciationAnnual,
      monthlyTotal,
      monthlyCash,
      annualTotal,
      effectiveConsumption,
      monthlyKm,
      usedFuelLabel: energy?.label ?? 'não disponível',
      notes,
    },
  }
}
