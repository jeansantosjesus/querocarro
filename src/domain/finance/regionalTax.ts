import { catalogRulesFor, TAX_REFERENCE_DATE } from '../../config/regionalTax'

import { stateName } from '../../config/states'

import type { Fuel } from '../../types/vehicle'

import type {

BrazilianStateCode,

ExemptionRule,

PropulsionScope,

RegionalTaxAlert,

RegionalTaxCalculation,

RegionalTaxQuery,

RegionalTaxRule,

TaxConfidence,

TaxRuleStatus,

VehicleConditionScope,

} from '../../types/regionalTax'



export interface RegionalTaxProvider {

getRules(state: BrazilianStateCode): readonly RegionalTaxRule[]

}



export const catalogRegionalTaxProvider: RegionalTaxProvider = {

getRules: catalogRulesFor,

}



/** Há regra de demonstração ou verificada, válida na data de referência, para a UF. */

export function stateHasUsableCatalogRule(

state: BrazilianStateCode,

asOf: string = TAX_REFERENCE_DATE,

): boolean {

return catalogRulesFor(state).some((rule) => {

const validation = validateRegionalRule(rule, asOf)

return (

validation.valid &&

!validation.expired &&

(rule.status === 'verificada' || rule.status === 'demonstracao')

)

})

}



export interface RuleValidation {

valid: boolean

expired: boolean

issues: string[]

}



const STATUSES: readonly TaxRuleStatus[] = ['verificada', 'pendente', 'vencida', 'demonstracao']



/** Centavos. Meio centavo sobe (o valor de IPVA é sempre positivo). */

export function roundMoney(value: number): number {

return Math.round((value + Number.EPSILON) * 100) / 100

}



function isIsoDate(value: string): boolean {

return /^\d{4}-\d{2}-\d{2}$/.test(value)

}



function snapshotRule(rule: RegionalTaxRule): RegionalTaxRule {

return { ...rule, exemptions: rule.exemptions.map((item) => ({ ...item })) }

}



export function validateRegionalRule(rule: RegionalTaxRule, asOf: string): RuleValidation {

const issues: string[] = []

if (!rule.id.trim()) issues.push('A regra não tem identificador.')

if (!rule.source.trim()) issues.push('A regra não tem fonte.')

if (!rule.legalBasis.trim()) issues.push('A regra não tem base legal.')

if (!Number.isInteger(rule.fiscalYear) || rule.fiscalYear < 2000 || rule.fiscalYear > 2100) {

issues.push('Exercício fiscal inválido.')

}

if (!isIsoDate(rule.validFrom) || !isIsoDate(rule.validUntil) || !isIsoDate(asOf)) {

issues.push('Vigência ou data de referência em formato inválido.')

} else if (rule.validFrom > rule.validUntil) {

issues.push('O início da vigência é posterior ao fim.')

}

if (!STATUSES.includes(rule.status)) issues.push('Situação da regra desconhecida.')

const hasRate = rule.ratePct !== null

const hasFixed = rule.fixedAmountBRL !== null

if (hasRate === hasFixed) {

issues.push('Informe alíquota ou valor fixo, nunca os dois e nunca nenhum.')

}

if (rule.ratePct !== null && (!Number.isFinite(rule.ratePct) || rule.ratePct < 0)) {

issues.push('Alíquota inválida.')

}

if (

rule.fixedAmountBRL !== null &&

(!Number.isFinite(rule.fixedAmountBRL) || rule.fixedAmountBRL < 0)

) {

issues.push('Valor fixo inválido.')

}

if (rule.status === 'verificada' && !rule.lastVerifiedAt) {

issues.push('Regra verificada exige data da última verificação.')

}



const expired =

rule.status === 'vencida' ||

(isIsoDate(rule.validUntil) && isIsoDate(asOf) && asOf > rule.validUntil)



return { valid: issues.length === 0, expired, issues }

}



function propulsionOf(fuel: Fuel | null): PropulsionScope | null {

if (fuel === null) return null

if (fuel === 'eletrico') return 'eletrico'

if (fuel === 'hibrido') return 'hibrido'

return 'combustao'

}



