import {
  AUTH_MESSAGES,
  type AuthEvent,
  type AuthService,
  type AuthSession,
  type AuthUser,
} from '../services/auth/types'

interface StoredUser extends AuthUser {
  password: string
}

/**

* Serviço de autenticação em memória, SOMENTE para testes e desenvolvimento.

* Reproduz o comportamento observável do Supabase Auth (mensagens genéricas,

* confirmação de e-mail opcional) sem guardar nada fora da memória do processo.

*/

export class MemoryAuthService implements AuthService {
  readonly available = true

  private users = new Map<string, StoredUser>()

  private current: AuthSession | null = null

  private listeners = new Set<(event: AuthEvent, session: AuthSession | null) => void>()

  private counter = 0

  readonly requestedResets: string[] = []

  constructor(private readonly options: { requireEmailConfirmation?: boolean } = {}) {}

  private emit(event: AuthEvent, session: AuthSession | null) {
    this.listeners.forEach((listener) => listener(event, session))
  }

  /** Simula o clique no link do e-mail de confirmação. */

  confirmEmailFor(email: string) {
    const user = this.users.get(email.toLowerCase())

    if (user) this.confirmed.add(user.id)
  }

  private confirmed = new Set<string>()

  async getSession() {
    return this.current
  }

  onChange(callback: (event: AuthEvent, session: AuthSession | null) => void) {
    this.listeners.add(callback)

    return () => {
      this.listeners.delete(callback)
    }
  }

  async signUp({ name, email, password }: { name: string; email: string; password: string }) {
    const key = email.toLowerCase()

    if (!this.users.has(key)) {
      this.counter += 1

      const user: StoredUser = {
        id: `user-${this.counter}`,

        email: key,

        displayName: name,

        password,
      }

      this.users.set(key, user)

      if (!this.options.requireEmailConfirmation) {
        this.confirmed.add(user.id)

        // Sem confirmação de e-mail, o Supabase já devolve a sessão no cadastro.

        const session: AuthSession = {
          user: { id: user.id, email: user.email, displayName: user.displayName },

          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        }

        this.current = session

        this.emit('SIGNED_IN', session)
      }
    }

    // Mesma resposta para e-mail novo ou já cadastrado (sem enumeração de contas).

    return {
      ok: true as const,

      data: { needsEmailConfirmation: !!this.options.requireEmailConfirmation },
    }
  }

  async signIn({ email, password }: { email: string; password: string; remember: boolean }) {
    const user = this.users.get(email.toLowerCase())

    if (!user || user.password !== password || !this.confirmed.has(user.id)) {
      return { ok: false as const, message: AUTH_MESSAGES.invalidCredentials }
    }

    const session: AuthSession = {
      user: { id: user.id, email: user.email, displayName: user.displayName },

      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    }

    this.current = session

    this.emit('SIGNED_IN', session)

    return { ok: true as const, data: session }
  }

  async signOut() {
    this.current = null

    this.emit('SIGNED_OUT', null)

    return { ok: true as const, data: null }
  }

  async requestPasswordReset(email: string) {
    this.requestedResets.push(email)

    return { ok: true as const, data: null }
  }

  async updatePassword(newPassword: string) {
    if (!this.current) return { ok: false as const, message: AUTH_MESSAGES.sessionExpired }

    const user = [...this.users.values()].find((item) => item.id === this.current?.user.id)

    if (user) user.password = newPassword

    return { ok: true as const, data: null }
  }

  async completeSessionFromUrl() {}

  /** Expira a sessão (simula token vencido sem renovação). */

  expireSession() {
    this.current = null

    this.emit('SIGNED_OUT', null)
  }

  /** Simula o evento de recuperação de senha vindo do link do e-mail. */

  triggerRecovery(email: string) {
    const user = this.users.get(email.toLowerCase())

    if (!user) return

    const session: AuthSession = {
      user: { id: user.id, email: user.email, displayName: user.displayName },

      expiresAt: null,
    }

    this.current = session

    this.emit('PASSWORD_RECOVERY', session)
  }
}
