import { z } from 'zod'

import { ALLOWED_LICENSE_PATTERNS, IMAGE_CONFIG, IMAGE_TITLE_PENALTIES } from '../../config/images'

import { htmlToPlainText, normalizeText } from '../../utils/text'

import type { VehicleImage, VehicleImageProvider, VehicleImageQuery } from './types'



/* -------------------------------------------------------------------------- */

/* Validação da resposta (qualquer divergência vira "sem foto", nunca erro) */

/* -------------------------------------------------------------------------- */



const metadataValue = z.object({ value: z.union([z.string(), z.number()]).optional() }).loose()



const imageInfoSchema = z

.object({

thumburl: z.string().optional(),

descriptionurl: z.string().optional(),

width: z.number().optional(),

height: z.number().optional(),

mime: z.string().optional(),

extmetadata: z

.object({

LicenseShortName: metadataValue.optional(),

LicenseUrl: metadataValue.optional(),

Artist: metadataValue.optional(),

AttributionRequired: metadataValue.optional(),

})

.loose()

.optional(),

})

.loose()



const pageSchema = z

.object({

title: z.string(),

imageinfo: z.array(imageInfoSchema).optional(),

})

.loose()



const responseSchema = z

.object({

query: z

.object({ pages: z.record(z.string(), pageSchema) })

.loose()

.optional(),

})

.loose()



type WikimediaPage = z.infer<typeof pageSchema>



/* -------------------------------------------------------------------------- */

/* Consulta */

/* -------------------------------------------------------------------------- */



const BRAND_ALIASES: Record<string, string[]> = {

volkswagen: ['vw'],

chevrolet: ['chevy', 'gm'],

mercedes: ['mercedes-benz'],

}



/** FIPE usa nomes como "VW - VolksWagen" ou "GM - Chevrolet": fica o nome comercial. */

export function cleanBrandName(brand: string): string {

const parts = brand.split(' - ')

const name = (parts[parts.length - 1] ?? brand).trim()

return name.replace(/[^\p{L}\p{N} .&-]/gu, '').trim()

}



/** "ARGO DRIVE 1.3 8V Flex Aut." -> "Argo": a família do modelo é a primeira palavra. */

export function modelFamily(model: string): string {

const first = model.trim().split(/\s+/)[0] ?? ''

return first.replace(/[^\p{L}\p{N}-]/gu, '')

}



export function buildSearchTerms(

query: VehicleImageQuery,

): { brand: string; family: string } | null {

const brand = cleanBrandName(query.brand)

const family = modelFamily(query.model)

if (brand.length < 2 || family.length < 2) return null

return { brand, family }

}



function cacheKey(query: VehicleImageQuery): string {

return normalizeText(

`${cleanBrandName(query.brand)}|${modelFamily(query.model)}|${query.modelYear}`,

)

}



/* -------------------------------------------------------------------------- */

/* Escolha e validação do melhor arquivo */

/* -------------------------------------------------------------------------- */



function isHttpsHost(value: string | undefined, hosts: readonly string[]): value is string {

if (!value) return false

try {

const url = new URL(value)

return url.protocol === 'https:' && hosts.includes(url.hostname)

} catch {

return false

}

}



function safeLicenseUrl(value: string | undefined): string | null {

if (!value) return null

try {

const url = new URL(value)

const allowed = ['creativecommons.org', IMAGE_CONFIG.pageHost]

return url.protocol === 'https:' && allowed.includes(url.hostname) ? url.toString() : null

} catch {

return null

}

}



function metaText(entry: { value?: string | number | undefined } | undefined): string {

return entry?.value === undefined ? '' : String(entry.value)

}



export function isAllowedLicense(shortName: string): boolean {

const text = htmlToPlainText(shortName).trim()

return ALLOWED_LICENSE_PATTERNS.some((pattern) => pattern.test(text))

}



function titleWithoutPrefix(title: string): string {

return title.replace(/^file:/i, '')

}



/** Converte uma página da API em imagem válida e pontuada, ou `null` se algum requisito falhar. */

