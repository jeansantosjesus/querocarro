import { resolveAssumptions } from '../../config/assumptions'

import { INVERSE_INSTALLMENT_OPTIONS } from '../../config/inverse'

import type { TcoHorizon } from '../../config/tco'

import type { InversePurchaseMode, InverseRequest } from '../../domain/finance/inverse'

import { resolveScenario } from '../../domain/decision/scenarios'

import type { FinanceInput, SimulationInput } from '../../schemas/simulation'

import type { BrazilianStateCode } from '../../types/regionalTax'

import type { AmortizationSystem } from '../../types/tco'

import type { Vehicle } from '../../types/vehicle'

import { DEMO_INPUT } from '../simulation/defaults'

/**

* Estado do formulário "Quero este carro". Campos vazios NÃO viram zero:

* quando há renda, cada campo financeiro obrigatório precisa ser preenchido.

*/

export interface InverseFormState {
  condition: 'novo' | 'usado' | 'indiferente'

  registrationState: BrazilianStateCode | ''

  allowDemonstrativeTax: boolean

  purchaseFinanced: boolean

  purchaseCash: boolean

  amortization: AmortizationSystem

  horizonMonths: TcoHorizon

  hasIncome: boolean

  netIncome: string

  fixedExpenses: string

  otherRecurringExpenses: string

  otherDebts: string

  monthlyReserve: string

  reserve: string

  accumulatedReserve: string

  monthlyRatePct: string

  installments: number[]

  maxDownPayment: string

  maxInstallment: string

  maxMonthlyTotal: string

  personalDownPayment: string

  personalInstallments: string
}

export interface InverseContext {
  vehicle: Vehicle

  referenceYear: number

  /** Simulação atual, quando existe. Serve só para pré-preencher e usar o mesmo cenário. */

  input: SimulationInput | null
}

export type InverseBuildResult =
  { ok: true; request: InverseRequest } | { ok: false; errors: string[] }

const DEFAULT_INSTALLMENTS = [...INVERSE_INSTALLMENT_OPTIONS]

