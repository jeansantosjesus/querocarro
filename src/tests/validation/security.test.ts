/**

* Verificações de segurança que não exigem banco nem rede.

* Leem o SQL, o código-fonte e o uso de storage. Não substituem o teste de RLS

* contra um banco real (supabase/tests/rls_verification.sql, não executado aqui).

*/

import { describe, expect, it } from 'vitest'

import { simulationInputSchema } from '../../schemas/simulation'

import { makeInput } from '../fixtures/factories'

import { readRepoFile } from './repoFiles'



const envExample = readRepoFile('.env.example')

const gitignore = readRepoFile('.gitignore')

const rlsSql = readRepoFile('supabase/migrations/0002_rls.sql')

const functionsSql = readRepoFile('supabase/migrations/0003_functions.sql')



/** Código-fonte de src/ (sem testes), indexado pelo caminho a partir da raiz. */

const SOURCE_FILES = import.meta.glob('/src/**/*.{ts,tsx}', {

query: '?raw',

import: 'default',

eager: true,

}) as Record<string, string>



function productionSource(): Array<{ path: string; text: string }> {

return Object.entries(SOURCE_FILES)

.filter(([path]) => !/\.(test|spec)\.(ts|tsx)$/.test(path))

.filter(([path]) => !path.startsWith('/src/tests/'))

.map(([path, text]) => ({ path: path.slice(1), text }))

}



describe('banco: RLS e privilégios (SQL estático)', () => {

const TABLES = ['profiles', 'user_preferences', 'simulations', 'simulation_results']



it('RLS ativo e forçado em todas as tabelas do usuário', () => {

for (const table of TABLES) {

expect(rlsSql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`))

expect(rlsSql).toMatch(new RegExp(`alter table public\\.${table} force row level security`))

}

})



it('anon não recebe nenhum privilégio nas tabelas', () => {

expect(rlsSql).toMatch(/revoke all on[^;]*from anon;/)

for (const table of TABLES) {

expect(rlsSql).toMatch(new RegExp(`revoke all on[^;]*public\\.${table}[^;]*from anon`))

}

})



it('cada política é para authenticated e limitada ao próprio usuário (auth.uid())', () => {

const policies = rlsSql.split(';').filter((statement) => /create policy/i.test(statement))

// profiles 4, user_preferences 4, simulations 3 (sem update), simulation_results 3.

expect(policies.length).toBe(14)

for (const policy of policies) {

expect(policy, policy.trim()).toMatch(/to authenticated/)

expect(policy, policy.trim()).toMatch(/auth\.uid\(\)/)

}

})



it('nenhuma política aberta (using true / with check true)', () => {

expect(rlsSql).not.toMatch(/using\s*\(\s*true\s*\)/i)

expect(rlsSql).not.toMatch(/with check\s*\(\s*true\s*\)/i)

})



it('simulações salvas não têm política de UPDATE (histórico imutável)', () => {

expect(rlsSql).not.toMatch(/create policy simulations_update/i)

expect(rlsSql).not.toMatch(/grant[^;]*update[^;]*public\.simulations/i)

})



it('funções SECURITY DEFINER têm search_path vazio', () => {

// Só código: comentários SQL (--) podem mencionar SECURITY DEFINER sem serem funções.

const code = functionsSql.replace(/^\s*--.*$/gm, '')

const occurrences = code.match(/security definer/gi) ?? []

expect(occurrences.length).toBeGreaterThan(0)

const withEmptyPath = code.match(/security definer\s+set search_path = ''/gi) ?? []

expect(withEmptyPath.length).toBe(occurrences.length)

})

})



describe('segredos e chaves no frontend', () => {

const sources = productionSource()



it('nenhum código de produção contém chave privada (service_role ou sb_secret_)', () => {

for (const { path, text } of sources) {

// src/config/env.ts contém os padrões para REJEITAR chaves privadas: é o único lugar permitido.

if (path === 'src/config/env.ts') continue

expect(text, path).not.toMatch(/service_role|sb_secret_|SERVICE_ROLE/)

}

})



it('o arquivo de exemplo de ambiente só lista variáveis públicas', () => {

const keys = envExample

.split(/\r?\n/)

.filter((line) => line.trim() && !line.trim().startsWith('#'))

.map((line) => line.split('=')[0]?.trim())

expect(keys).toEqual(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])

})



it('.env.local não é versionado (regra no .gitignore)', () => {

expect(gitignore).toMatch(/^\.env\.\*$/m)

})

})



describe('código de produção: injeção e logs', () => {

const sources = productionSource()



it('nenhum uso de HTML bruto ou execução dinâmica', () => {

for (const { path, text } of sources) {

expect(text, path).not.toMatch(

/dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|new Function\(/,

)

}

})



it('nenhum log de depuração em produção (console.log, info, debug)', () => {

for (const { path, text } of sources) {

expect(text, path).not.toMatch(/console\.(log|info|debug)\(/)

}

})

})



describe('persistência no navegador', () => {

it('só estes arquivos gravam em storage: cache FIPE, sessão do Supabase e flag de demonstração', () => {

const writers = productionSource()

.filter(({ text }) => /\.setItem\(/.test(text))

.map(({ path }) => path)

.sort()

expect(writers).toEqual([

'src/features/auth/AuthContext.tsx',

'src/services/fipe/cache.ts',

'src/services/supabase/client.ts',

])

})



it('renda e despesas não são gravadas em storage pelo contexto da simulação', () => {

const context = SOURCE_FILES['/src/features/simulation/SimulationContext.tsx']

expect(context).toBeDefined()

// Só código: a documentação do arquivo pode mencionar o storage para explicar que não o usa.

const code = (context ?? '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

expect(code).not.toMatch(/setItem|localStorage|sessionStorage/)

})

})



describe('validação de entrada (schema da simulação)', () => {

it('a entrada de demonstração é aceita (controle positivo)', () => {

expect(simulationInputSchema.safeParse(makeInput()).success).toBe(true)

})



it('renda negativa é rejeitada', () => {

const result = simulationInputSchema.safeParse(makeInput({ finance: { netIncome: -1 } }))

expect(result.success).toBe(false)

})



it('entrada negativa é rejeitada', () => {

const result = simulationInputSchema.safeParse(makeInput({ finance: { downPayment: -500 } }))

expect(result.success).toBe(false)

})



it('taxa de juros não numérica (NaN) é rejeitada', () => {

const result = simulationInputSchema.safeParse(

makeInput({ finance: { monthlyRatePct: Number.NaN } }),

)

expect(result.success).toBe(false)

})

})
