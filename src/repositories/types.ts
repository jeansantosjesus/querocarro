import type {
  SavedSimulation,
  SavedSimulationSummary,
  SimulationDraft,
  UserPreferences,
  UserProfile,
} from '../types/history'

/**

* Contratos de persistência. Todas as operações atuam SOMENTE sobre dados do usuário

* autenticado: o isolamento é garantido no banco (RLS) e reforçado nas implementações.

*/

export interface SimulationRepository {
  list(): Promise<SavedSimulationSummary[]>

  get(id: string): Promise<SavedSimulation | null>

  save(draft: SimulationDraft): Promise<SavedSimulation>

  remove(id: string): Promise<void>

  removeAll(): Promise<void>
}

export interface ProfileRepository {
  get(): Promise<UserProfile | null>

  upsert(profile: { displayName: string; privacyAcceptedAt: string | null }): Promise<UserProfile>

  /** Exclui o perfil, as preferências e todo o histórico associado (direito de exclusão). */

  deleteMyData(): Promise<void>

  /** Exclui também a conta de autenticação (função SQL `delete_my_account`). */

  deleteAccount(): Promise<void>
}

export interface PreferencesRepository {
  get(): Promise<UserPreferences>

  update(preferences: Partial<UserPreferences>): Promise<UserPreferences>
}

export interface Repositories {
  simulations: SimulationRepository

  profile: ProfileRepository

  preferences: PreferencesRepository
}

export class ConsentRequiredError extends Error {
  constructor() {
    super('O consentimento para salvar o histórico ainda não foi concedido.')

    this.name = 'ConsentRequiredError'
  }
}

export class RepositoryError extends Error {
  constructor(message: string) {
    super(message)

    this.name = 'RepositoryError'
  }
}
