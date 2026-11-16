import { render, screen } from '@testing-library/react'

import userEvent from '@testing-library/user-event'

import { describe, expect, it } from 'vitest'

import { BAHIA_DEMONSTRATION_RULE, TAX_REFERENCE_DATE } from '../../config/regionalTax'

import { BRAZILIAN_STATES } from '../../config/states'

import { runDecision } from '../../domain/decision/pipeline'

import { computeVehicleCosts, type CostContext } from '../../domain/finance/costs'

import {

calculateRegionalTaxes,

getApplicableExemption,

roundMoney,

selectApplicableRule,

validateRegionalRule,

type RegionalTaxProvider,

} from '../../domain/finance/regionalTax'

import { RegionalTaxSection } from '../../features/recommendations/RegionalTaxSection'

import { simulationInputSchema } from '../../schemas/simulation'

import { DEFAULT_ASSUMPTIONS } from '../../config/assumptions'

import { SCENARIOS } from '../../config/scenarios'

import type { ExemptionRule, RegionalTaxQuery, RegionalTaxRule } from '../../types/regionalTax'

import { BRAZILIAN_STATE_CODES } from '../../types/regionalTax'

import { REFERENCE_YEAR, makeInput, makeVehicle } from '../fixtures/factories'



const AS_OF = TAX_REFERENCE_DATE



function query(patch: Partial<RegionalTaxQuery> = {}): RegionalTaxQuery {

return {

state: 'BA',

priceBRL: 10_000,

condition: 'indiferente',

fuel: 'flex',

asOf: AS_OF,

manualRatePct: undefined,

allowDemonstrativeEstimate: false,

demonstrativeRatePct: 4,

...patch,

}

}



function rule(patch: Partial<RegionalTaxRule> = {}): RegionalTaxRule {

return { ...BAHIA_DEMONSTRATION_RULE, exemptions: [], ...patch }

}



function exemption(patch: Partial<ExemptionRule> = {}): ExemptionRule {

return {

id: 'isencao-teste',

state: 'BA',

description: 'Isenção usada só neste teste',

vehicleCondition: 'qualquer',

propulsion: 'eletrico',

ratePct: null,

source: 'Regra fictícia de teste. Não é fonte oficial.',

legalBasis: 'Base usada somente no teste automatizado.',

fiscalYear: 2026,

validFrom: '2026-01-01',

validUntil: '2026-12-31',

lastVerifiedAt: '2026-11-01',

status: 'verificada',

...patch,

}

}



function provider(rules: RegionalTaxRule[]): RegionalTaxProvider {

return { getRules: (state) => rules.filter((item) => item.state === state) }

}



describe('unidades federativas', () => {

it('cadastra as 27 siglas, na ordem do seletor, e rejeita UF inválida', () => {

expect(BRAZILIAN_STATE_CODES).toHaveLength(27)

expect(BRAZILIAN_STATES.map((state) => state.code)).toEqual([...BRAZILIAN_STATE_CODES])

expect(new Set(BRAZILIAN_STATE_CODES).size).toBe(27)

for (const code of BRAZILIAN_STATE_CODES) {

expect(simulationInputSchema.safeParse(makeInput({ registrationState: code })).success).toBe(

true,

)

}

expect(

simulationInputSchema.safeParse({ ...makeInput(), registrationState: 'XX' }).success,

).toBe(false)

})



it('só a Bahia tem regra, e ela é demonstração — não oficial', () => {

expect(BAHIA_DEMONSTRATION_RULE.status).toBe('demonstracao')

expect(BAHIA_DEMONSTRATION_RULE.ratePct).toBe(DEFAULT_ASSUMPTIONS.ipvaRatePct)

expect(BAHIA_DEMONSTRATION_RULE.exemptions).toEqual([])

expect(BAHIA_DEMONSTRATION_RULE.lastVerifiedAt).toBeNull()

for (const code of BRAZILIAN_STATE_CODES) {

const found = provider([BAHIA_DEMONSTRATION_RULE]).getRules(code)

expect(found.length).toBe(code === 'BA' ? 1 : 0)

}

})

})



