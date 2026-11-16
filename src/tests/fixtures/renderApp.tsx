import { render } from '@testing-library/react'

import userEvent from '@testing-library/user-event'

import { useEffect } from 'react'

import {
  MemoryRouter,
  useNavigate,
  type InitialEntry,
  type NavigateFunction,
} from 'react-router-dom'

import { AppProviders } from '../../app/AppProviders'

import type { ProviderFactory } from '../../features/vehicles/CatalogContext'

import { MemoryAuthService } from '../../mocks/memoryAuthService'

import { MemoryDatabase } from '../../repositories/memory'

import { AppRoutes } from '../../routes/AppRoutes'

import type { VehicleImageProvider } from '../../services/images/types'

import { MockVehicleDataProvider } from '../../services/vehicles/MockVehicleDataProvider'

export const TEST_USER = {
  name: 'Maria Silva',

  email: 'maria@example.com',

  password: 'SenhaForte123',
}

interface RenderAppOptions {
  route?: InitialEntry

  auth?: MemoryAuthService

  db?: MemoryDatabase

  providerFactory?: ProviderFactory

  /** Fonte de fotos. Padrão nos testes: nenhuma (sem rede). */

  imageProvider?: VehicleImageProvider | null

  /** Cria o usuário de teste e inicia a sessão antes de renderizar. */

  signedIn?: boolean
}

function NavigatorCapture({ onReady }: { onReady: (navigate: NavigateFunction) => void }) {
  const navigate = useNavigate()

  useEffect(() => {
    onReady(navigate)
  }, [navigate, onReady])

  return null
}

/** Renderiza o app completo com serviços em memória (sem rede, sem Supabase). */

export async function renderApp(options: RenderAppOptions = {}) {
  const auth = options.auth ?? new MemoryAuthService()

  const db = options.db ?? new MemoryDatabase()

  const providerFactory: ProviderFactory =
    options.providerFactory ?? (() => new MockVehicleDataProvider())

  if (options.signedIn) {
    await auth.signUp({
      name: TEST_USER.name,

      email: TEST_USER.email,

      password: TEST_USER.password,
    })

    await auth.signIn({ email: TEST_USER.email, password: TEST_USER.password, remember: false })
  }

  let navigate: NavigateFunction = () => {
    throw new Error('Navegação ainda não disponível.')
  }

  const user = userEvent.setup()

  const utils = render(
    <MemoryRouter initialEntries={[options.route ?? '/']}>
      <AppProviders
        authService={auth}

        repositoryFactory={(userId) => db.repositoriesFor(userId)}

        providerFactory={providerFactory}

        imageProvider={options.imageProvider ?? null}
      >
        <NavigatorCapture
          onReady={(fn) => {
            navigate = fn
          }}
        />

        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  )

  return { user, auth, db, goTo: (path: string) => navigate(path), ...utils }
}
