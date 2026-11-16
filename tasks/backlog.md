# Backlog

Preenchido pela auditoria inicial (10/11/2026). Status inicial: pendente.

## QC-001 — Auditoria do estado atual

- **Descrição:** Mapear o que já existe, sem mudar código de cálculo ou de tela.

- **Risco:** baixo

- **Agente recomendado:** orquestrador

- **Dependências:** nenhuma

- **Arquivos prováveis:** `docs/arquitetura/auditoria-atual.md`

- **Critérios de aceite:** mapa, lacunas, reprodução renda R$ 15.000 × R$ 100.000 e ordem dos próximos prompts.

- **Testes necessários:** exemplo com `runDecision` no snapshot (feito e removido).

- **Status:** concluído

## QC-002 — Fundamentação do SAD

- **Descrição:** Registrar o que o sistema decide, o que não decide e como a renda pode influenciar filtros sem virar critério de “carro mais caro”.

- **Risco:** alto

- **Agente recomendado:** agente principal

- **Dependências:** QC-001

- **Arquivos prováveis:** `docs/` de metodologia, `src/config/scenarios.ts`, artigos de metodologia em `src/config/help.ts`

- **Critérios de aceite:** regras invioláveis refletidas na metodologia visível; nenhuma alíquota nova sem fonte.

- **Testes necessários:** revisão dos testes de decisão que afirmam que a renda não é critério.

- **Status:** pendente

## QC-003 — TCO e financiamento

- **Descrição:** Completar a identificação de cada componente do custo total e do que a Tabela Price não inclui.

- **Risco:** alto

- **Agente recomendado:** agente principal

- **Dependências:** QC-002

- **Arquivos prováveis:** `src/domain/finance/costs.ts`, `loan.ts`, `estimates.ts`, `src/config/assumptions.ts`

- **Critérios de aceite:** cada estimativa tem origem, premissa, referência e confiança; ausência não vira zero.

- **Testes necessários:** `finance.test.ts`, `estimates.test.ts`.

- **Status:** pendente

## QC-004 — Capacidade financeira

- **Descrição:** Deixar explícitos o limite voluntário, a margem da renda e o teto de comprometimento, e o efeito da renda no conjunto elegível.

- **Risco:** alto

- **Agente recomendado:** agente principal

- **Dependências:** QC-003

- **Arquivos prováveis:** `src/domain/finance/indicators.ts`, `src/domain/decision/pipeline.ts`, `StepFinance.tsx`

- **Critérios de aceite:** a tela usa a mesma função de domínio da margem; renda R$ 15.000 e R$ 100.000 com o mesmo limite voluntário mantêm o mesmo grupo; diferença de elegíveis, quando o limite voluntário não segura, é explicada.

- **Testes necessários:** teste de regressão dos dois rendimentos no snapshot.

- **Status:** pendente

## QC-005 — Regionalização tributária

- **Descrição:** IPVA e licenciamento por UF e exercício, somente com fonte oficial. Sem fonte, manter estimativa configurável e o aviso.

- **Risco:** alto

- **Agente recomendado:** agente principal

- **Dependências:** QC-003

- **Arquivos prováveis:** `src/config/assumptions.ts`, wizard de finanças, metodologia

- **Critérios de aceite:** nenhuma alíquota inventada; UF ausente não vira zero nem uma alíquota silenciosa.

- **Testes necessários:** schema da UF e custo com e sem alíquota conhecida.

- **Status:** pendente

## QC-006 — Modelo analítico

- **Descrição:** Revisar pesos, normalização e o grupo recomendado depois das regras de capacidade e tributos.

- **Risco:** alto

- **Agente recomendado:** agente principal

- **Dependências:** QC-004, QC-005

- **Arquivos prováveis:** `src/domain/decision/`, `src/config/criteria.ts`, `scenarios.ts`

- **Critérios de aceite:** grupo de 3 a 5, sem vencedor; ranking determinístico; pesos editáveis somando 100.

- **Testes necessários:** `decision.test.ts`, `pipeline.test.ts`.

- **Status:** pendente

## QC-007 — Simulação inversa

- **Descrição:** A partir de um veículo, mostrar combinações de entrada, prazo e parcela e o TCO correspondente, sem aprovar crédito.

- **Risco:** alto

- **Agente recomendado:** agente principal para a fórmula; apoio para a tela

- **Dependências:** QC-003, QC-004

- **Arquivos prováveis:** novo módulo em `src/domain/finance/`, nova rota e página

- **Critérios de aceite:** não existe hoje; o resultado explica premissas e não promete aprovação.

- **Testes necessários:** casos de entrada insuficiente, taxa zero e prazo inválido.

- **Status:** pendente

## QC-008 — Central de ajuda

- **Descrição:** Ajuda navegável sobre FIPE, TCO, financiamento, capacidade, pesos e limites, sem duplicar números mágicos fora da config.

- **Risco:** baixo

- **Agente recomendado:** apoio (conteúdo), com revisão do agente principal

- **Dependências:** QC-002

- **Arquivos prováveis:** nova página de ajuda, links no layout, `docs/`

- **Critérios de aceite:** os textos batem com a config; avisos de estimativa permanecem.

- **Testes necessários:** render da ajuda e um teste de acessibilidade.

- **Status:** pendente

## QC-009 — Dados e fontes

- **Descrição:** Inventariar o que é FIPE, o que é base demonstrativa e o que é premissa editável.

- **Risco:** médio

- **Agente recomendado:** apoio para inventário; agente principal para classificar fonte

- **Dependências:** QC-003

- **Arquivos prováveis:** `src/config/vehicleSupplementData.ts`, `src/mocks/fipeSnapshot.ts`, metodologia

- **Critérios de aceite:** nenhum campo complementar atribuído à FIPE.

- **Testes necessários:** `vehicle.test.ts`, `fipe.test.ts`.

- **Status:** pendente

## QC-010 — Testes e validação

- **Descrição:** Cobrir capacidade financeira, regionalização (quando existir), simulação inversa e ajuda.

- **Risco:** médio

- **Agente recomendado:** apoio para testes repetitivos; agente principal revisa os de dinheiro

- **Dependências:** QC-004 a QC-008

- **Arquivos prováveis:** `src/tests/unit/`, `src/tests/integration/`

- **Critérios de aceite:** `npm run lint`, `typecheck`, `test` e `build` sem erro.

- **Testes necessários:** os das tarefas anteriores, juntos.

- **Status:** pendente

## QC-011 — Revisão final

- **Descrição:** Conferir regras invioláveis, privacidade, RLS e o deploy antes de encerrar a árvore.

- **Risco:** alto

- **Agente recomendado:** agente principal

- **Dependências:** QC-010

- **Arquivos prováveis:** diff completo, `docs/security.md`, `docs/quality-report.md`

- **Critérios de aceite:** checklist do prompt `10-revisao-final.md`.

- **Testes necessários:** suíte completa e build.

- **Status:** pendente
