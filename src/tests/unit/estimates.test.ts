import { describe, expect, it } from 'vitest'

import { runDecision } from '../../domain/decision/pipeline'

import { buildCostLines } from '../../domain/finance/estimates'

import { REFERENCE_YEAR, loadCatalogVehicles, makeInput, makeVehicle } from '../fixtures/factories'



describe('buildCostLines (metadados de cada estimativa)', () => {

const input = makeInput()

const result = runDecision(input, loadCatalogVehicles(), { referenceYear: REFERENCE_YEAR })

const item = result.ranking[0]!



it('gera todas as linhas com metadados completos', () => {

const lines = buildCostLines(item, input, '2026-11')

expect(lines.map((line) => line.key)).toEqual([

'price',

'installment',

'ipva',

'licensing',

'insurance',

'maintenance',

'energy',

'depreciation',

'total',

])

for (const line of lines) {

expect(line.meta.label.length).toBeGreaterThan(0)

expect(line.meta.assumption.length).toBeGreaterThan(10)

expect(line.meta.reference).toMatch(/^\d{4}-\d{2}$/)

expect(['alta', 'media', 'baixa']).toContain(line.meta.reliability)

expect(typeof line.meta.adjustable).toBe('boolean')

}

})



it('a soma das parcelas mensais equivale ao custo mensal total', () => {

const lines = buildCostLines(item, input, '2026-11')

const amount = (key: string) => lines.find((line) => line.key === key)?.amount ?? NaN

const sum =

amount('installment') +

amount('ipva') +

amount('licensing') +

amount('insurance') +

amount('maintenance') +

amount('energy') +

amount('depreciation')

expect(sum).toBeCloseTo(amount('total'), 6)

})



it('marca estimativas demonstrativas como baixa confiabilidade e não ajustáveis', () => {

const lines = buildCostLines(item, input, '2026-11')

const insurance = lines.find((line) => line.key === 'insurance')!

expect(insurance.meta.origin).toBe('estimativa_demonstrativa')

expect(insurance.meta.reliability).toBe('baixa')

expect(insurance.meta.adjustable).toBe(false)

expect(lines.find((line) => line.key === 'ipva')!.meta.adjustable).toBe(true)

})



it('compra à vista informa que não há parcela', () => {

const cash = makeInput({

objective: { purchaseMode: 'avista' },

finance: { downPayment: 500000, accumulatedReserve: 510000 },

})

const cashResult = runDecision(cash, loadCatalogVehicles(), { referenceYear: REFERENCE_YEAR })

const lines = buildCostLines(cashResult.ranking[0]!, cash, '2026-11')

const installment = lines.find((line) => line.key === 'installment')!

expect(installment.amount).toBe(0)

expect(installment.meta.assumption).toMatch(/sem parcela/i)

})



it('dado ausente permanece null (nunca vira zero)', () => {

const vehicle = makeVehicle({ maintenanceAnnualBRL: null })

const partial = runDecision(makeInput(), [vehicle, ...loadCatalogVehicles().slice(0, 12)], {

referenceYear: REFERENCE_YEAR,

})

const found = partial.ranking.find((entry) => entry.vehicle.id === vehicle.id)

// Com manutenção ausente o custo total fica indisponível, e a linha reflete isso.

if (found) {

const lines = buildCostLines(found, makeInput(), '2026-11')

expect(lines.find((line) => line.key === 'maintenance')!.amount).toBeNull()

expect(lines.find((line) => line.key === 'total')!.amount).toBeNull()

} else {

expect(partial.excluded.some((record) => record.vehicleId === vehicle.id)).toBe(true)

}

})

})
