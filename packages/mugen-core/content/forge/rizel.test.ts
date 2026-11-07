import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FORGE_CONTENT, FORGE_CONTENT_PROBLEMS, forgeCorrespondence, forgeDefinitions } from './forgeContent';
import { consistencyIssues, sourceOnlyFields, unmappedIssues } from './forgeVocabularyAdapter';
import { forgeRegistrationState } from './forgeStatus';
import { ALL_NPCS, personEntry } from '../people/allPeople';
import { NPC_REGISTRY } from '../people/registry';
import { MUGEN_WORLD_RULES, WORLD_PEOPLE } from '../world/mugenWorld';
import { WORLD_LIFE_RULES, readWorldLife } from '../../core/life/worldReading';
import { emptyWorld, observe } from '../../core/life/engine';
import { World } from '../../core/world/world';
import { IdbMemoryStore } from '../../core/memory/idbStore';
import { SAVE_VERSION } from '../../core/world/saveSchema';
import { canonicalJson, payloadHash } from '../../core/forge/canonical';
import { forgeHumanCurrentFacts } from '../../core/forge/record';

// RIZEL — THE FIRST REAL CHARACTER ADOPTED FROM CHARACTER FORGE.
//
// FORGE HUM-000001 「リゼル」, adopted 2026-09-28 as NPC_ID RIZEL from the
// author's real export (deploy 0.1-r2). These tests read the build's own
// content — nothing mocked — and pin what adopting her must and must not
// have done (docs/FORGE_IMPORT.md §9, §9b).

const dir = new URL('./', import.meta.url);
const stored = JSON.parse(readFileSync(new URL('characters/HUM-000001.json', dir), 'utf8'));
const entry = FORGE_CONTENT.roster.characters.find((e) => e.characterId === 'HUM-000001')!;
const HASH = 'sha256:69c9e867e36b68867cc62275de6b812c40f9db2bcf9cc6530d522361c5403afb';

async function rowsOf(dbName: string) {
  const store = new IdbMemoryStore(dbName);
  await store.init();
  const rows = await store.getAllState();
  store.close();
  return rows;
}

