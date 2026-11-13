port { ASSUMPTIONS_REFERENCE_MONTH, DEFAULT_ASSUMPTIONS } from './assumptions'
import { CLUSTERING, ADHERENCE_THRESHOLDS, PRESSURE_THRESHOLDS } from './analytics'
import { COMFORT_BANDS, FINANCIAL_SCORE_WEIGHTS } from './capacity'
import { DISCLAIMERS } from './copy'
import { WEIGHT_LIMITS } from './limits'
import { MODEL_VERSION, SCENARIO_LIST } from './scenarios'
import { TAX_REFERENCE_DATE } from './regionalTax'
import { formatBRL, formatPercent, formatReferenceMonth } from '../utils/format'

/**
 * Conteúdo da Central de Ajuda. Todo número vem da configuração do QC, nunca de texto fixo.
 * Cada artigo traz uso no QC, fontes, data de referência e limitações.
 */

export const HELP_ARTICLE_SLUGS = [
  'como-funciona',
  'metodologia',
  'formulas',
  'tco',
  'analises',
  'impostos',
  'fontes',
  'privacidade',
  'glossario',
  'limitacoes',
] as const

export type HelpArticleSlug = (typeof HELP_ARTICLE_SLUGS)[number]

export interface HelpSection {
  /** Identificador único dentro da página (usado em âncoras e na busca). */
  id: string
  title: string
  paragraphs: string[]
  /** Fórmulas em texto. Cada uma também está descrita em `paragraphs`. */
  formulas?: string[]
  items?: string[]
}

export interface HelpArticle {
  slug: HelpArticleSlug
  title: string
  summary: string
  keywords: string[]
  sections: HelpSection[]
  usage: string
  sources: string[]
  referenceDate: string
  limitations: string[]
}

const WEIGHTS_TEXT = SCENARIO_LIST.filter((scenario) => scenario.id !== 'personalizado').map(
  (scenario) =>
    `${scenario.label}: TCO ${scenario.weights.tco}%, situação financeira ${scenario.weights.incomeCommitment}%, aderência ao uso ${scenario.weights.usageFit}%, preferências ${scenario.weights.preference}%.`,
)

const SCENARIO_TEXT = SCENARIO_LIST.filter((scenario) => scenario.id !== 'personalizado').map(
  (scenario) => `${scenario.label}. ${scenario.explanation}`,
)

const REFERENCE_MONTH_TEXT = formatReferenceMonth(ASSUMPTIONS_REFERENCE_MONTH)

