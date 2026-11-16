import { initialWeights } from '../../domain/decision/scenarios'

import type { SimulationInput } from '../../schemas/simulation'

import type { DeepPartial } from '../../types/utils'

export type SimulationDraftInput = DeepPartial<SimulationInput>

const NEUTRAL_PRIORITIES = { economia: 3, conforto: 3, desempenho: 3, manutencao: 3 }

/**

* Rascunho inicial. Campos financeiros pessoais ficam VAZIOS de propósito:

* o QC não assume renda, despesas nem entrada do usuário.

*/

export function createBlankDraft(): SimulationDraftInput {
  return {
    objective: {
      title: '',

      scenarioId: 'equilibrado',

      customMarginMultiplier: 1,

      purchaseMode: 'financiado',

      condition: 'indiferente',

      maxPurchasePrice: null,
    },

    finance: {
      otherRecurringExpenses: 0,

      otherDebts: 0,

      monthlyReserve: 0,

      reserve: 0,

      accumulatedReserve: 0,

      reserveMonths: 0,

      safetyMarginMonthly: 0,

      limitMode: 'informado',

      vehicleSharePct: null,

      useFullDownPayment: false,

      installments: 48,

      monthlyRatePct: 1.5,

      maxInstallment: null,
    },

    usage: {
      type: 'misto',

      daysPerWeek: 5,

      monthlyKmOverride: null,

      passengers: 4,

      trunkNeed: 'media',
    },

    preferences: {
      fuel: 'indiferente',

      transmission: 'indiferente',

      requireFuel: false,

      requireTransmission: false,

      requireCondition: false,

      yearMin: null,

      yearMax: null,

      wantedBrands: [],

      avoidedBrands: [],

      priorities: { ...NEUTRAL_PRIORITIES },
    },

    weights: initialWeights('equilibrado', NEUTRAL_PRIORITIES),

    assumptionOverrides: {},

    allowDemonstrativeTax: false,

    useLiveFipe: true,
  }
}

/** Dados FICTÍCIOS para o modo demonstração (nenhum dado pessoal real). */

export const DEMO_INPUT: SimulationInput = {
  objective: {
    title: 'Demonstração (dados fictícios)',

    scenarioId: 'equilibrado',

    customMarginMultiplier: 1,

    purchaseMode: 'financiado',

    condition: 'indiferente',

    maxPurchasePrice: null,
  },

  finance: {
    netIncome: 12000,

    fixedExpenses: 4000,

    otherRecurringExpenses: 0,

    otherDebts: 0,

    monthlyReserve: 0,

    downPayment: 30000,

    reserve: 10000,

    accumulatedReserve: 40000,

    reserveMonths: 0,

    safetyMarginMonthly: 0,

    limitMode: 'informado',

    vehicleSharePct: null,

    useFullDownPayment: false,

    maxMonthlyVehicleSpend: 3500,

    installments: 48,

    monthlyRatePct: 1.5,

    maxInstallment: 2200,
  },

  usage: {
    type: 'misto',

    kmPerDay: 30,

    daysPerWeek: 5,

    monthlyKmOverride: null,

    passengers: 4,

    trunkNeed: 'media',
  },

  preferences: {
    fuel: 'indiferente',

    transmission: 'indiferente',

    requireFuel: false,

    requireTransmission: false,

    requireCondition: false,

    yearMin: null,

    yearMax: null,

    wantedBrands: [],

    avoidedBrands: [],

    priorities: { ...NEUTRAL_PRIORITIES },
  },

  weights: initialWeights('equilibrado', NEUTRAL_PRIORITIES),

  assumptionOverrides: {},

  // UF de exemplo do modo demonstração, visível e alterável. Não é inferência silenciosa.

  registrationState: 'BA',

  allowDemonstrativeTax: false,

  useLiveFipe: false,
}