describe('validação da regra', () => {

it('aceita a regra de demonstração da Bahia na data de referência', () => {

expect(validateRegionalRule(BAHIA_DEMONSTRATION_RULE, AS_OF)).toEqual({

valid: true,

expired: false,

issues: [],

})

})



it('marca regra vencida pela data e pela situação', () => {

expect(validateRegionalRule(rule({ validUntil: '2025-12-31' }), AS_OF).expired).toBe(true)

expect(validateRegionalRule(rule({ status: 'vencida' }), AS_OF).expired).toBe(true)

})



it('não aceita regra verificada sem data de verificação', () => {

const verified = rule({ status: 'verificada', lastVerifiedAt: null })

expect(validateRegionalRule(verified, AS_OF).valid).toBe(false)

})

})



describe('cálculo do IPVA regional', () => {

it('Bahia usa a alíquota de demonstração e guarda a regra', () => {

const result = calculateRegionalTaxes(query())

expect(result.confidence).toBe('demonstracao')

expect(result.annualBRL).toBe(400)

expect(result.monthlyBRL).toBe(33.33)

expect(result.rule?.id).toBe(BAHIA_DEMONSTRATION_RULE.id)

expect(result.alerts.map((item) => item.code)).toContain('arredondamento')

expect(result.explanation).toContain('Não é alíquota oficial')

})



it('arredonda para centavos e não alerta quando a divisão por 12 é exata', () => {

expect(roundMoney(1.005)).toBe(1.01)

expect(roundMoney(1.004)).toBe(1)

const exact = calculateRegionalTaxes(query({ priceBRL: 12_000 }))

expect(exact.annualBRL).toBe(480)

expect(exact.monthlyBRL).toBe(40)

expect(exact.alerts.map((item) => item.code)).not.toContain('arredondamento')

})



it('UF sem regra fica indisponível e não vira zero', () => {

const result = calculateRegionalTaxes(query({ state: 'SP' }))

expect(result.annualBRL).toBeNull()

expect(result.monthlyBRL).toBeNull()

expect(result.confidence).toBe('indisponivel')

expect(result.rule).toBeNull()

expect(result.alerts.map((item) => item.code)).toEqual(

expect.arrayContaining(['regra_ausente', 'regra_pendente']),

)

})



it('mudar a UF troca a regra aplicada', () => {

const bahia = calculateRegionalTaxes(query({ state: 'BA' }))

const sergipe = calculateRegionalTaxes(query({ state: 'SE' }))

expect(bahia.annualBRL).toBe(400)

expect(sergipe.annualBRL).toBeNull()

expect(bahia.state).not.toBe(sergipe.state)

})



it('regra vencida gera alerta e não é aplicada', () => {

const expired = rule({

id: 'ba-vencida',

validFrom: '2025-01-01',

validUntil: '2025-12-31',

})

const result = calculateRegionalTaxes(query(), provider([expired]))

expect(result.annualBRL).toBeNull()

expect(result.alerts.map((item) => item.code)).toContain('regra_vencida')

expect(result.rule?.id).toBe('ba-vencida')

})



it('regra pendente exige alíquota manual ou estimativa de demonstração', () => {

const pending = rule({ id: 'sp-pendente', state: 'SP', status: 'pendente' })

const blocked = calculateRegionalTaxes(query({ state: 'SP' }), provider([pending]))

expect(blocked.annualBRL).toBeNull()

expect(blocked.alerts.map((item) => item.code)).toContain('regra_pendente')



const manual = calculateRegionalTaxes(

query({ state: 'SP', manualRatePct: 3 }),

provider([pending]),

)

expect(manual.confidence).toBe('manual')

expect(manual.annualBRL).toBe(300)

expect(manual.rule?.id).toBe('sp-pendente')



const demo = calculateRegionalTaxes(

query({ state: 'SP', allowDemonstrativeEstimate: true }),

provider([pending]),

)

expect(demo.confidence).toBe('demonstracao')

expect(demo.annualBRL).toBe(400)

expect(demo.source).toContain('não é a alíquota deste estado')

})



it('alíquota informada substitui a regra da Bahia', () => {

const result = calculateRegionalTaxes(query({ manualRatePct: 2 }))

expect(result.confidence).toBe('manual')

expect(result.annualBRL).toBe(200)

expect(result.rule?.id).toBe(BAHIA_DEMONSTRATION_RULE.id)

})



it('isenção de elétrico não alcança combustão e zero não é dado ausente', () => {

const electricRule = rule({

status: 'verificada',

lastVerifiedAt: '2026-11-01',

legalBasis: 'Base fictícia do teste.',

source: 'Fonte fictícia do teste.',

exemptions: [exemption()],

})
const rules = provider([electricRule])

const electric = calculateRegionalTaxes(query({ fuel: 'eletrico' }), rules)

const flex = calculateRegionalTaxes(query({ fuel: 'flex' }), rules)

expect(electric.exemption?.id).toBe('isencao-teste')

expect(electric.annualBRL).toBe(0)

expect(electric.confidence).toBe('oficial')

expect(flex.exemption).toBeNull()

expect(flex.annualBRL).toBe(400)

expect(

getApplicableExemption(electricRule, { condition: 'indiferente', fuel: 'flex' }, AS_OF),

).toBeNull()

})



it('regra de carro novo não se aplica a usado', () => {

const onlyNew = rule({ id: 'somente-novo', vehicleCondition: 'novo' })

const rules = provider([onlyNew])

expect(selectApplicableRule([onlyNew], { condition: 'usado', fuel: 'flex' })).toBeNull()

expect(calculateRegionalTaxes(query({ condition: 'novo' }), rules).annualBRL).toBe(400)

expect(calculateRegionalTaxes(query({ condition: 'usado' }), rules).annualBRL).toBeNull()

expect(calculateRegionalTaxes(query({ condition: 'indiferente' }), rules).annualBRL).toBeNull()

})



it('a fotografia da regra sobrevive à serialização e à simulação', () => {

const result = calculateRegionalTaxes(query())

const stored = JSON.parse(JSON.stringify(result)) as typeof result

expect(stored.rule?.id).toBe(BAHIA_DEMONSTRATION_RULE.id)

expect(stored.ratePct).toBe(4)

expect(stored.fiscalYear).toBe(2026)



const decision = runDecision(makeInput(), [makeVehicle({ priceBRL: 50_000 })], {

referenceYear: REFERENCE_YEAR,

})

const snapshot = decision.ranking[0]?.costs.regionalTax

expect(snapshot?.state).toBe('BA')

expect(snapshot?.rule?.id).toBe(BAHIA_DEMONSTRATION_RULE.id)

expect(JSON.parse(JSON.stringify(snapshot)).rule.id).toBe(BAHIA_DEMONSTRATION_RULE.id)

})

})