const ARTICLE_COMO_FUNCIONA: HelpArticle = {
  slug: 'como-funciona',
  title: 'Como funciona',
  summary: 'Do cadastro das opções ao grupo recomendado, em etapas que você pode conferir.',
  keywords: ['sad', 'sistema de apoio à decisão', 'decisor', 'alternativas', 'fluxo', 'etapas'],
  sections: [
    {
      id: 'fluxo-sad',
      title: 'Fluxo do sistema de apoio à decisão (SAD)',
      paragraphs: [
        'O QC segue sempre a mesma ordem. Cada etapa só recebe o que a anterior aprovou.',
      ],
      items: [
        'Qualidade dos dados: confere se cada veículo tem preço, código e consumo válidos. Dado inválido sai com o motivo.',
        'Filtros: aplica o que você pediu, como faixa de preço, condição, combustível, câmbio, ano e marcas.',
        'Custos: estima parcela, IPVA, licenciamento, seguro, energia, manutenção e depreciação. Se um componente faltar, o total fica indisponível.',
        'Viabilidade: compara o custo e o preço com o seu orçamento e a sua capacidade de compra. Restrição rígida não recebe nota.',
        'Normalização: transforma cada critério em uma nota de 0 a 100 entre as opções elegíveis.',
        'Soma ponderada: combina as notas com os pesos do cenário e gera o índice de cada opção.',
        'Grupo recomendado: separa as melhores opções (de 3 a 5) e explica cada uma.',
      ],
    },
    {
      id: 'decisor-alternativas',
      title: 'Decisor e alternativas',
      paragraphs: [
        'Você é o decisor. O QC não escolhe um vencedor: ele mostra um grupo de alternativas compatíveis, todas com o mesmo destaque.',
        'Alternativas são os veículos da base do QC que passam pelas etapas. Os que não passam aparecem em "Por que os veículos não aparecem", com a regra que os excluiu.',
      ],
    },
    {
      id: 'criterios-pesos',
      title: 'Critérios e pesos',
      paragraphs: [
        'O QC usa quatro critérios. Os pesos de cada cenário somam 100%, e nenhum critério passa de ' +
          `${WEIGHT_LIMITS.maxPerCriterion}%.`,
        ...WEIGHTS_TEXT,
      ],
      items: [
        'Custo total no horizonte (TCO): custo, em que menor é melhor. Veja o artigo sobre TCO.',
        'Situação financeira: benefício, de 0 a 100, com base no orçamento, na renda disponível, no preço frente à capacidade de compra, na folga e na reserva.',
        'Aderência ao uso: benefício, pelo tipo de uso, passageiros, porta-malas e categoria do veículo.',
        'Preferências: benefício, pelas marcas, combustível, câmbio, faixa de ano e condição que você informou.',
      ],
    },
    {
      id: 'soma-ponderada',
      title: 'Soma ponderada',
      paragraphs: [
        'Cada opção recebe um índice entre 0 e 100. Ele é a soma, critério por critério, do peso (dividido por 100) multiplicado pela nota normalizada.',
        'Se um critério não tiver dado para um veículo, o peso dele é redistribuído entre os demais. Se o peso sem dado passar de 30% do total, o veículo fica de fora, com o motivo registrado. Dado ausente nunca vira zero.',
      ],
      formulas: ['índice = soma de (peso do critério ÷ 100) × nota normalizada do critério'],
    },
    {
      id: 'criterios-custo-beneficio',
      title: 'Critérios de custo e de benefício',
      paragraphs: [
        'Critério de custo: quanto menor o valor, melhor. Critério de benefício: quanto maior, melhor. A nota de cada um é calculada pela normalização min-max entre as opções elegíveis.',
        'Por isso a nota é relativa: ela depende das outras opções da mesma simulação.',
      ],
    },
    {
      id: 'combustivel',
      title: 'Combustível e energia',
      paragraphs: [
        'O critério de custo com energia compara o custo por quilômetro, o que permite comparar flex, híbrido e elétrico na mesma escala.',
        `O consumo efetivo combina o consumo urbano e o rodoviário pela média harmônica. Para uso urbano, o peso é 85% urbano e 15% rodoviário; para rodoviário, 15% e 85%; para uso misto, 50% e 50%.`,
        `Flex usa gasolina, ou etanol se você preferir. O etanol rende ${formatPercent(DEFAULT_ASSUMPTIONS.ethanolConsumptionFactor, 0)} do km/l da gasolina. Elétricos usam o preço do kWh.`,
      ],
    },
    {
      id: 'sensibilidade',
      title: 'Sensibilidade',
      paragraphs: [
        'A análise de sensibilidade varia, para mais e para menos, a entrada, a taxa, o prazo, a quilometragem, o preço da energia, a manutenção, o seguro e a depreciação. Assim você vê quais premissas mais mudam o custo.',
        'Na tela de resultado, escolha um veículo do grupo para ver a sensibilidade do custo em 36 meses, com a Tabela Price. Ela não altera o grupo recomendado e não é uma previsão. Na compra à vista, entrada, taxa e prazo não mudam o custo.',
      ],
    },
  ],
  usage:
    'Essas etapas são executadas na mesma ordem a cada simulação, sem aleatoriedade e sem inteligência artificial generativa. O mesmo conjunto de dados sempre gera o mesmo resultado.',
  sources: [
    'Modelo de soma ponderada (WSM): premissa do QC, sem fonte externa citada (ver Fontes).',
    `Versão do modelo: ${MODEL_VERSION}.`,
  ],
  referenceDate: `Modelo ${MODEL_VERSION}. Premissas de custo de referência ${REFERENCE_MONTH_TEXT}.`,
  limitations: [
    'Os pesos e o método de soma ponderada são escolhas metodológicas do QC. Não são uma verdade única.',
    'A nota é relativa às outras opções da simulação e não mede qualidade absoluta do veículo.',
    'O grupo mostra opções compatíveis. Ele não substitui a sua decisão.',
  ],
}