function conditionMatches(

scope: VehicleConditionScope,

condition: RegionalTaxQuery['condition'],

): boolean {

if (scope === 'qualquer') return true

if (condition === 'indiferente') return false

return scope === condition

}



function propulsionMatches(scope: PropulsionScope, fuel: Fuel | null): boolean {

if (scope === 'qualquer') return true

const propulsion = propulsionOf(fuel)

return propulsion !== null && scope === propulsion

}



function specificity(rule: {

vehicleCondition: VehicleConditionScope

propulsion: PropulsionScope

}): number {

return (rule.vehicleCondition === 'qualquer' ? 0 : 2) + (rule.propulsion === 'qualquer' ? 0 : 1)

}



/** Regra mais específica que cobre o veículo. Empate pelo identificador, em ordem estável. */

export function selectApplicableRule(

rules: readonly RegionalTaxRule[],

query: Pick<RegionalTaxQuery, 'condition' | 'fuel'>,

): RegionalTaxRule | null {

const matches = rules.filter(

(rule) =>

conditionMatches(rule.vehicleCondition, query.condition) &&

propulsionMatches(rule.propulsion, query.fuel),

)

matches.sort((a, b) => specificity(b) - specificity(a) || a.id.localeCompare(b.id))

return matches[0] ?? null

}



/**

* Isenção aplicável. Pendente, vencida ou inválida não é aplicada.

* Sem regra de isenção cadastrada, devolve null: o QC não inventa isenção.

*/

export function getApplicableExemption(

rule: RegionalTaxRule,

query: Pick<RegionalTaxQuery, 'condition' | 'fuel'>,

asOf: string,

): ExemptionRule | null {

const matches = rule.exemptions.filter((exemption) => {

if (!conditionMatches(exemption.vehicleCondition, query.condition)) return false

if (!propulsionMatches(exemption.propulsion, query.fuel)) return false

const validation = validateExemption(exemption, asOf)

return validation.valid && !validation.expired && exemption.status !== 'pendente'

})

matches.sort((a, b) => specificity(b) - specificity(a) || a.id.localeCompare(b.id))

return matches[0] ?? null

}



function validateExemption(exemption: ExemptionRule, asOf: string): RuleValidation {

return validateRegionalRule(

{

id: exemption.id,

state: exemption.state,

tax: 'ipva',

vehicleCondition: exemption.vehicleCondition,

propulsion: exemption.propulsion,

ratePct: exemption.ratePct ?? 0,

fixedAmountBRL: null,

exemptions: [],

source: exemption.source,

legalBasis: exemption.legalBasis,

fiscalYear: exemption.fiscalYear,

validFrom: exemption.validFrom,

validUntil: exemption.validUntil,

lastVerifiedAt: exemption.lastVerifiedAt,

status: exemption.status,

},

asOf,

)

}
export function getRegionalTaxExplanation(calculation: RegionalTaxCalculation): string {

const state = stateName(calculation.state)

const lines = [

`IPVA para registro em ${state} (${calculation.state}).`,

`Confiança: ${CONFIDENCE_LABEL[calculation.confidence]}.`,

]

if (calculation.baseBRL === null) {

lines.push('Base de cálculo indisponível: o preço de referência não foi informado.')

} else if (calculation.annualBRL === null) {

lines.push('Não há alíquota aplicável. O valor não foi substituído por zero.')

} else if (calculation.fixedAmountBRL !== null && calculation.exemption === null) {

lines.push(

`Valor fixo de referência: ${calculation.fixedAmountBRL.toFixed(2)} sobre a base de ${calculation.baseBRL.toFixed(2)}.`,

)

} else if (calculation.ratePct !== null) {

lines.push(

`Base ${calculation.baseBRL.toFixed(2)} × alíquota ${calculation.ratePct.toFixed(4)}% = ${calculation.annualBRL.toFixed(2)} ao ano.`,

)

lines.push(

`Equivalente mensal: ${calculation.annualBRL.toFixed(2)} ÷ 12 = ${calculation.monthlyBRL?.toFixed(2)}, arredondado para centavos.`,

)

}

if (calculation.exemption) {

lines.push(`Isenção aplicada: ${calculation.exemption.description}.`)

}

lines.push(`Fonte: ${calculation.source}`)

if (calculation.legalBasis) lines.push(`Base legal: ${calculation.legalBasis}`)

if (calculation.fiscalYear !== null) lines.push(`Exercício: ${calculation.fiscalYear}.`)

if (calculation.rule) {

lines.push(

`Regra consultada: ${calculation.rule.id}, situação ${calculation.rule.status}, vigência ${calculation.rule.validFrom} a ${calculation.rule.validUntil}.`,

)

} else {

lines.push('Nenhuma regra deste estado foi aplicada.')

}

lines.push(

'O licenciamento continua sendo a estimativa nacional configurável. Esta tela não afirma cobertura tributária de todas as UFs.',

)

return lines.join(' ')

}



