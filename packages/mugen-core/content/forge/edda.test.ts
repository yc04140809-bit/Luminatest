import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FORGE_CONTENT, FORGE_CONTENT_PROBLEMS, forgeCorrespondence, forgeDefinitions } from './forgeContent';
import { consistencyIssues, sourceOnlyFields, unmappedIssues } from './forgeVocabularyAdapter';
import { forgeRegistrationState } from './forgeStatus';
import { ALL_NPCS, personEntry } from '../people/allPeople';
import { NPC_REGISTRY } from '../people/registry';
import { WORLD_PEOPLE } from '../world/mugenWorld';
import { WORLD_LIFE_RULES, readWorldLife } from '../../core/life/worldReading';
import { World } from '../../core/world/world';
import { IdbMemoryStore } from '../../core/memory/idbStore';
import { canonicalJson, payloadHash } from '../../core/forge/canonical';

// EDDA — THE SECOND REAL CHARACTER ADOPTED FROM CHARACTER FORGE.
//
// FORGE HUM-000002 「エッダ」, adopted 2026-09-29 as NPC_ID EDDA from the
// author's real deploy JSON (0.1), by the same steps as RIZEL: preview →
// check → --apply. Nothing new was built for her. These tests read the
// build's own content — nothing mocked (docs/FORGE_IMPORT.md §12).

const stored = JSON.parse(readFileSync(new URL('./characters/HUM-000002.json', import.meta.url), 'utf8'));
const entry = FORGE_CONTENT.roster.characters.find((e) => e.characterId === 'HUM-000002')!;
const HASH = 'sha256:1037c00e4f0464be54f152d4a008799bac326b60bbbf1f309fed3e1cc09b37d9';