const ARTICLE_METODOLOGIA: HelpArticle = {
  slug: 'metodologia',
  title: 'Metodologia',
  summary: 'Como os cenários, o orçamento e a situação financeira entram no resultado.',
  keywords: [
    'cenário',
    'econômico',
    'equilibrado',
    'conservador',
    'premissas',
    'renda',
    'orçamento',
  ],
sections: [
    {
      id: 'modelo',
      title: 'Modelo',
      paragraphs: [
        `O QC usa o Weighted Sum Model (WSM), versão ${MODEL_VERSION}. O resultado é determinístico: a mesma entrada produz a mesma saída. Não há inteligência artificial generativa no ranking.`,
      ],
    },
    {
      id: 'cenarios',
      title: 'Cenários',
      paragraphs: SCENARIO_TEXT,
    },
    {
      id: 'renda-disponivel',
      title: 'Renda disponível e orçamento',
      paragraphs: [
        'A renda disponível é a renda líquida menos as despesas essenciais, outras despesas recorrentes, dívidas e a reserva mensal que você pretende guardar. Pode ser negativa.',
        'O orçamento do veículo usa um percentual da renda disponível. Esse percentual é premissa do cenário (40%, 35% ou 25%), salvo se você informar outro valor entre 5% e 80%. Não é uma regra universal.',
        'No modo informado, o orçamento é o menor valor entre o limite que você digitou e o calculado. No modo estimado, o QC ignora o limite digitado e usa só o calculado.',
        'Renda disponível negativa significa pressão financeira crítica. Nesse caso, nenhuma opção recebe capacidade positiva.',
      ],
    },
    {
      id: 'reserva',
      title: 'Reserva e entrada',
      paragraphs: [
        'A reserva protegida é o maior valor entre a reserva de emergência que você quer preservar e as despesas essenciais multiplicadas pelos meses de proteção.',
        'A entrada utilizável é o que sobra da reserva acumulada depois da reserva protegida, limitado ao valor da entrada. Se a entrada informada passa disso, a simulação fica bloqueada até você reduzir a entrada ou confirmar o uso da reserva.',
      ],
    },
    {
      id: 'situacao-financeira',
      title: 'Situação financeira (score de 0 a 100)',
      paragraphs: [
        `O score combina cinco partes: ${FINANCIAL_SCORE_WEIGHTS.utilization}% utilização do orçamento, ${FINANCIAL_SCORE_WEIGHTS.availableCommitment}% custo sobre a renda disponível, ${FINANCIAL_SCORE_WEIGHTS.priceCapacity}% preço sobre a capacidade de compra, ${FINANCIAL_SCORE_WEIGHTS.margin}% folga depois do veículo e ${FINANCIAL_SCORE_WEIGHTS.reserve}% reserva preservada.`,
        `Cada relação vale 100 até ${formatPercent(COMFORT_BANDS.fullComfortShare, 0)} do referencial e cai em linha reta até 0 em ${formatPercent(COMFORT_BANDS.limitShare, 0)}. Renda maior, depois dessa faixa, não aumenta mais a nota, para que um carro mais caro não vença só porque a renda é alta.`,
        'A folga satura quando cobre pelo menos um mês de despesas essenciais. Assim ela não repete o que o custo sobre a renda já mede.',
      ],
    },
    {
      id: 'pressao-financeira',
      title: 'Pressão financeira',
      paragraphs: [
        `O comprometimento da renda líquida (custo mensal ÷ renda líquida) continua visível como indicador. As faixas são: até ${formatPercent(PRESSURE_THRESHOLDS.baixa, 0)} baixa; até ${formatPercent(PRESSURE_THRESHOLDS.moderada, 0)} moderada; até ${formatPercent(PRESSURE_THRESHOLDS.elevada, 0)} elevada; acima disso, crítica. A linguagem é informativa, nunca proibitiva.`,
      ],
    },
    {
      id: 'premissas',
      title: 'Premissas de custo',
      paragraphs: [
        `As premissas são estimativas do QC com referência em ${REFERENCE_MONTH_TEXT}. Não são valores oficiais.`,
        `Gasolina ${formatBRL(DEFAULT_ASSUMPTIONS.gasolinePricePerLiter, { cents: true })}/litro; etanol ${formatBRL(DEFAULT_ASSUMPTIONS.ethanolPricePerLiter, { cents: true })}/litro; diesel ${formatBRL(DEFAULT_ASSUMPTIONS.dieselPricePerLiter, { cents: true })}/litro; energia elétrica ${formatBRL(DEFAULT_ASSUMPTIONS.electricityPricePerKwh, { cents: true })}/kWh; licenciamento ${formatBRL(DEFAULT_ASSUMPTIONS.licensingAnnualBRL)}/ano.`,
        'Seguro é uma média por categoria, em percentual do valor ao ano. Manutenção e depreciação também são médias da base demonstrativa.',
        'Você pode ajustar as premissas na etapa de revisão. A tela de cada veículo mostra a origem e a confiança de cada valor.',
      ],
    },
  ],
  usage:
    'A metodologia define o peso de cada critério por cenário, o orçamento, a reserva e o score financeiro usados na soma ponderada. As análises complementares não alteram o índice.',
  sources: [
    'Métodos de soma ponderada, normalização min-max e pesos: premissas do QC, sem fonte externa citada.',
    'Premissas de custo: estimativas configuráveis do QC, ver a seção Fontes.',
  ],
  referenceDate: `Premissas de custo: ${REFERENCE_MONTH_TEXT}. Modelo ${MODEL_VERSION}.`,
  limitations: [
    'Os percentuais de cenário e a composição do score são premissas do QC, sem fonte externa.',
    'Com o mesmo limite voluntário, duas rendas folgadas recebem o mesmo score financeiro. Os indicadores absolutos continuam diferentes e aparecem na tela.',
    'A renda é informada por você e não é verificada.',
  ],
}

