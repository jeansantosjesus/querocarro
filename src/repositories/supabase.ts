import type { SupabaseClient } from '@supabase/supabase-js'

import {

preferencesRowSchema,

migrateStoredSimulationRow,

profileRowSchema,

savedResultRowSchema,

simulationRowSchema,

simulationSummaryRowSchema,

} from '../schemas/history'

import type {

SavedResultItem,

SavedSimulation,

SimulationDraft,

UserPreferences,

UserProfile,

} from '../types/history'

import type { RankedVehicle } from '../types/decision'

import {

ConsentRequiredError,

RepositoryError,

type PreferencesRepository,

type ProfileRepository,

type Repositories,

type SimulationRepository,

} from './types'



/**

* Repositórios Supabase. O isolamento entre usuários é garantido pelas políticas RLS

* (ver supabase/migrations). O `user_id` é SEMPRE definido a partir da sessão

* (auth.uid()), nunca de parâmetros recebidos da interface.

*/

export function createSupabaseRepositories(client: SupabaseClient): Repositories {

async function currentUserId(): Promise<string> {

const { data, error } = await client.auth.getUser()

if (error || !data.user) throw new RepositoryError('Sessão inválida ou expirada.')

return data.user.id

}



const simulations: SimulationRepository = {

async list() {

const { data, error } = await client

.from('simulations')

.select(

'id,title,scenario_id,created_at,fipe_reference_month,fipe_reference_month_label,simulation_results(count)',

)

.order('created_at', { ascending: false })

.limit(200)

if (error) throw new RepositoryError('Não foi possível carregar o histórico.')

return (data ?? []).flatMap((row) => {

const parsed = simulationSummaryRowSchema.safeParse(row)

if (!parsed.success) return []

const r = parsed.data

return [

{

id: r.id,

title: r.title,

scenarioId: r.scenario_id,

createdAt: r.created_at,

fipeReferenceMonth: r.fipe_reference_month,

fipeReferenceMonthLabel: r.fipe_reference_month_label,

resultCount: r.simulation_results?.[0]?.count ?? 0,

},

]

})

},



async get(id) {

const { data: row, error } = await client

.from('simulations')

.select('*')

.eq('id', id)

.maybeSingle()

if (error) throw new RepositoryError('Não foi possível abrir a simulação.')

if (!row) return null

const parsed = simulationRowSchema.safeParse(migrateStoredSimulationRow(row))

if (!parsed.success)

throw new RepositoryError('Registro de simulação em formato incompatível.')



const { data: resultRows, error: resultsError } = await client

.from('simulation_results')

.select(

'vehicle_fipe_code,vehicle_year_id,compatibility_index,in_recommended_group,rank,payload',

)

.eq('simulation_id', id)

.order('rank', { ascending: true })

if (resultsError) throw new RepositoryError('Não foi possível carregar os resultados.')



const results: SavedResultItem[] = (resultRows ?? []).flatMap((resultRow) => {

const result = savedResultRowSchema.safeParse(resultRow)

if (!result.success) return []

return [

{

vehicleFipeCode: result.data.vehicle_fipe_code,

vehicleYearId: result.data.vehicle_year_id,

compatibilityIndex: result.data.compatibility_index,

inRecommendedGroup: result.data.in_recommended_group,

rank: result.data.rank,

payload: result.data.payload as unknown as RankedVehicle,

},

]

})



const r = parsed.data

const simulation: SavedSimulation = {

id: r.id,

createdAt: r.created_at,

title: r.title,

scenarioId: r.scenario_id,

inputs: r.inputs,

weights: r.weights,

scenarioSnapshot: r.scenario_snapshot,

fipeReferenceMonth: r.fipe_reference_month,

fipeReferenceMonthLabel: r.fipe_reference_month_label,

catalogVersion: r.catalog_version,

results,

}

return simulation

},



async save(draft: SimulationDraft) {

const userId = await currentUserId()



const { data: prefs } = await client

.from('user_preferences')

.select('persist_history_consent')

.eq('user_id', userId)

.maybeSingle()

if (!prefs || prefs.persist_history_consent !== true) throw new ConsentRequiredError()



const { data: inserted, error } = await client

.from('simulations')

.insert({

user_id: userId,

title: draft.title,

scenario_id: draft.scenarioId,

inputs: draft.inputs,

weights: draft.weights,

scenario_snapshot: draft.scenarioSnapshot,

fipe_reference_month: draft.fipeReferenceMonth,

fipe_reference_month_label: draft.fipeReferenceMonthLabel,

catalog_version: draft.catalogVersion,

model_version: draft.scenarioSnapshot.modelVersion,

})

.select('id,created_at')

.single()

if (error || !inserted) throw new RepositoryError('Não foi possível salvar a simulação.')



const { error: resultsError } = await client.from('simulation_results').insert(

draft.results.map((item) => ({

simulation_id: inserted.id as string,

user_id: userId,

vehicle_fipe_code: item.vehicleFipeCode,

vehicle_year_id: item.vehicleYearId,

compatibility_index: Number(item.compatibilityIndex.toFixed(2)),

in_recommended_group: item.inRecommendedGroup,

rank: item.rank,

payload: item.payload,

})),

)

if (resultsError) {

// Sem transação no cliente: desfaz a simulação criada para não deixar registro parcial.

await client

.from('simulations')

.delete()

.eq('id', inserted.id as string)

throw new RepositoryError('Não foi possível salvar os resultados da simulação.')

}



return { ...draft, id: inserted.id as string, createdAt: inserted.created_at as string }

},



async remove(id) {

const { error } = await client.from('simulations').delete().eq('id', id)

if (error) throw new RepositoryError('Não foi possível excluir a simulação.')

},



async removeAll() {

const userId = await currentUserId()

const { error } = await client.from('simulations').delete().eq('user_id', userId)

if (error) throw new RepositoryError('Não foi possível excluir o histórico.')

},

}



const profile: ProfileRepository = {

async get() {

const userId = await currentUserId()

const { data, error } = await client

.from('profiles')

.select('*')

.eq('id', userId)

.maybeSingle()

if (error) throw new RepositoryError('Não foi possível carregar o perfil.')

if (!data) return null

const parsed = profileRowSchema.safeParse(data)

if (!parsed.success) throw new RepositoryError('Perfil em formato incompatível.')

return {

id: parsed.data.id,

displayName: parsed.data.display_name,

privacyAcceptedAt: parsed.data.privacy_accepted_at,

}

},

async upsert({ displayName, privacyAcceptedAt }) {

const userId = await currentUserId()

const { data, error } = await client

.from('profiles')

.upsert({ id: userId, display_name: displayName, privacy_accepted_at: privacyAcceptedAt })

.select('*')

.single()

if (error || !data) throw new RepositoryError('Não foi possível salvar o perfil.')

const parsed = profileRowSchema.parse(data)

const result: UserProfile = {

id: parsed.id,

displayName: parsed.display_name,

privacyAcceptedAt: parsed.privacy_accepted_at,

}

return result

},
async deleteMyData() {

const userId = await currentUserId()

await client.from('simulations').delete().eq('user_id', userId)

await client.from('user_preferences').delete().eq('user_id', userId)

await client.from('profiles').delete().eq('id', userId)

},

async deleteAccount() {

const { error } = await client.rpc('delete_my_account')

if (error) throw new RepositoryError('Não foi possível excluir a conta.')

},

}



const preferences: PreferencesRepository = {

async get() {

const userId = await currentUserId()

const { data, error } = await client

.from('user_preferences')

.select('persist_history_consent,default_scenario')

.eq('user_id', userId)

.maybeSingle()

if (error) throw new RepositoryError('Não foi possível carregar as preferências.')

if (!data) return { persistHistoryConsent: false, defaultScenario: null }

const parsed = preferencesRowSchema.safeParse(data)

if (!parsed.success) return { persistHistoryConsent: false, defaultScenario: null }

return {

persistHistoryConsent: parsed.data.persist_history_consent,

defaultScenario: parsed.data.default_scenario,

}

},

async update(patch) {

const userId = await currentUserId()

const current = await preferences.get()

const next: UserPreferences = { ...current, ...patch }

const { error } = await client.from('user_preferences').upsert({

user_id: userId,

persist_history_consent: next.persistHistoryConsent,

default_scenario: next.defaultScenario,

})

if (error) throw new RepositoryError('Não foi possível salvar as preferências.')

return next

},

}



return { simulations, profile, preferences }

}
