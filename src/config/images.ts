/**
 * Configuração das fotos de veículos (Wikimedia Commons).
 * As fotos são OPCIONAIS e ilustrativas: não participam do cálculo.
 */
export const IMAGE_CONFIG = {
  apiUrl: 'https://commons.wikimedia.org/w/api.php',
  /** Únicos hosts aceitos para o arquivo da imagem (original e serviço de miniaturas). */
  imageHosts: ['upload.wikimedia.org', 'thumb.wikimedia.org'],
  /** Único host aceito para a página do arquivo. */
  pageHost: 'commons.wikimedia.org',
  thumbnailWidth: 640,
  timeoutMs: 8_000,
  searchLimit: 12,
  /** Máximo de buscas simultâneas. */
  concurrency: 2,
  /** Tipos de arquivo aceitos. */
  allowedMime: ['image/jpeg', 'image/png', 'image/webp'],
  /** Proporção mínima largura/altura (descarta fotos de detalhes verticais). */
  minAspectRatio: 1.2,
  maxAuthorLength: 80,
  maxTitleLength: 160,
} as const

/**
 * Somente licenças livres que permitem reutilização com atribuição são aceitas.
 * Licenças restritivas (ex.: "No known restrictions" sem autor, uso justo, NC, ND) são rejeitadas.
 */
export const ALLOWED_LICENSE_PATTERNS: readonly RegExp[] = [
  /^cc[- ]by(?:[- ]sa)?(?:[- ]\d(?:\.\d)?)?(?:[- ][a-z]{2,3})?$/i,
  /^cc0(?:[- ]\d(?:\.\d)?)?$/i,
  /^public domain/i,
  /^pd[- ]/i,
]

/** Palavras do título que indicam foto que não mostra o carro inteiro. */
export const IMAGE_TITLE_PENALTIES: readonly RegExp[] = [
  /\b(interior|interiors|dashboard|painel|engine|motor|wheel|wheels|roda|rodas|logo|badge|emblem|detail|details|detalhe|steering|volante|trunk|cockpit|console|headlight|taillight|farol|lanterna)\b/i,
]
