import { createFipeClient } from '../../services/fipe/client'

import { FipeVehicleDataProvider } from '../../services/vehicles/FipeVehicleDataProvider'

import { MockVehicleDataProvider } from '../../services/vehicles/MockVehicleDataProvider'

import type { ProviderFactory } from './CatalogContext'

export const defaultProviderFactory: ProviderFactory = (source) =>
  source === 'live'
    ? new FipeVehicleDataProvider(createFipeClient())
    : new MockVehicleDataProvider()
