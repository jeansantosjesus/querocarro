import { ASSUMPTIONS_REFERENCE_MONTH } from './assumptions'
import { FIPE_CONFIG } from './fipe'
import { TAX_REFERENCE_DATE } from './regionalTax'
import { SUPPLEMENT_UPDATED_AT } from './vehicleSupplementData'
import type { DataProvenance } from '../types/provenance'

/**
 * Registro de proveniência do QC. Cada entrada descreve UMA classe de dado.
 * Nada aqui é número de premissa: só de onde vem, quando, com que confiança e com que limite.
 *
 * Regra: sem fonte cadastrada, `sourceName` e `sourceUrl` ficam `null`. Não se inventa fonte.
 */

/** Data em que o snapshot da FIPE foi capturado (ver `mocks/fipeSnapshot.ts`). */
export const FIPE_SNAPSHOT_CAPTURED_AT = '2026-11-06'

export const PROVENANCE_ENTRIES = {
  fipe_online: {
    origin: 'fipe',
    sourceName: 'API FIPE v2 (consulta online)',
    sourceUrl: FIPE_CONFIG.baseUrl,
    referenceDate: null,
    collectedAt: null,
    methodology:
      'Preço médio de referência da FIPE para o veículo e o ano-modelo. Não é preço de venda garantido.',
    confidence: 'media',
    notes: [
      'O mês de referência vem da própria resposta da API.',
      'A FIPE não informa consumo, manutenção, seguro nem depreciação.',
    ],
  },
  fipe_snapshot: {
    origin: 'fipe',
    sourceName: 'API FIPE v2 (referência salva no QC)',
    sourceUrl: FIPE_CONFIG.baseUrl,
    referenceDate: null,
    collectedAt: FIPE_SNAPSHOT_CAPTURED_AT,
    methodology:
      'Resposta da API FIPE salva no próprio QC, usada quando não há consulta online. Pode estar desatualizada.',
    confidence: 'media',
    notes: [
      'Mostrada sempre como "referência salva", nunca como consulta em tempo real.',
      'A FIPE não informa consumo, manutenção, seguro nem depreciação.',
    ],
  },
  base_complementar: {
    origin: 'demonstration',
    sourceName: 'Base complementar acadêmica do QC (estimativa demonstrativa)',
    sourceUrl: null,
    referenceDate: SUPPLEMENT_UPDATED_AT,
    collectedAt: SUPPLEMENT_UPDATED_AT,
    methodology:
      'Consumo, manutenção preventiva, categoria de seguro, depreciação, porta-malas e lugares. Aproximações para demonstrar o modelo.',
    confidence: 'baixa',
    notes: [
      'Não vem da FIPE e não é oficial.',
      'Pode divergir bastante da realidade.',
      'Depreciação: fonte necessária, ainda não indicada.',
    ],
  },
  premissas_custo: {
    origin: 'estimated',
    sourceName: 'Premissas configuráveis do QC (config/assumptions.ts)',
    sourceUrl: null,
    referenceDate: ASSUMPTIONS_REFERENCE_MONTH,
    collectedAt: null,
    methodology:
      'Preços de combustível, energia, IPVA padrão, licenciamento, seguro por categoria, reserva corretiva e envelhecimento da manutenção.',
    confidence: 'baixa',
    notes: [
      'Nenhuma fonte externa cadastrada para estes valores.',
      'A pessoa pode ajustar combustível, energia, IPVA e licenciamento na simulação.',
    ],
  },
  ipva_demonstracao_ba: {
    origin: 'demonstration',
    sourceName: 'Regra de demonstração do QC para IPVA da Bahia',
    sourceUrl: null,
    referenceDate: '2026',
    collectedAt: null,
    methodology: 'Reutiliza a estimativa configurável de IPVA. Não é alíquota oficial da Bahia.',
    confidence: 'baixa',
    notes: [
      'Nenhuma base legal cadastrada.',
      'Válida apenas como demonstração, até haver regra verificada da UF.',
    ],
  },
  ipva_sem_regra: {
    origin: 'unavailable',
    sourceName: null,
    sourceUrl: null,
    referenceDate: TAX_REFERENCE_DATE,
    collectedAt: null,
    methodology:
      'Nenhuma regra verificada e vigente para a UF. O IPVA fica indisponível, a menos que a pessoa informe a alíquota.',
    confidence: 'nao_verificada',
    notes: ['Fonte oficial necessária: UF e exercício.'],
  },
  informado_usuario: {
    origin: 'user',
    sourceName: 'Informação digitada na simulação',
    sourceUrl: null,
    referenceDate: null,
    collectedAt: null,
    methodology:
      'Valor informado pela pessoa (renda, despesas, entrada, parcela, alíquota de IPVA).',
    confidence: 'nao_verificada',
    notes: ['O QC não verifica a informação.'],
  },
  metodo_price_sac: {
    origin: 'academic',
    sourceName:
      'DIAS JÚNIOR, José Dijailson (2023). A matemática financeira presente em consórcio e financiamento de um bem.',
    sourceUrl: null,
    referenceDate: '2023',
    collectedAt: null,
    methodology:
      'Fórmulas de parcela constante (Price) e do sistema SAC. Seções 3.2.2 e 3.3 do documento.',
    confidence: 'alta',
    notes: ['Não fornece valores numéricos de premissa.'],
  },
  metodo_tco: {
    origin: 'academic',
    sourceName:
      'GIMENES, Ana Klara et al. (2022). CALCULO DO TCO: aquisição ou locação de ativo imobilizado veículo.',
    sourceUrl: null,
    referenceDate: '2022',
    collectedAt: null,
    methodology: 'Modelo de custo total de propriedade. Seções 4 e 4.1 do documento.',
    confidence: 'media',
    notes: [
      'Valores do estudo de caso (2021–2022, dois modelos, compra à vista) não são premissas do QC.',
    ],
  },
  metodo_multicriterio: {
    origin: 'estimated',
    sourceName: 'Método interno do QC (soma ponderada, normalização min-max, pesos)',
    sourceUrl: null,
    referenceDate: null,
    collectedAt: null,
    methodology:
      'Weighted Sum Model com normalização min-max de 0 a 100. Pesos dos cenários em config/scenarios.ts.',
    confidence: 'media',
    notes: [
      'Fonte necessária: os documentos fornecidos não cobrem WSM.',
      'Os pesos são premissas do QC, não resultados de pesquisa.',
    ],
  },
  comprometimento_renda: {
    origin: 'estimated',
    sourceName: 'Definição interna do QC',
    sourceUrl: null,
    referenceDate: null,
    collectedAt: null,
    methodology: 'Parcela da renda líquida comprometida pelo custo mensal e limites do cenário.',
    confidence: 'baixa',
    notes: ['Fonte necessária: os documentos fornecidos não cobrem este indicador.'],
  },
} as const satisfies Record<string, DataProvenance>

export type ProvenanceKey = keyof typeof PROVENANCE_ENTRIES

export function provenanceOf(key: ProvenanceKey): DataProvenance {
  return PROVENANCE_ENTRIES[key]
}

/**
 * Fontes oficiais cadastradas. Vazio de propósito: o QC ainda não tem fonte oficial
 * verificada para nenhum valor (tributos exigem UF e exercício; ver docs/metodologia/referencias.md).
 */
export const GOVERNMENT_SOURCE_KEYS: readonly ProvenanceKey[] = []

/**
 * Premissas que não estão registradas em simulações salvas ANTES do registro de premissas.
 * Simulações novas gravam o conjunto completo em `scenarioSnapshot.premises`.
 */
export const UNRECORDED_PREMISES = [
  {
    id: 'premissas-padrao-antigas',
    description:
      'Simulações salvas antes do registro de premissas não guardam os padrões de custo (config/assumptions.ts) usados para chegar aos valores. O detalhe do histórico avisa quando isso acontece.',
  },
] as const
