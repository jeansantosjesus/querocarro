import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { Spinner } from '../components/ui/Spinner'

import { useAuth } from '../features/auth/AuthContext'



interface RequireAccessProps {

/** Se verdadeiro, o modo demonstração também libera a rota. */

allowDemo?: boolean

}



/**

* Proteção de rotas privadas (no cliente, para experiência de uso).

* A proteção REAL dos dados está nas políticas RLS do banco: esta guarda não é um controle de segurança.

*/

export function RequireAccess({ allowDemo = false }: RequireAccessProps) {

const { status, isDemo, signedOutByUser } = useAuth()

const location = useLocation()



if (status === 'loading') {

return <Spinner label="Verificando sua sessão…" />

}

if (status === 'authenticated' || (allowDemo && isDemo)) {

return <Outlet />

}

// Saída deliberada ("Sair", exclusão de conta): volta ao início, sem tela de login.

if (signedOutByUser) {

return <Navigate to="/" replace />

}

return <Navigate to="/entrar" replace state={{ from: location.pathname }} />

}
