# Quero Carro (QC)



Sistema de Apoio à Decisão (SAD) **acadêmico** que ajuda a pessoa a encontrar um **grupo de 3 a 5 veículos** compatíveis com a sua situação financeira e o seu perfil de uso. Os dados de mercado vêm da [API FIPE (Parallelum v2)](https://fipe.parallelum.com.br/api/v2); o cálculo é **determinístico** (Weighted Sum Model), **sem IA generativa**, e cada resultado é explicável.



> **Aviso.** Os resultados são estimativas educacionais. Não constituem aconselhamento financeiro. A FIPE é apenas uma referência de mercado; seguro, manutenção, impostos, combustível e financiamento variam. A decisão e a responsabilidade pela compra são do usuário.



## Princípios



- **Grupo, não vencedor.** O resultado mostra de 3 a 5 opções com o mesmo peso visual, em ordem alfabética inicial, reordenáveis por vários critérios.

- **Linguagem respeitosa.** Nunca "você não pode comprar este carro".

- **Transparência.** Toda estimativa informa origem, premissa, periodicidade, data de referência, confiabilidade e se pode ser ajustada. A fórmula aparece em "Como o QC calculou este resultado".

- **Dado ausente nunca vira zero.** Aparece como "Informação não disponível" e sai do cálculo (com o peso redistribuído) ou exclui a alternativa, com motivo registrado.

- **Privacidade por padrão.** Simulação só em memória; salvar exige consentimento; histórico pode ser apagado; há modo demonstração com dados fictícios.



## Stack



React 19 · TypeScript (strict) · Vite 8 · React Router 7 (`HashRouter`) · Tailwind CSS 4 · Supabase (Auth + Postgres + RLS) · React Hook Form + Zod · Recharts · Vitest + Testing Library + vitest-axe · ESLint + Prettier · GitHub Actions/Pages.



## Começando



Requisitos: Node 22+ e npm.



```bash

npm ci

cp .env.example .env.local # Windows: copy .env.example .env.local

npm run dev # http://localhost:5173

```



Sem as variáveis do Supabase o app abre, mas só o **modo demonstração** fica disponível (cadastro/login ficam indisponíveis com aviso claro).



### Scripts



| Comando | O que faz |

| --------------------------------- | --------------------------------------------------------------------------- |

| `npm run dev` | Servidor de desenvolvimento |

| `npm run lint` | ESLint (inclui regras de acessibilidade e proíbe `dangerouslySetInnerHTML`) |

| `npm run typecheck` | `tsc -b --noEmit` |

| `npm test` | Vitest (unitários + integração + acessibilidade) |

| `npm run build` | Typecheck + build de produção em `dist/` |

| `npm run preview` | Serve o build localmente |

| `npm run format` / `format:check` | Prettier |



## Configurar o Supabase



1. Crie uma conta e um projeto em [supabase.com](https://supabase.com) (região **South America (São Paulo)**). Guarde a senha do banco em um gerenciador de senhas. **Ela nunca entra no projeto.**

2. Em **Project Settings → API**, copie:

- **Project URL** → `VITE_SUPABASE_URL`

- chave **anon / publishable** → `VITE_SUPABASE_ANON_KEY`

- **Não copie** a `service_role`/`secret`. O app recusa essa chave e o CI também.

3. Crie `.env.local` a partir de `.env.example` e preencha as duas variáveis. O arquivo está no `.gitignore`.

4. No **SQL Editor**, rode **na ordem**:

1. `supabase/migrations/0001_schema.sql`

2. `supabase/migrations/0002_rls.sql`

3. `supabase/migrations/0003_functions.sql`

5. Valide o RLS rodando `supabase/tests/rls_verification.sql` (veja [docs/security.md](docs/security.md)).

6. Em **Authentication → URL Configuration**:

- **Site URL:** `https://jeansantosjesus.github.io/querocarro/`

- **Redirect URLs:** a URL acima e `http://localhost:5173`

7. Em **Authentication → Providers → Email**, decida sobre **Confirm email**. Com a confirmação ligada, o app orienta a pessoa a confirmar o e-mail antes de entrar; desligada, ela entra direto. Os dois fluxos são tratados.



## Publicar no GitHub Pages



1. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

2. Em **Settings → Secrets and variables → Actions → Secrets**, crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (apenas valores públicos).

3. Faça push na branch `main`. O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) executa `npm ci`, auditoria de produção, lint, typecheck, testes, build e publica `dist/`.

4. O app fica em `https://jeansantosjesus.github.io/querocarro/`.



Observações:



- O app usa `HashRouter` (URLs como `/#/painel`), então recarregar a página não gera 404 no Pages.

- `vite.config.ts` usa `base: './'`, que funciona em qualquer subcaminho. Para outro caminho, defina `VITE_BASE_PATH` no build.

- **GitHub Pages em repositório privado** exige plano pago (GitHub Pro, Team ou Enterprise Cloud). Em conta gratuita, o repositório precisa ser público para publicar. O código não contém segredos, então a visibilidade não expõe credenciais.

- A chave anon do Supabase é pública por projeto. **A segurança dos dados está no RLS**, não no sigilo dessa chave.



## Estrutura



```

src/

app/ composição de providers e dependências padrão

components/ UI reutilizável e layout

config/ premissas, critérios, cenários, limites, textos (sem números mágicos no domínio)

domain/ funções puras: finance, vehicle, decision (testadas sem React)

features/ auth, simulation (assistente), recommendations, history, vehicles

mocks/ snapshot FIPE e AuthService em memória

pages/ telas

repositories/ interfaces + Supabase + MemoryDatabase

routes/ rotas e guarda de acesso

schemas/ validação Zod

services/ fipe (cliente, cache, adapter), supabase, vehicles (VehicleDataProvider)

tests/ unit, integration, fixtures

supabase/ migrations SQL e verificação de RLS

docs/ arquitetura, dados, metodologia, segurança, ADRs, backlog, testes, qualidade

```



## Documentação



- [Arquitetura (Mermaid)](docs/architecture.md)

- [Modelo de dados e SQL](docs/data-model.md)

- [Metodologia e fórmulas](docs/methodology.md)

- [Segurança, privacidade e RLS](docs/security.md)

- [Decisões de arquitetura (ADRs)](docs/adr.md)

- [Plano de testes](docs/test-plan.md)

- [Relatório de qualidade](docs/quality-report.md)

- [Backlog e limitações](docs/backlog.md)



## Licença e uso



Projeto acadêmico. Sem garantias. Não use como única base para uma decisão financeira.