export function evaluatePage(

page: WikimediaPage,

query: VehicleImageQuery,

): { image: VehicleImage; score: number } | null {

const terms = buildSearchTerms(query)

const info = page.imageinfo?.[0]

if (!terms || !info) return null



const mime = info.mime ?? ''

if (!(IMAGE_CONFIG.allowedMime as readonly string[]).includes(mime)) return null

if (!isHttpsHost(info.thumburl, IMAGE_CONFIG.imageHosts)) return null

if (!isHttpsHost(info.descriptionurl, [IMAGE_CONFIG.pageHost])) return null



const { width, height } = info

if (!width || !height || width / height < IMAGE_CONFIG.minAspectRatio) return null



const license = htmlToPlainText(metaText(info.extmetadata?.LicenseShortName))

if (!license || !isAllowedLicense(license)) return null



const title = titleWithoutPrefix(page.title)

const normalizedTitle = normalizeText(title)

const family = normalizeText(terms.family)

const brand = normalizeText(terms.brand)

const brandWords = [brand, ...(BRAND_ALIASES[brand] ?? [])]



// Exige modelo e marca no título: evita fotos de outro carro ou de coisas sem relação.

if (!normalizedTitle.includes(family)) return null

if (!brandWords.some((word) => normalizedTitle.includes(word))) return null

if (IMAGE_TITLE_PENALTIES.some((pattern) => pattern.test(normalizedTitle))) return null



let score = 10

if (normalizedTitle.includes(String(query.modelYear))) score += 4

const extraModelWords = normalizeText(query.model)

.split(' ')

.slice(1, 3)

.filter((word) => word.length > 2 && /^\p{L}+$/u.test(word))

score += extraModelWords.filter((word) => normalizedTitle.includes(word)).length * 2

// Fotos mais largas costumam mostrar o carro inteiro.

score += Math.min(width / height, 2)



const author = htmlToPlainText(metaText(info.extmetadata?.Artist)).slice(

0,

IMAGE_CONFIG.maxAuthorLength,

)



return {

score,

image: {

url: info.thumburl,

pageUrl: info.descriptionurl,

title: title.slice(0, IMAGE_CONFIG.maxTitleLength),

author,

license: license.slice(0, 40),

licenseUrl: safeLicenseUrl(metaText(info.extmetadata?.LicenseUrl)),

},

}

}



export function pickBestImage(

pages: readonly WikimediaPage[],

query: VehicleImageQuery,

): VehicleImage | null {

let best: { image: VehicleImage; score: number } | null = null

for (const page of pages) {

const candidate = evaluatePage(page, query)

if (candidate && (!best || candidate.score > best.score)) best = candidate

}

return best?.image ?? null

}



/* -------------------------------------------------------------------------- */

/* Provedor */

/* -------------------------------------------------------------------------- */



export interface WikimediaProviderOptions {

fetchImpl?: typeof fetch

timeoutMs?: number

concurrency?: number

}



/** Limita requisições simultâneas (a Wikimedia pede uso moderado da API). */

function createLimiter(limit: number) {

let active = 0

const waiting: Array<() => void> = []

return async function run<T>(task: () => Promise<T>): Promise<T> {

if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve))

active += 1

try {

return await task()

} finally {

active -= 1

waiting.shift()?.()

}

}

}
export function buildRequestUrl(terms: { brand: string; family: string }): string {

const params = new URLSearchParams({

action: 'query',

format: 'json',

origin: '*',

generator: 'search',

gsrnamespace: '6',

gsrlimit: String(IMAGE_CONFIG.searchLimit),

gsrsearch: `filetype:bitmap ${terms.brand} ${terms.family}`,

prop: 'imageinfo',

iiprop: 'url|size|mime|extmetadata',

iiurlwidth: String(IMAGE_CONFIG.thumbnailWidth),

iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|AttributionRequired',

})

return `${IMAGE_CONFIG.apiUrl}?${params.toString()}`

}



/**

* Busca fotos na Wikimedia Commons. Só envia marca e modelo do veículo (nenhum dado do usuário).

* Faz cache em memória (inclusive de "sem foto") e nunca lança: qualquer falha vira `null`.

*/

export function createWikimediaImageProvider(

options: WikimediaProviderOptions = {},

): VehicleImageProvider {

const fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args))

const timeoutMs = options.timeoutMs ?? IMAGE_CONFIG.timeoutMs

const limit = createLimiter(options.concurrency ?? IMAGE_CONFIG.concurrency)

const cache = new Map<string, Promise<VehicleImage | null>>()



async function fetchImage(query: VehicleImageQuery): Promise<VehicleImage | null> {

const terms = buildSearchTerms(query)

if (!terms) return null

const controller = new AbortController()

const timer = setTimeout(() => controller.abort(), timeoutMs)

try {

const response = await fetchImpl(buildRequestUrl(terms), {

signal: controller.signal,

credentials: 'omit',

referrerPolicy: 'no-referrer',

headers: { Accept: 'application/json' },

})

if (!response.ok) throw new Error(`HTTP ${response.status}`)

const parsed = responseSchema.safeParse(await response.json())

if (!parsed.success) return null

return pickBestImage(Object.values(parsed.data.query?.pages ?? {}), query)

} finally {

clearTimeout(timer)

}

}



return {

id: 'wikimedia-commons',

find(query, signal) {

if (signal?.aborted) return Promise.resolve(null)

const key = cacheKey(query)

const cached = cache.get(key)

if (cached) return cached

const pending = limit(() => fetchImage(query)).catch(() => {

// Falha de rede/timeout: não guarda em cache para permitir nova tentativa depois.

cache.delete(key)

return null

})

cache.set(key, pending)

return pending

},

}

}
