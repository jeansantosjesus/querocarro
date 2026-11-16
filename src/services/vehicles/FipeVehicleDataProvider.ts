import { FIPE_CONFIG } from '../../config/fipe'

import { SUPPLEMENT_DATA } from '../../config/vehicleSupplementData'

import { FIPE_SNAPSHOT, type FipeSnapshotEntry } from '../../mocks/fipeSnapshot'

import type {
  LoadCatalogOptions,
  SupplementRecord,
  Vehicle,
  VehicleCatalog,
  VehicleDataProvider,
} from '../../types/vehicle'

import { FipeError, isFipeError } from '../fipe/errors'

import type { FipeClient } from '../fipe/client'

import { buildCatalog, mergeVehicle } from './merge'

import { indexSnapshot, snapshotKey } from './MockVehicleDataProvider'

/**

* Provedor que consulta a API FIPE para obter o preço de referência dos veículos da base

* complementar. Para cada veículo:

* 1. tenta a consulta online (com cache, timeout e tratamento de 429);

* 2. se falhar, usa a referência salva e sinaliza claramente na interface.

*

* Ao receber HTTP 429, interrompe novas consultas online para não agravar o limite.

*/

export class FipeVehicleDataProvider implements VehicleDataProvider {
  readonly id = 'fipe'

  readonly label = 'Tabela FIPE (consulta online, com referência salva como alternativa)'

  constructor(
    private readonly client: FipeClient,

    private readonly supplement: readonly SupplementRecord[] = SUPPLEMENT_DATA,

    private readonly snapshot: readonly FipeSnapshotEntry[] = FIPE_SNAPSHOT,

    private readonly concurrency: number = FIPE_CONFIG.concurrency,
  ) {}

  async loadCatalog(options?: LoadCatalogOptions): Promise<VehicleCatalog> {
    const snapshotIndex = indexSnapshot(this.snapshot)

    const total = this.supplement.length

    const results: Array<Vehicle | null> = new Array<Vehicle | null>(total).fill(null)

    const failures = new Map<string, number>()

    let stopLive = false

    let done = 0

    let cursor = 0

    let userMessage: string | null = null

    const worker = async () => {
      for (;;) {
        const index = cursor

        cursor += 1

        const record = this.supplement[index]

        if (!record) return

        if (options?.signal?.aborted) throw new FipeError('aborted', 'Requisição cancelada.')

        let vehicle: Vehicle | null = null

        if (!stopLive) {
          try {
            const price = await this.client.getPrice(
              record.fipeBrandId,

              record.fipeModelId,

              record.fipeYearId,

              { signal: options?.signal, forceRefresh: options?.forceRefresh },
            )

            if (price.fipeCode !== record.fipeCode) {
              throw new FipeError(
                'invalid_response',

                `Código FIPE divergente (esperado ${record.fipeCode}, recebido ${price.fipeCode}).`,
              )
            }

            vehicle = mergeVehicle(record, price, 'fipe_online')
          } catch (error) {
            if (isFipeError(error)) {
              if (error.kind === 'aborted') throw error

              failures.set(error.kind, (failures.get(error.kind) ?? 0) + 1)

              userMessage ??= error.userMessage

              if (error.kind === 'rate_limit') stopLive = true
            } else {
              throw error
            }
          }
        }

        if (!vehicle) {
          const saved = snapshotIndex.get(
            snapshotKey(record.fipeBrandId, record.fipeModelId, record.fipeYearId),
          )

          if (saved) vehicle = mergeVehicle(record, saved, 'fipe_referencia_salva')
        }

        results[index] = vehicle

        done += 1

        options?.onProgress?.(done, total)
      }
    }

    const workers = Array.from({ length: Math.max(1, Math.min(this.concurrency, total)) }, worker)

    await Promise.all(workers)

    const vehicles = results.filter((vehicle): vehicle is Vehicle => vehicle !== null)

    const warnings: string[] = []

    const failedCount = [...failures.values()].reduce((sum, value) => sum + value, 0)

    if (failedCount > 0) {
      warnings.push(
        `${userMessage ?? 'Houve falha na consulta à tabela FIPE.'} ${failedCount} de ${total} veículos usam a referência FIPE salva.`,
      )
    }

    return buildCatalog({
      vehicles,

      sourceLabel: this.label,

      versionTag: failedCount > 0 ? 'fipe-parcial' : 'fipe',

      warnings,

      retryable: failedCount > 0,
    })
  }
}
