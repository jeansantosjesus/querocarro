export interface AuthUser {

id: string

email: string

displayName: string | null

}



export interface AuthSession {

user: AuthUser

/** Epoch em segundos, quando conhecido. */

expiresAt: number | null

}



export type AuthEvent =

| 'INITIAL_SESSION'

| 'SIGNED_IN'

| 'SIGNED_OUT'

| 'TOKEN_REFRESHED'

| 'PASSWORD_RECOVERY'

| 'USER_UPDATED'



export type AuthResult<T> = { ok: true; data: T } | { ok: false; message: string }



export interface SignUpParams {

name: string

email: string

password: string

}



export interface SignInParams {

email: string

password: string

/** "Permanecer conectado": persiste a sessão entre fechamentos do navegador. */

remember: boolean

}



/**

* Contrato de autenticação. A implementação real usa Supabase Auth: a aplicação

* NUNCA armazena senhas nem implementa hash próprio.

* As mensagens de erro são genéricas e não revelam se um e-mail existe.

*/

export interface AuthService {

readonly available: boolean

getSession(): Promise<AuthSession | null>

onChange(callback: (event: AuthEvent, session: AuthSession | null) => void): () => void

signUp(params: SignUpParams): Promise<AuthResult<{ needsEmailConfirmation: boolean }>>

signIn(params: SignInParams): Promise<AuthResult<AuthSession>>

signOut(): Promise<AuthResult<null>>

requestPasswordReset(email: string): Promise<AuthResult<null>>

updatePassword(newPassword: string): Promise<AuthResult<null>>

/** Troca o código PKCE presente na URL (confirmação de e-mail / recuperação) por sessão. */

completeSessionFromUrl(): Promise<void>

}



export const AUTH_MESSAGES = {

invalidCredentials: 'E-mail ou senha incorretos.',

generic: 'Não foi possível concluir a operação. Tente novamente em instantes.',

tooMany: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',

network: 'Sem conexão com o serviço de autenticação. Verifique sua internet.',

unavailable:

'O serviço de autenticação não está configurado neste ambiente. Use a demonstração ou configure o Supabase (veja o README).',

resetSent: 'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.',

weakPassword: 'A senha não atende aos requisitos de segurança.',

sessionExpired: 'Sua sessão expirou. Entre novamente para continuar.',

} as const
