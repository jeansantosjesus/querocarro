import { useMemo, useState, type ReactNode } from 'react'

import type { VehicleImageProvider } from '../../../services/images/types'

import { VehicleImagesContext, type VehicleImagesValue } from './imagesContext'

interface VehicleImagesProviderProps {
  /** `null` desativa as fotos (testes, ambientes sem rede). */

  provider: VehicleImageProvider | null

  children: ReactNode
}

export function VehicleImagesProvider({ provider, children }: VehicleImagesProviderProps) {
  const [enabled, setEnabled] = useState(true)

  const value = useMemo<VehicleImagesValue>(
    () => ({ available: provider !== null, enabled, setEnabled, provider }),

    [provider, enabled],
  )

  return <VehicleImagesContext.Provider value={value}>{children}</VehicleImagesContext.Provider>
}
