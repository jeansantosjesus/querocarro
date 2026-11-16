/**

* Classe da fonte de um dado. Diferente de `ValueOrigin` (rótulo exibido em cada valor),

* aqui se diz de onde o dado veio, em termos de autoridade.

*

* - fipe: API ou snapshot da FIPE (referência de mercado, não preço de venda).

* - government: fonte oficial (ex.: lei ou tabela estadual). Só entra com UF, exercício e base legal.

* - academic: método ou referência de texto acadêmico. Não fornece valores numéricos do QC.

* - user: informação digitada pela pessoa. O QC não verifica.

* - estimated: premissa do QC, configurável, sem fonte externa cadastrada.

* - demonstration: base de demonstração. Nunca é apresentada como oficial.

* - unavailable: não há dado. Nunca vira zero.

*/

export type DataOrigin =
  'fipe' | 'government' | 'academic' | 'user' | 'estimated' | 'demonstration' | 'unavailable'

/** Confiança declarada pelo QC. "nao_verificada" quando o QC não tem como checar. */

export type ProvenanceConfidence = 'alta' | 'media' | 'baixa' | 'nao_verificada'

/** Proveniência de um valor ou grupo de valores. Campos sem informação ficam `null`. */

export interface DataProvenance {
  origin: DataOrigin

  /** Nome da fonte, ou `null` quando não há fonte cadastrada. */

  sourceName: string | null

  /** URL da fonte, ou `null`. */

  sourceUrl: string | null

  /** Data ou exercício de referência (YYYY-MM, YYYY-MM-DD ou ano), ou `null`. */

  referenceDate: string | null

  /** Quando o QC obteve ou atualizou o dado, ou `null`. */

  collectedAt: string | null

  /** Método resumido: como o valor é usado ou obtido. */

  methodology: string

  confidence: ProvenanceConfidence

  /** Observações sobre limites da fonte. */

  notes: readonly string[]
}