const CONFIDENCE_LABEL: Record<TaxConfidence, string> = {

oficial: 'oficial (regra verificada)',

demonstracao: 'dado de demonstração',

manual: 'valor informado nesta simulação',

indisponivel: 'informação não disponível',

}



function alert(code: RegionalTaxAlert['code'], message: string): RegionalTaxAlert {

return { code, message }

}



interface AppliedTax {

ratePct: number | null

fixedAmountBRL: number | null

confidence: TaxConfidence

source: string

legalBasis: string | null

fiscalYear: number | null

exemption: ExemptionRule | null

alerts: RegionalTaxAlert[]

}



function applyAmounts(

base: number | null,

applied: AppliedTax,

): Pick<RegionalTaxCalculation, 'annualBRL' | 'monthlyBRL' | 'alerts'> {

const alerts = [...applied.alerts]

if (base === null || !Number.isFinite(base) || base <= 0) {

return { annualBRL: null, monthlyBRL: null, alerts }

}

if (

applied.confidence === 'indisponivel' ||

(applied.ratePct === null && applied.fixedAmountBRL === null)

) {

return { annualBRL: null, monthlyBRL: null, alerts }

}

const annual =

applied.fixedAmountBRL !== null && applied.exemption === null && applied.ratePct === null

? roundMoney(applied.fixedAmountBRL)

: roundMoney((base * (applied.ratePct ?? 0)) / 100)

const monthly = roundMoney(annual / 12)

if (roundMoney(monthly * 12) !== annual) {

alerts.push(

alert(

'arredondamento',

'O equivalente mensal é o valor anual dividido por 12 e arredondado para centavos. Doze meses podem diferir do anual em alguns centavos.',

),

)

}

return { annualBRL: annual, monthlyBRL: monthly, alerts }

}



/**

* IPVA da UF. Ordem: alíquota informada na simulação, regra utilizável (com isenção),

* estimativa de demonstração marcada pela pessoa, ou valor indisponível.

* Ausência nunca vira zero.

*/

export function calculateRegionalTaxes(

query: RegionalTaxQuery,

provider: RegionalTaxProvider = catalogRegionalTaxProvider,

): RegionalTaxCalculation {

const consulted = selectApplicableRule(provider.getRules(query.state), query)

const validation = consulted ? validateRegionalRule(consulted, query.asOf) : null

const usable =

consulted !== null &&

validation !== null &&

validation.valid &&

!validation.expired &&

(consulted.status === 'verificada' || consulted.status === 'demonstracao')



const applied = resolveApplied(query, consulted, validation, usable)

const amounts = applyAmounts(query.priceBRL, applied)

const calculation: RegionalTaxCalculation = {

state: query.state,

baseBRL: query.priceBRL !== null && Number.isFinite(query.priceBRL) ? query.priceBRL : null,

ratePct: applied.ratePct,

fixedAmountBRL: applied.fixedAmountBRL,

annualBRL: amounts.annualBRL,

monthlyBRL: amounts.monthlyBRL,

rule: consulted ? snapshotRule(consulted) : null,

exemption: applied.exemption ? { ...applied.exemption } : null,

source: applied.source,

legalBasis: applied.legalBasis,

fiscalYear: applied.fiscalYear,

alerts: amounts.alerts,

confidence: applied.confidence,

explanation: '',

}

calculation.explanation = getRegionalTaxExplanation(calculation)

return calculation

}



