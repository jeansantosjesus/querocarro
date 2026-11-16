import type { Fuel, FipePriceRecord } from '../../types/vehicle'

import { FipeError } from './errors'

import { fipePriceResponseSchema } from './schemas'



const MONTHS: Record<string, string> = {

janeiro: '01',

fevereiro: '02',

marco: '03',

março: '03',

abril: '04',

maio: '05',

junho: '06',

julho: '07',

agosto: '08',

setembro: '09',

outubro: '10',

novembro: '11',

dezembro: '12',

}



/** "R$ 45.828,00" -> 45828. Lança FipeError se o formato não for reconhecido. */

export function parseFipePrice(raw: string): number {

const cleaned = raw

.replace(/R\$/i, '')

.replace(/[\s\u00a0]/g, '')

.replace(/\./g, '')

.replace(',', '.')

if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {

throw new FipeError('invalid_response', `Preço em formato inesperado: "${raw}"`)

}

const value = Number(cleaned)

if (!Number.isFinite(value) || value <= 0) {

throw new FipeError('invalid_response', `Preço inválido: "${raw}"`)

}

return value

}



/** "novembro de 2026" -> "2026-11". Retorna null se não reconhecer (o rótulo original é preservado). */

export function parseReferenceMonth(label: string): string | null {

const match = /^\s*([A-Za-zÀ-ÿ]+)\s+de\s+(\d{4})\s*$/.exec(label)

if (!match) return null

const month = MONTHS[(match[1] ?? '').toLowerCase()]

return month ? `${match[2]}-${month}` : null

}



export function mapFipeFuel(label: string): Fuel | null {

const normalized = label

.normalize('NFD')

.replace(/[\u0300-\u036f]/g, '')

.toLowerCase()

.trim()

switch (normalized) {

case 'flex':

return 'flex'

case 'gasolina':

return 'gasolina'

case 'alcool':

case 'etanol':

return 'etanol'

case 'diesel':

return 'diesel'

case 'hibrido':

return 'hibrido'

case 'eletrico':

return 'eletrico'

default:

return null

}

}



/**

* Adaptador: converte a resposta da API para o modelo interno, isolando o restante

* do sistema da estrutura da FIPE. Valida o formato antes de adaptar.

*/

export function adaptFipePriceResponse(payload: unknown): FipePriceRecord {

const parsed = fipePriceResponseSchema.safeParse(payload)

if (!parsed.success) {

throw new FipeError('invalid_response', 'Resposta de preço fora do formato esperado.')

}

const data = parsed.data

return {

fipeCode: data.codeFipe.trim(),

brand: data.brand.trim(),

model: data.model.trim(),

modelYear: data.modelYear,

fuel: mapFipeFuel(data.fuel),

fuelLabel: data.fuel,

priceBRL: parseFipePrice(data.price),

referenceMonthLabel: data.referenceMonth,

referenceMonth: parseReferenceMonth(data.referenceMonth),

}

}
