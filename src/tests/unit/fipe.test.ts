import {
  adaptFipePriceResponse,
  mapFipeFuel,
  parseFipePrice,
  parseReferenceMonth,
} from '../../services/fipe/adapter'

import { MemoryTtlCache, StorageTtlCache } from '../../services/fipe/cache'

import { createFipeClient } from '../../services/fipe/client'

import { FipeError } from '../../services/fipe/errors'

import { FipeVehicleDataProvider } from '../../services/vehicles/FipeVehicleDataProvider'

import { MockVehicleDataProvider } from '../../services/vehicles/MockVehicleDataProvider'

import { SUPPLEMENT_DATA } from '../../config/vehicleSupplementData'

const validPrice = {
  vehicleType: 1,

  price: 'R$ 45.828,00',

  brand: 'Fiat',

  model: 'MOBI DRIVE 1.0 Flex 6V 5p',

  modelYear: 2020,

  fuel: 'Flex',

  codeFipe: '001480-0',

  referenceMonth: 'novembro de 2026',

  fuelAcronym: 'F',
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,

    headers: { 'content-type': 'application/json' },

    ...init,
  })
}

const instantSleep = () => Promise.resolve()

function makeClient(fetchImpl: typeof fetch, extra: Parameters<typeof createFipeClient>[0] = {}) {
  return createFipeClient({
    fetchImpl,

    cache: new MemoryTtlCache(),

    sleep: instantSleep,

    timeoutMs: 50,

    maxRetries: 2,

    ...extra,
  })
}

describe('adaptador da FIPE', () => {
  it('converte preço em reais', () => {
    expect(parseFipePrice('R$ 45.828,00')).toBe(45828)

    expect(parseFipePrice('R$\u00a01.234.567,89')).toBeCloseTo(1234567.89, 2)
  })

  it.each(['', 'abc', 'R$ -10,00', 'R$ 0,00', 'R$ 10,5,5', 'USD 10'])(
    'rejeita preço inválido "%s"',

    (raw) => {
      expect(() => parseFipePrice(raw)).toThrow(FipeError)
    },
  )

  it('normaliza o mês de referência', () => {
    expect(parseReferenceMonth('novembro de 2026')).toBe('2026-11')

    expect(parseReferenceMonth('março de 2025')).toBe('2025-03')

    expect(parseReferenceMonth('qualquer coisa')).toBeNull()
  })

  it('mapeia combustíveis e preserva o desconhecido como null', () => {
    expect(mapFipeFuel('Flex')).toBe('flex')

    expect(mapFipeFuel('Híbrido')).toBe('hibrido')

    expect(mapFipeFuel('Elétrico')).toBe('eletrico')

    expect(mapFipeFuel('Álcool')).toBe('etanol')

    expect(mapFipeFuel('Gás natural')).toBeNull()
  })

  it('adapta somente campos retornados pela API (sem inventar consumo, seguro, etc.)', () => {
    const record = adaptFipePriceResponse(validPrice)

    expect(Object.keys(record).sort()).toEqual(
      [
        'brand',

        'fipeCode',

        'fuel',

        'fuelLabel',

        'model',

        'modelYear',

        'priceBRL',

        'referenceMonth',

        'referenceMonthLabel',
      ].sort(),
    )

    expect(record).toMatchObject({
      fipeCode: '001480-0',

      priceBRL: 45828,

      referenceMonth: '2026-11',
    })
  })

  it.each([
    ['campo obrigatório ausente', { ...validPrice, codeFipe: undefined }],

    ['tipo errado', { ...validPrice, modelYear: '2020' }],

    ['resposta não objeto', 'texto'],

    ['null', null],

    ['array', []],
  ])('rejeita resposta inesperada: %s', (_label, payload) => {
    expect(() => adaptFipePriceResponse(payload)).toThrow(FipeError)
  })
})

