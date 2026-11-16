import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { RECOMMENDATION_LIMITS } from '../../config/limits'

import { buildRelaxedVariants, runDecision } from '../../domain/decision/pipeline'

import { referenceYearOf } from '../../domain/decision/premises'

import type { SortKey } from '../../domain/decision/sort'

import type { SimulationInput } from '../../schemas/simulation'

import type { Weights } from '../../types/decision'

import type { DecisionResult } from '../../types/decision'

import { useCatalog } from '../vehicles/CatalogContext'

import { createBlankDraft, DEMO_INPUT, type SimulationDraftInput } from './defaults'



/**

* Estado da simulação ATUAL. Vive apenas em memória (React state): nenhum dado

* financeiro vai para localStorage/sessionStorage. Só é persistido pelo histórico,

* com consentimento explícito.

*/

export interface SimulationContextValue {

draft: SimulationDraftInput

input: SimulationInput | null

result: DecisionResult | null

hasCalculated: boolean

sortKey: SortKey

groupSize: number

compareIds: string[]

savedId: string | null

weightsCustomized: boolean

setDraft: (draft: SimulationDraftInput) => void

setWeightsCustomized: (value: boolean) => void

/** Confirma uma entrada validada e a marca como pronta para cálculo. */

commitInput: (input: SimulationInput) => void

/** Ajusta apenas os pesos (recalcula o resultado na hora). */

updateWeights: (weights: Weights) => void

/** Aplica uma sugestão de ajuste (um único parâmetro relaxado). */

applySuggestion: (suggestionId: string) => boolean

startNew: (mode?: 'blank' | 'demo') => void

/** Carrega uma simulação salva (histórico) como ponto de partida. */

loadInput: (input: SimulationInput, options?: { calculate?: boolean }) => void

setSortKey: (key: SortKey) => void

setGroupSize: (size: number) => void

toggleCompare: (vehicleId: string) => void

clearCompare: () => void

markSaved: (id: string | null) => void

}



const SimulationContext = createContext<SimulationContextValue | null>(null)



function clampGroupSize(size: number): number {

return Math.min(

RECOMMENDATION_LIMITS.maxGroupSize,

Math.max(RECOMMENDATION_LIMITS.minGroupSize, Math.round(size)),

)

}



export function SimulationProvider({ children }: { children: ReactNode }) {

const { catalog } = useCatalog()

const [draft, setDraftState] = useState<SimulationDraftInput>(createBlankDraft)

const [input, setInput] = useState<SimulationInput | null>(null)

const [hasCalculated, setHasCalculated] = useState(false)

const [sortKey, setSortKey] = useState<SortKey>('alfabetica')

const [groupSize, setGroupSizeState] = useState<number>(RECOMMENDATION_LIMITS.defaultGroupSize)

const [compareIds, setCompareIds] = useState<string[]>([])

const [savedId, setSavedId] = useState<string | null>(null)

const [weightsCustomized, setWeightsCustomized] = useState(false)



const result = useMemo<DecisionResult | null>(() => {

if (!input || !hasCalculated || !catalog) return null

const referenceYear = referenceYearOf(catalog.referenceMonth)

return runDecision(input, catalog.vehicles, { referenceYear, groupSize, withSuggestions: true })

}, [input, hasCalculated, catalog, groupSize])



const commitInput = useCallback((next: SimulationInput) => {

setInput(next)

setDraftState(next as SimulationDraftInput)

setHasCalculated(true)

setCompareIds([])

setSavedId(null)

}, [])



const updateWeights = useCallback((weights: Weights) => {

setInput((current) => (current ? { ...current, weights } : current))

setDraftState((current) => ({ ...current, weights }))

setWeightsCustomized(true)

setSavedId(null)

}, [])



const applySuggestion = useCallback(

(suggestionId: string) => {

if (!input) return false

const variant = buildRelaxedVariants(input).find((item) => item.id === suggestionId)

if (!variant) return false

setInput(variant.input)

setDraftState(variant.input as SimulationDraftInput)

setSavedId(null)

return true

},

[input],

)



const startNew = useCallback((mode: 'blank' | 'demo' = 'blank') => {

const next = mode === 'demo' ? DEMO_INPUT : null

setDraftState(next ? (structuredClone(next) as SimulationDraftInput) : createBlankDraft())

setInput(null)

setHasCalculated(false)

setCompareIds([])

setSavedId(null)

setWeightsCustomized(mode === 'demo')

setSortKey('alfabetica')

}, [])



const loadInput = useCallback((next: SimulationInput, options?: { calculate?: boolean }) => {

setDraftState(structuredClone(next) as SimulationDraftInput)

setInput(options?.calculate ? next : null)

setHasCalculated(Boolean(options?.calculate))

setCompareIds([])

setSavedId(null)

setWeightsCustomized(true)

}, [])



const setGroupSize = useCallback((size: number) => setGroupSizeState(clampGroupSize(size)), [])



const toggleCompare = useCallback((vehicleId: string) => {

setCompareIds((current) => {

if (current.includes(vehicleId)) return current.filter((id) => id !== vehicleId)

if (current.length >= RECOMMENDATION_LIMITS.maxCompare) return current

return [...current, vehicleId]

})

}, [])



const clearCompare = useCallback(() => setCompareIds([]), [])



const value = useMemo<SimulationContextValue>(

() => ({

draft,

input,

result,

hasCalculated,

sortKey,

groupSize,

compareIds,

savedId,

weightsCustomized,

setDraft: setDraftState,

setWeightsCustomized,

commitInput,

updateWeights,

applySuggestion,

startNew,

loadInput,

setSortKey,

setGroupSize,

toggleCompare,

clearCompare,

markSaved: setSavedId,

}),

[

draft,

input,

result,

hasCalculated,

sortKey,

groupSize,

compareIds,

savedId,

weightsCustomized,

commitInput,

updateWeights,

applySuggestion,

startNew,

loadInput,

setGroupSize,

toggleCompare,

clearCompare,

],

)



return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>

}



// eslint-disable-next-line react-refresh/only-export-components

export function useSimulation(): SimulationContextValue {

const context = useContext(SimulationContext)

if (!context) throw new Error('useSimulation deve ser usado dentro de <SimulationProvider>.')

return context

}
