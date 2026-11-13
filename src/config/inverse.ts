/**
 * Modalidade "Quero este carro" (simulação inversa). São premissas de busca do QC, não regras.
 */

/** Entradas candidatas, como fração do preço, quando a pessoa não informa valores. */
export const INVERSE_DOWN_PAYMENT_SHARES = [0, 0.1, 0.2, 0.3, 0.4, 0.5] as const

/** Prazos candidatos, em meses, quando a pessoa não escolhe. */
export const INVERSE_INSTALLMENT_OPTIONS = [12, 24, 36, 48, 60] as const

/** Limite de combinações avaliadas, para a busca continuar rápida e previsível. */
export const INVERSE_MAX_COMBINATIONS = 200