const ARTICLE_FORMULAS: HelpArticle = {
  slug: 'formulas',
  title: 'Fórmulas',
  summary: 'As contas do QC em texto, com a descrição de cada termo.',
  keywords: [
    'fórmula',
    'parcela',
    'juros',
    'price',
    'sac',
    'financiamento',
    'amortização',
    'cálculo',
  ],
  sections: [
    {
      id: 'parcela-price',
      title: 'Parcela pela Tabela Price',
      paragraphs: [
        'Parcelas iguais, com juros compostos. P é o valor financiado (preço menos entrada), i é a taxa mensal em forma decimal e n é o número de parcelas. Com taxa zero, a parcela é P dividido por n.',
        'Estimativa didática: não inclui IOF, tarifas nem seguro do financiamento.',
      ],
      formulas: [
        'PMT = P · i ÷ (1 − (1 + i)^−n), para i maior que zero',
        'PMT = P ÷ n, para i igual a zero',
      ],
    },
    {
      id: 'capacidade-price',
      title: 'Principal que uma parcela financia (inverso da Price)',
      paragraphs: [
        'Para saber quanto uma parcela máxima financia, a conta é o inverso da Price. Ela calcula a capacidade de compra com a parcela máxima do orçamento.',
        'Capacidade de aquisição = entrada utilizável + principal financiado pela parcela máxima. À vista, só a entrada utilizável.',
      ],
      formulas: [
        'P = PMT · (1 − (1 + i)^−n) ÷ i, para i maior que zero',
        'P = PMT · n, para i igual a zero',
      ],
    },
    {
      id: 'sac',
      title: 'Sistema de amortização constante (SAC)',
      paragraphs: [
        'No SAC, a amortização é a mesma em todas as parcelas, então as parcelas diminuem ao longo do prazo. Os juros de cada período são a taxa vezes o saldo devedor no início do período.',
        'No QC, o SAC aparece como visão alternativa na tela de TCO. O critério do ranking usa a Price.',
      ],
      formulas: [
        'amortização = P ÷ n',
        'juros do período = i × saldo devedor no início do período',
        'parcela do período = amortização + juros do período',
      ],
    },
    {
      id: 'juros',
      title: 'Juros',
      paragraphs: [
        'Juros compostos são calculados sobre o saldo do período anterior. Taxa maior não reduz o total de juros. Quando a taxa é zero, não há juros.',
      ],
    },
    {
      id: 'custo-mensal',
      title: 'Custo mensal total',
      paragraphs: [
        'Soma da parcela e dos custos mensais do veículo. Se algum componente não puder ser estimado, o total fica indisponível. Nunca é somado como zero.',
      ],
      formulas: [
        'custo mensal = parcela + IPVA ÷ 12 + licenciamento ÷ 12 + seguro ÷ 12 + manutenção ÷ 12 + energia mensal + depreciação ÷ 12',
      ],
    },{
      id: 'renda-disponivel-formula',
      title: 'Renda disponível e limite',
      paragraphs: [
        'A renda disponível desconta da renda líquida as despesas essenciais, outras despesas recorrentes, dívidas e a reserva mensal. O limite calculado é a renda disponível, quando positiva, vezes o percentual do veículo.',
      ],
      formulas: [
        'renda disponível = renda líquida − essenciais − outras despesas − dívidas − reserva mensal',
        'limite calculado = máximo(0; renda disponível) × percentual do veículo',
      ],
    },
    {
      id: 'comprometimento',
      title: 'Comprometimento da renda',
      paragraphs: [
        'Indicador de pressão: custo mensal dividido pela renda líquida. Não é critério de comparação entre veículos.',
      ],
      formulas: ['comprometimento = custo mensal ÷ renda líquida'],
    },
    {
      id: 'residual',
      title: 'Valor residual',
      paragraphs: [
        'Valor estimado do veículo ao fim do horizonte, com depreciação linear e piso zero. Se o percentual de depreciação não existir na base, o residual fica indisponível.',
      ],
      formulas: ['residual = máximo(0; preço × (1 − depreciação anual × meses ÷ 12))'],
    },
    {
      id: 'energia-formula',
      title: 'Consumo e custo de energia',
      paragraphs: [
        'O consumo efetivo é a média harmônica ponderada entre o consumo urbano e o rodoviário, conforme o tipo de uso. O custo mensal é a quilometragem mensal dividida pelo consumo efetivo, vezes o preço da unidade (litro ou kWh).',
      ],
      formulas: [
        'consumo efetivo = 1 ÷ (peso urbano ÷ consumo urbano + peso rodoviário ÷ consumo rodoviário)',
        'custo mensal de energia = km do mês ÷ consumo efetivo × preço da unidade',
      ],
    },
    {
      id: 'normalizacao-formula',
      title: 'Normalização e soma ponderada',
      paragraphs: [
        'Para critérios de benefício, a nota é proporcional ao valor entre o menor e o maior do conjunto. Para critérios de custo, a conta é invertida. Se todas as opções têm o mesmo valor, todas recebem 100 e o critério fica marcado.',
      ],
      formulas: [
        'benefício: nota = 100 × (valor − mínimo) ÷ (máximo − mínimo)',
        'custo: nota = 100 × (máximo − valor) ÷ (máximo − mínimo)',
      ],
    },
  ],
  usage:
    'As fórmulas acima são as que o QC aplica às suas entradas. Os valores de entrada, premissas e resultados aparecem separados na tela de cada veículo.',
  sources: [
    'Tabela Price e SAC: DIAS JÚNIOR (2023), seções 3.2 e 3.3.',
    'Juros compostos: DIAS JÚNIOR (2023), seção 3.1.3.',
    'Valor residual, comprometimento, renda disponível e score: premissas do QC, sem fonte externa.',
  ],
  referenceDate: `Fórmulas vigentes no modelo ${MODEL_VERSION}.`,
  limitations: [
    'As fórmulas são estimativas didáticas. Não incluem IOF, tarifas, seguros do financiamento nem correção monetária.',
    'A fonte de DIAS JÚNIOR (2023) traz inconsistências na Tabela 3.3 (SAF). O QC não copia essa tabela.',
  ],
}

