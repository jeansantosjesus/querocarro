export type FipeErrorKind =

'network' | 'timeout' | 'rate_limit' | 'http' | 'invalid_response' | 'aborted'



const USER_MESSAGES: Record<FipeErrorKind, string> = {

network: 'Não foi possível conectar à tabela FIPE. Verifique sua conexão e tente novamente.',

timeout: 'A consulta à tabela FIPE demorou mais que o esperado. Tente novamente em instantes.',

rate_limit:

'O limite de consultas à tabela FIPE foi atingido. Aguarde alguns minutos ou use a referência salva.',

http: 'A tabela FIPE respondeu com um erro. Tente novamente mais tarde.',

invalid_response:

'A tabela FIPE retornou dados em um formato inesperado e eles foram descartados.',

aborted: 'A consulta foi cancelada.',

}



export class FipeError extends Error {

readonly kind: FipeErrorKind

readonly status: number | undefined

readonly retryAfterMs: number | undefined

readonly userMessage: string



constructor(

kind: FipeErrorKind,

detail: string,

extra?: { status?: number; retryAfterMs?: number },

) {

super(`[FIPE:${kind}] ${detail}`)

this.name = 'FipeError'

this.kind = kind

this.status = extra?.status

this.retryAfterMs = extra?.retryAfterMs

this.userMessage = USER_MESSAGES[kind]

}

}



export function isFipeError(error: unknown): error is FipeError {

return error instanceof FipeError

}
