import { createSupabaseRepositories } from '../repositories/supabase'
import type { Repositories } from '../repositories/types'
import type { AuthService } from '../services/auth/types'
import type { VehicleImageProvider } from '../services/images/types'
import { createWikimediaImageProvider } from '../services/images/wikimedia'
import { createSupabaseAuthService } from '../services/supabase/authService'
import { getSupabaseClient } from '../services/supabase/client'

export type RepositoryFactory = (userId: string) => Repositories | null

export const defaultRepositoryFactory: RepositoryFactory = () => {
  const client = getSupabaseClient()
  return client ? createSupabaseRepositories(client) : null
}

let defaultAuthService: AuthService | null = null

export function getDefaultAuthService(): AuthService {
  defaultAuthService ??= createSupabaseAuthService()
  return defaultAuthService
}

let defaultImageProvider: VehicleImageProvider | null = null

/** Provedor de fotos compartilhado (mantém o cache em memória entre telas). */
export function getDefaultImageProvider(): VehicleImageProvider {
  defaultImageProvider ??= createWikimediaImageProvider()
  return defaultImageProvider
}
