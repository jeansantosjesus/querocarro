import { describe, expect, it } from 'vitest'

import { buildSimulationDraft } from '../../features/history/buildDraft'

import { runDecision } from '../../domain/decision/pipeline'

import { MemoryDatabase } from '../../repositories/memory'

import { ConsentRequiredError } from '../../repositories/types'

import { REFERENCE_YEAR, loadCatalogVehicles, makeInput } from '../fixtures/factories'

import type { VehicleCatalog } from '../../types/vehicle'

function makeDraft(title = 'Minha simulação') {
  const input = makeInput({ objective: { title } })

  const vehicles = loadCatalogVehicles()

  const result = runDecision(input, vehicles, { referenceYear: REFERENCE_YEAR })

  const catalog = {
    vehicles,

    referenceMonth: '2026-11',

    referenceMonthLabel: 'novembro de 2026',

    version: 'test-catalog',
  } as VehicleCatalog

  return buildSimulationDraft(input, result, catalog)
}

describe('repositórios em memória (regra equivalente à RLS)', () => {
  it('exige consentimento para salvar o histórico', async () => {
    const db = new MemoryDatabase()

    const repos = db.repositoriesFor('user-a')

    await expect(repos.simulations.save(makeDraft())).rejects.toBeInstanceOf(ConsentRequiredError)

    expect(await repos.simulations.list()).toHaveLength(0)

    await repos.preferences.update({ persistHistoryConsent: true })

    const saved = await repos.simulations.save(makeDraft())

    expect(saved.title).toBe('Minha simulação')

    expect(await repos.simulations.list()).toHaveLength(1)
  })

  it('guarda o ranking completo, o grupo recomendado e a versão do catálogo', async () => {
    const db = new MemoryDatabase()

    const repos = db.repositoriesFor('user-a')

    await repos.preferences.update({ persistHistoryConsent: true })

    const saved = await repos.simulations.save(makeDraft())

    expect(saved.catalogVersion).toBe('test-catalog')

    expect(saved.results.length).toBeGreaterThan(3)

    const group = saved.results.filter((item) => item.inRecommendedGroup)

    expect(group.length).toBeGreaterThanOrEqual(3)

    expect(group.length).toBeLessThanOrEqual(5)
  })

  it('só o dono lê, lista e exclui suas simulações (leitura horizontal bloqueada)', async () => {
    const db = new MemoryDatabase()

    const alice = db.repositoriesFor('user-a')

    const bob = db.repositoriesFor('user-b')

    await alice.preferences.update({ persistHistoryConsent: true })

    await bob.preferences.update({ persistHistoryConsent: true })

    const aliceSim = await alice.simulations.save(makeDraft('Da Alice'))

    await bob.simulations.save(makeDraft('Do Bob'))

    expect((await alice.simulations.list()).map((item) => item.title)).toEqual(['Da Alice'])

    expect((await bob.simulations.list()).map((item) => item.title)).toEqual(['Do Bob'])

    // Bob tenta abrir e excluir a simulação da Alice pelo id

    expect(await bob.simulations.get(aliceSim.id)).toBeNull()

    await bob.simulations.remove(aliceSim.id)

    expect(await alice.simulations.get(aliceSim.id)).not.toBeNull()

    // removeAll do Bob não afeta a Alice

    await bob.simulations.removeAll()

    expect(await alice.simulations.list()).toHaveLength(1)
  })

  it('não permite alterar o registro salvo por fora (cópia defensiva)', async () => {
    const db = new MemoryDatabase()

    const repos = db.repositoriesFor('user-a')

    await repos.preferences.update({ persistHistoryConsent: true })

    const saved = await repos.simulations.save(makeDraft())

    saved.title = 'Alterado fora'

    const reloaded = await repos.simulations.get(saved.id)

    expect(reloaded?.title).toBe('Minha simulação')
  })

  it('exclusão de conta remove perfil, preferências e histórico do usuário', async () => {
    const db = new MemoryDatabase()

    const repos = db.repositoriesFor('user-a')

    await repos.profile.upsert({ displayName: 'A', privacyAcceptedAt: new Date().toISOString() })

    await repos.preferences.update({ persistHistoryConsent: true })

    await repos.simulations.save(makeDraft())

    await repos.profile.deleteAccount()

    expect(await repos.profile.get()).toBeNull()

    expect(await repos.simulations.list()).toHaveLength(0)

    expect((await repos.preferences.get()).persistHistoryConsent).toBe(false)
  })

  it('usa ids em formato UUID, como o banco real', async () => {
    const db = new MemoryDatabase()

    const repos = db.repositoriesFor('user-a')

    await repos.preferences.update({ persistHistoryConsent: true })

    const saved = await repos.simulations.save(makeDraft())

    expect(saved.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
})