const ARTICLE_TCO: HelpArticle = {
  slug: 'tco',
  title: 'TCO (custo total no horizonte)',
  summary: 'O critério de custo do ranking: quanto o veículo custa em 36 meses.',
  keywords: ['tco', 'custo total', 'horizonte', 'valor residual', 'ranking', 'caixa'],
  sections: [
    {
      id: 'o-que-e',
      title: 'O que é o TCO',
      paragraphs: [
        'O custo total no horizonte (TCO) estima quanto o veículo custa ao longo de um período. O QC usa 36 meses no ranking. A visão econômica considera o preço, subtrai o valor residual e soma juros e custos do período.',
        'O TCO substitui os critérios separados de preço, custo mensal, consumo, manutenção e depreciação. Esses itens continuam calculados e aparecem nos detalhes, mas não entram no índice como critérios próprios. Assim o mesmo custo não é contado duas vezes.',
      ],
      formulas: [
        'TCO econômico = preço − residual + juros + IPVA + licenciamento + seguro + energia + manutenção, no horizonte',
      ],
    },
    {
      id: 'componentes',
      title: 'Componentes',
      paragraphs: [
        'Os componentes são estimados para o mesmo período. Se algum faltar, o total fica indisponível e a tela informa qual é.',
      ],
      items: [
        'Juros e parcelas: pela Tabela Price, no critério do ranking.',
        'Valor residual: depreciação linear, com piso zero.',
        'IPVA e licenciamento: pela regra da UF, ver o artigo Impostos.',
        'Seguro e energia: estimativas por categoria e uso. Manutenção: a soma mensal de cada ano usa o fator de envelhecimento daquele ano.',
        'Extras (documentação, transferência, estacionamento e outros): existem no motor, mas não têm campos no formulário. Aparecem como "não incluídos".',
      ],
    },
    {
      id: 'visao-caixa',
      title: 'Visão de caixa e identidade',
      paragraphs: [
        'A visão de caixa troca o preço e os juros pela entrada e pelas parcelas. A diferença entre as duas visões é o residual menos o saldo devedor: econômica = caixa − (residual − saldo devedor).',
        'Os valores são nominais. Não há correção monetária.',
      ],
    },
    {
      id: 'horizontes',
      title: 'Horizontes e sensibilidade',
      paragraphs: [
        'A tela oferece horizontes de 12, 24, 36, 48 e 60 meses. O ranking usa 36 meses. A sensibilidade do custo aparece na tela de resultado, também em 36 meses.',
      ],
    },
  ],
  usage:
    'O TCO é o critério de custo que mais pesa em todos os cenários. Ele compara veículo com veículo, sem considerar sua renda.',
  sources: [
    'Estrutura do modelo de custo total: CALCULO DO TCO (2022), seções 2 e 4.',
    'Composição, valor residual e horizonte: premissas do QC. O estudo de caso citado não fornece premissas para o QC.',
  ],
  referenceDate: `Premissas de custo de referência ${REFERENCE_MONTH_TEXT}. Modelo ${MODEL_VERSION}.`,
  limitations: [
    'Depreciação, seguro e manutenção são médias por categoria, não cotações individuais.',
    'O valor residual é linear. Ele não capta mudanças de mercado.',
    'O TCO não inclui extras nem correção monetária.',
  ],
}

const ARTICLE_ANALISES: HelpArticle = {
  slug: 'analises',
  title: 'Análises complementares',
  summary: 'Resumos, grupos e faixas que ajudam a ler o resultado sem mudar o ranking.',
  keywords: [
    'sumarização',
    'agrupamento',
    'clusterização',
    'classificação',
    'regressão',
    'associação',
    'k-means',
  ],
  sections: [
    {
      id: 'sumarizacao',
      title: 'Sumarização',
      paragraphs: [
        'Resume as opções elegíveis com mínimo, máximo, amplitude, média, mediana, quartis e desvio padrão do preço e do custo mensal. Dado ausente é contado à parte e nunca entra como zero.',
      ],
    },
    {
      id: 'agrupamento',
      title: 'Agrupamento',
      paragraphs: [
        `O grupo analítico usa K-Means próprio, sobre preço, custo mensal, energia por km, manutenção, depreciação, aderência e categoria, todos padronizados. Não usa marca, modelo, renda nem índice.`,
        `O número de grupos vai de 2 a 4, escolhido pela maior silhueta. O K-Means só é aceito com pelo menos ${CLUSTERING.minPerCluster} opções por grupo e silhueta de ao menos ${CLUSTERING.minSilhouette.toFixed(2).replace('.', ',')}. Caso contrário, o QC usa faixas de custo mensal (tercis).`,
        'A letra do grupo identifica o grupo. Ela não indica qualidade.',
      ],
    },
    {
      id: 'classificacao',
      title: 'Classificação',
      paragraphs: [
        `Aderência ao uso, por faixas: muito alta a partir de ${ADHERENCE_THRESHOLDS.muitoAlta}; alta a partir de ${ADHERENCE_THRESHOLDS.alta}; moderada a partir de ${ADHERENCE_THRESHOLDS.moderada}; baixa a partir de ${ADHERENCE_THRESHOLDS.baixa}; abaixo disso, incompatível.`,
        'Pressão financeira, pelas faixas do comprometimento da renda (ver Metodologia). São regras fixas, não um modelo treinado.',
      ],
    },{
      id: 'regressao',
      title: 'Regressão',
      paragraphs: [
        'Estima um valor numérico contínuo a partir de outras variáveis. No QC existe apenas o contrato de tipo para isso. Nenhum modelo foi treinado, porque não há base histórica real.',
      ],
    },
    {
      id: 'associacao',
      title: 'Associação',
      paragraphs: [
        'Mede combinações de itens que ocorrem juntas, por suporte, confiança e lift. No QC existe apenas o contrato de tipo. Ela exigiria eventos anônimos, consentidos e agregados, que não existem.',
      ],
    },
  ],
  usage:
    'Essas análises aparecem como leitura complementar. Elas não alteram o índice, a ordem do ranking nem o grupo recomendado.',
  sources: [
    'Sumarização, agrupamento, associação, regressão e classificação: JESUS (2026), seções 2 a 8.',
    'K-Means e padronização: JESUS (2026), seção 8. Os limites de grupo e de silhueta são premissas configuráveis do QC.',
  ],
  referenceDate: `Limites de análise vigentes no modelo ${MODEL_VERSION}.`,
  limitations: [
    'Com poucas opções, o agrupamento pode ficar indisponível.',
    'Regressão e associação não são usadas nas decisões. Não há base para treiná-las.',
    'Os limites de faixa são premissas do QC.',
  ],
}

