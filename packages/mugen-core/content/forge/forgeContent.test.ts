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
    [asReal('boss-monster'), { npcId: 'ROOTRING_WARDEN' }],
  );

  it('joins the registry of who exists — a person, or a creature — under its NPC_ID', () => {
    const entries = forgeRegistryEntries(NPC_REGISTRY, content);
    expect(entries).toEqual([
      { npcId: 'SERA', displayName: 'セラ', kind: 'PERSON', region: 'ALDEN', standing: 'ORDINARY', artId: null, aliases: [] },
      { npcId: 'ROOTRING_WARDEN', displayName: '根環の森守', kind: 'CREATURE', region: UNPLACED_REGION, standing: 'ORDINARY', artId: null, aliases: [] },
    ]);
    expect(registryProblems([...NPC_REGISTRY, ...entries])).toEqual([]);
    expect(forgeCorrespondence(content)).toEqual({ 'HUM-900001': 'SERA', 'MON-900002': 'ROOTRING_WARDEN' });
  });

  it('becomes a person in the WORLD LIFE ENGINE, in FORGE’s own words', () => {
    const [sera, warden] = forgeCores(MUGEN_WORLD_RULES.cores, content);
    expect(sera).toEqual({
      npcId: 'SERA',
      traits: ['慎重', '世話焼き', '負けず嫌い'],
      values: ['家族第一', '約束を守る'],
      desires: ['家族を幸せにしたい', '外の世界を見たい'],
      // Potential, in the engine's spelling. Never current skill.
      aptitudes: { MAGIC: 0.78, SWORD: 0.21, HEALING: 0.74, COMMERCE: 0.45, SOCIAL: 0.58 },
    });
    // A monster's combat potential is not a life aptitude.
    expect(warden).toEqual({ npcId: 'ROOTRING_WARDEN', traits: [], values: [], desires: ['巣の防衛'], aptitudes: {} });
  });

  it('is read by the WORLD LIFE ENGINE: what happens in front of them takes root in them', () => {
    const rules = { ...WORLD_LIFE_RULES, cores: [...WORLD_LIFE_RULES.cores, ...forgeCores(WORLD_LIFE_RULES.cores, content)] };
    const shown = { action: 'SHOW_MAGIC', actor: 'PLAYER', target: null, location: 'ALDEN_VILLAGE', witnesses: ['SERA'] };
    const withSera = observe(emptyWorld({ worldYear: 1, worldDay: 1 }), shown, rules);
    expect(withSera.planted.map((seed) => seed.targetNpcId)).toContain('SERA');
    // Without her core, the same afternoon plants nothing in her.
    const without = observe(emptyWorld({ worldYear: 1, worldDay: 1 }), shown, WORLD_LIFE_RULES);
    expect(without.planted.map((seed) => seed.targetNpcId)).not.toContain('SERA');
  });

  it('appears on GOD VIEW’s roster', () => {
    expect(forgeWorldPeople([], content).map((p) => [p.npcId, p.name, p.region])).toEqual([
      ['SERA', 'セラ', 'ALDEN'],
      ['ROOTRING_WARDEN', '根環の森守', UNPLACED_REGION],
    ]);
  });

  it('adopted as an existing person, adds nothing — that person keeps their entry, core and name', () => {
    const lina = adopted([asReal('human'), { npcId: 'LINA' }]);
    expect(forgeRegistryEntries(NPC_REGISTRY, lina)).toEqual([]);
    expect(forgeCores(MUGEN_WORLD_RULES.cores, lina)).toEqual([]);
    expect(forgeWorldPeople(['LINA'], lina)).toEqual([]);
    // Nor a second MARTA where the engine still spells her alden_marta.
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