function resolveApplied(

query: RegionalTaxQuery,

consulted: RegionalTaxRule | null,

validation: RuleValidation | null,

usable: boolean,

): AppliedTax {

const alerts: RegionalTaxAlert[] = []

if (!consulted) {

alerts.push(

alert(

'regra_ausente',

`Não há regra de IPVA cadastrada para ${stateName(query.state)}. O QC não completa com uma alíquota oficial.`,

),

)

} else {

if (!validation?.valid) {

alerts.push(

alert(

'regra_invalida',

`A regra ${consulted.id} não passou na validação e não foi aplicada.`,

),

)

}

if (validation?.expired) {

alerts.push(

alert(

'regra_vencida',

`A regra ${consulted.id} está vencida na data de referência ${query.asOf} e não foi aplicada.`,

),

)

} else if (validation?.valid && consulted.status === 'pendente') {

alerts.push(

alert(

'regra_pendente',

`A regra de ${stateName(query.state)} está pendente. Informe a alíquota ou use a estimativa de demonstração.`,

),

)

}

}
if (query.manualRatePct !== undefined && Number.isFinite(query.manualRatePct)) {

alerts.push(

alert(

'manual',

'A alíquota informada nesta simulação substitui a regra do estado. Não é alíquota oficial.',

),

)

return {

ratePct: query.manualRatePct,

fixedAmountBRL: null,

confidence: 'manual',

source: 'Valor informado nesta simulação. Não é alíquota oficial.',

legalBasis: null,

fiscalYear: null,

exemption: null,

alerts,

}

}



if (usable && consulted) {

const exemption = getApplicableExemption(consulted, query, query.asOf)

if (exemption) {

const official = consulted.status === 'verificada' && exemption.status === 'verificada'

alerts.push(

alert(

'isencao',

official

? `Isenção aplicada: ${exemption.description}.`

: `Isenção de demonstração aplicada: ${exemption.description}. Não é benefício oficial confirmado.`,

),

)

return {

ratePct: exemption.ratePct ?? 0,

fixedAmountBRL: null,

confidence: official ? 'oficial' : 'demonstracao',

source: exemption.source,

legalBasis: exemption.legalBasis,

fiscalYear: exemption.fiscalYear,

exemption,

alerts,

}

}

if (consulted.status === 'demonstracao') {

alerts.push(

alert(

'demonstracao',

`IPVA de ${stateName(consulted.state)} é dado de demonstração, não alíquota oficial.`,

),

)

}

return {

ratePct: consulted.fixedAmountBRL === null ? consulted.ratePct : null,

fixedAmountBRL: consulted.ratePct === null ? consulted.fixedAmountBRL : null,

confidence: consulted.status === 'verificada' ? 'oficial' : 'demonstracao',

source: consulted.source,

legalBasis: consulted.legalBasis,

fiscalYear: consulted.fiscalYear,

exemption: null,

alerts,

}

}



if (query.allowDemonstrativeEstimate && Number.isFinite(query.demonstrativeRatePct)) {

alerts.push(

alert(

'demonstracao',

'Estimativa de demonstração marcada nesta simulação. Não é a alíquota deste estado.',

),

)

return {

ratePct: query.demonstrativeRatePct,

fixedAmountBRL: null,

confidence: 'demonstracao',

source: 'Estimativa configurável do QC. Dado de demonstração; não é a alíquota deste estado.',

legalBasis: null,

fiscalYear: null,

exemption: null,

alerts,

}

}



if (!consulted || validation?.expired) {

alerts.push(

alert(

'regra_pendente',

'Informe a alíquota na revisão ou marque a estimativa de demonstração para estimar o IPVA.',

),

)

}



return {

ratePct: null,

fixedAmountBRL: null,

confidence: 'indisponivel',

source: 'Informação não disponível.',

legalBasis: null,

fiscalYear: null,

exemption: null,

alerts,

}

}
