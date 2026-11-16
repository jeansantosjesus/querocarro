import { SUPPLEMENT_DATA } from '../../config/vehicleSupplementData'

import {
  FIPE_SNAPSHOT,
  FIPE_SNAPSHOT_CAPTURED_AT,
  type FipeSnapshotEntry,
} from '../../mocks/fipeSnapshot'

import type {
  FipePriceRecord,
  LoadCatalogOptions,
  SupplementRecord,
  Vehicle,
  VehicleCatalog,
  VehicleDataProvider,
} from '../../types/vehicle'

import { adaptFipePriceResponse } from '../fipe/adapter'

import { FipeError } from '../fipe/errors'

import { buildCatalog, mergeVehicle } from './merge'

export function snapshotKey(brandId: string, modelId: string, yearId: string): string {
  return `${brandId}/${modelId}/${yearId}`
}

/** Indexa o snapshot e adapta as respostas pelo MESMO adaptador usado com a API real. */

export function indexSnapshot(
  snapshot: readonly FipeSnapshotEntry[] = FIPE_SNAPSHOT,
): Map<string, FipePriceRecord> {
  const index = new Map<string, FipePriceRecord>()

  for (const entry of snapshot) {
    try {
      index.set(
        snapshotKey(entry.brandId, entry.modelId, entry.yearId),

        adaptFipePriceResponse(entry.response),
      )
    } catch (error) {
      if (!(error instanceof FipeError)) throw error

      // entrada inválida do snapshot é ignorada: o veículo ficará sem preço e será excluído
    }
  }

  return index
}

export function buildVehiclesFromSnapshot(
  supplement: readonly SupplementRecord[] = SUPPLEMENT_DATA,

  snapshot: readonly FipeSnapshotEntry[] = FIPE_SNAPSHOT,
): Vehicle[] {
  const index = indexSnapshot(snapshot)

  const vehicles: Vehicle[] = []

  for (const record of supplement) {
    const price = index.get(snapshotKey(record.fipeBrandId, record.fipeModelId, record.fipeYearId))

    if (price) vehicles.push(mergeVehicle(record, price, 'fipe_referencia_salva'))
  }

  return vehicles
}

/**

* Provedor local para modo demonstração, desenvolvimento e testes.

* Usa uma referência FIPE salva (respostas reais capturadas) e NÃO acessa a rede.

*/

export class MockVehicleDataProvider implements VehicleDataProvider {
  readonly id = 'mock'

  readonly label = `Referência FIPE salva em ${FIPE_SNAPSHOT_CAPTURED_AT.split('-').reverse().join('/')} (sem consulta online)`

  constructor(
    private readonly supplement: readonly SupplementRecord[] = SUPPLEMENT_DATA,

    private readonly snapshot: readonly FipeSnapshotEntry[] = FIPE_SNAPSHOT,
  ) {}

  async loadCatalog(options?: LoadCatalogOptions): Promise<VehicleCatalog> {
    if (options?.signal?.aborted) throw new FipeError('aborted', 'Requisição cancelada.')

    const vehicles = buildVehiclesFromSnapshot(this.supplement, this.snapshot)

    options?.onProgress?.(vehicles.length, vehicles.length)

    return buildCatalog({
      vehicles,

      sourceLabel: this.label,

      versionTag: 'snapshot',

      warnings: [],

      retryable: false,

      now: new Date(`${FIPE_SNAPSHOT_CAPTURED_AT}T12:00:00Z`),
    })
  }
}