const ARTICLE_IMPOSTOS: HelpArticle = {
  slug: 'impostos',
  title: 'Impostos e regionalização',
  summary: 'Como o IPVA depende do estado de registro e o que é, ou não é, dado oficial.',
  keywords: [
    'ipva',
    'imposto',
    'uf',
    'estado',
    'licenciamento',
    'regionalização',
    'isenção',
    'alíquota',
  ],
  sections: [
    {
      id: 'ipva-por-uf',
      title: 'IPVA por estado',
      paragraphs: [
        'O IPVA depende do estado onde o veículo será registrado. O QC pede a UF e trata os 27 estados.',
        `Hoje a Bahia tem uma regra de demonstração, com a alíquota configurável de ${DEFAULT_ASSUMPTIONS.ipvaRatePct}% ao ano. Ela não é uma regra oficial. As outras 26 UFs não têm regra cadastrada.`,
        'Para os outros estados, o IPVA só existe se você informar a alíquota ou marcar a estimativa de demonstração. Sem uma dessas opções, o IPVA e o custo mensal ficam indisponíveis, nunca zero.',
      ],
      formulas: ['IPVA anual = valor FIPE × alíquota', 'IPVA mensal = IPVA anual ÷ 12'],
    },
    {
      id: 'ordem-aplicacao',
      title: 'Ordem de aplicação',
      paragraphs: ['O QC aplica a primeira regra disponível nesta ordem:'],
      items: [
        'Alíquota informada por você, que substitui qualquer regra do catálogo.',
        'Regra do catálogo do estado, vigente na data de referência e aplicável ao veículo, com isenção quando houver. Hoje só a Bahia tem regra, e ela é de demonstração.',
        'Estimativa de demonstração, só se você marcou a opção para um estado sem regra.',
        'Indisponível.',
      ],
    },
    {
      id: 'vigencia',
      title: 'Vigência e data de referência',
      paragraphs: [
        `O cálculo usa a data fixa de referência ${TAX_REFERENCE_DATE}, para o resultado ser reproduzível. Ele não acompanha o relógio do navegador. Uma regra vencida gera um alerta e não é aplicada.`,
        'O valor anual é arredondado em centavos. O valor mensal é o anual dividido por 12, também em centavos. Se 12 vezes o mensal não bater com o anual, o QC mostra um alerta.',
      ],
    },
    {
      id: 'licenciamento',
      title: 'Licenciamento',
      paragraphs: [
        `O licenciamento usa a estimativa nacional de ${formatBRL(DEFAULT_ASSUMPTIONS.licensingAnnualBRL)} por ano. Não há tabela por estado.`,
      ],
    },
  ],
  usage:
    'O IPVA entra no custo mensal e no TCO. A tela de cada veículo mostra o valor anual, o equivalente mensal e o botão "Entenda o cálculo", com a regra usada.',
  sources: [
    'Alíquota de demonstração da Bahia: valor configurável do próprio QC. Não é fonte oficial.',
    'Regra oficial por UF e exercício: fonte necessária, ainda não cadastrada.',
  ],
  referenceDate: `Data de referência do IPVA: ${TAX_REFERENCE_DATE}. Estimativa de licenciamento: ${REFERENCE_MONTH_TEXT}.`,
  limitations: [
    'Nenhuma alíquota oficial foi verificada e cadastrada. A cobertura nacional não está completa.',
    'Nenhuma isenção foi cadastrada no catálogo. O motor sabe aplicá-las, quando houver.',
    'Após a data de referência, as regras não são atualizadas automaticamente.',
  ],
}

