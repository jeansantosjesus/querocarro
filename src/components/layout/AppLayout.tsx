import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { APP_NAME, DISCLAIMERS } from '../../config/copy'
import { useAuth } from '../../features/auth/AuthContext'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold ${
    isActive ? 'bg-brand-50 text-brand-900' : 'text-ink-700 hover:bg-ink-100'
  }`

export function AppLayout() {
  const { status, user, isDemo, signOut, exitDemo, recovery, signedOutByUser, acknowledgeSignOut } =
    useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  // Leva o foco ao conteúdo a cada troca de rota (leitores de tela e teclado).
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: false })
  }, [location.pathname])

  // Depois de sair de propósito e chegar ao início, rotas protegidas voltam a redirecionar ao login.
  useEffect(() => {
    if (signedOutByUser && location.pathname === '/') acknowledgeSignOut()
  }, [signedOutByUser, location.pathname, acknowledgeSignOut])

  // Link de recuperação de senha aberto: leva à tela de nova senha.
  useEffect(() => {
    if (recovery && location.pathname !== '/redefinir-senha')
      navigate('/redefinir-senha', { replace: true })
  }, [recovery, location.pathname, navigate])

  const loggedIn = status === 'authenticated'
  const canUseApp = loggedIn || isDemo

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  function handleExitDemo() {
    exitDemo()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        onClick={(event) => {
          event.preventDefault()
          mainRef.current?.focus()
        }}
        className="no-print sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold"
      >
        Pular para o conteúdo
      </a>

      <header className="no-print border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-extrabold text-brand-900">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-lg bg-brand-700 text-sm text-white"
            >
              QC
            </span>
            {APP_NAME}
          </Link>

          <nav aria-label="Principal" className="flex flex-wrap items-center gap-1">
            {canUseApp ? (
              <>
                <NavLink to="/painel" className={navLinkClass}>
                  Painel
                </NavLink>
                <NavLink to="/simulacao" className={navLinkClass}>
                  Nova simulação
                </NavLink>
                {loggedIn ? (
                  <NavLink to="/historico" className={navLinkClass}>
                    Histórico
                  </NavLink>
                ) : null}
              </>
            ) : null}
            <NavLink to="/ajuda" className={navLinkClass}>
              Central de ajuda
            </NavLink>
            {loggedIn ? (
              <>
                <NavLink to="/perfil" className={navLinkClass}>
                  Perfil
                </NavLink>
                <button type="button" className="qc-btn-secondary" onClick={handleSignOut}>
                  Sair
                </button>
              </>
            ) : isDemo ? (
              <button type="button" className="qc-btn-secondary" onClick={handleExitDemo}>
                Sair da demonstração
              </button>
            ) : status === 'anonymous' ? (
              <>
                <NavLink to="/entrar" className={navLinkClass}>
                  Entrar
                </NavLink>
                <Link to="/cadastro" className="qc-btn-primary">
                  Criar conta
                </Link>
              </>
            ) : null}
          </nav>
        </div>
        {loggedIn && user ? (
          <p className="mx-auto max-w-6xl px-4 pb-2 text-xs text-ink-600">
            Conectado como {user.displayName ?? user.email}
          </p>
        ) : null}
        {isDemo && !loggedIn ? (
          <p className="bg-info-bg px-4 py-2 text-center text-sm font-medium text-info-fg">
            Modo demonstração: dados fictícios, nada é salvo nem enviado.
          </p>
        ) : null}
      </header>

      <main
        id="conteudo"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 focus:outline-none"
      >
        <Outlet />
      </main>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-600">
          <p>{DISCLAIMERS.short}</p>
          <p className="no-print mt-2">
            <Link to="/ajuda" className="font-semibold text-brand-800 underline">
              Central de ajuda: privacidade, metodologia e limitações
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