describe('cache com validade', () => {
  it('expira após o TTL', () => {
    let now = 1000

    const cache = new MemoryTtlCache(() => now)

    cache.set('k', { a: 1 }, 500)

    expect(cache.get('k')).toEqual({ a: 1 })

    now = 1499

    expect(cache.get('k')).toEqual({ a: 1 })

    now = 1500

    expect(cache.get('k')).toBeUndefined()
  })

  it('persiste em Storage e descarta entradas expiradas ou corrompidas', () => {
    let now = 0

    const cache = new StorageTtlCache(window.localStorage, 'teste:', () => now)

    cache.set('x', [1, 2], 100)

    expect(cache.get('x')).toEqual([1, 2])

    window.localStorage.setItem('teste:ruim', '{nao-json')

    expect(cache.get('ruim')).toBeUndefined()

    now = 200

    expect(cache.get('x')).toBeUndefined()

    cache.set('y', 1, 100)

    cache.clear()

    expect(cache.get('y')).toBeUndefined()
  })
})

describe('cliente FIPE', () => {
  it('busca e valida marcas, usa o endpoint correto e guarda em cache', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) =>
      json([{ code: '21', name: 'Fiat' }]),
    )

    const client = makeClient(fetchImpl as unknown as typeof fetch)

    const first = await client.getBrands()

    const second = await client.getBrands()

    expect(first).toEqual([{ code: '21', name: 'Fiat' }])

    expect(second).toEqual(first)

    expect(fetchImpl).toHaveBeenCalledTimes(1)

    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(
      'https://fipe.parallelum.com.br/api/v2/cars/brands',
    )
  })

  it('usa os endpoints esperados para modelos, anos e preço', async () => {
    const urls: string[] = []

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      urls.push(String(input))

      if (urls.length === 3) return json(validPrice)

      return json([{ code: '1', name: 'x' }])
    })

    const client = makeClient(fetchImpl as unknown as typeof fetch)

    await client.getModels('21')

    await client.getYears('21', '7825')

    const price = await client.getPrice('21', '7825', '2020-5')

    expect(price.priceBRL).toBe(45828)

    expect(urls).toEqual([
      'https://fipe.parallelum.com.br/api/v2/cars/brands/21/models',

      'https://fipe.parallelum.com.br/api/v2/cars/brands/21/models/7825/years',

      'https://fipe.parallelum.com.br/api/v2/cars/brands/21/models/7825/years/2020-5',
    ])
  })

  it('forceRefresh ignora o cache', async () => {
    const fetchImpl = vi.fn(async () => json([{ code: '1', name: 'A' }]))

    const client = makeClient(fetchImpl as unknown as typeof fetch)

    await client.getBrands()

    await client.getBrands({ forceRefresh: true })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('HTTP 429: respeita Retry-After curto e tenta novamente com sucesso', async () => {
    const sleeps: number[] = []

    let calls = 0

    const fetchImpl = vi.fn(async () => {
      calls += 1

      if (calls === 1) return new Response('', { status: 429, headers: { 'retry-after': '2' } })

      return json(validPrice)
    })

    const client = makeClient(fetchImpl as unknown as typeof fetch, {
      sleep: async (ms) => {
        sleeps.push(ms)
      },
    })

    const price = await client.getPrice('21', '7825', '2020-5')

    expect(price.fipeCode).toBe('001480-0')

    expect(sleeps).toEqual([2000])
  })

  it('HTTP 429 persistente: erro rate_limit com mensagem compreensível', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 429 }))

    const client = makeClient(fetchImpl as unknown as typeof fetch)

    const error = await client.getBrands().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(FipeError)

    expect((error as FipeError).kind).toBe('rate_limit')

    expect((error as FipeError).userMessage).toMatch(/limite de consultas/i)

    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('HTTP 429 com espera muito longa: desiste sem esperar', async () => {
    const sleeps: number[] = []

    const fetchImpl = vi.fn(
      async () => new Response('', { status: 429, headers: { 'retry-after': '3600' } }),
    )

    const client = makeClient(fetchImpl as unknown as typeof fetch, {
      sleep: async (ms) => {
        sleeps.push(ms)
      },
    })

    const error = await client.getBrands().catch((e: unknown) => e)

    expect((error as FipeError).kind).toBe('rate_limit')

    expect(sleeps).toEqual([])

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('falha de rede: tenta novamente e depois informa erro claro', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const client = makeClient(fetchImpl as unknown as typeof fetch)

    const error = await client.getBrands().catch((e: unknown) => e)

    expect((error as FipeError).kind).toBe('network')

    expect((error as FipeError).userMessage).toMatch(/conectar/i)

    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('timeout: aborta a requisição lenta', async () => {
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('abortado', 'AbortError')),
          )
        }),
    )

    const client = makeClient(fetchImpl as unknown as typeof fetch, {
      maxRetries: 0,

      timeoutMs: 20,
    })

    const error = await client.getBrands().catch((e: unknown) => e)

    expect((error as FipeError).kind).toBe('timeout')
  })

  it('cancelamento externo não é tentado novamente', async () => {
    const controller = new AbortController()

    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('abortado', 'AbortError')),
          )

          controller.abort()
        }),
    )

    const client = makeClient(fetchImpl as unknown as typeof fetch, { timeoutMs: 5000 })

    const error = await client.getBrands({ signal: controller.signal }).catch((e: unknown) => e)

    expect((error as FipeError).kind).toBe('aborted')

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('erro 5xx é tentado novamente; 404 não', async () => {
    let calls = 0

    const flaky = vi.fn(async () => {
      calls += 1

      return calls < 3 ? new Response('', { status: 503 }) : json([{ code: '1', name: 'A' }])
    })

    expect(await makeClient(flaky as unknown as typeof fetch).getBrands()).toHaveLength(1)

    const notFound = vi.fn(async () => new Response('', { status: 404 }))

    const error = await makeClient(notFound as unknown as typeof fetch)
      .getBrands()

      .catch((e: unknown) => e)

    expect((error as FipeError).kind).toBe('http')

    expect(notFound).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['formato inesperado', { not: 'an array' }],

    ['item inválido', [{ code: 1, name: null }]],

    ['lista vazia de campos', [{}]],
  ])('descarta resposta com %s', async (_label, body) => {
    const fetchImpl = vi.fn(async () => json(body))

    const error = await makeClient(fetchImpl as unknown as typeof fetch)
      .getBrands()

      .catch((e: unknown) => e)

    expect((error as FipeError).kind).toBe('invalid_response')
  })

  it('resposta que não é JSON é invalid_response', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>erro</html>', { status: 200 }))

    const error = await makeClient(fetchImpl as unknown as typeof fetch, { maxRetries: 0 })
      .getBrands()

      .catch((e: unknown) => e)

    expect((error as FipeError).kind).toBe('invalid_response')
  })

  it('cache corrompido é descartado e refeito', async () => {
    const cache = new MemoryTtlCache()

    cache.set('/cars/brands', { corrompido: true }, 10_000)

    const fetchImpl = vi.fn(async () => json([{ code: '1', name: 'A' }]))

    const client = makeClient(fetchImpl as unknown as typeof fetch, { cache })

    expect(await client.getBrands()).toEqual([{ code: '1', name: 'A' }])

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it.each(['../etc/passwd', '21/../../x', 'a b', '', 'x'.repeat(40), '1?x=2'])(
    'rejeita identificador manipulado "%s" sem chamar a rede',

    async (id) => {
      const fetchImpl = vi.fn(async () => json([]))

      const client = makeClient(fetchImpl as unknown as typeof fetch)

      await expect(client.getModels(id)).rejects.toBeInstanceOf(FipeError)

      expect(fetchImpl).not.toHaveBeenCalled()
    },
  )
})

