# Tarefa atual

## Prompt ativo

`10-revisao-final.md`: revisão concluída e decisões do usuário aplicadas (B3 e A1). Resultado: **não pronto para publicação com dados reais**. Restam B1 (RLS no banco real) e B2 (navegador).

Ordem do prompt tree: `01, 02, 04, 04b, 05, 03, 07, 06, 08, 09, 10`. O 06 foi executado antes do 07 a pedido do usuário.

## Objetivo

Revisão final acadêmica, funcional, financeira, de segurança e de publicação, com relatório em `docs/decisoes/revisao-final.md`. Depois, aplicar as decisões do usuário sobre os bloqueadores B3 (premissas do histórico) e A1 (sensibilidade sem tela).

## Decisões

- B3: gravar as premissas com a simulação. Campo `scenarioSnapshot.premises` (jsonb existente, sem migração). Registros antigos continuam válidos e mostram aviso.

- A1: criar a tela de sensibilidade ligada ao motor existente, na página de resultado, para um veículo do grupo, em 36 meses, Tabela Price.

- Nada commitado nem enviado.

## Mudanças desta etapa

- Novos: `src/domain/decision/premises.ts`, `src/domain/decision/sensitivity.ts`, `src/features/recommendations/SensitivityPanel.tsx`, `src/tests/unit/premises-sensitivity.test.ts`.

- Alterados: `src/types/history.ts` (`SavedPremises`, `premises?`), `src/schemas/history.ts` (schema de premissas, opcional), `src/features/history/buildDraft.ts`, `src/features/simulation/SimulationContext.tsx` (usa `referenceYearOf`), `src/pages/ResultPage.tsx` (painel), `src/pages/HistoryDetailPage.tsx` (seção de premissas e aviso), `src/config/provenance.ts` (`UNRECORDED_PREMISES` só para registros antigos), `src/config/help.ts` (textos sobre sensibilidade).

- Testes: `flow.test.tsx` (sensibilidade no resultado), `history.test.tsx` (premissas no detalhe; registro antigo).

- Docs: `docs/dados-e-fontes.md` (seção 7), `docs/methodology.md`, `docs/metodologia/matriz-rastreabilidade.md`, `docs/decisoes/revisao-final.md`, `docs/decisoes/relatorio-validacao.md`, `docs/test-plan.md` (checklist de navegador).

## Validação (11/11/2026)

- `npm run lint`, `npm run typecheck`, `npm run format:check`: passam.

- `npm test`: 31 arquivos, 614 testes passando (eram 604).

- `npm run build`: passa.

- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades (sem mudança de dependências).

## Bloqueadores abertos

- **B1** RLS não executada no projeto Supabase real (`supabase/tests/rls_verification.sql`).

- **B2** Sem verificação em navegador (checklist em `docs/test-plan.md`, incluindo o painel de sensibilidade).

## Não feito

- Execução de RLS no banco real (B1).

- Checklist de navegador (B2).

- Revisão por pessoa ou outro agente. A revisão foi feita pelo mesmo agente que implementou.

- Sensibilidade no histórico salvo e na simulação inversa (fora do escopo da decisão A1).

- Confirmação do custo R$ 0 pela visibilidade do repositório e pelo plano do Supabase.

## Próximo passo

1. Executar `supabase/tests/rls_verification.sql` no projeto de homologação e anexar o resultado (B1).

2. Checklist de navegador de `docs/test-plan.md` (B2).

3. Commit e push só quando o usuário autorizar. O push publica automaticamente no GitHub Pages.

## Decisões de limpeza

- `src/pages/MethodologyPage.tsx` permanece removido. A metodologia está em `/ajuda/metodologia`.

- `querocarro.bundle` apagado: era cópia do commit `3216687`, já presente em `.git`. `*.bundle` no `.gitignore`.
