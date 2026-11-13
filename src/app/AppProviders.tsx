import { useMemo, type ReactNode } from 'react'
import { AuthProvider, useAuth } from '../features/auth/AuthContext'
import { RepositoriesProvider } from '../features/history/RepositoriesContext'
import { SimulationProvider } from '../features/simulation/SimulationContext'
import { CatalogProvider, type ProviderFactory } from '../features/vehicles/CatalogContext'
import { VehicleImagesProvider } from '../features/vehicles/images/VehicleImagesContext'
import type { AuthService } from '../services/auth/types'
import type { VehicleImageProvider } from '../services/images/types'
import { defaultProviderFactory } from '../features/vehicles/providerFactory'
import {
  defaultRepositoryFactory,
  getDefaultAuthService,
  getDefaultImageProvider,
  type RepositoryFactory,
} from './defaults'

function RepositoriesBridge({
  factory,
  children,
}: {
  factory: RepositoryFactory
  children: ReactNode
}) {
  const { status, user } = useAuth()
  const userId = status === 'authenticated' ? (user?.id ?? null) : null
  // Repositórios existem apenas para usuário autenticado (nunca no modo demonstração).
  const repositories = useMemo(() => (userId ? factory(userId) : null), [factory, userId])
  return <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
}

interface AppProvidersProps {
  authService?: AuthService
  repositoryFactory?: RepositoryFactory
  providerFactory?: ProviderFactory
  /** Fonte de fotos. Omitido: Wikimedia Commons. `null`: sem fotos (ilustrações genéricas). */
  imageProvider?: VehicleImageProvider | null
  children: ReactNode
}

export function AppProviders({
  authService,
  repositoryFactory = defaultRepositoryFactory,
  providerFactory = defaultProviderFactory,
  imageProvider,
  children,
}: AppProvidersProps) {
  const service = useMemo(() => authService ?? getDefaultAuthService(), [authService])
  const images = imageProvider === undefined ? getDefaultImageProvider() : imageProvider
  return (
    <AuthProvider service={service}>
      <RepositoriesBridge factory={repositoryFactory}>
        <CatalogProvider providerFactory={providerFactory}>
          <VehicleImagesProvider provider={images}>
            <SimulationProvider>{children}</SimulationProvider>
          </VehicleImagesProvider>
        </CatalogProvider>
      </RepositoriesBridge>
    </AuthProvider>
  )
}
