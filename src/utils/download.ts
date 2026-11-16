/** Nome de arquivo seguro: apenas letras, números, hífen e sublinhado. */

export function safeFileName(name: string, fallback = 'quero-carro'): string {
  const cleaned = name

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')

    .replace(/[^A-Za-z0-9_-]+/g, '-')

    .replace(/^-+|-+$/g, '')

    .slice(0, 60)

  return cleaned || fallback
}

/** Baixa um objeto como arquivo JSON, gerado inteiramente no navegador (nada é enviado a servidores). */

export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })

  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')

  anchor.href = url

  anchor.download = `${safeFileName(fileName)}.json`

  document.body.appendChild(anchor)

  anchor.click()

  anchor.remove()

  URL.revokeObjectURL(url)
}
