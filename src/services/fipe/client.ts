import type { z } from 'zod'

import { FIPE_CONFIG } from '../../config/fipe'

import type { FipePriceRecord } from '../../types/vehicle'

import { adaptFipePriceResponse } from './adapter'

import { createDefaultFipeCache, type TtlCache } from './cache'

import { FipeError } from './errors'

import {

fipeBrandsSchema,

fipeModelsSchema,

fipePriceResponseSchema,

fipeYearsSchema,

type FipeBrand,

} from './schemas'



export interface FipeClientOptions {

baseUrl?: string

fetchImpl?: typeof fetch

timeoutMs?: number

maxRetries?: number

maxBackoffMs?: number

baseBackoffMs?: number

cacheTtlMs?: number

cache?: TtlCache

sleep?: (ms: number) => Promise<void>

}



export interface RequestOptions {

signal?: AbortSignal

forceRefresh?: boolean

}



export interface FipeClient {

getBrands(options?: RequestOptions): Promise<FipeBrand[]>

getModels(brandId: string, options?: RequestOptions): Promise<FipeBrand[]>

getYears(brandId: string, modelId: string, options?: RequestOptions): Promise<FipeBrand[]>

getPrice(

brandId: string,

modelId: string,

yearId: string,

options?: RequestOptions,

): Promise<FipePriceRecord>

}



/** Identificadores de URL aceitos: evita manipulação de parâmetros e path traversal. */

const SAFE_ID = /^[A-Za-z0-9_-]{1,32}$/



function assertSafeId(label: string, value: string): string {

if (!SAFE_ID.test(value)) {

throw new FipeError('invalid_response', `Identificador inválido para ${label}.`)

}

return encodeURIComponent(value)

}



const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))



function parseRetryAfter(header: string | null): number | undefined {

if (!header) return undefined

const seconds = Number(header)

if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000

const date = Date.parse(header)

if (!Number.isNaN(date)) return Math.max(date - Date.now(), 0)

return undefined

}



/**

* Cliente da API FIPE v2 (https://fipe.parallelum.com.br/api/v2).

* Recursos: timeout, retry com backoff para falhas transitórias, tratamento de HTTP 429

* (respeita Retry-After), validação Zod das respostas e cache com TTL.

*/

export function createFipeClient(options: FipeClientOptions = {}): FipeClient {

const baseUrl = (options.baseUrl ?? FIPE_CONFIG.baseUrl).replace(/\/+$/, '')

const fetchImpl = options.fetchImpl ?? ((...args) => globalThis.fetch(...args))

const timeoutMs = options.timeoutMs ?? FIPE_CONFIG.timeoutMs

const maxRetries = options.maxRetries ?? FIPE_CONFIG.maxRetries

const maxBackoffMs = options.maxBackoffMs ?? FIPE_CONFIG.maxBackoffMs

const baseBackoffMs = options.baseBackoffMs ?? FIPE_CONFIG.baseBackoffMs

const cacheTtlMs = options.cacheTtlMs ?? FIPE_CONFIG.cacheTtlMs

const cache = options.cache ?? createDefaultFipeCache()

const sleep = options.sleep ?? defaultSleep



async function attempt(url: string, signal: AbortSignal | undefined): Promise<unknown> {

const controller = new AbortController()

let timedOut = false

const timer = setTimeout(() => {

timedOut = true

controller.abort()

}, timeoutMs)

const onExternalAbort = () => controller.abort()

signal?.addEventListener('abort', onExternalAbort, { once: true })



try {

let response: Response

try {

response = await fetchImpl(url, {

signal: controller.signal,

headers: { Accept: 'application/json' },

credentials: 'omit',

})

} catch (error) {

if (signal?.aborted) throw new FipeError('aborted', 'Requisição cancelada.')

if (timedOut) throw new FipeError('timeout', `Tempo limite de ${timeoutMs} ms excedido.`)

throw new FipeError('network', error instanceof Error ? error.message : 'Falha de rede.')

}



if (response.status === 429) {

throw new FipeError('rate_limit', 'HTTP 429', {

status: 429,

retryAfterMs: parseRetryAfter(response.headers.get('retry-after')),

})

}

if (!response.ok) {

throw new FipeError('http', `HTTP ${response.status}`, { status: response.status })

}

try {

return (await response.json()) as unknown

} catch {

throw new FipeError('invalid_response', 'Corpo da resposta não é JSON válido.')

}

} finally {

clearTimeout(timer)

signal?.removeEventListener('abort', onExternalAbort)

}

}



function isRetryable(error: FipeError): boolean {

if (error.kind === 'network' || error.kind === 'timeout' || error.kind === 'rate_limit')

return true

return error.kind === 'http' && (error.status ?? 0) >= 500

}



async function requestJson<T extends z.ZodType>(

path: string,

schema: T,

requestOptions: RequestOptions | undefined,

): Promise<z.infer<T>> {

if (!requestOptions?.forceRefresh) {

const cached = cache.get(path)

if (cached !== undefined) {

const parsed = schema.safeParse(cached)

if (parsed.success) return parsed.data

cache.delete(path) // cache corrompido ou de outra versão

}

}



const url = `${baseUrl}${path}`

let lastError: FipeError | undefined



for (let tryNumber = 0; tryNumber <= maxRetries; tryNumber += 1) {

if (requestOptions?.signal?.aborted) throw new FipeError('aborted', 'Requisição cancelada.')

try {

const body = await attempt(url, requestOptions?.signal)

const parsed = schema.safeParse(body)

if (!parsed.success) {

throw new FipeError('invalid_response', 'Resposta fora do formato esperado.')

}

cache.set(path, parsed.data, cacheTtlMs)

return parsed.data

} catch (error) {

const fipeError =

error instanceof FipeError

? error

: new FipeError(

'network',

error instanceof Error ? error.message : 'Falha desconhecida.',

)

lastError = fipeError

if (!isRetryable(fipeError) || tryNumber === maxRetries) break



const exponential = baseBackoffMs * 2 ** tryNumber

const wait =

fipeError.kind === 'rate_limit' ? (fipeError.retryAfterMs ?? exponential) : exponential

// Se a espera exigida for longa demais, desiste e deixa a interface orientar o usuário.

if (wait > maxBackoffMs) break

await sleep(wait)

}

}

throw lastError ?? new FipeError('network', 'Falha desconhecida.')

}



// Métodos async: identificadores inválidos viram Promise rejeitada (nunca exceção síncrona).

return {

getBrands: async (opts) => requestJson('/cars/brands', fipeBrandsSchema, opts),

getModels: async (brandId, opts) =>

requestJson(`/cars/brands/${assertSafeId('marca', brandId)}/models`, fipeModelsSchema, opts),

getYears: async (brandId, modelId, opts) =>

requestJson(

`/cars/brands/${assertSafeId('marca', brandId)}/models/${assertSafeId('modelo', modelId)}/years`,

fipeYearsSchema,

opts,

),

getPrice: async (brandId, modelId, yearId, opts) => {

const body = await requestJson(

`/cars/brands/${assertSafeId('marca', brandId)}/models/${assertSafeId('modelo', modelId)}/years/${assertSafeId('ano', yearId)}`,

fipePriceResponseSchema,

opts,

)

return adaptFipePriceResponse(body)

},

}

}
