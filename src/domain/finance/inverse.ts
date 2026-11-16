import type { Assumptions } from '../../config/assumptions'

import type { ScenarioDefinition } from '../../config/scenarios'

import {
  INVERSE_DOWN_PAYMENT_SHARES,
  INVERSE_INSTALLMENT_OPTIONS,
  INVERSE_MAX_COMBINATIONS,
} from '../../config/inverse'

import type { TcoHorizon } from '../../config/tco'

import type { FinanceInput, UsageInput } from '../../schemas/simulation'

import type { BrazilianStateCode } from '../../types/regionalTax'

import type { AmortizationSystem } from '../../types/tco'

import type { Vehicle } from '../../types/vehicle'

import { assessVehicle, calculateHouseholdBudget, roundMoney } from './capacity'

import { computeVehicleCosts, type CostContext } from './costs'

import { FinanceInputError } from './loan'

import { buildSchedule, buildTcoInput, calculateVehicleTco } from './tco'

/**

* Simulação inversa: dado um veículo escolhido, busca combinações de entrada e prazo

* que cabem nas restrições. Não é aprovação de crédito nem política bancária.

*

* Quem calcula parcela, custo mensal e TCO são as funções já usadas no resto do QC.

* Aqui só se combina, filtra, remove dominadas e escolhe cenários representativos.

*/

export type InversePurchaseMode = 'avista' | 'financiado'

export type InverseScenarioKey =
  'menorEntrada' | 'menorParcela' | 'menorCustoTotal' | 'avista' | 'personalizado'

export interface InverseReason {
  code: string

  message: string

  required: number | null

  available: number | null

  gap: number | null
}

export interface InverseCandidate {
  id: string

  purchaseMode: InversePurchaseMode

  amortization: AmortizationSystem

  /** Entrada usada. À vista, é o preço. */

  downPayment: number

  /** Prazo em meses. Zero à vista. */

  installments: number

  financed: number

  monthlyInstallment: number

  monthlyTotal: number | null

  interest: number | null

  /** TCO econômico no horizonte. É a "custo total" do cenário. */

  tcoEconomic: number | null

  /** Visão de caixa no horizonte. */

  tcoCash: number | null

  /** Renda de referência = custo mensal ÷ limite do cenário. Referência matemática apenas. */

  referenceIncome: number | null

  /** Reserva acumulada que sobra após a entrada. Null sem renda informada. */

  reserveAfter: number | null

  /** Renda livre mensal depois do custo do veículo. Null sem renda informada. */

  marginAfter: number | null

  status: 'viavel' | 'inviavel' | 'indisponivel'

  reasons: InverseReason[]

  personalized: boolean
}

export interface InverseRequest {
  vehicle: Vehicle

  registrationState: BrazilianStateCode

  condition: 'novo' | 'usado' | 'indiferente'

  usage: UsageInput

  fuelPreference: CostContext['fuelPreference']

  assumptions: Assumptions

  scenario: ScenarioDefinition

  referenceYear: number

  horizonMonths: TcoHorizon

  manualIpvaRatePct?: number

  allowDemonstrativeTax: boolean

  /** Finanças. `netIncome` só é usada quando `hasIncome` é true. `maxInstallment` limita a parcela. */

  finance: FinanceInput

  hasIncome: boolean

  purchaseModes: InversePurchaseMode[]

  /** Sistema de amortização do financiamento. Price é o padrão do QC. */

  amortization: AmortizationSystem

  /** Prazos candidatos. Vazio usa a grade padrão. */

  installmentOptions?: readonly number[]

  /** Entradas candidatas em R$. Vazio usa a grade de percentuais do preço. */

  downPaymentOptions?: readonly number[]

  /** Teto da entrada disponível. Null = sem teto informado. */

  maxDownPayment: number | null

  /** Teto do custo mensal total. Null = sem teto informado. */

  maxMonthlyTotal: number | null

  /** Combinação pedida pela pessoa (entrada e prazo). */

  personalized: { downPayment: number; installments: number } | null
}