describe('EDDA is adopted, as content, the same way RIZEL was', () => {
  it('is registered next to RIZEL, and the build reads both cleanly', () => {
    expect(FORGE_CONTENT_PROBLEMS).toEqual([]);
    expect(FORGE_CONTENT.damaged).toEqual([]);
    expect(forgeCorrespondence()).toMatchObject({ 'HUM-000001': 'RIZEL', 'HUM-000002': 'EDDA' });
    expect(FORGE_CONTENT.voidIds).toEqual([]);
  });

  it('HUM-000002 → EDDA: a human, a life actor, unplaced, deploy 0.1', () => {
    expect(entry).toMatchObject({
      npcId: 'EDDA',
      characterType: 'human',
      encounterRole: null,
      lifeActor: true,
      region: null,
      payloadHash: HASH,
      deployedVersion: '0.1',
      deployedAt: '2026-09-29T16:52:45.329Z',
      previous: null,
    });
    expect(entry.history.map((h) => h.result)).toEqual(['NEW']);
  });

  it('keeps FORGE’s JSON exactly as the author sent it — empty fields stay empty', () => {
    expect(payloadHash(stored)).toBe(HASH);
    expect(canonicalJson(FORGE_CONTENT.baselines['HUM-000002'])).toBe(canonicalJson(stored));
    expect(stored.identity).toMatchObject({ name: 'エッダ', nameStatus: 'CANON' });
    // Not filled in by MUGEN ZERO: no age, gender, region or importance was sent.
    expect([stored.profile.age, stored.profile.gender, stored.profile.currentRegion, stored.profile.importance]).toEqual(['', '', '', '']);
  });

  it('is in the registry as a new person under her own id; nobody hand-written changed', () => {
    expect(personEntry('EDDA')).toEqual({
      npcId: 'EDDA',
      displayName: 'エッダ',
      kind: 'PERSON',
      region: 'UNPLACED',
      standing: 'ORDINARY',
      artId: null,
      aliases: [],
    });
    expect(NPC_REGISTRY.map((e) => e.npcId)).not.toContain('EDDA');
    expect(ALL_NPCS.filter((e) => e.npcId === 'EDDA')).toHaveLength(1);
    expect(personEntry('RIZEL')?.displayName).toBe('リゼル');
  });

  it('is a WORLD LIFE ENGINE actor with only the mapped aptitudes, and on GOD VIEW', () => {
    expect(WORLD_LIFE_RULES.cores.find((c) => c.npcId === 'EDDA')).toEqual({
      npcId: 'EDDA',
      traits: [],
      values: [],
      desires: [],
      aptitudes: { MAGIC: 0.91, SWORD: 0.28, HEALING: 0.45 },
    });
    expect(WORLD_PEOPLE.find((p) => p.npcId === 'EDDA')).toEqual({ npcId: 'EDDA', name: 'エッダ', region: 'UNPLACED', standing: 'ORDINARY' });
    // FORGE's own seeds (復讐心・故郷への愛着・更生への意志) are not the engine's.
    expect(readWorldLife([], { worldYear: 1, worldDay: 1 }).seeds.filter((s) => s.targetNpcId === 'EDDA')).toEqual([]);
  });

  it('UNMAPPED stays UNMAPPED: nothing made from personality, values, desires or an empty importance', () => {
    const definition = forgeDefinitions().find((d) => d.characterId === 'HUM-000002')!;
    // FORGE sent no importance: nothing to keep, nothing derived.
    expect(definition.importance).toBeNull();
    expect(unmappedIssues(stored).map((i) => `${i.path}:${i.message.match(/「(.+?)」/)?.[1]}`)).toEqual([
      'profile.core.personality:皮肉屋',
      'profile.core.personality:頑固',
      'profile.core.personality:短気',
      'profile.core.values:友情',
      'profile.core.values:強さ',
      'profile.core.desires:故郷を守りたい',
      'profile.core.desires:誰かを守れる人になりたい',
      'aptitudes:commerce',
      'aptitudes:social',
    ]);
  });

  it('visualDiversity is SOURCE DATA PRESERVED / GAME MAPPING = UNUSED; elderly is one of FORGE’s seven ageGroups', () => {
    expect(stored.visualDiversity).toMatchObject({ ageGroup: 'elderly', bodyBuild: 'lean', hair: { length: 'shaved' } });
    expect(sourceOnlyFields(stored).map((f) => f.field)).toContain('visualDiversity');
    // elderly is official (SOURCE VERIFIED); no age was sent, so there is nothing to compare — and nothing is corrected.
    expect(consistencyIssues(stored)).toEqual([]);
    const readByGame = JSON.stringify({ ...forgeDefinitions().find((d) => d.characterId === 'HUM-000002'), unmapped: [] });
    for (const value of ['elderly', 'feminine', 'lean', 'shaved', 'tight_curl', 'work_stained', 'nervous']) expect(readByGame, value).not.toContain(value);
  });

  it('character, life engine and picture are separate states; no relationship is named', () => {
    const state = forgeRegistrationState(entry, FORGE_CONTENT);
    expect(state).toMatchObject({ character: 'REGISTERED', lifeEngine: 'ACTOR', image: 'NOT_REGISTERED', assetMetadataCount: 1, primaryAssetId: null, relationships: [] });
  });

  it('RESET WORLD and はじめる leave her adopted; the save never holds her', async () => {
    const db = 'edda-reset';
    const world = await World.open(new IdbMemoryStore(db));
    await world.recordGaldLifeChoice('HELP');
    await world.resetWorld();
    const fresh = await World.open(new IdbMemoryStore(db));
    expect(fresh.getEvents()).toEqual([]);
    expect([!!personEntry('EDDA'), WORLD_LIFE_RULES.cores.some((c) => c.npcId === 'EDDA')]).toEqual([true, true]);
    const store = new IdbMemoryStore(db);
    await store.init();
    const rows = await store.getAllState();
    store.close();
    expect(JSON.stringify(rows)).not.toMatch(/EDDA|HUM-000002|forge_/);
  });
});
