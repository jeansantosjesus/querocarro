import { z } from 'zod'

/**
 * Validação das variáveis de ambiente públicas.
 *
 * Somente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são permitidas no frontend.
 * Qualquer chave que aparente ser privada (service_role / secret) é rejeitada,
 * para evitar vazamento acidental no bundle público.
 */

function decodeJwtRole(token: string): string | null {
  const parts = token.split('.')
  const payload = parts[1]
  if (parts.length !== 3 || !payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const parsed: unknown = JSON.parse(json)
    if (parsed && typeof parsed === 'object' && 'role' in parsed) {
      const role = (parsed as { role: unknown }).role
      return typeof role === 'string' ? role : null
    }
    return null
  } catch {
    return null
  }
}

export function looksLikePrivateKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  return decodeJwtRole(key) === 'service_role'
}

const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .trim()
    .url('VITE_SUPABASE_URL deve ser uma URL válida.')
    .refine((value) => value.startsWith('https://'), 'VITE_SUPABASE_URL deve usar https.'),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .trim()
    .min(20, 'VITE_SUPABASE_ANON_KEY parece inválida.')
    .refine(
      (value) => !looksLikePrivateKey(value),
      'Chave privada detectada (service_role/secret). Use somente a chave anon/pública.',
    ),
})

export type PublicEnv = {
  supabaseUrl: string
  supabaseAnonKey: string
}

export type EnvResult = { ok: true; env: PublicEnv } | { ok: false; problems: string[] }

export function parseEnv(raw: Record<string, unknown>): EnvResult {
  const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((name) => {
    const value = raw[name]
    return typeof value !== 'string' || value.trim() === ''
  })
  if (missing.length > 0) {
    return { ok: false, problems: missing.map((name) => `Variável ausente: ${name}`) }
  }

  const result = envSchema.safeParse(raw)
  if (!result.success) {
    return { ok: false, problems: result.error.issues.map((issue) => issue.message) }
  }
  return {
    ok: true,
    env: {
      supabaseUrl: result.data.VITE_SUPABASE_URL,
      supabaseAnonKey: result.data.VITE_SUPABASE_ANON_KEY,
    },
  }
}

/** Resultado da validação do ambiente atual (calculado uma vez). */
export const envResult: EnvResult = parseEnv(import.meta.env as Record<string, unknown>)

export const isSupabaseConfigured = envResult.ok