export interface InverseResult {
  status: 'ok' | 'sem_solucao'

  /** Todas as combinações avaliadas, em ordem estável. */

  candidates: InverseCandidate[]

  /** Viáveis e não dominadas. */

  options: InverseCandidate[]

  scenarios: Record<InverseScenarioKey, InverseCandidate | null>

  /** Quantas combinações caíram em cada motivo. */

  rejectionCounts: Record<string, number>

  /** Ajustes possíveis, sem sugerir ocultar despesas ou tomar mais dívida. */

  suggestions: string[]

  premises: string[]
}

interface Combo {
  purchaseMode: InversePurchaseMode

  downPayment: number

  installments: number

  personalized: boolean
}

const REASON_SUGGESTIONS: Record<string, string> = {
  entrada_acima_disponivel:
    'Reduzir a entrada ao valor que você tem disponível, ou escolher um veículo de menor preço.',

  reserva_violada:
    'Reduzir a entrada, ou confirmar o uso da reserva se essa for sua decisão consciente.',

  parcela_acima_limite: 'Rever o limite de parcela informado, se ele for o motivo.',

  custo_mensal_acima_limite: 'Rever o limite de custo mensal informado, ou escolher outro veículo.',

  custo_acima_limite:
    'Escolher um veículo de menor custo mensal. A análise não sugere reduzir despesas essenciais.',

  preco_acima_capacidade:
    'Escolher um veículo de menor preço. Com a renda informada, a capacidade de compra é menor que o preço.',

  margem_negativa:
    'O custo mensal passa da renda disponível. Escolher outro veículo ou revisar a renda informada.',

  renda_disponivel_negativa:
    'A renda disponível não é positiva. Revise os dados informados antes de buscar combinações.',

  ipva_indisponivel:
    'Informar a alíquota de IPVA do estado, ou marcar a estimativa de demonstração, quando permitido.',

  custo_mensal_incompleto:
    'Há componente de custo sem dado. Revise o estado de registro e os dados do veículo.',

  tco_incompleto:
    'Há componente do TCO sem dado. Revise o estado de registro e os dados do veículo.',
}

/** Grade padrão de entradas, como R$ arredondados em centavos e sem repetição. */

function defaultDownPayments(price: number): number[] {
  return [...new Set(INVERSE_DOWN_PAYMENT_SHARES.map((share) => roundMoney(price * share)))]
}

