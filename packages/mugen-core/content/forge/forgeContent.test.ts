import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  FORGE_CONTENT,
  FORGE_CONTENT_PROBLEMS,
  UNPLACED_REGION,
  forgeCores,
  forgeCorrespondence,
  forgeRegistryEntries,
  forgeWorldPeople,
} from './forgeContent';
import { forgeAdoptionView } from './adoptionView';
import { ALL_NPCS } from '../people/allPeople';
import { NPC_REGISTRY } from '../people/registry';
import { MUGEN_WORLD_RULES } from '../world/mugenWorld';
import { registryProblems } from '../../core/link/npcId';
import {
  EMPTY_ROSTER,
  EMPTY_VOID_LEDGER,
  applyForgeAdoption,
  contentFromData,
  generateForgeIndex,
  planForgeAdoption,
  type ForgeAdoptionInput,
} from '../../core/forge/content';
import type { ForgeContent, ForgeDeployPackage } from '../../core/forge/types';
import { asReal } from '../../core/forge/fixtures/load';
import { emptyWorld, observe } from '../../core/life/engine';
import { WORLD_LIFE_RULES } from '../../core/life/worldReading';
import { World } from '../../core/world/world';
import { IdbMemoryStore, WORLD_STATE_STORE } from '../../core/memory/idbStore';
import { MemoryOnlyStore } from '../../core/memory/memoryOnlyStore';
import { openDatabase, txDone } from '../../core/memory/idbSchema';
import { SAVE_VERSION } from '../../core/world/saveSchema';

// ADOPTED CHARACTERS ARE CONTENT: what the build carries, how the rest of
// the game sees them, and that no save is touched by any of it.

const EMPTY: ForgeContent = { roster: EMPTY_ROSTER, baselines: {}, previous: {}, voidIds: [], damaged: [] };

/** A content object with characters adopted into it, read back as the build reads it. */
function adopted(...list: [ForgeDeployPackage, ForgeAdoptionInput][]): ForgeContent {
  let content = EMPTY;
  for (const [payload, choice] of list) {
    const p = planForgeAdoption(JSON.stringify(payload), forgeAdoptionView(content), choice);
    expect(p.ready, [...p.errors, ...p.npcErrors].map((e) => e.message).join()).toBe(true);
    const change = applyForgeAdoption(p, content, '2026-09-27T02:00:00.000Z');
    const baselines: Record<string, unknown> = { ...content.baselines };
    for (const [path, text] of Object.entries(change.files)) {
      if (path.startsWith('characters/') && text) baselines[path.slice(11, -5)] = JSON.parse(text);
    }
    const read = contentFromData(change.roster, EMPTY_VOID_LEDGER, baselines);
    expect(read.problems).toEqual([]);
    content = read.content;
  }
  return content;
}

describe('the content this build carries (content/forge)', () => {
  const dir = new URL('./', import.meta.url);
  const roster = JSON.parse(readFileSync(new URL('roster.json', dir), 'utf8'));

  it('reads without a single problem', () => {
    expect(FORGE_CONTENT_PROBLEMS).toEqual([]);
    expect(FORGE_CONTENT.damaged).toEqual([]);
  });

  it('has an index generated from its roster, not edited by hand', () => {
    expect(readFileSync(new URL('index.generated.ts', dir), 'utf8')).toBe(generateForgeIndex(roster));
  });

  it('holds no sample, no retired id, and no NPC_ID twice', () => {
    for (const definition of Object.values(FORGE_CONTENT.baselines)) expect(definition.sampleOnly).not.toBe(true);
    for (const entry of FORGE_CONTENT.roster.characters) expect(FORGE_CONTENT.voidIds).not.toContain(entry.characterId);
    expect(registryProblems(ALL_NPCS)).toEqual([]);
  });
});