const ARTICLE_FONTES: HelpArticle = {
  slug: 'fontes',
  title: 'Fontes de dados',
  summary: 'De onde vem cada informação, e o que ainda não tem fonte.',
  keywords: ['fonte', 'referência', 'referências', 'abnt', 'fipe', 'dados', 'premissas'],
  sections: [
    {
      id: 'documentos',
      title: 'Documentos usados',
      paragraphs: [
        'DIAS JÚNIOR, José Dijailson. A matemática financeira presente em consórcio e financiamento de um bem. Trabalho de Conclusão de Curso (Licenciatura em Matemática). Instituto Federal da Paraíba, Campus Cajazeiras, 2023. Seções 3.1 a 3.3.',
        'GIMENES, Ana Klara; MANSANO, Filipe Borges; ARRUDA, Matheus Felipe de Oliveira; ALMEIDA JÚNIOR, André Sebastião de. Cálculo do TCO: aquisição ou locação de ativo imobilizado veículo. Trabalho de conclusão de curso, Faculdade FGP, 2022. Seções 2 e 4.',
        'JESUS, Jean. Funções de análise de dados: sumarização, agrupamento, associação, regressão e classificação. Trabalho acadêmico, Salvador, 2026. Seções 2 a 8.',
      ],
    },
    {
      id: 'observacoes-fontes',
      title: 'Observações sobre as fontes',
      paragraphs: [
        'A Tabela 3.3 (SAF) de DIAS JÚNIOR (2023) tem inconsistências na soma da coluna de amortização. O QC não copia essa tabela.',
        'O exemplo 3.3.1 de DIAS JÚNIOR (2023) reproduz a parcela com 10 parcelas, não com 12. O QC testa esse caso com 10.',
        'O estudo de caso de CALCULO DO TCO (2022) usa valores de 2021 e 2022 e compra à vista. Esses valores não são premissas do QC.',
      ],
    },
    {
      id: 'sem-fonte',
      title: 'Itens sem fonte ainda',
      paragraphs: [
        'Os documentos acima não cobrem os itens abaixo. Eles são premissas do QC até que uma fonte seja indicada:',
      ],
      items: [
        'Análise multicritério, soma ponderada e pesos.',
        'Comprometimento da renda como indicador e a composição do score financeiro.',
        'Tributos por UF e exercício. Só a regra oficial conta como dado oficial.',
        'Depreciação de veículos.',
      ],
    },
    {
      id: 'dados-plataforma',
      title: 'Dados da plataforma',
      paragraphs: [
        'FIPE (API pública): marca, modelo, ano, combustível e preço de referência. Os preços ficam em cache por 24 horas. Se a API falhar ou limitar as consultas, o QC usa uma referência FIPE salva e avisa você.',
        `Premissas de custo: configuradas no QC, com referência em ${REFERENCE_MONTH_TEXT}, e exibidas ao lado de cada valor.`,
        'Valores informados por você: usados só para calcular os indicadores da sua simulação.',
        DISCLAIMERS.demonstrativeData,
      ],
    },
  ],
  usage:
    'Cada valor exibido informa a origem: FIPE, premissa do QC, dado informado por você ou dado de demonstração.',
  sources: ['Esta própria página lista as fontes. Veja os documentos acima.'],
  referenceDate: `Referência FIPE da simulação e premissas de custo: ${REFERENCE_MONTH_TEXT}.`,
  limitations: [
    'A FIPE mostra apenas referência de mercado. O preço negociado pode ser diferente.',
    'Consumo, manutenção e depreciação vêm de uma base demonstrativa, não da FIPE.',
  ],
}const ARTICLE_PRIVACIDADE: HelpArticle = {
  slug: 'privacidade',
  title: 'Privacidade e segurança',
  summary: 'O que o QC pede, onde os dados ficam e o que nunca pede.',
  keywords: ['privacidade', 'dados', 'segurança', 'senha', 'rls', 'histórico', 'conta', 'foto'],
  sections: [
    {
      id: 'o-que-pedimos',
      title: 'O que pedimos',
      paragraphs: [
        'Nome, e-mail e senha, para a conta, além dos dados da simulação. Não pedimos CPF, RG, endereço completo, número de conta ou cartão, credenciais bancárias, holerite ou qualquer acesso bancário.',
      ],
    },
    {
      id: 'simulacao-atual',
      title: 'Simulação atual',
      paragraphs: [
        'Fica apenas na memória do navegador. Renda e despesas não são gravadas em localStorage.',
      ],
    },
    {
      id: 'historico',
      title: 'Histórico',
      paragraphs: [
        'Só é salvo se você autorizar. Você pode excluir uma simulação, todo o histórico ou a conta inteira em "Perfil".',
      ],
    },
    {
      id: 'senhas-isolamento',
      title: 'Senhas e isolamento',
      paragraphs: [
        'As senhas são gerenciadas pelo Supabase Auth. O QC nunca armazena nem processa senhas. As tabelas usam RLS (Row Level Security): cada usuário só acessa as próprias linhas.',
      ],
    },
    {
      id: 'demonstracao',
      title: 'Modo demonstração',
      paragraphs: ['Usa dados fictícios e a base salva. Não grava nada.'],
    },
    {
      id: 'fotos',
      title: 'Fotos de terceiros',
      paragraphs: [
        'Ao exibir fotos, o navegador consulta a Wikimedia Commons apenas com a marca e o modelo do carro, nunca com seus dados. Como em qualquer site, a Wikimedia vê o seu endereço IP. Você pode desligar as fotos em "Mostrar fotos dos carros".',
      ],
    },
    {
      id: 'sessao',
      title: 'Sessão',
      paragraphs: [
        '"Permanecer conectado" guarda a sessão neste dispositivo. Sem essa opção, a sessão termina ao fechar o navegador.',
      ],
    },
  ],
  usage:
    'Os dados financeiros são usados só para calcular os indicadores da sua simulação. O QC não avalia crédito e não os compartilha com terceiros.',
  sources: ['Política do próprio QC, descrita nesta página.'],
  referenceDate: `Versão da política publicada com o modelo ${MODEL_VERSION}.`,
  limitations: [
    'O QC não é aconselhamento financeiro, de crédito ou de investimento.',
    'A segurança da conta depende também do seu dispositivo e da sua senha.',
  ],
}

