import type {

SavedSimulation,

SavedSimulationSummary,

SimulationDraft,

UserPreferences,

UserProfile,

} from '../types/history'

import {

ConsentRequiredError,

type PreferencesRepository,

type ProfileRepository,

type Repositories,

type SimulationRepository,

} from './types'



/**

* "Banco" em memória compartilhado entre usuários, para testes e modo demonstração.

* Cada repositório recebe o id do usuário e só enxerga as próprias linhas,

* reproduzindo a regra de RLS (`user_id = auth.uid()`).

*/

export class MemoryDatabase {

readonly simulations = new Map<string, SavedSimulation & { userId: string }>()

readonly profiles = new Map<string, UserProfile>()

readonly preferences = new Map<string, UserPreferences>()

private counter = 0



nextId(): string {

this.counter += 1

// Formato UUID, como no banco real (as rotas validam o formato do id).

return `00000000-0000-4000-8000-${String(this.counter).padStart(12, '0')}`

}



repositoriesFor(userId: string, clock: () => Date = () => new Date()): Repositories {

return createMemoryRepositories(this, userId, clock)

}

}



function summarize(simulation: SavedSimulation): SavedSimulationSummary {

return {

id: simulation.id,

title: simulation.title,

scenarioId: simulation.scenarioId,

createdAt: simulation.createdAt,

fipeReferenceMonth: simulation.fipeReferenceMonth,

fipeReferenceMonthLabel: simulation.fipeReferenceMonthLabel,

resultCount: simulation.results.length,

}

}



export function createMemoryRepositories(

db: MemoryDatabase,

userId: string,

clock: () => Date = () => new Date(),

): Repositories {

const consent = () => db.preferences.get(userId)?.persistHistoryConsent === true



const simulations: SimulationRepository = {

async list() {

return [...db.simulations.values()]

.filter((item) => item.userId === userId)

.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))

.map(summarize)

},

async get(id) {

const found = db.simulations.get(id)

if (!found || found.userId !== userId) return null

const { userId: _owner, ...simulation } = found

return structuredClone(simulation)

},

async save(draft: SimulationDraft) {

if (!consent()) throw new ConsentRequiredError()

const simulation: SavedSimulation = {

...structuredClone(draft),

id: db.nextId(),

createdAt: clock().toISOString(),

}

db.simulations.set(simulation.id, { ...simulation, userId })

return structuredClone(simulation)

},

async remove(id) {

const found = db.simulations.get(id)

if (found && found.userId === userId) db.simulations.delete(id)

},

async removeAll() {

for (const [id, item] of db.simulations) {

if (item.userId === userId) db.simulations.delete(id)

}

},

}



const profile: ProfileRepository = {

async get() {

return db.profiles.get(userId) ?? null

},

async upsert({ displayName, privacyAcceptedAt }) {

const next: UserProfile = { id: userId, displayName, privacyAcceptedAt }

db.profiles.set(userId, next)

return next

},

async deleteMyData() {

await simulations.removeAll()

db.profiles.delete(userId)

db.preferences.delete(userId)

},

async deleteAccount() {

await profile.deleteMyData()

},

}



const preferences: PreferencesRepository = {

async get() {

return db.preferences.get(userId) ?? { persistHistoryConsent: false, defaultScenario: null }

},

async update(patch) {

const current = db.preferences.get(userId) ?? {

persistHistoryConsent: false,

defaultScenario: null,

}

const next = { ...current, ...patch }

db.preferences.set(userId, next)

return next

},

}



return { simulations, profile, preferences }

}
