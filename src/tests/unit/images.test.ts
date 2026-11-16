import { describe, expect, it, vi } from 'vitest'

import {
  buildRequestUrl,
  cleanBrandName,
  createWikimediaImageProvider,
  isAllowedLicense,
  modelFamily,
} from '../../services/images/wikimedia'

import { htmlToPlainText } from '../../utils/text'

const QUERY = { brand: 'Fiat', model: 'ARGO DRIVE 1.3 8V Flex Aut.', modelYear: 2023 }

interface FakeFile {
  title?: string

  thumburl?: string

  descriptionurl?: string

  width?: number

  height?: number

  mime?: string

  license?: string

  artist?: string

  licenseUrl?: string
}

function page(file: FakeFile) {
  return {
    title: file.title ?? 'File:Fiat Argo Drive 2023.jpg',

    imageinfo: [
      {
        thumburl: file.thumburl ?? 'https://upload.wikimedia.org/thumb/argo.jpg',

        descriptionurl:
          file.descriptionurl ?? 'https://commons.wikimedia.org/wiki/File:Fiat_Argo_Drive_2023.jpg',

        width: file.width ?? 4000,

        height: file.height ?? 2500,

        mime: file.mime ?? 'image/jpeg',

        extmetadata: {
          LicenseShortName: { value: file.license ?? 'CC BY-SA 4.0' },

          LicenseUrl: {
            value: file.licenseUrl ?? 'https://creativecommons.org/licenses/by-sa/4.0',
          },

          Artist: { value: file.artist ?? '<a href="//x.org/u">Maria Foto</a>' },
        },
      },
    ],
  }
}

function fetchWith(pages: unknown[], init: { ok?: boolean; status?: number } = {}) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    return {
      ok: init.ok ?? true,

      status: init.status ?? 200,

      json: async () => ({
        query: { pages: Object.fromEntries(pages.map((p, i) => [String(i + 1), p])) },
      }),
    } as unknown as Response
  })
}

function providerFor(fetchImpl: ReturnType<typeof fetchWith>, timeoutMs?: number) {
  return createWikimediaImageProvider({
    fetchImpl: fetchImpl as unknown as typeof fetch,

    timeoutMs,
  })
}

describe('termos de busca', () => {
  it('limpa o nome da marca da FIPE e extrai a família do modelo', () => {
    expect(cleanBrandName('VW - VolksWagen')).toBe('VolksWagen')

    expect(cleanBrandName('GM - Chevrolet')).toBe('Chevrolet')

    expect(cleanBrandName('Fiat')).toBe('Fiat')

    expect(modelFamily('ARGO DRIVE 1.3 8V Flex Aut.')).toBe('ARGO')

    expect(modelFamily('T-Cross Sense 200 TSI')).toBe('T-Cross')
  })

  it('a URL só consulta marca e modelo, sem dados do usuário, e usa CORS anônimo', () => {
    const url = new URL(buildRequestUrl({ brand: 'Fiat', family: 'Argo' }))

    expect(url.origin).toBe('https://commons.wikimedia.org')

    expect(url.searchParams.get('origin')).toBe('*')

    expect(url.searchParams.get('gsrsearch')).toBe('filetype:bitmap Fiat Argo')
  })
})

describe('licenças', () => {
  it.each(['CC BY 4.0', 'CC BY-SA 3.0', 'CC BY-SA 2.0 br', 'CC0', 'Public domain', 'PD-self'])(
    'aceita %s',

    (license) => expect(isAllowedLicense(license)).toBe(true),
  )

  it.each(['CC BY-NC 4.0', 'CC BY-ND 2.0', 'Fair use', 'All rights reserved', ''])(
    'rejeita %s',

    (license) => expect(isAllowedLicense(license)).toBe(false),
  )
})