describe('provedores de dados de veículos', () => {
  it('o provedor local (mock) entrega a base completa sem rede, com mês FIPE registrado', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const catalog = await new MockVehicleDataProvider().loadCatalog()

    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()

    expect(catalog.vehicles).toHaveLength(SUPPLEMENT_DATA.length)

    expect(catalog.referenceMonth).toBe('2026-11')

    expect(catalog.liveStatus).toBe('referencia_salva')

    expect(catalog.retryable).toBe(false)

    expect(catalog.onlineCount).toBe(0)
  })

  it('o catálogo local é estável entre chamadas (versão reproduzível)', async () => {
    const provider = new MockVehicleDataProvider()

    const [a, b] = await Promise.all([provider.loadCatalog(), provider.loadCatalog()])

    expect(a.version).toBe(b.version)

    expect(a.vehicles.map((v) => v.id)).toEqual(b.vehicles.map((v) => v.id))
  })

  it('FIPE disponível: usa preços online', async () => {
    const client = {
      getBrands: vi.fn(),

      getModels: vi.fn(),

      getYears: vi.fn(),

      getPrice: vi.fn(async (_b: string, _m: string, y: string) => {
        const record = SUPPLEMENT_DATA.find((r) => r.fipeYearId === y)!

        return {
          fipeCode: record.fipeCode,

          brand: 'Marca',

          model: 'Modelo',

          modelYear: 2023,

          fuel: 'flex' as const,

          fuelLabel: 'Flex',

          priceBRL: 70000,

          referenceMonthLabel: 'dezembro de 2026',

          referenceMonth: '2026-12',
        }
      }),
    }

    const provider = new FipeVehicleDataProvider(client, SUPPLEMENT_DATA.slice(0, 1))

    const catalog = await provider.loadCatalog()

    expect(catalog.liveStatus).toBe('online')

    expect(catalog.vehicles[0]?.priceSource).toBe('fipe_online')

    expect(catalog.referenceMonth).toBe('2026-12')

    expect(catalog.warnings).toEqual([])
  })

  it('API indisponível: usa a referência salva, avisa e permite tentar novamente', async () => {
    const client = {
      getBrands: vi.fn(),

      getModels: vi.fn(),

      getYears: vi.fn(),

      getPrice: vi.fn(async () => {
        throw new FipeError('network', 'offline')
      }),
    }

    const provider = new FipeVehicleDataProvider(client)

    const catalog = await provider.loadCatalog()

    expect(catalog.vehicles).toHaveLength(SUPPLEMENT_DATA.length)

    expect(catalog.liveStatus).toBe('referencia_salva')

    expect(catalog.retryable).toBe(true)

    expect(catalog.warnings[0]).toMatch(/conectar/i)

    expect(catalog.vehicles.every((v) => v.priceSource === 'fipe_referencia_salva')).toBe(true)
  })

  it('HTTP 429: interrompe as consultas online seguintes para não agravar o limite', async () => {
    const getPrice = vi.fn(async () => {
      throw new FipeError('rate_limit', '429', { status: 429 })
    })

    const client = { getBrands: vi.fn(), getModels: vi.fn(), getYears: vi.fn(), getPrice }

    const provider = new FipeVehicleDataProvider(client, SUPPLEMENT_DATA, undefined, 1)

    const catalog = await provider.loadCatalog()

    expect(getPrice).toHaveBeenCalledTimes(1)

    expect(catalog.vehicles).toHaveLength(SUPPLEMENT_DATA.length)

    expect(catalog.warnings[0]).toMatch(/limite de consultas/i)

    expect(catalog.retryable).toBe(true)
  })

  it('código FIPE divergente é descartado e substituído pela referência salva', async () => {
    const client = {
      getBrands: vi.fn(),

      getModels: vi.fn(),

      getYears: vi.fn(),

      getPrice: vi.fn(async () => ({
        fipeCode: '999999-9',

        brand: 'X',

        model: 'Y',

        modelYear: 2023,

        fuel: 'flex' as const,

        fuelLabel: 'Flex',

        priceBRL: 1,

        referenceMonthLabel: 'novembro de 2026',

        referenceMonth: '2026-11',
      })),
    }
    const catalog = await new FipeVehicleDataProvider(
      client,

      SUPPLEMENT_DATA.slice(0, 2),
    ).loadCatalog()

    expect(catalog.liveStatus).toBe('referencia_salva')

    expect(catalog.vehicles.every((v) => v.priceBRL !== 1)).toBe(true)
  })

  it('cancelamento propaga como erro aborted', async () => {
    const controller = new AbortController()

    controller.abort()

    const client = { getBrands: vi.fn(), getModels: vi.fn(), getYears: vi.fn(), getPrice: vi.fn() }

    await expect(
      new FipeVehicleDataProvider(client).loadCatalog({ signal: controller.signal }),
    ).rejects.toMatchObject({
      kind: 'aborted',
    })
  })

  it('dados técnicos nunca são atribuídos à FIPE', async () => {
    const catalog = await new MockVehicleDataProvider().loadCatalog()

    const vehicle = catalog.vehicles[0]!

    // o preço é FIPE; consumo/seguro/manutenção/depreciação vêm da base complementar

    expect(vehicle.hasSupplement).toBe(true)

    expect(vehicle.supplementUpdatedAt).toBe('2026-11-06')
  })
})
