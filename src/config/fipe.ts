export const FIPE_CONFIG = {
  baseUrl: 'https://fipe.parallelum.com.br/api/v2',
  timeoutMs: 10_000,
  maxRetries: 2,
  /** Espera máxima aceita para respeitar Retry-After antes de desistir. */
  maxBackoffMs: 8_000,
  baseBackoffMs: 800,
  /** Validade do cache: a tabela FIPE é atualizada uma vez por mês. */
  cacheTtlMs: 24 * 60 * 60 * 1000,
  /** Consultas simultâneas (a API aplica throttle). */
  concurrency: 3,
} as const