const ARTICLE_GLOSSARIO: HelpArticle = {
  slug: 'glossario',
  title: 'Glossário',
  summary: 'Termos usados no QC, em ordem alfabética.',
  keywords: ['glossário', 'termos', 'definição', 'sigla'],
  sections: [
    {
      id: 'termos',
      title: 'Termos',
      paragraphs: ['Definições curtas. Os artigos da central explicam cada uma em detalhes.'],
      items: [
        'Amortização: parte da parcela que reduz o principal da dívida.',
        'Capacidade de aquisição: entrada utilizável mais o principal que a parcela máxima financia.',
        'Comprometimento da renda: custo mensal dividido pela renda líquida. Indicador de pressão.',
        'Dado de demonstração: valor de base demonstrativa, não oficial.',
        'Dado indisponível: valor ausente. Nunca é tratado como zero.',
        'Estimativa configurável: valor do QC que você pode ajustar, com premissa explícita.',
        'IPVA: imposto anual sobre o veículo, que depende do estado de registro.',
        'Normalização min-max: escala de 0 a 100 entre o menor e o maior valor do conjunto.',
        'Renda disponível: renda líquida menos essenciais, outras despesas, dívidas e reserva mensal.',
        'Reserva protegida: maior valor entre a reserva que você quer preservar e as despesas essenciais em meses.',
        'Residual: valor estimado do veículo ao fim do horizonte.',
        'SAC: sistema de amortização constante, com parcelas decrescentes.',
        'Sensibilidade: efeito, sobre o custo, de variar uma premissa.',
        'Situação financeira: score de 0 a 100 sobre o orçamento e a folga, usado como critério de benefício.',
        'Soma ponderada (WSM): índice de cada opção, pela soma das notas multiplicadas pelos pesos.',
        'Tabela Price: parcelas iguais, com juros compostos.',
        'TCO: custo total no horizonte de 36 meses, critério de custo do ranking.',
      ],
    },
  ],
  usage: 'Termos usados nas telas, nos alertas e nos artigos.',
  sources: ['Definições internas do QC, com base nas fontes listadas em Fontes de dados.'],
  referenceDate: `Modelo ${MODEL_VERSION}.`,
  limitations: [
    'As definições são as do QC, não necessariamente as de uma instituição financeira.',
  ],
}

const ARTICLE_LIMITACOES: HelpArticle = {
  slug: 'limitacoes',
  title: 'Limitações',
  summary: 'O que o QC não cobre, e o que você deve conferir antes de decidir.',
  keywords: ['limitações', 'limite', 'cobertura', 'base', 'riscos', 'alertas'],
  sections: [
    {
      id: 'base-veiculos',
      title: 'Base de veículos',
      paragraphs: [
        'A base de veículos é pequena e demonstrativa. O QC não cobre todos os modelos, versões e opcionais do mercado.',
        'O desempenho (potência, aceleração) não está na base. A preferência por desempenho apenas aumenta o peso das preferências que você informou.',
      ],
    },
    {
      id: 'normalizacao-relativa',
      title: 'Normalização relativa',
      paragraphs: [
        'A nota de cada critério depende das outras opções elegíveis naquela simulação. Critérios de custo costumam andar juntos, e veículos mais baratos tendem a pontuar bem em vários critérios. Ajuste os pesos para refletir o que importa para você.',
      ],
    },
    {
      id: 'renda-nao-verificada',
      title: 'Renda não verificada',
      paragraphs: [
        'A renda é informada por você e não é verificada. O QC não avalia crédito e não substitui a análise de uma instituição financeira.',
      ],
    },
    {
      id: 'estimativas',
      title: 'Estimativas',
      paragraphs: [
        'Seguro, manutenção e depreciação são médias por categoria. Financiamento, IOF e tarifas não estão incluídos. Não há correção monetária.',
        'As análises de regressão e associação não são usadas nas decisões: no QC existem apenas contratos de tipo para elas.',
      ],
    },
  ],
  usage:
    'Estas limitações valem para todos os resultados. Elas aparecem também na tela de resultado, quando há alertas específicos da simulação.',
  sources: ['Limitações conhecidas do modelo, descritas pelo próprio QC.'],
  referenceDate: `Modelo ${MODEL_VERSION}. Premissas de custo: ${REFERENCE_MONTH_TEXT}.`,
  limitations: ['Esta lista não é exaustiva.'],
}

export const HELP_ARTICLES: readonly HelpArticle[] = [
  ARTICLE_COMO_FUNCIONA,
  ARTICLE_METODOLOGIA,
  ARTICLE_FORMULAS,
  ARTICLE_TCO,
  ARTICLE_ANALISES,
  ARTICLE_IMPOSTOS,
  ARTICLE_FONTES,
  ARTICLE_PRIVACIDADE,
  ARTICLE_GLOSSARIO,
  ARTICLE_LIMITACOES,
]

export function findHelpArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.slug === slug)
  }
