/** Erro lançado quando parâmetros financeiros são inválidos (nunca produz NaN silencioso). */

export class FinanceInputError extends Error {
  constructor(message: string) {
    super(message)

    this.name = 'FinanceInputError'
  }
}

/**

* Parcela mensal pela Tabela Price (parcelas fixas, juros compostos).

*

* PMT = P * i / (1 - (1 + i)^-n) (i > 0)

* PMT = P / n (i = 0)

*

* @param principal valor financiado (BRL, >= 0)

* @param monthlyRatePct taxa mensal em % (ex.: 1.5 significa 1,5% a.m.)

* @param installments quantidade de parcelas (inteiro >= 1)

*

* Estimativa didática: NÃO é simulação financeira oficial (não inclui IOF, tarifas, seguros).

*/

export function calculateMonthlyPayment(
  principal: number,

  monthlyRatePct: number,

  installments: number,
): number {
  if (!Number.isFinite(principal) || principal < 0) {
    throw new FinanceInputError('O valor financiado deve ser um número maior ou igual a zero.')
  }

  if (!Number.isFinite(monthlyRatePct) || monthlyRatePct < 0) {
    throw new FinanceInputError('A taxa de juros deve ser um número maior ou igual a zero.')
  }

  if (!Number.isInteger(installments) || installments < 1) {
    throw new FinanceInputError('A quantidade de parcelas deve ser um inteiro maior ou igual a 1.')
  }

  if (principal === 0) return 0

  if (monthlyRatePct === 0) return principal / installments

  const rate = monthlyRatePct / 100

  return (principal * rate) / (1 - Math.pow(1 + rate, -installments))
}

/**

* Principal financiável pela Tabela Price, inverso da parcela.

*

* P = PMT · (1 − (1 + i)^(−n)) / i (i > 0)

* P = PMT · n (i = 0)

*/

export function calculateFinancedPrincipal(
  payment: number,

  monthlyRatePct: number,

  installments: number,
): number {
  if (!Number.isFinite(payment) || payment < 0) {
    throw new FinanceInputError('A parcela máxima deve ser um número maior ou igual a zero.')
  }

  if (!Number.isFinite(monthlyRatePct) || monthlyRatePct < 0) {
    throw new FinanceInputError('A taxa de juros deve ser um número maior ou igual a zero.')
  }

  if (!Number.isInteger(installments) || installments < 1) {
    throw new FinanceInputError('A quantidade de parcelas deve ser um inteiro maior ou igual a 1.')
  }

  if (payment === 0) return 0

  if (monthlyRatePct === 0) return payment * installments

  const rate = monthlyRatePct / 100

  return (payment * (1 - Math.pow(1 + rate, -installments))) / rate
}

/** Valor total pago ao final do financiamento (parcelas x quantidade). */

export function totalPaidWithInterest(
  principal: number,

  monthlyRatePct: number,

  installments: number,
): number {
  return calculateMonthlyPayment(principal, monthlyRatePct, installments) * installments
}
