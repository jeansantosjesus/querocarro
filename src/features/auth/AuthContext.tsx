import {

createContext,

useCallback,

useContext,

useEffect,

useMemo,

useRef,

useState,

type ReactNode,

} from 'react'

import {

AUTH_MESSAGES,

type AuthResult,

type AuthService,

type AuthUser,

} from '../../services/auth/types'



export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'



export interface AuthContextValue {

status: AuthStatus

user: AuthUser | null

isDemo: boolean

/** Verdadeiro após abrir o link de recuperação de senha. */

recovery: boolean

/** Verdadeiro quando a sessão terminou sem o usuário ter clicado em "Sair". */

sessionExpired: boolean

/** Verdadeiro logo após o usuário encerrar a sessão de propósito ("Sair" ou exclusão de conta). */

signedOutByUser: boolean

serviceAvailable: boolean

signUp: AuthService['signUp']

signIn: AuthService['signIn']

signOut: () => Promise<AuthResult<null>>

requestPasswordReset: AuthService['requestPasswordReset']

updatePassword: (password: string) => Promise<AuthResult<null>>

enterDemo: () => void

exitDemo: () => void

clearSessionExpired: () => void

/** Chamado ao chegar ao início depois de sair de propósito (volta ao redirecionamento normal ao login). */

acknowledgeSignOut: () => void

}



const AuthContext = createContext<AuthContextValue | null>(null)



const DEMO_KEY = 'qc:demo'



function readDemoFlag(): boolean {

try {

return window.sessionStorage.getItem(DEMO_KEY) === '1'

} catch {

return false

}

}



function writeDemoFlag(value: boolean) {

try {

if (value) window.sessionStorage.setItem(DEMO_KEY, '1')

else window.sessionStorage.removeItem(DEMO_KEY)

} catch {

// sessionStorage indisponível: o modo demonstração vale apenas nesta página

}

}



export function AuthProvider({ service, children }: { service: AuthService; children: ReactNode }) {

const [status, setStatus] = useState<AuthStatus>('loading')

const [user, setUser] = useState<AuthUser | null>(null)

const [isDemo, setIsDemo] = useState<boolean>(readDemoFlag)

const [recovery, setRecovery] = useState(false)

const [sessionExpired, setSessionExpired] = useState(false)

const [signedOutByUser, setSignedOutByUser] = useState(false)

const userInitiatedSignOut = useRef(false)

const wasAuthenticated = useRef(false)



useEffect(() => {

let active = true



const unsubscribe = service.onChange((event, session) => {

if (!active) return

if (session) {

wasAuthenticated.current = true

setUser(session.user)

setStatus('authenticated')

setSessionExpired(false)

setSignedOutByUser(false)

if (event === 'PASSWORD_RECOVERY') setRecovery(true)

return

}

setUser(null)

setStatus('anonymous')

if (event === 'SIGNED_OUT') {

if (wasAuthenticated.current && !userInitiatedSignOut.current) setSessionExpired(true)

wasAuthenticated.current = false

userInitiatedSignOut.current = false

}

})



;(async () => {

try {

await service.completeSessionFromUrl()

} catch {

// código inválido/expirado: segue como anônimo

}

try {

const session = await service.getSession()

if (!active) return

if (session) {

wasAuthenticated.current = true

setUser(session.user)

setStatus('authenticated')

} else {

setStatus('anonymous')

}

} catch {

if (active) setStatus('anonymous')

}

})()



return () => {

active = false

unsubscribe()

}

}, [service])



const signIn = useCallback<AuthService['signIn']>(

async (params) => {

const result = await service.signIn(params)

if (result.ok) {

setIsDemo(false)

writeDemoFlag(false)

setUser(result.data.user)

setStatus('authenticated')

wasAuthenticated.current = true

setSessionExpired(false)

setSignedOutByUser(false)

}

return result

},

[service],

)



const signOut = useCallback(async () => {

userInitiatedSignOut.current = true

const result = await service.signOut()

setUser(null)

setSignedOutByUser(true)

setStatus('anonymous')

setRecovery(false)

wasAuthenticated.current = false

if (!result.ok) userInitiatedSignOut.current = false

return result

}, [service])



const updatePassword = useCallback(

async (password: string) => {

const result = await service.updatePassword(password)

if (result.ok) setRecovery(false)

return result

},

[service],

)



const enterDemo = useCallback(() => {

writeDemoFlag(true)

setIsDemo(true)

}, [])



const exitDemo = useCallback(() => {

writeDemoFlag(false)

setIsDemo(false)

}, [])



const clearSessionExpired = useCallback(() => setSessionExpired(false), [])

const acknowledgeSignOut = useCallback(() => setSignedOutByUser(false), [])



const value = useMemo<AuthContextValue>(

() => ({

status,

user,

isDemo,

recovery,

sessionExpired,

signedOutByUser,

serviceAvailable: service.available,

signUp: (params) => service.signUp(params),

signIn,

signOut,

requestPasswordReset: (email) => service.requestPasswordReset(email),

updatePassword,

enterDemo,

exitDemo,

clearSessionExpired,

acknowledgeSignOut,

}),

[

status,

user,

isDemo,

recovery,

sessionExpired,

signedOutByUser,

service,

signIn,

signOut,

updatePassword,

enterDemo,

exitDemo,

clearSessionExpired,

acknowledgeSignOut,

],

)



return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>

}



// eslint-disable-next-line react-refresh/only-export-components

export function useAuth(): AuthContextValue {

const context = useContext(AuthContext)

if (!context) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.')

return context

}



export { AUTH_MESSAGES }
