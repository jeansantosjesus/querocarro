import { createContext, useContext, useEffect, useState } from 'react'

import type {
  VehicleImage,
  VehicleImageProvider,
  VehicleImageQuery,
} from '../../../services/images/types'

export interface VehicleImagesValue {
  /** Existe uma fonte de fotos configurada. */

  available: boolean

  /** O usuário permite carregar fotos (padrão: sim). Fica só em memória. */

  enabled: boolean

  setEnabled: (enabled: boolean) => void

  provider: VehicleImageProvider | null
}

export const VehicleImagesContext = createContext<VehicleImagesValue>({
  available: false,

  enabled: false,

  setEnabled: () => {},

  provider: null,
})

export function useVehicleImagesSettings() {
  const { available, enabled, setEnabled } = useContext(VehicleImagesContext)

  return { available, enabled, setEnabled }
}

export type VehicleImageStatus = 'off' | 'loading' | 'ready' | 'none'

interface ImageState {
  key: string

  image: VehicleImage | null
}

/** Busca a foto do veículo. `off`: desativada ou sem fonte; `none`: não há foto adequada. */

export function useVehicleImage(query: VehicleImageQuery): {
  status: VehicleImageStatus

  image: VehicleImage | null
} {
  const { provider, enabled } = useContext(VehicleImagesContext)

  const { brand, model, modelYear } = query

  const active = enabled && provider !== null

  const key = `${brand}|${model}|${modelYear}`

  const [state, setState] = useState<ImageState | null>(null)

  useEffect(() => {
    if (!active || !provider) return

    let cancelled = false

    provider

      .find({ brand, model, modelYear })

      .then((image) => {
        if (!cancelled) setState({ key, image })
      })

      .catch(() => {
        if (!cancelled) setState({ key, image: null })
      })

    return () => {
      cancelled = true
    }
  }, [active, provider, brand, model, modelYear, key])

  if (!active) return { status: 'off', image: null }

  if (state?.key !== key) return { status: 'loading', image: null }

  return state.image ? { status: 'ready', image: state.image } : { status: 'none', image: null }
}
