import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';

// A BUILD THAT CARRIES ADOPTED CHARACTERS — simulated.
//
// The repository's content/forge is empty until the author adopts a real
// FORGE character (and FORGE's samples may never be adopted). So this
// file stands in for the build that will exist then: the generated index
// is replaced, for this file only, by one adopting non-sample copies of
// the bridge's examples — a human life actor (SERA), a common monster
// (MOSS_ROLLER) and a boss the author marked as a life actor
// (MON_ROOTRING) — and everything else runs for real: the registry, the
// WORLD LIFE ENGINE's rules, and a World opening, playing, resetting and
// reopening a save.

vi.mock('./index.generated', async () => {
  const { applyForgeAdoption, planForgeAdoption, EMPTY_ROSTER } = await import('../../core/forge/content');
  const { forgeAdoptionView } = await import('./adoptionView');
  const { asReal } = await import('../../core/forge/fixtures/load');
  let roster: unknown = EMPTY_ROSTER;
  const baselines: Record<string, unknown> = {};
  const list = [
    [asReal('human'), { npcId: 'SERA', region: 'ALDEN' }],
    [asReal('normal-monster'), { npcId: 'MOSS_ROLLER' }],
    [asReal('boss-monster'), { npcId: 'MON_ROOTRING', lifeActor: true }],
  ] as const;
  for (const [payload, choice] of list) {
    const content = {
      roster: roster as never,
      baselines: baselines as never,
      previous: {},
      voidIds: [],
      damaged: [],
    };
    const plan = planForgeAdoption(JSON.stringify(payload), forgeAdoptionView(content), choice);
    const change = applyForgeAdoption(plan, content, '2026-09-27T02:00:00.000Z');
    roster = change.roster;
    baselines[payload.characterId] = payload;
  }
  return {
    FORGE_ROSTER_DATA: roster,
    FORGE_VOID_DATA: { format: 'mugen-zero.forge-void', version: 1, ids: ['HUM-000004'], sources: [] },
    FORGE_BASELINE_DATA: baselines,
  };
});

const { FORGE_CONTENT, FORGE_CONTENT_PROBLEMS, FORGE_VOID_IDS, forgeDefinitions } = await import('./forgeContent');
const { ALL_NPCS, personEntry } = await import('../people/allPeople');
const { WORLD_LIFE_RULES, readWorldLife } = await import('../../core/life/worldReading');
const { WORLD_PEOPLE } = await import('../world/mugenWorld');
const { World } = await import('../../core/world/world');
const { IdbMemoryStore } = await import('../../core/memory/idbStore');
const { SAVE_VERSION } = await import('../../core/world/saveSchema');

const everyone = () => ALL_NPCS.map((e) => e.npcId);
const lifeActors = () => WORLD_LIFE_RULES.cores.map((c) => c.npcId);

describe('a build with adopted characters', () => {
  it('reads them, with their NPC_IDs and the VOID ledger', () => {
    expect(FORGE_CONTENT_PROBLEMS).toEqual([]);
    expect(FORGE_CONTENT.roster.characters.map((e) => [e.characterId, e.npcId, e.lifeActor])).toEqual([
      ['HUM-900001', 'SERA', true],
      ['MON-900001', 'MOSS_ROLLER', false],
      ['MON-900002', 'MON_ROOTRING', true],
    ]);
    expect(FORGE_VOID_IDS).toEqual(['HUM-000004']);
    expect(forgeDefinitions().map((d) => d.entityType)).toEqual(['PERSON', 'CREATURE', 'CREATURE']);
  });

  it('every adopted character exists; only life actors are in the WORLD LIFE ENGINE', () => {
    expect(everyone()).toEqual(expect.arrayContaining(['SERA', 'MOSS_ROLLER', 'MON_ROOTRING', 'GALD', 'LINA']));
    expect(personEntry('MOSS_ROLLER')?.kind).toBe('CREATURE');
    expect(lifeActors()).toEqual(expect.arrayContaining(['SERA', 'MON_ROOTRING', 'LINA']));
    expect(lifeActors()).not.toContain('MOSS_ROLLER');
    expect(WORLD_PEOPLE.map((p) => p.npcId)).toEqual(expect.arrayContaining(['SERA', 'MON_ROOTRING']));
    expect(WORLD_PEOPLE.map((p) => p.npcId)).not.toContain('MOSS_ROLLER');
  });

  it('survives an existing save being loaded, RESET WORLD, and a new game — the save never holds them', async () => {
    const before = { people: everyone(), actors: lifeActors() };
    const dbName = 'adopted-build-save';

    // A save somebody has played: Gald spared, three years on.
    const played = await World.open(new IdbMemoryStore(dbName));
    await played.recordGaldLifeChoice('SPARE');
    await played.timeShift(3);
    const events = played.getEvents();

    // Loaded again, as a returning player.
    const reopened = await World.open(new IdbMemoryStore(dbName));
    expect(reopened.getSaveHealth().health).toBe('ok');
    expect(reopened.getEvents()).toEqual(events);
    expect(reopened.hasProgress()).toBe(true);
    // The life engine reads that save with the adopted characters in the world, and nothing breaks.
    expect(() => readWorldLife(reopened.getEvents(), reopened.getClock())).not.toThrow();

    // RESET WORLD.
    await reopened.resetWorld();
    expect(reopened.hasProgress()).toBe(false);
    expect(everyone()).toEqual(before.people);
    expect(lifeActors()).toEqual(before.actors);

    // はじめる on a fresh open of the same (now empty) save.
    const fresh = await World.open(new IdbMemoryStore(dbName));
    expect(fresh.getEvents()).toEqual([]);
    expect(everyone()).toEqual(before.people);
    expect(lifeActors()).toEqual(before.actors);

    // Nothing about them was ever written to the save.
    const store = new IdbMemoryStore(dbName);
    await store.init();
    const rows = await store.getAllState();
    store.close();
    expect(rows.some((row) => row.key.startsWith('forge_') || JSON.stringify(row.value).includes('HUM-900001'))).toBe(false);
    expect(SAVE_VERSION).toBe(3);
  });
});