describe('how the game sees an adopted character', () => {
  const content = adopted(
    [asReal('human'), { npcId: 'SERA', region: 'ALDEN' }],
    [asReal('normal-monster'), { npcId: 'MOSS_ROLLER' }],
    [asReal('boss-monster'), { npcId: 'MON_ROOTRING', lifeActor: true }],
  );

  it('every adopted character joins the registry of who exists, under its NPC_ID — life actor or not', () => {
    const entries = forgeRegistryEntries(NPC_REGISTRY, content);
    expect(entries.map((e) => [e.npcId, e.displayName, e.kind, e.region])).toEqual([
      ['SERA', 'セラ', 'PERSON', 'ALDEN'],
      ['MOSS_ROLLER', '苔綿ころがし', 'CREATURE', UNPLACED_REGION],
      ['MON_ROOTRING', '根環の森守', 'CREATURE', UNPLACED_REGION],
    ]);
    expect(registryProblems([...NPC_REGISTRY, ...entries])).toEqual([]);
    expect(forgeCorrespondence(content)).toEqual({ 'HUM-900001': 'SERA', 'MON-900001': 'MOSS_ROLLER', 'MON-900002': 'MON_ROOTRING' });
  });

  it('only LIFE ACTORS become people in the WORLD LIFE ENGINE — with mapped vocabulary only', () => {
    const cores = forgeCores(MUGEN_WORLD_RULES.cores, content);
    expect(cores.map((c) => c.npcId)).toEqual(['SERA', 'MON_ROOTRING']);
    expect(cores[0]).toEqual({ npcId: 'SERA', traits: [], values: [], desires: [], aptitudes: { MAGIC: 0.78, SWORD: 0.21, HEALING: 0.74 } });
    expect(cores[1]).toEqual({ npcId: 'MON_ROOTRING', traits: [], values: [], desires: [], aptitudes: {} });
    // The common monster is adopted content with no life of its own.
    expect(cores.map((c) => c.npcId)).not.toContain('MOSS_ROLLER');
  });

  it('the WORLD LIFE ENGINE reads a life actor: what happens in front of them takes root in them', () => {
    const rules = { ...WORLD_LIFE_RULES, cores: [...WORLD_LIFE_RULES.cores, ...forgeCores(WORLD_LIFE_RULES.cores, content)] };
    const shown = { action: 'SHOW_MAGIC', actor: 'PLAYER', target: null, location: 'ALDEN_VILLAGE', witnesses: ['SERA', 'MOSS_ROLLER'] };
    const planted = observe(emptyWorld({ worldYear: 1, worldDay: 1 }), shown, rules).planted.map((seed) => seed.targetNpcId);
    expect(planted).toContain('SERA');
    // Not the common monster standing next to her.
    expect(planted).not.toContain('MOSS_ROLLER');
    // And without her core, nothing lands on her either.
    const without = observe(emptyWorld({ worldYear: 1, worldDay: 1 }), shown, WORLD_LIFE_RULES).planted.map((s) => s.targetNpcId);
    expect(without).not.toContain('SERA');
  });

  it('GOD VIEW’s life roster lists life actors only', () => {
    expect(forgeWorldPeople([], content).map((p) => [p.npcId, p.name, p.region])).toEqual([
      ['SERA', 'セラ', 'ALDEN'],
      ['MON_ROOTRING', '根環の森守', UNPLACED_REGION],
    ]);
  });

  it('adopted as an existing person, adds nothing — that person keeps their entry, core and name', () => {
    const lina = adopted([asReal('human'), { npcId: 'LINA' }]);
    expect(forgeRegistryEntries(NPC_REGISTRY, lina)).toEqual([]);
    expect(forgeCores(MUGEN_WORLD_RULES.cores, lina)).toEqual([]);
    expect(forgeWorldPeople(['LINA'], lina)).toEqual([]);
    const marta = adopted([asReal('human'), { npcId: 'MARTA' }]);
    expect(forgeCores(MUGEN_WORLD_RULES.cores, marta)).toEqual([]);
    expect(forgeWorldPeople(['alden_marta'], marta)).toEqual([]);
  });
});

describe('no save is touched', () => {
  it('SAVE_VERSION stays 3, and a new save holds no FORGE row', async () => {
    expect(SAVE_VERSION).toBe(3);
    const store = new MemoryOnlyStore();
    await World.open(store);
    expect((await store.getAllState()).filter((row) => row.key.startsWith('forge_'))).toEqual([]);
  });

  it('RESET WORLD and a new game leave the adopted characters where they are — in the build', async () => {
    const before = { people: ALL_NPCS.map((e) => e.npcId), cores: MUGEN_WORLD_RULES.cores.map((c) => c.npcId) };
    const world = await World.open(new MemoryOnlyStore());
    await world.recordGaldLifeChoice('SPARE');
    await world.resetWorld();
    expect(ALL_NPCS.map((e) => e.npcId)).toEqual(before.people);
    expect(MUGEN_WORLD_RULES.cores.map((c) => c.npcId)).toEqual(before.cores);
    expect(world.hasProgress()).toBe(false);
  });

  it('a save written by the 2026-09-27 debug build (FORGE rows and events) still opens, untouched', async () => {
    const dbName = 'forge-legacy-save';
    await World.open(new IdbMemoryStore(dbName));
    const legacyRow = { key: 'forge_character_HUM-900001', value: { recordVersion: 1, characterId: 'HUM-900001' } };
    const db = await openDatabase(dbName);
    const tx = db.transaction(WORLD_STATE_STORE, 'readwrite');
    tx.objectStore(WORLD_STATE_STORE).put(legacyRow);
    await txDone(tx);
    db.close();
    const store = new IdbMemoryStore(dbName);
    await store.init();
    await store.add({
      id: 'evt_forge_import_HUM-900001',
      type: 'CHARACTER_IMPORTED_FROM_FORGE',
      worldYear: 1,
      worldDay: 1,
      location: 'MUGEN_CHARACTER_FORGE',
      actors: ['HUM-900001'],
      importance: 'AMBIENT',
      createdAt: '2026-09-27T02:00:00.000Z',
    });
    store.close();

    const world = await World.open(new IdbMemoryStore(dbName));
    expect(world.getSaveHealth().health).toBe('ok');
    expect(world.hasProgress()).toBe(false);
    expect(world.getKnownEvents()).toEqual([]);
    const reader = new IdbMemoryStore(dbName);
    await reader.init();
    const rows = await reader.getAllState();
    reader.close();
    expect(rows.find((row) => row.key === legacyRow.key)?.value).toEqual(legacyRow.value);
  });
});