describe('RIZEL is adopted, as content', () => {
  it('1. is registered in packages/mugen-core/content/forge, and the build reads it cleanly', () => {
    expect(FORGE_CONTENT_PROBLEMS).toEqual([]);
    expect(FORGE_CONTENT.damaged).toEqual([]);
    expect(entry).toBeDefined();
    expect(FORGE_CONTENT.baselines['HUM-000001']).toBeDefined();
  });

  it('2. HUM-000001 corresponds to RIZEL — a human, a life actor, from deploy 0.1-r2', () => {
    expect(forgeCorrespondence()['HUM-000001']).toBe('RIZEL');
    expect(entry).toMatchObject({
      npcId: 'RIZEL',
      characterType: 'human',
      encounterRole: null,
      lifeActor: true,
      region: null,
      payloadHash: HASH,
      deployedVersion: '0.1-r2',
      deployedAt: '2026-09-27T21:51:51.207Z',
      previous: null,
    });
    expect(entry.history.map((h) => h.result)).toEqual(['NEW']);
  });

  it('keeps FORGE’s JSON exactly as the author exported it', () => {
    expect(payloadHash(stored)).toBe(HASH);
    expect(canonicalJson(FORGE_CONTENT.baselines['HUM-000001'])).toBe(canonicalJson(stored));
    expect(stored.identity.name).toBe('リゼル');
    expect(stored.profile.age).toBe('20');
    expect(stored.profile.importance).toBe('重要');
    expect(stored.profile.core).toEqual({
      personality: ['情に厚い', '臆病', '世話焼き'],
      values: ['友情', '平和'],
      weakness: '見栄っ張り',
      desires: ['静かに暮らしたい', '誰かに必要とされたい'],
      tendency: '普段と戦闘時で性格が変わる',
    });
  });

  it('3. is in the registry of who exists, as a person, under her own new id', () => {
    expect(personEntry('RIZEL')).toEqual({
      npcId: 'RIZEL',
      displayName: 'リゼル',
      kind: 'PERSON',
      region: 'UNPLACED',
      standing: 'ORDINARY',
      artId: null,
      aliases: [],
    });
    // A new person: nobody hand-written was renamed or displaced.
    expect(NPC_REGISTRY.map((e) => e.npcId)).not.toContain('RIZEL');
    expect(ALL_NPCS.filter((e) => e.npcId === 'RIZEL')).toHaveLength(1);
  });

  it('4. is a WORLD LIFE ENGINE actor (lifeActor = true) and on GOD VIEW', () => {
    const core = WORLD_LIFE_RULES.cores.find((c) => c.npcId === 'RIZEL');
    expect(core).toEqual({ npcId: 'RIZEL', traits: [], values: [], desires: [], aptitudes: { MAGIC: 0.28, SWORD: 0.62, HEALING: 0.53 } });
    expect(MUGEN_WORLD_RULES.cores.filter((c) => c.npcId === 'RIZEL')).toHaveLength(1);
    expect(WORLD_PEOPLE.find((p) => p.npcId === 'RIZEL')).toEqual({ npcId: 'RIZEL', name: 'リゼル', region: 'UNPLACED', standing: 'ORDINARY' });
    // And the engine does read her: something happening in front of her reaches her.
    const shown = { action: 'SHOW_MAGIC', actor: 'PLAYER', target: null, location: 'ALDEN_VILLAGE', witnesses: ['RIZEL'] };
    const planted = observe(emptyWorld({ worldYear: 1, worldDay: 1 }), shown, WORLD_LIFE_RULES).planted;
    expect(planted.map((s) => s.targetNpcId)).toContain('RIZEL');
  });

  it('5. her visualDiversity is SOURCE DATA PRESERVED / GAME MAPPING = UNUSED', () => {
    // Kept exactly as exported, contradictions and all …
    expect(stored.visualDiversity).toMatchObject({
      ageGroup: 'older_adult',
      bodyBuild: 'heavy',
      heightImpression: 'very_tall',
      hair: { color: 'salt_and_pepper', length: 'very_short' },
    });
    expect(sourceOnlyFields(stored).map((f) => f.field)).toContain('visualDiversity');
    // … and reaching nothing the game reads.
    const [definition] = forgeDefinitions();
    const readByGame = JSON.stringify(definition);
    for (const value of ['older_adult', 'heavy', 'very_tall', 'salt_and_pepper', 'very_short', 'androgynous'])
      expect(readByGame, value).not.toContain(value);
    expect(JSON.stringify(personEntry('RIZEL'))).not.toMatch(/older_adult|heavy|salt_and_pepper/);
  });

  it('6. nothing is made from her UNMAPPED values — no trait, value, desire or seed of her own', () => {
    const core = WORLD_LIFE_RULES.cores.find((c) => c.npcId === 'RIZEL')!;
    expect([core.traits, core.values, core.desires]).toEqual([[], [], []]);
    expect(unmappedIssues(stored).map((i) => `${i.path}:${i.message.match(/「(.+?)」/)?.[1]}`)).toEqual([
      'profile.importance:重要',
      'profile.core.personality:情に厚い',
      'profile.core.personality:臆病',
      'profile.core.personality:世話焼き',
      'profile.core.values:友情',
      'profile.core.values:平和',
      'profile.core.desires:静かに暮らしたい',
      'profile.core.desires:誰かに必要とされたい',
      'aptitudes:commerce',
      'aptitudes:social',
    ]);
    // A world where nothing has happened plants nothing in her: FORGE's own
    // seeds (恐怖・冒険への憧れ・知識への渇望) are not the engine's.
    const life = readWorldLife([], { worldYear: 1, worldDay: 1 });
    expect(life.seeds.filter((s) => s.targetNpcId === 'RIZEL')).toEqual([]);
    expect(definitionFacts().skills).toEqual({ magic: 'UNLEARNED', sword: 'UNLEARNED', healing: 'UNLEARNED', commerce: 'UNLEARNED', social: 'UNLEARNED' });
  });

  it('12. a common monster is still not a life actor; she is a FORGE life actor', () => {
    const forgeActors = WORLD_LIFE_RULES.cores.filter((c) => forgeCorrespondenceIds().includes(c.npcId)).map((c) => c.npcId);
    expect(forgeActors).toContain('RIZEL');
    expect(FORGE_CONTENT.roster.characters.filter((e) => e.characterType === 'monster' && e.lifeActor)).toEqual([]);
  });
});

