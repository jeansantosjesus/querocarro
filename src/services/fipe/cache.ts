/**

* Cache com prazo de validade (TTL) para respostas PÚBLICAS da API FIPE.

* Nunca armazena dados do usuário. A API pública limita as consultas diárias,

* então o cache é essencial.

*/

export interface TtlCache {

get(key: string): unknown

set(key: string, value: unknown, ttlMs: number): void

delete(key: string): void

clear(): void

}



interface Entry {

expiresAt: number

value: unknown

}



export class MemoryTtlCache implements TtlCache {

private readonly store = new Map<string, Entry>()



constructor(private readonly now: () => number = Date.now) {}



get(key: string): unknown {

const entry = this.store.get(key)

if (!entry) return undefined

if (entry.expiresAt <= this.now()) {

this.store.delete(key)

return undefined

}

return entry.value

}



set(key: string, value: unknown, ttlMs: number): void {

this.store.set(key, { value, expiresAt: this.now() + ttlMs })

}



delete(key: string): void {

this.store.delete(key)

}



clear(): void {

this.store.clear()

}

}



/** Cache persistido em Storage (localStorage). Falhas de quota/JSON são silenciosas. */

export class StorageTtlCache implements TtlCache {

constructor(

private readonly storage: Storage,

private readonly prefix = 'qc:fipe:v1:',

private readonly now: () => number = Date.now,

) {}



get(key: string): unknown {

try {

const raw = this.storage.getItem(this.prefix + key)

if (!raw) return undefined

const entry = JSON.parse(raw) as Entry

if (typeof entry?.expiresAt !== 'number' || entry.expiresAt <= this.now()) {

this.storage.removeItem(this.prefix + key)

return undefined

}

return entry.value

} catch {

return undefined

}

}



set(key: string, value: unknown, ttlMs: number): void {

try {

const entry: Entry = { value, expiresAt: this.now() + ttlMs }

this.storage.setItem(this.prefix + key, JSON.stringify(entry))

} catch {

// quota excedida ou storage indisponível: o cache é apenas otimização

}

}



delete(key: string): void {

try {

this.storage.removeItem(this.prefix + key)

} catch {

// ignora

}

}



clear(): void {

try {

const keys: string[] = []

for (let index = 0; index < this.storage.length; index += 1) {

const key = this.storage.key(index)

if (key?.startsWith(this.prefix)) keys.push(key)

}

keys.forEach((key) => this.storage.removeItem(key))

} catch {

// ignora

}

}

}



export function createDefaultFipeCache(): TtlCache {

try {

if (typeof window !== 'undefined' && window.localStorage) {

return new StorageTtlCache(window.localStorage)

}

} catch {

// acesso ao storage pode lançar em navegação privada restrita

}

return new MemoryTtlCache()

}