function buildCombos(request: InverseRequest, price: number): Combo[] {
  const installmentOptions: readonly number[] =
    request.installmentOptions && request.installmentOptions.length > 0
      ? request.installmentOptions
      : INVERSE_INSTALLMENT_OPTIONS

  const downPayments =
    request.downPaymentOptions && request.downPaymentOptions.length > 0
      ? [...request.downPaymentOptions]
      : defaultDownPayments(price)

  const modes = [...new Set(request.purchaseModes)].sort()

  const combos: Combo[] = []

  for (const mode of modes) {
    if (mode === 'avista') {
      combos.push({
        purchaseMode: 'avista',

        downPayment: price,

        installments: 0,

        personalized: false,
      })

      continue
    }

    for (const downPayment of downPayments) {
      // Entrada igual ou maior que o preço não é financiamento: fica para a opção à vista.

      if (downPayment < 0 || downPayment >= price) continue

      for (const installments of installmentOptions) {
        combos.push({
          purchaseMode: 'financiado',

          downPayment: roundMoney(downPayment),

          installments,

          personalized: false,
        })
      }
    }
  }
  if (request.personalized && modes.includes('financiado')) {
    const { downPayment, installments } = request.personalized

    combos.push({
      purchaseMode: 'financiado',

      downPayment: roundMoney(downPayment),

      installments,

      personalized: true,
    })
  }

  // Ordem estável e sem duplicatas (a combinação pessoal pode repetir uma da grade).

  const seen = new Set<string>()

  const unique = combos.filter((combo) => {
    const key = `${combo.purchaseMode}:${combo.downPayment}:${combo.installments}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)

    return true
  })

  return unique.slice(0, INVERSE_MAX_COMBINATIONS)
}

/** Renda de referência = custo mensal ÷ limite do cenário. Null quando o cenário não tem limite. */

export function referenceIncomeFor(
  monthlyTotal: number,

  scenario: ScenarioDefinition,
): number | null {
  if (scenario.maxIncomeCommitment <= 0) return null

  return roundMoney(monthlyTotal / scenario.maxIncomeCommitment)
}

function candidateId(combo: Combo): string {
  return `${combo.purchaseMode}:${combo.downPayment}:${combo.installments}`
}

function unavailable(
  base: Omit<InverseCandidate, 'status' | 'reasons'>,

  code: string,

  message: string,
): InverseCandidate {
  return {
    ...base,

    status: 'indisponivel',

    reasons: [{ code, message, required: null, available: null, gap: null }],
  }
}

function evaluate(request: InverseRequest, combo: Combo, price: number): InverseCandidate {
  const isCash = combo.purchaseMode === 'avista'

  const installments = isCash ? Math.max(1, request.finance.installments) : combo.installments

  const finance: FinanceInput = {
    ...request.finance,

    downPayment: combo.downPayment,

    installments,
  }

  const base = {
    id: candidateId(combo),

    purchaseMode: combo.purchaseMode,

    amortization: request.amortization,

    downPayment: combo.downPayment,

    installments: isCash ? 0 : combo.installments,

    financed: 0,

    monthlyInstallment: 0,

    monthlyTotal: null,

    interest: null,

    tcoEconomic: null,

    tcoCash: null,

    referenceIncome: null,

    reserveAfter: null,

    marginAfter: null,

    personalized: combo.personalized,
  }

  const context: CostContext = {
    finance,

    usage: request.usage,

    purchaseMode: combo.purchaseMode,

    fuelPreference: request.fuelPreference,

    assumptions: request.assumptions,

    scenario: request.scenario,

    referenceYear: request.referenceYear,

    registrationState: request.registrationState,

    condition: request.condition,

    manualIpvaRatePct: request.manualIpvaRatePct,

    allowDemonstrativeTax: request.allowDemonstrativeTax,
  }

  const result = computeVehicleCosts(request.vehicle, context)

  if (!result.ok) {
    return unavailable(base, result.code, result.message)
  }

  const costs = result.costs

  if (costs.monthlyTotal === null) {
    const code = costs.ipvaAnnual === null ? 'ipva_indisponivel' : 'custo_mensal_incompleto'

    return unavailable(
      { ...base, financed: costs.financedAmount, monthlyInstallment: costs.monthlyInstallment },

      code,

      costs.notes.join(' ') || 'Custo mensal não pôde ser estimado.',
    )
  }

  // Price é o padrão do cálculo de custo. SAC troca só a parcela de financiamento:

  // a primeira parcela SAC é maior, e o restante do custo mensal fica igual.

  const sacFirst =
    request.amortization === 'sac' && !isCash && costs.financedAmount > 0
      ? buildSchedule('sac', costs.financedAmount, finance.monthlyRatePct, installments)[0]
      : undefined

  const monthlyInstallment = sacFirst ? sacFirst.installment : costs.monthlyInstallment

  const monthlyTotal = roundMoney(
    costs.monthlyTotal - costs.monthlyInstallment + monthlyInstallment,
  )

  const tco = calculateVehicleTco(
    buildTcoInput({
      vehicle: request.vehicle,

      costs,

      finance,

      usage: request.usage,

      purchaseMode: combo.purchaseMode,

      assumptions: request.assumptions,

      referenceYear: request.referenceYear,
    }),
  ).byHorizon[request.horizonMonths][request.amortization]

  const household = request.hasIncome ? calculateHouseholdBudget(finance, request.scenario) : null

  const withCosts: InverseCandidate = {
    ...base,

    amortization: request.amortization,

    financed: costs.financedAmount,

    monthlyInstallment: roundMoney(monthlyInstallment),

    monthlyTotal,

    interest: tco.interestPaid,

    tcoEconomic: tco.economic.total,

    tcoCash: tco.cash.total,

    referenceIncome: referenceIncomeFor(monthlyTotal, request.scenario),

    // Reserva que sobra depois da entrada, e renda livre depois do veículo (só com renda informada).

    reserveAfter: household ? roundMoney(finance.accumulatedReserve - combo.downPayment) : null,

    marginAfter: household ? roundMoney(household.availableIncome - monthlyTotal) : null,

    status: 'viavel',

    reasons: [],
  }

  if (tco.economic.total === null) {
    return unavailable(
      withCosts,

      'tco_incompleto',

      `Componentes sem dado: ${tco.missing.join(', ')}.`,
    )
  }

  const reasons: InverseReason[] = []

  if (request.maxDownPayment !== null && combo.downPayment > request.maxDownPayment) {
    reasons.push({
      code: 'entrada_acima_disponivel',

      message: 'A entrada desta combinação passa do valor disponível informado.',

      required: combo.downPayment,

      available: request.maxDownPayment,

      gap: roundMoney(combo.downPayment - request.maxDownPayment),
    })
  }

  if (finance.maxInstallment !== null && monthlyInstallment > finance.maxInstallment) {
    reasons.push({
      code: 'parcela_acima_limite',

      message: 'A parcela desta combinação passa do valor máximo informado.',

      required: roundMoney(monthlyInstallment),

      available: finance.maxInstallment,

      gap: roundMoney(monthlyInstallment - finance.maxInstallment),
    })
  }

  if (request.maxMonthlyTotal !== null && monthlyTotal > request.maxMonthlyTotal) {
    reasons.push({
      code: 'custo_mensal_acima_limite',

      message: 'O custo mensal total passa do limite informado.',

      required: monthlyTotal,

      available: request.maxMonthlyTotal,

      gap: roundMoney(monthlyTotal - request.maxMonthlyTotal),
    })
  }

  if (household) {
    const budget = household

    if (budget.reserveBlocked) {
      reasons.push({
        code: 'reserva_violada',

        message: 'A entrada desta combinação usa a reserva protegida.',

        required: combo.downPayment,

        available: budget.downPaymentRoom,

        gap: roundMoney(Math.max(0, combo.downPayment - budget.downPaymentRoom)),
      })
    } else {
      const assessment = assessVehicle({
        budget,

        purchaseMode: combo.purchaseMode,

        price,

        monthlyTotal,

        monthlyInstallment,

        netIncome: finance.netIncome,

        monthlyRatePct: finance.monthlyRatePct,

        installments,

        safetyMarginMonthly: finance.safetyMarginMonthly,

        essentialExpenses: finance.fixedExpenses,
      })

      for (const item of assessment.reasons) {
        reasons.push({
          code: item.code,

          message: item.message,

          required: item.required,

          available: item.available,

          gap: item.gap,
        })
      }
    }
  }
  return {
    ...withCosts,

    status: reasons.length === 0 ? 'viavel' : 'inviavel',

    reasons,
  }
}

/** Dominada: outra é igual ou melhor em entrada, parcela e custo total, e estritamente melhor em uma delas. */

export function isDominated(candidate: InverseCandidate, other: InverseCandidate): boolean {
  const a = vector(candidate)

  const b = vector(other)

  const notWorse = b.every((value, index) => value <= (a[index] as number))

  const strictlyBetter = b.some((value, index) => value < (a[index] as number))

  return notWorse && strictlyBetter
}

function vector(candidate: InverseCandidate): [number, number, number] {
  return [candidate.downPayment, candidate.monthlyInstallment, candidate.tcoEconomic as number]
}

function compareStable(a: InverseCandidate, b: InverseCandidate): number {
  if (a.purchaseMode !== b.purchaseMode) return a.purchaseMode < b.purchaseMode ? -1 : 1

  if (a.downPayment !== b.downPayment) return a.downPayment - b.downPayment

  if (a.installments !== b.installments) return a.installments - b.installments

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function pickBest(
  items: InverseCandidate[],

  key: (candidate: InverseCandidate) => number,
): InverseCandidate | null {
  let best: InverseCandidate | null = null

  for (const item of items) {
    if (
      best === null ||
      key(item) < key(best) ||
      (key(item) === key(best) && compareStable(item, best) < 0)
    ) {
      best = item
    }
  }

  return best
}

function buildSuggestions(candidates: InverseCandidate[]): {
  suggestions: string[]

  counts: Record<string, number>
} {
  const counts: Record<string, number> = {}

  for (const candidate of candidates) {
    for (const reason of candidate.reasons) {
      counts[reason.code] = (counts[reason.code] ?? 0) + 1
    }
  }

  const suggestions = Object.entries(counts)

    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))

    .map(([code]) => REASON_SUGGESTIONS[code])

    .filter((text): text is string => Boolean(text))

  return { suggestions, counts }
}

function buildPremises(request: InverseRequest): string[] {
  const premises = [
    `Cenário ${request.scenario.label}. Limite de comprometimento da renda de ${roundMoney(request.scenario.maxIncomeCommitment * 100)}%: premissa do cenário, não regra universal.`,

    'Renda de referência = custo mensal total ÷ esse limite. É uma conta de referência, não aprovação nem política de crédito.',

    `Estado de registro: ${request.registrationState}. O IPVA segue a regra desse estado (ver Central de ajuda, artigo Impostos).`,

    `Condição do veículo: ${request.condition}.`,

    `Horizonte do TCO: ${request.horizonMonths} meses, valores nominais, sem correção monetária.`,

    `Taxa mensal de financiamento: ${request.finance.monthlyRatePct}%.`,

    `Amortização: ${request.amortization === 'price' ? 'Price (parcelas fixas)' : 'SAC (amortização constante, parcelas decrescentes)'}.`,
  ]

  if (!request.hasIncome) {
    premises.push(
      'Sem renda informada: o QC não avalia orçamento nem capacidade. Só os limites de entrada, parcela e custo mensal informados foram aplicados.',
    )
  }

  return premises
}

/**

* Busca as combinações de entrada e prazo para um veículo escolhido.

* Função pura e determinística: a mesma entrada produz o mesmo resultado.

*/

export function calculateInverseOptions(request: InverseRequest): InverseResult {
  const price = request.vehicle.priceBRL

  if (price === null || !Number.isFinite(price) || price <= 0) {
    // Sem preço de referência não há base para calcular: não se assume preço.

    throw new FinanceInputError('Este veículo não tem preço de referência para a simulação.')
  }

  if (request.purchaseModes.length === 0) {
    throw new FinanceInputError('Escolha pelo menos uma forma de compra.')
  }

  const combos = buildCombos(request, price)

  const candidates = combos.map((combo) => evaluate(request, combo, price)).sort(compareStable)

  const viable = candidates.filter((candidate) => candidate.status === 'viavel')

  const options = viable.filter(
    (candidate) => !viable.some((other) => other !== candidate && isDominated(candidate, other)),
  )

  const personalizedCandidate = candidates.find((candidate) => candidate.personalized) ?? null

  const cashOption = options.find((candidate) => candidate.purchaseMode === 'avista') ?? null

  const scenarios: InverseResult['scenarios'] = {
    menorEntrada: pickBest(options, (c) => c.downPayment),

    menorParcela: pickBest(options, (c) => c.monthlyInstallment),

    menorCustoTotal: pickBest(options, (c) => c.tcoEconomic as number),

    avista: cashOption,

    personalizado: personalizedCandidate,
  }

  const { suggestions, counts } = buildSuggestions(candidates.filter((c) => c.status !== 'viavel'))

  return {
    status: options.length > 0 ? 'ok' : 'sem_solucao',

    candidates,

    options: [...options].sort(compareStable),

    scenarios,

    rejectionCounts: counts,

    suggestions:
      options.length > 0
        ? []
        : [
            'Nenhuma combinação atendeu às restrições informadas. Nada foi aplicado automaticamente.',

            ...suggestions,
          ],

    premises: buildPremises(request),
  }
}
