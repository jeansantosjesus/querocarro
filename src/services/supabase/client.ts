import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { envResult } from '../../config/env'

const REMEMBER_KEY = 'qc:auth:remember'

/**
 * Armazenamento da sessão do Supabase. Guarda APENAS o token de autenticação.
 * "Permanecer conectado" => localStorage; caso contrário => sessionStorage
 * (sessão termina ao fechar a aba). Nunca guarda dados financeiros.
 */
function readRemember(): boolean {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) !== '0'
  } catch {
    return true
  }
}

export function setRememberSession(remember: boolean): void {
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  } catch {
    // storage indisponível: usa o padrão
  }
}

function activeStorage(): Storage {
  return readRemember() ? window.localStorage : window.sessionStorage
}

const authStorage = {
  getItem: (key: string) => {
    try {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    try {
      const target = activeStorage()
      const other = target === window.localStorage ? window.sessionStorage : window.localStorage
      other.removeItem(key)
      target.setItem(key, value)
    } catch {
      // ignora falhas de storage
    }
  },
  removeItem: (key: string) => {
    try {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    } catch {
      // ignora falhas de storage
    }
  },
}

let cached: SupabaseClient | null | undefined

/**
 * Cliente Supabase único. Usa somente a URL e a chave ANON (pública) validadas em config/env.
 * Retorna null quando as variáveis estão ausentes ou inválidas (a interface orienta o usuário).
 *
 * - PKCE: o retorno de e-mails de confirmação/recuperação usa `?code=`, compatível com HashRouter.
 * - detectSessionInUrl desligado: o código é tratado explicitamente em AuthService.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached
  if (!envResult.ok) {
    cached = null
    return cached
  }
  cached = createClient(envResult.env.supabaseUrl, envResult.env.supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: authStorage,
    },
  })
  return cached
}
