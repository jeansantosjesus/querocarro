export type Fuel = 'flex' | 'gasolina' | 'etanol' | 'diesel' | 'hibrido' | 'eletrico'

export type Transmission = 'manual' | 'automatico'

export type VehicleCategory = 'hatch' | 'sedan' | 'suv' | 'picape' | 'minivan'

export type InsuranceCategory = 'baixo' | 'medio' | 'alto' | 'muito_alto'

export type ConsumptionUnit = 'km/l' | 'km/kWh'

/** Origem de um valor exibido ao usuário (rótulo da interface). Ver `DataOrigin` em `types/provenance.ts` para a classe da fonte. */

export type ValueOrigin =
  | 'fipe_online'
  | 'fipe_referencia_salva'
  | 'estimativa_demonstrativa'
  | 'premissa_configuravel'
  | 'informado_usuario'
  | 'calculado'

/**

* Registro da base complementar (estimativa demonstrativa). Não vem da FIPE.

* Campos opcionais ausentes permanecem `null`: nunca são substituídos por zero.

*/

export interface SupplementRecord {
  fipeCode: string

  fipeBrandId: string

  fipeModelId: string

  fipeYearId: string

  transmission: Transmission | null

  urbanConsumption: number | null

  highwayConsumption: number | null

  consumptionUnit: ConsumptionUnit

  maintenanceAnnualBRL: number | null

  insuranceCategory: InsuranceCategory | null

  depreciationAnnualPct: number | null

  category: VehicleCategory | null

  trunkLiters: number | null

  seats: number | null
}

/** Preço de referência já adaptado a partir da resposta da API FIPE. */

export interface FipePriceRecord {
  fipeCode: string

  brand: string

  model: string

  modelYear: number

  fuel: Fuel | null

  fuelLabel: string

  priceBRL: number

  /** Texto original da API, ex.: "novembro de 2026". */

  referenceMonthLabel: string

  /** Normalizado como YYYY-MM quando possível. */

  referenceMonth: string | null
}

export type PriceSource = 'fipe_online' | 'fipe_referencia_salva'

/** Veículo consolidado (FIPE + complemento). `null` significa "Informação não disponível". */

export interface Vehicle {
  /** `${fipeCode}:${yearId}` */

  id: string

  fipeCode: string

  fipeBrandId: string

  fipeModelId: string

  fipeYearId: string

  brand: string

  model: string

  modelYear: number

  fuel: Fuel | null

  priceBRL: number | null

  priceSource: PriceSource

  referenceMonth: string | null

  referenceMonthLabel: string | null

  transmission: Transmission | null

  urbanConsumption: number | null

  highwayConsumption: number | null

  consumptionUnit: ConsumptionUnit

  maintenanceAnnualBRL: number | null

  insuranceCategory: InsuranceCategory | null

  depreciationAnnualPct: number | null

  category: VehicleCategory | null

  trunkLiters: number | null

  seats: number | null

  supplementUpdatedAt: string | null

  hasSupplement: boolean
}

export interface VehicleCatalog {
  vehicles: Vehicle[]

  /** Mês de referência FIPE predominante (YYYY-MM) e seu rótulo. */

  referenceMonth: string | null

  referenceMonthLabel: string | null

  sourceLabel: string

  fetchedAt: string

  /** Identifica versão do catálogo para reprodutibilidade. */

  version: string

  warnings: string[]

  /** Quantos preços vieram da FIPE online / referência salva. */

  onlineCount: number

  snapshotCount: number

  /**

* online: todos os preços consultados na FIPE; parcial: parte consultada, parte salva;

* referencia_salva: nenhuma consulta online (modo demonstração ou falha).

*/

  liveStatus: 'online' | 'parcial' | 'referencia_salva'

  /** Houve falha na consulta online que justifica oferecer "Tentar novamente". */

  retryable: boolean
}

export interface LoadCatalogOptions {
  signal?: AbortSignal

  forceRefresh?: boolean

  onProgress?: (done: number, total: number) => void
}

/** Contrato para fontes de dados de veículos: a FIPE pode ser substituída no futuro. */

export interface VehicleDataProvider {
  readonly id: string

  readonly label: string

  loadCatalog(options?: LoadCatalogOptions): Promise<VehicleCatalog>
}
