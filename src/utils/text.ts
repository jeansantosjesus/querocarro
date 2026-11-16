/** Normaliza texto para comparação: minúsculas, sem acentos e sem espaços extras. */

export function normalizeText(value: string): string {
  return value

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')

    .toLowerCase()

    .replace(/\s+/g, ' ')

    .trim()
}

export const UNAVAILABLE_TEXT = 'Informação não disponível'

/** Comparação alfabética em pt-BR (acentos e maiúsculas não alteram a ordem). */

export function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
}

/**

* Converte um trecho HTML (ex.: crédito de autor vindo de uma API) em TEXTO PURO.

* O HTML é interpretado em um documento inerte (sem executar scripts nem carregar recursos)

* e somente o `textContent` é usado: o resultado nunca deve ser renderizado como HTML.

*/

export function htmlToPlainText(html: string): string {
  let text: string

  if (typeof DOMParser !== 'undefined') {
    text = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''
  } else {
    text = html.replace(/<[^>]*>/g, ' ')
  }

  return text.replace(/\s+/g, ' ').trim()
}
