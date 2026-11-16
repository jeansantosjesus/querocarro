import type { Session, SupabaseClient, User } from '@supabase/supabase-js'

import {

AUTH_MESSAGES,

type AuthEvent,

type AuthResult,

type AuthService,

type AuthSession,

type AuthUser,

} from '../auth/types'

import { getSupabaseClient, setRememberSession } from './client'



function toUser(user: User): AuthUser {

const metaName = (user.user_metadata as Record<string, unknown> | undefined)?.display_name

return {

id: user.id,

email: user.email ?? '',

displayName: typeof metaName === 'string' && metaName.trim() ? metaName : null,

}

}



function toSession(session: Session | null): AuthSession | null {

if (!session?.user) return null

return { user: toUser(session.user), expiresAt: session.expires_at ?? null }

}



/** Redirecionamento compatível com HashRouter e subcaminho do GitHub Pages. */

function redirectUrl(route: string): string {

const { origin, pathname } = window.location

return `${origin}${pathname}#${route}`

}



/** Mensagens genéricas: não revelam se o e-mail existe nem detalhes internos do serviço. */

function mapError(error: { status?: number; message?: string; code?: string } | null): string {

if (!error) return AUTH_MESSAGES.generic

if (

error.status === 429 ||

error.code === 'over_request_rate_limit' ||

error.code === 'over_email_send_rate_limit'

) {

return AUTH_MESSAGES.tooMany

}

if (error.code === 'weak_password') return AUTH_MESSAGES.weakPassword

if (error.status === 0 || /fetch|network/i.test(error.message ?? '')) return AUTH_MESSAGES.network

return AUTH_MESSAGES.generic

}



const EVENT_MAP: Partial<Record<string, AuthEvent>> = {

INITIAL_SESSION: 'INITIAL_SESSION',

SIGNED_IN: 'SIGNED_IN',

SIGNED_OUT: 'SIGNED_OUT',

TOKEN_REFRESHED: 'TOKEN_REFRESHED',

PASSWORD_RECOVERY: 'PASSWORD_RECOVERY',

USER_UPDATED: 'USER_UPDATED',

}



export function createSupabaseAuthService(

client: SupabaseClient | null = getSupabaseClient(),

): AuthService {

const unavailable = <T>(): AuthResult<T> => ({ ok: false, message: AUTH_MESSAGES.unavailable })



if (!client) {

return {

available: false,

getSession: async () => null,

onChange: () => () => {},

signUp: async () => unavailable(),

signIn: async () => unavailable(),

signOut: async () => ({ ok: true, data: null }),

requestPasswordReset: async () => unavailable(),

updatePassword: async () => unavailable(),

completeSessionFromUrl: async () => {},

}

}



return {

available: true,



async getSession() {

const { data } = await client.auth.getSession()

return toSession(data.session)

},



onChange(callback) {

const { data } = client.auth.onAuthStateChange((event, session) => {

const mapped = EVENT_MAP[event]

if (mapped) callback(mapped, toSession(session))

})

return () => data.subscription.unsubscribe()

},



async signUp({ name, email, password }) {

const { data, error } = await client.auth.signUp({

email,

password,

options: {

data: { display_name: name, privacy_accepted: true },

emailRedirectTo: redirectUrl('/entrar'),

},

})

if (error) return { ok: false, message: mapError(error) }

// Com confirmação de e-mail habilitada, não há sessão imediata.

return { ok: true, data: { needsEmailConfirmation: !data.session } }

},



async signIn({ email, password, remember }) {

setRememberSession(remember)

const { data, error } = await client.auth.signInWithPassword({ email, password })

if (error || !data.session) {

// Qualquer falha de credencial usa a mesma mensagem (sem enumeração de contas).

const tooMany = error && (error.status === 429 || error.code === 'over_request_rate_limit')

const network = error && (error.status === 0 || /fetch|network/i.test(error.message))

return {

ok: false,

message: tooMany

? AUTH_MESSAGES.tooMany

: network

? AUTH_MESSAGES.network

: AUTH_MESSAGES.invalidCredentials,

}

}

const session = toSession(data.session)

return session ? { ok: true, data: session } : { ok: false, message: AUTH_MESSAGES.generic }

},



async signOut() {

const { error } = await client.auth.signOut()

return error ? { ok: false, message: mapError(error) } : { ok: true, data: null }

},



async requestPasswordReset(email) {

const { error } = await client.auth.resetPasswordForEmail(email, {

redirectTo: redirectUrl('/redefinir-senha'),

})

// Mesma resposta para e-mails existentes e inexistentes (exceto limite de taxa).

if (error && (error.status === 429 || error.code === 'over_email_send_rate_limit')) {

return { ok: false, message: AUTH_MESSAGES.tooMany }

}

return { ok: true, data: null }

},



async updatePassword(newPassword) {

const { error } = await client.auth.updateUser({ password: newPassword })

return error ? { ok: false, message: mapError(error) } : { ok: true, data: null }

},



async completeSessionFromUrl() {

const params = new URLSearchParams(window.location.search)

const code = params.get('code')

if (!code || !/^[A-Za-z0-9._~-]{8,200}$/.test(code)) return

await client.auth.exchangeCodeForSession(code)

// Remove o código da URL preservando a rota (#/...), sem recarregar a página.

params.delete('code')

const search = params.toString()

const clean = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`

window.history.replaceState(null, '', clean)

},

}

}