function text(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

/** Pré-preenche com a simulação atual. Sem simulação, nada de renda é assumido. */

export function createInverseForm(input: SimulationInput | null): InverseFormState {
  if (!input) {
    return {
      condition: 'indiferente',

      registrationState: '',

      allowDemonstrativeTax: false,

      purchaseFinanced: true,

      purchaseCash: true,

      amortization: 'price',

      horizonMonths: 36,

      hasIncome: false,

      netIncome: '',

      fixedExpenses: '',

      otherRecurringExpenses: '',

      otherDebts: '',

      monthlyReserve: '',

      reserve: '',

      accumulatedReserve: '',

      monthlyRatePct: '1.5',

      installments: DEFAULT_INSTALLMENTS,

      maxDownPayment: '',

      maxInstallment: '',

      maxMonthlyTotal: '',

      personalDownPayment: '',

      personalInstallments: '',
    }
  }

  return {
    condition: input.objective.condition,

    registrationState: input.registrationState ?? '',

    allowDemonstrativeTax: input.allowDemonstrativeTax,

    purchaseFinanced: true,

    purchaseCash: true,

    amortization: 'price',

    horizonMonths: 36,

    hasIncome: true,

    netIncome: text(input.finance.netIncome),

    fixedExpenses: text(input.finance.fixedExpenses),

    otherRecurringExpenses: text(input.finance.otherRecurringExpenses),

    otherDebts: text(input.finance.otherDebts),

    monthlyReserve: text(input.finance.monthlyReserve),

    reserve: text(input.finance.reserve),

    accumulatedReserve: text(input.finance.accumulatedReserve),

    monthlyRatePct: text(input.finance.monthlyRatePct),

    installments: DEFAULT_INSTALLMENTS,

    maxDownPayment: '',

    maxInstallment: text(input.finance.maxInstallment),

    maxMonthlyTotal: '',

    personalDownPayment: '',

    personalInstallments: '',
  }
}

type Parsed = { ok: true; value: number | null } | { ok: false }

/** Vazio = ausente (null). Texto inválido ou negativo = erro. Vírgula decimal aceita. */

function parseOptional(raw: string): Parsed {
  const normalized = raw.trim().replace(',', '.')

  if (normalized === '') return { ok: true, value: null }

  const value = Number(normalized)

  return Number.isFinite(value) && value >= 0 ? { ok: true, value } : { ok: false }
}

function parseRequired(raw: string): Parsed {
  const parsed = parseOptional(raw)

  return parsed.ok && parsed.value !== null ? parsed : { ok: false }
}

/**

* Valida o formulário e monta a requisição da simulação inversa.

* Ausência de dado obrigatório devolve erro; nunca usa zero no lugar.

*/

export function buildInverseRequest(
  form: InverseFormState,

  context: InverseContext,
): InverseBuildResult {
  const errors: string[] = []

  const { input, vehicle } = context

  if (form.registrationState === '') errors.push('Escolha a UF de registro do veículo.')

  if (!form.purchaseFinanced && !form.purchaseCash) {
    errors.push('Escolha pelo menos uma forma de compra: financiado ou à vista.')
  }

  const installments = [...new Set(form.installments)].sort((a, b) => a - b)

  if (installments.length === 0) errors.push('Escolha pelo menos um prazo de financiamento.')

  const rate = parseRequired(form.monthlyRatePct)

  if (!rate.ok) errors.push('Informe a taxa mensal de financiamento (use 0 se não houver juros).')

  const maxDownPayment = parseOptional(form.maxDownPayment)

  const maxInstallment = parseOptional(form.maxInstallment)

  const maxMonthlyTotal = parseOptional(form.maxMonthlyTotal)

  if (!maxDownPayment.ok) errors.push('O teto da entrada precisa ser um valor positivo ou vazio.')

  if (!maxInstallment.ok) errors.push('O teto da parcela precisa ser um valor positivo ou vazio.')

  if (!maxMonthlyTotal.ok)
    errors.push('O teto do custo mensal precisa ser um valor positivo ou vazio.')

  const personalDown = parseOptional(form.personalDownPayment)

  const personalInst = parseOptional(form.personalInstallments)

  const personalFilled =
    form.personalDownPayment.trim() !== '' || form.personalInstallments.trim() !== ''

  let personalized: InverseRequest['personalized'] = null

  if (personalFilled) {
    if (
      !personalDown.ok ||
      personalDown.value === null ||
      !personalInst.ok ||
      personalInst.value === null
    ) {
      errors.push('Para a combinação personalizada, informe entrada e prazo válidos.')
    } else if (personalInst.value < 1) {
      errors.push('O prazo personalizado precisa ser de pelo menos 1 mês.')
    } else {
      personalized = {
        downPayment: personalDown.value,

        installments: Math.round(personalInst.value),
      }
    }
  }

  // Renda: quando informada, todos os campos financeiros são obrigatórios.

  const required = {
    netIncome: parseRequired(form.netIncome),

    fixedExpenses: parseRequired(form.fixedExpenses),

    otherRecurringExpenses: parseRequired(form.otherRecurringExpenses),

    otherDebts: parseRequired(form.otherDebts),

    monthlyReserve: parseRequired(form.monthlyReserve),

    reserve: parseRequired(form.reserve),

    accumulatedReserve: parseRequired(form.accumulatedReserve),
  }

  const labels: Record<keyof typeof required, string> = {
    netIncome: 'a renda líquida mensal',

    fixedExpenses: 'as despesas essenciais mensais',

    otherRecurringExpenses: 'as outras despesas recorrentes',

    otherDebts: 'as dívidas mensais',

    monthlyReserve: 'a reserva mensal',

    reserve: 'a reserva mínima a preservar',

    accumulatedReserve: 'a reserva acumulada',
  }

  if (form.hasIncome) {
    for (const key of Object.keys(required) as (keyof typeof required)[]) {
      if (!required[key].ok) {
        errors.push(`Informe ${labels[key]} (use 0 se não houver).`)
      }
    }

    const netIncome = required.netIncome

    if (netIncome.ok && netIncome.value !== null && netIncome.value <= 0) {
      errors.push('A renda líquida precisa ser maior que zero para avaliar o orçamento.')
    }
  }
  if (errors.length > 0 || !rate.ok) {
    return { ok: false, errors }
  }

  // Mesmo cenário da simulação atual (inclusive o personalizado), ou o equilibrado por padrão.

  const scenario = resolveScenario(input?.objective ?? DEMO_INPUT.objective)

  const numeric = (parsed: Parsed) => (parsed.ok && parsed.value !== null ? parsed.value : 0)

  const finance: FinanceInput = {
    netIncome: numeric(required.netIncome),

    fixedExpenses: numeric(required.fixedExpenses),

    otherRecurringExpenses: numeric(required.otherRecurringExpenses),

    otherDebts: numeric(required.otherDebts),

    monthlyReserve: numeric(required.monthlyReserve),

    // Entrada é definida em cada combinação; este valor não é usado na busca.

    downPayment: 0,

    reserve: numeric(required.reserve),

    accumulatedReserve: numeric(required.accumulatedReserve),

    reserveMonths: 0,

    safetyMarginMonthly: 0,

    limitMode: 'estimado',

    vehicleSharePct: null,

    useFullDownPayment: false,

    maxMonthlyVehicleSpend: 0,

    installments: installments[0] ?? 48,

    monthlyRatePct: rate.value ?? 0,

    maxInstallment: maxInstallment.ok ? maxInstallment.value : null,
  }

  const purchaseModes: InversePurchaseMode[] = []

  if (form.purchaseFinanced) purchaseModes.push('financiado')

  if (form.purchaseCash) purchaseModes.push('avista')

  const request: InverseRequest = {
    vehicle,

    registrationState: form.registrationState as BrazilianStateCode,

    condition: form.condition,

    usage: (input ?? DEMO_INPUT).usage,

    fuelPreference: (input ?? DEMO_INPUT).preferences.fuel,

    assumptions: resolveAssumptions(input?.assumptionOverrides ?? {}),

    scenario,

    referenceYear: context.referenceYear,

    horizonMonths: form.horizonMonths,

    allowDemonstrativeTax: form.allowDemonstrativeTax,

    finance,

    hasIncome: form.hasIncome,

    purchaseModes,

    amortization: form.amortization,

    installmentOptions: installments,

    downPaymentOptions: [],

    maxDownPayment: maxDownPayment.ok ? maxDownPayment.value : null,

    maxMonthlyTotal: maxMonthlyTotal.ok ? maxMonthlyTotal.value : null,

    personalized,
  }

  return { ok: true, request }
}
