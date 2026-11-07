import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FORGE_CONTENT, FORGE_CONTENT_PROBLEMS, forgeCorrespondence, forgeDefinitions } from './forgeContent';
import { sourceOnlyFields, unmappedIssues } from './forgeVocabularyAdapter';
import { forgeRegistrationState } from './forgeStatus';
import { personEntry } from '../people/allPeople';
import { WORLD_PEOPLE } from '../world/mugenWorld';
import { WORLD_LIFE_RULES } from '../../core/life/worldReading';
import { World } from '../../core/world/world';
import { IdbMemoryStore } from '../../core/memory/idbStore';
import { canonicalJson, payloadHash } from '../../core/forge/canonical';
import { forgeKindOf } from '../../core/forge/record';
import { validateDeployPackage } from '../../core/forge/validate';

// NUMAWATARI — THE FIRST REAL MONSTER ADOPTED FROM CHARACTER FORGE.
//
// FORGE MON-000001 「ヌマワタリ」, a NORMAL monster, adopted 2026-10-04 as
// NPC_ID NUMAWATARI, not a life actor (author decision), from the real
// deploy package (0.1). Kept exactly as FORGE sent it: nothing converted,
// filled in or corrected — including what differs from its character
// sheet, and the 「なし」 among its skill candidates (both reported to
// FORGE, not fixed here). These tests read the build's own content.

const stored = JSON.parse(readFileSync(new URL('./characters/MON-000001.json', import.meta.url), 'utf8'));
const entry = FORGE_CONTENT.roster.characters.find((e) => e.characterId === 'MON-000001')!;
const HASH = 'sha256:839e333ba64fba5c1a2d6385a8e77bad1818b40d4ecec2805178f6dae1fa051d';

describe('NUMAWATARI is adopted, as content: a NORMAL monster, kept as FORGE sent it', () => {
  it('MON-000001 → NUMAWATARI: monster, NORMAL, not a life actor, unplaced, deploy 0.1', () => {
    expect(FORGE_CONTENT_PROBLEMS).toEqual([]);
    expect(forgeCorrespondence()['MON-000001']).toBe('NUMAWATARI');
    expect(entry).toMatchObject({
      npcId: 'NUMAWATARI',
      characterType: 'monster',
      encounterRole: 'NORMAL',
      lifeActor: false,
      region: null,
      payloadHash: HASH,
      deployedVersion: '0.1',
      deployedAt: '2026-10-04T06:17:03.968Z',
      previous: null,
    });
    expect(entry.history.map((h) => h.result)).toEqual(['NEW']);
    expect(forgeKindOf(entry)).toBe('MONSTER');
  });

  it('the package passes FORGE’s verified rules with no error and no old-package warning', () => {
    const { errors, warnings } = validateDeployPackage(stored);
    expect(errors).toEqual([]);
    expect(warnings.map((w) => w.code)).not.toContain('UNVERIFIED_CONTRACT');
  });

  it('keeps FORGE’s JSON exactly as sent — structure, UNMAPPED values and all', () => {
    expect(payloadHash(stored)).toBe(HASH);
    expect(canonicalJson(FORGE_CONTENT.baselines['MON-000001'])).toBe(canonicalJson(stored));
    expect(stored).toMatchObject({ characterType: 'monster', encounterRole: 'NORMAL', bossEncounter: null, currentSkills: null, equipment: null, lifeStage: null });
    expect(stored.identity).toMatchObject({ speciesName: 'ヌマワタリ', speciesNameStatus: 'CANON', individualName: null });
    // As FORGE wrote them, not corrected: the body that differs from the sheet, and 「なし」 among the candidates.
    expect(stored.profile.body).toMatchObject({ skeleton: '蛇型', legs: 'なし', arms: '2本' });
    expect(stored.combat.uniqueSkillCandidates).toEqual(['反射障壁', 'なし', '地中潜行']);
    expect(stored.ecology).toMatchObject({ desire: '安全な場所', role: '未設定' });
  });

  it('UNMAPPED stays UNMAPPED and is never put into the game’s definition', () => {
    expect(unmappedIssues(stored).map((i) => `${i.path}:${i.message.match(/「(.+?)」/)?.[1]}`)).toEqual([
      'profile.classification（種族分類）:魔獣',
      'profile.activityTime（活動時間）:薄明性',
      'profile.habitat:沼地',
      'ecology.desire:安全な場所',
    ]);
    const definition = forgeDefinitions().find((d) => d.characterId === 'MON-000001')!;
    expect(definition).toMatchObject({
      entityType: 'CREATURE',
      encounterRole: 'NORMAL',
      importance: null,
      habitat: null,
      species: { name: 'ヌマワタリ', speciesId: null },
      life: { traits: [], values: [], desires: [], aptitudes: {} },
      lifeActor: false,
    });
    // combat and visualDiversity are source only: kept, never used by the game.
    expect(sourceOnlyFields(stored).map((f) => f.field)).toEqual(expect.arrayContaining(['combat', 'visualDiversity']));
  });

  it('exists in the registry as a creature, and is not in the WORLD LIFE ENGINE or GOD VIEW', () => {
    expect(personEntry('NUMAWATARI')).toMatchObject({ displayName: 'ヌマワタリ', kind: 'CREATURE', region: 'UNPLACED' });
    expect(WORLD_LIFE_RULES.cores.some((c) => c.npcId === 'NUMAWATARI')).toBe(false);
    expect(WORLD_PEOPLE.some((p) => p.npcId === 'NUMAWATARI')).toBe(false);
    expect(forgeRegistrationState(entry, FORGE_CONTENT)).toMatchObject({ lifeEngine: 'NOT_ACTOR', image: 'NOT_REGISTERED', primaryAssetId: null, relationships: [] });
  });

  it('touches no save: RESET WORLD and はじめる leave it adopted, and the save never holds it', async () => {
    const db = 'numawatari-reset';
    const world = await World.open(new IdbMemoryStore(db));
    await world.recordGaldLifeChoice('HELP');
    await world.resetWorld();
    const fresh = await World.open(new IdbMemoryStore(db));
    expect(fresh.getEvents()).toEqual([]);
    expect(personEntry('NUMAWATARI')).not.toBeNull();
    const store = new IdbMemoryStore(db);
    await store.init();
    const rows = await store.getAllState();
    store.close();
    expect(JSON.stringify(rows)).not.toMatch(/NUMAWATARI|MON-000001|ヌマワタリ|forge_/);
  });
});
