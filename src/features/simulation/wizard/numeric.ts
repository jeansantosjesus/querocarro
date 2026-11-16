function parse(value: unknown): number {
  if (typeof value === 'number') return value

  return Number(String(value).trim().replace(',', '.'))
}

/** Campo obrigatório: vazio vira `undefined` (o Zod mostra "Informe um número válido"). */

export const requiredNumber = {
  setValueAs: (value: unknown): number | undefined =>
    value === '' || value === null || value === undefined ? undefined : parse(value),
}

/** Campo opcional: vazio vira `null`. */

export const optionalNumber = {
  setValueAs: (value: unknown): number | null =>
    value === '' || value === null || value === undefined ? null : parse(value),
}

/** Ajuste opcional de premissa: vazio = usar o padrão (campo ausente). */

export const overrideNumber = {
  setValueAs: (value: unknown): number | undefined =>
    value === '' || value === null || value === undefined ? undefined : parse(value),
}

/** Lista separada por vírgula ou ponto e vírgula. */

export const brandList = {
  setValueAs: (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(String)

    const items = String(value ?? '')
      .split(/[;,]/)

      .map((item) => item.trim())

      .filter((item) => item.length > 0)

    return [...new Set(items)]
  },
}