describe('provedor Wikimedia', () => {
  it('escolhe a foto com créditos e converte o autor para texto puro', async () => {
    const provider = providerFor(fetchWith([page({})]))

    const image = await provider.find(QUERY)

    expect(image).toEqual({
      url: 'https://upload.wikimedia.org/thumb/argo.jpg',

      pageUrl: 'https://commons.wikimedia.org/wiki/File:Fiat_Argo_Drive_2023.jpg',

      title: 'Fiat Argo Drive 2023.jpg',

      author: 'Maria Foto',

      license: 'CC BY-SA 4.0',

      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    })
  })

  it('nunca devolve HTML ou scripts vindos do autor', async () => {
    const provider = providerFor(
      fetchWith([page({ artist: '<img src=x onerror=alert(1)><script>alert(2)</script>Zé' })]),
    )

    const image = await provider.find(QUERY)

    expect(image?.author).not.toMatch(/[<>]/)

    expect(image?.author).toContain('Zé')
  })

  it('rejeita licença não livre, formato inválido, vertical e título de outro carro', async () => {
    const provider = providerFor(
      fetchWith([
        page({ license: 'CC BY-NC 4.0' }),

        page({ mime: 'image/svg+xml' }),

        page({ width: 1000, height: 2000 }),

        page({ title: 'File:Fiat Mobi 2020.jpg' }),

        page({ title: 'File:Ford Argo.jpg' }),

        page({ title: 'File:Fiat Argo interior.jpg' }),
      ]),
    )

    expect(await provider.find(QUERY)).toBeNull()
  })

  it('rejeita hosts fora da Wikimedia (imagem e página)', async () => {
    const provider = providerFor(
      fetchWith([
        page({ thumburl: 'https://evil.example/argo.jpg' }),

        page({ thumburl: 'http://upload.wikimedia.org/argo.jpg' }),

        page({ descriptionurl: 'https://evil.example/wiki/Argo' }),
      ]),
    )

    expect(await provider.find(QUERY)).toBeNull()
  })

  it('aceita miniaturas do serviço oficial thumb.wikimedia.org', async () => {
    const provider = providerFor(
      fetchWith([page({ thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a.jpg' })]),
    )

    expect((await provider.find(QUERY))?.url).toBe(
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/a.jpg',
    )
  })

  it('ignora o link da licença quando o host não é confiável', async () => {
    const provider = providerFor(fetchWith([page({ licenseUrl: 'https://evil.example/l' })]))

    expect((await provider.find(QUERY))?.licenseUrl).toBeNull()
  })

  it('prefere a foto cujo título menciona o ano do modelo', async () => {
    const provider = providerFor(
      fetchWith([
        page({ title: 'File:Fiat Argo 2018.jpg', thumburl: 'https://upload.wikimedia.org/a.jpg' }),

        page({ title: 'File:Fiat Argo 2023.jpg', thumburl: 'https://upload.wikimedia.org/b.jpg' }),
      ]),
    )

    expect((await provider.find(QUERY))?.url).toBe('https://upload.wikimedia.org/b.jpg')
  })

  it('aceita o alias da marca (VW para Volkswagen)', async () => {
    const provider = providerFor(fetchWith([page({ title: 'File:VW Polo 2023.jpg' })]))

    const image = await provider.find({
      brand: 'VW - VolksWagen',

      model: 'Polo 1.0 TSI Flex',

      modelYear: 2023,
    })

    expect(image?.title).toBe('VW Polo 2023.jpg')
  })

  it('sem resultados ou resposta inesperada vira "sem foto" (null), sem lançar erro', async () => {
    const empty = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }) as Response)

    expect(await providerFor(empty as never).find(QUERY)).toBeNull()

    const weird = vi.fn(
      async () =>
        ({ ok: true, status: 200, json: async () => ({ query: { pages: 42 } }) }) as Response,
    )

    expect(await providerFor(weird as never).find(QUERY)).toBeNull()
  })

  it('falha HTTP (429/500) ou de rede vira null e não fica em cache', async () => {
    const failing = fetchWith([], { ok: false, status: 429 })

    const provider = providerFor(failing)

    expect(await provider.find(QUERY)).toBeNull()

    expect(await provider.find(QUERY)).toBeNull()

    expect(failing).toHaveBeenCalledTimes(2)

    const offline = vi.fn(async () => {
      throw new TypeError('network')
    })

    expect(await providerFor(offline as never).find(QUERY)).toBeNull()
  })

  it('aplica timeout', async () => {
    const hanging = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('abort', 'AbortError')),
          )
        }),
    )

    const provider = createWikimediaImageProvider({
      fetchImpl: hanging as unknown as typeof fetch,

      timeoutMs: 20,
    })

    expect(await provider.find(QUERY)).toBeNull()
  })
  it('usa cache: a mesma consulta (inclusive "sem foto") não repete a requisição', async () => {
    const fetchImpl = fetchWith([page({})])

    const provider = providerFor(fetchImpl)

    await Promise.all([provider.find(QUERY), provider.find(QUERY)])

    await provider.find({ ...QUERY, model: 'ARGO HGT 1.8' })

    expect(fetchImpl).toHaveBeenCalledTimes(1)

    const none = fetchWith([])

    const emptyProvider = providerFor(none)

    await emptyProvider.find(QUERY)

    await emptyProvider.find(QUERY)

    expect(none).toHaveBeenCalledTimes(1)
  })

  it('envia a requisição sem cookies nem referrer', async () => {
    const fetchImpl = fetchWith([page({})])

    await providerFor(fetchImpl).find(QUERY)

    const init = fetchImpl.mock.calls[0]?.[1]

    expect(init?.credentials).toBe('omit')

    expect(init?.referrerPolicy).toBe('no-referrer')
  })
})

describe('htmlToPlainText', () => {
  it('remove tags, normaliza espaços e não executa nada', () => {
    expect(htmlToPlainText('<b>Ana</b> <i>Souza</i>')).toBe('Ana Souza')

    expect(htmlToPlainText('<script>x()</script>Oi')).toBe('Oi')

    expect(htmlToPlainText('')).toBe('')
  })
})
