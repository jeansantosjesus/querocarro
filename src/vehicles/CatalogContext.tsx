import {

createContext,

useCallback,

useContext,

useEffect,

useMemo,

useRef,

useState,

type ReactNode,

} from 'react'

import { isFipeError } from '../../services/fipe/errors'

import type { VehicleCatalog, VehicleDataProvider } from '../../types/vehicle'



export type CatalogSource = 'live' | 'saved'

export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error'



export interface CatalogContextValue {

status: CatalogStatus

catalog: VehicleCatalog | null

source: CatalogSource | null

progress: { done: number; total: number } | null

error: string | null

/** Carrega o catálogo. Reaproveita o já carregado da mesma fonte, exceto com `force`. */

load: (source: CatalogSource, options?: { force?: boolean }) => Promise<VehicleCatalog | null>

}



const CatalogContext = createContext<CatalogContextValue | null>(null)



export type ProviderFactory = (source: CatalogSource) => VehicleDataProvider



export function CatalogProvider({

providerFactory,

children,

}: {

providerFactory: ProviderFactory

children: ReactNode

}) {

const [status, setStatus] = useState<CatalogStatus>('idle')

const [catalog, setCatalog] = useState<VehicleCatalog | null>(null)

const [source, setSource] = useState<CatalogSource | null>(null)

const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

const [error, setError] = useState<string | null>(null)

const controllerRef = useRef<AbortController | null>(null)

const loadedRef = useRef<{ source: CatalogSource; catalog: VehicleCatalog } | null>(null)



useEffect(() => () => controllerRef.current?.abort(), [])



const load = useCallback<CatalogContextValue['load']>(

async (requested, options) => {

const previous = loadedRef.current

if (previous && previous.source === requested && !options?.force) {

return previous.catalog

}



controllerRef.current?.abort()

const controller = new AbortController()

controllerRef.current = controller



setStatus('loading')

setError(null)

setProgress(null)

try {

const loaded = await providerFactory(requested).loadCatalog({

signal: controller.signal,

forceRefresh: options?.force,

onProgress: (done, total) => {

if (!controller.signal.aborted) setProgress({ done, total })

},

})

if (controller.signal.aborted) return null

loadedRef.current = { source: requested, catalog: loaded }

setCatalog(loaded)

setSource(requested)

setStatus('ready')

return loaded

} catch (caught) {

if (controller.signal.aborted) return null

setStatus('error')

setError(

isFipeError(caught)

? caught.userMessage

: 'Não foi possível carregar os dados dos veículos. Tente novamente.',

)

return null

}

},

[providerFactory],

)



const value = useMemo(

() => ({ status, catalog, source, progress, error, load }),

[status, catalog, source, progress, error, load],

)

return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>

}



// eslint-disable-next-line react-refresh/only-export-components

export function useCatalog(): CatalogContextValue {

const context = useContext(CatalogContext)

if (!context) throw new Error('useCatalog deve ser usado dentro de <CatalogProvider>.')

return context

}
