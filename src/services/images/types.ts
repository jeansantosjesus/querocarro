/** Foto de um veículo com os créditos exigidos pela licença. Todo texto é texto puro (nunca HTML). */

export interface VehicleImage {
  /** URL https da miniatura (somente upload.wikimedia.org ou thumb.wikimedia.org). */

  url: string

  /** Página do arquivo na Wikimedia Commons (https). */

  pageUrl: string

  /** Título do arquivo (ex.: "Fiat Argo 2018.jpg"). */

  title: string

  /** Autor/atribuição em texto puro; pode estar vazio se a fonte não informar. */

  author: string

  /** Licença curta (ex.: "CC BY-SA 4.0", "Public domain"). */

  license: string

  /** Link do texto da licença, quando informado e seguro. */

  licenseUrl: string | null
}

/** Dados mínimos de um veículo para buscar uma foto (nada do usuário é enviado). */

export interface VehicleImageQuery {
  brand: string

  model: string

  modelYear: number
}

/** Contrato para fontes de imagens: a Wikimedia pode ser trocada no futuro. */

export interface VehicleImageProvider {
  readonly id: string

  /** Retorna `null` quando não há foto adequada. Nunca lança por indisponibilidade da fonte. */

  find(query: VehicleImageQuery, signal?: AbortSignal): Promise<VehicleImage | null>
}