describe('RIZEL — decided 2026-09-28', () => {
  it('her age 20 and her older_adult visual age are both kept; by FORGE’s own rules both are ADULT, so no warning (C1, 2026-10-02)', () => {
    // MUGEN ZERO does not overrule FORGE's visual age with a band table of its own.
    expect(consistencyIssues(stored)).toEqual([]);
    expect(stored.profile.age).toBe('20');
    expect(stored.visualDiversity.ageGroup).toBe('older_adult');
    expect(payloadHash(FORGE_CONTENT.baselines['HUM-000001'])).toBe(HASH);
  });

  it('her data, her Life Engine place and her picture are separate: no picture, and she is still registered and a life actor', () => {
    expect(forgeRegistrationState(entry, FORGE_CONTENT)).toEqual({
      characterId: 'HUM-000001',
      npcId: 'RIZEL',
      character: 'REGISTERED',
      lifeEngine: 'ACTOR',
      image: 'NOT_REGISTERED',
      assetMetadataCount: 1,
      primaryAssetId: null,
      relationships: [
        {
          relationshipId: 'REL-000001',
          counterpartCharacterId: 'HUM-000005',
          relationType: 'FAMILY_SIBLING',
          canonStatus: 'PROVISIONAL',
          counterpartAdopted: false,
          state: 'PENDING',
          reason: '相手（HUM-000005）が未採用のため保留',
        },
      ],
    });
  });
});

describe('RIZEL and the save', () => {
  it('7–8, 11. an existing save opens as it was; nothing of her is written to it; SAVE_VERSION stays 3', async () => {
    const db = 'rizel-existing-save';
    const played = await World.open(new IdbMemoryStore(db));
    await played.recordGaldLifeChoice('SPARE');
    await played.timeShift(3);
    await played.addLumi(50);
    const events = played.getEvents();
    // Settle the save once (the existing old-save BGM backfill writes on the first reopen).
    await World.open(new IdbMemoryStore(db));
    const before = await rowsOf(db);

    const reopened = await World.open(new IdbMemoryStore(db));
    expect(reopened.getSaveHealth().health).toBe('ok');
    expect(reopened.getEvents()).toEqual(events);
    expect(reopened.getLumi()).toBe(50);
    expect(await rowsOf(db)).toEqual(before);
    expect(JSON.stringify(before)).not.toMatch(/RIZEL|HUM-000001|forge_/);
    expect(JSON.stringify(reopened.getEvents())).not.toMatch(/RIZEL|HUM-000001/);
    expect(SAVE_VERSION).toBe(3);
  });

  it('9–10. RESET WORLD and はじめる leave her adopted', async () => {
    const db = 'rizel-reset';
    const world = await World.open(new IdbMemoryStore(db));
    await world.recordGaldLifeChoice('HELP');
    await world.resetWorld();
    const adopted = () => [
      FORGE_CONTENT.roster.characters.map((e) => e.npcId).includes('RIZEL'),
      !!personEntry('RIZEL'),
      WORLD_LIFE_RULES.cores.some((c) => c.npcId === 'RIZEL'),
    ];
    expect(adopted()).toEqual([true, true, true]);
    // はじめる: a fresh open of the now-empty save.
    const fresh = await World.open(new IdbMemoryStore(db));
    expect(fresh.getEvents()).toEqual([]);
    expect(fresh.hasProgress()).toBe(false);
    expect(adopted()).toEqual([true, true, true]);
    expect(JSON.stringify(await rowsOf(db))).not.toMatch(/RIZEL|HUM-000001|forge_/);
  });
});

function definitionFacts() {
  return forgeHumanCurrentFacts(FORGE_CONTENT.baselines['HUM-000001'])!;
}

function forgeCorrespondenceIds(): string[] {
  return Object.values(forgeCorrespondence());
}