describe('IPVA na composição de custos', () => {

const context: CostContext = {

finance: makeInput().finance,

usage: makeInput().usage,

purchaseMode: 'financiado',

fuelPreference: 'indiferente',

assumptions: DEFAULT_ASSUMPTIONS,

scenario: SCENARIOS.equilibrado,

referenceYear: REFERENCE_YEAR,

registrationState: 'SP',

condition: 'indiferente',

manualIpvaRatePct: undefined,

allowDemonstrativeTax: false,

}



it('sem regra e sem estimativa, o IPVA ausente zera o total mensal sem virar zero', () => {

const result = computeVehicleCosts(makeVehicle(), context)

expect(result.ok).toBe(true)

if (!result.ok) return

expect(result.costs.ipvaAnnual).toBeNull()

expect(result.costs.monthlyTotal).toBeNull()

expect(result.costs.regionalTax.confidence).toBe('indisponivel')

})

})



describe('tela do IPVA', () => {

it('mostra o valor anual, o mensal e o botão Entenda o cálculo', async () => {

const tax = calculateRegionalTaxes(query())

const user = userEvent.setup()

render(<RegionalTaxSection tax={tax} />)

expect(screen.getByText(/400,00/)).toBeInTheDocument()

expect(screen.getByText(/33,33/)).toBeInTheDocument()

expect(screen.getByText('Dado de demonstração')).toBeInTheDocument()

await user.click(screen.getByRole('button', { name: 'Entenda o cálculo' }))

expect(screen.getByText(/Base 10000.00 × alíquota/)).toBeInTheDocument()

expect(screen.getByText(/Exercício: 2026/)).toBeInTheDocument()

})

})
