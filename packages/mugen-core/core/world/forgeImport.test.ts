import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { World } from './world';
import { IdbMemoryStore, META_STORE, WORLD_STATE_STORE } from '../memory/idbStore';
import { openDatabase, txDone } from '../memory/idbSchema';
import { MemoryOnlyStore } from '../memory/memoryOnlyStore';
import { MIGRATIONS, SAVE_VERSION } from './saveSchema';
import { readWorldLife } from '../life/worldReading';
import { aldenNewsTodayForAuthor } from '../news/aldenNewsday';
import { isForgeEventType, type MemoryEvent } from '../memory/types';
import { asReal, resent, sampleText } from '../forge/fixtures/load';
import { payloadHash } from '../forge/canonical';
import { NPC_REGISTRY } from '../../content/people/registry';
import { LOCATIONS } from '../../content/locations/alden';
import { ENEMY_SPECIES } from '../../content/enemies/species';

// CHARACTER FORGE → MUGEN ZERO, through the World and a real (fake)
// IndexedDB: what reaches the save, what survives a reload, and — the
// half that matters most — everything that must NOT change. Test names
// carry the bridge package's acceptance ids (ACCEPTANCE_TESTS.md).

let dbCounter = 0;
const freshDbName = () => `forge-import-test-${++dbCounter}`;
const open = (dbName: string) => World.open(new IdbMemoryStore(dbName));

async function rawRows(dbName: string): Promise<{ key: string; value: unknown }[]> {
  const db = await openDatabase(dbName);
  const tx = db.transaction(WORLD_STATE_STORE, 'readonly');
  const rows = await new Promise<{ key: string; value: unknown }[]>((resolve, reject) => {
    const rq = tx.objectStore(WORLD_STATE_STORE).getAll();
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
  db.close();
  return rows;
}

async function putRaw(dbName: string, rows: { key: string; value: unknown }[]): Promise<void> {
  const db = await openDatabase(dbName);
  const tx = db.transaction(WORLD_STATE_STORE, 'readwrite');
  for (const row of rows) tx.objectStore(WORLD_STATE_STORE).put(row);
  await txDone(tx);
  db.close();
}

async function readMeta(dbName: string, key: string): Promise<unknown> {
  const db = await openDatabase(dbName);
  const tx = db.transaction(META_STORE, 'readonly');
  const value = await new Promise<unknown>((resolve, reject) => {
    const rq = tx.objectStore(META_STORE).get(key);
    rq.onsuccess = () => resolve(rq.result?.value);
    rq.onerror = () => reject(rq.error);
  });
  db.close();
  return value;
}

/** Plans and registers one payload, the way the import screen does. */
async function importInto(world: World, payload: unknown, at?: string) {
  const plan = world.planForgeImport(JSON.stringify(payload));
  expect(plan.canRegister, `${plan.decision}: ${plan.errors.map((e) => e.message).join(' / ')}`).toBe(true);
  return world.commitForgeImport(plan, at);
}

/** A world somebody has actually played: a choice made, years passed, money and a bag. */
async function aPlayedWorld(dbName: string): Promise<World> {
  const world = await open(dbName);
  await world.recordGaldLifeChoice('SPARE');
  await world.timeShift(3);
  await world.addLumi(120);
  await world.addItem('FOREST_HERB', 2);
  return open(dbName);
}

const nonForge = (events: MemoryEvent[]) => events.filter((e) => !isForgeEventType(e.type));

describe('B. 新規登録 — through the save', () => {
  it('B1–B6: human, normal monster and boss are registered and are still there after a reload', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    const results = [
      await importInto(world, asReal('human')),
      await importInto(world, asReal('normal-monster')),
      await importInto(world, asReal('boss-monster')),
    ];
    expect(results.map((r) => r.result)).toEqual(['NEW', 'NEW', 'NEW']);

    const reopened = await open(dbName);
    const records = reopened.getForgeCharacters();
    expect(records.map((r) => r.characterId)).toEqual(['HUM-900001', 'MON-900001', 'MON-900002']);
    expect(records.map((r) => [r.characterType, r.encounterRole])).toEqual([
      ['human', null],
      ['monster', 'NORMAL'],
      ['monster', 'BOSS'],
    ]);
    // Under the id it came with, and the file kept exactly.
    expect(reopened.getForgeCharacter('MON-900002')!.importMetadata.payloadHash).toBe(
      payloadHash(asReal('boss-monster')),
    );
  });

  it('B7–B8: exactly one arrival event per character, and a history entry', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await importInto(world, asReal('human'));
    const reopened = await open(dbName);
    const arrivals = reopened.getEvents().filter((e) => e.type === 'CHARACTER_IMPORTED_FROM_FORGE');
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0]).toMatchObject({ actors: ['HUM-900001'], importance: 'AMBIENT' });
    const history = reopened.getForgeImportHistory('HUM-900001');
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ result: 'NEW', deployedVersion: '0.1', sourceSchemaVersion: '1.0' });
  });

  it('A2 / A6: a broken file or a sample reaches nothing in the save', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    const before = await rawRows(dbName);
    for (const text of ['{ broken', sampleText('human'), sampleText('boss-monster')]) {
      const plan = world.planForgeImport(text);
      expect(plan.canRegister).toBe(false);
      await expect(world.commitForgeImport(plan)).rejects.toThrow();
    }
    expect(await rawRows(dbName)).toEqual(before);
    expect(world.getEvents()).toEqual([]);
    expect(world.getForgeCharacters()).toEqual([]);
  });
});

describe('C. 冪等性・更新 — through the save', () => {
  it('C1: reading the same file twice makes no second character and no second event', async () => {
    const world = await open(freshDbName());
    const p = asReal('human');
    await importInto(world, p);
    const plan = world.planForgeImport(JSON.stringify(p, null, 4));
    expect(plan.decision).toBe('UNCHANGED');
    await expect(world.commitForgeImport(plan)).rejects.toThrow();
    expect(world.getForgeCharacters()).toHaveLength(1);
    expect(world.getEvents()).toHaveLength(1);
    expect(world.getForgeImportHistory('HUM-900001')).toHaveLength(1);
  });

  it('C2–C5: an update changes only the FORGE baseline — history, game state and events stay', async () => {
    const dbName = freshDbName();
    const played = await aPlayedWorld(dbName);
    const p = asReal('human');
    await importInto(played, p);
    // What the game has made of her since (written by the game, not FORGE).
    const record = played.getForgeCharacter('HUM-900001')!;
    const runtimeState = { location: 'ALDEN_VILLAGE', hp: 12, questProgress: { herbs: 2 }, earnedName: '森のセラ', relations: ['LINA'] };
    await putRaw(dbName, [{ key: 'forge_character_HUM-900001', value: { ...record, runtimeState } }]);
    const world = await open(dbName);

    const eventsBefore = world.getEvents();
    const clockBefore = world.getClock();
    const lumiBefore = world.getLumi();
    const bagBefore = world.getInventory();
    const galdBefore = world.getCharacter('GALD');

    const r2 = resent(p, 2, (x) => (x.profile.occupation = '薬師'));
    const plan = world.planForgeImport(JSON.stringify(r2));
    expect(plan.decision).toBe('UPDATE');
    // C3: planning wrote nothing.
    expect(world.getForgeCharacter('HUM-900001')!.forgeBaseline.profile.occupation).toBe('薬草採集人');
    expect((await rawRows(dbName)).find((r) => r.key === 'forge_character_HUM-900001')!.value).toMatchObject({
      importMetadata: { deployedVersion: '0.1' },
    });

    const result = await world.commitForgeImport(plan);
    expect(result.result).toBe('UPDATED');
    expect(result.rollback.available).toBe(true);

    const after = await open(dbName);
    const updated = after.getForgeCharacter('HUM-900001')!;
    expect(updated.forgeBaseline.profile.occupation).toBe('薬師');
    expect(updated.importMetadata.deployedVersion).toBe('0.1-r2');
    expect(updated.runtimeState).toEqual(runtimeState);
    // C4: every earlier event is still there, unchanged, plus one update fact.
    const eventsAfter = after.getEvents();
    for (const event of eventsBefore) expect(eventsAfter).toContainEqual(event);
    expect(eventsAfter.filter((e) => e.type === 'CHARACTER_UPDATED_FROM_FORGE')).toHaveLength(1);
    expect(eventsAfter).toHaveLength(eventsBefore.length + 1);
    // C5: the playthrough is where it was.
    expect(after.getClock()).toEqual(clockBefore);
    expect(after.getLumi()).toBe(lumiBefore);
    expect(after.getInventory()).toEqual(bagBefore);
    expect(after.getCharacter('GALD')).toEqual(galdBefore);
  });

  it('C6: the update can be rolled back once; game state and events stay', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    const p = asReal('boss-monster');
    await importInto(world, p);
    const r2 = resent(p, 2, (x) => ((x.bossEncounter as Record<string, unknown>).arena = '焼け跡の広場'));
    await importInto(world, r2);
    const eventsBefore = world.getEvents();
    expect(world.canRollBackForge('MON-900002')).toBe(true);

    const entry = await world.rollbackForgeImport('MON-900002');
    expect(entry.result).toBe('ROLLED_BACK');

    const reopened = await open(dbName);
    const back = reopened.getForgeCharacter('MON-900002')!;
    expect(back.forgeBaseline.bossEncounter!.arena).toBe('根が張り巡らされた地下空洞');
    expect(back.importMetadata.payloadHash).toBe(payloadHash(p));
    expect(reopened.getEvents()).toEqual(eventsBefore);
    expect(reopened.canRollBackForge('MON-900002')).toBe(false);
    await expect(reopened.rollbackForgeImport('MON-900002')).rejects.toThrow();
    expect(reopened.getForgeImportHistory('MON-900002').map((h) => h.result)).toEqual(['NEW', 'UPDATED', 'ROLLED_BACK']);

    // The rolled-back send can be taken in again, and is said to be familiar.
    const again = reopened.planForgeImport(JSON.stringify(r2));
    expect(again.decision).toBe('UPDATE');
    expect(again.warnings.map((w) => w.code)).toContain('PAYLOAD_SEEN_BEFORE');
    const result = await reopened.commitForgeImport(again);
    expect(result.result).toBe('UPDATED');
    expect(reopened.getEvents().filter((e) => e.type === 'CHARACTER_UPDATED_FROM_FORGE')).toHaveLength(2);
  });

  it('refuses to register a plan the save has moved past', async () => {
    const world = await open(freshDbName());
    const plan = world.planForgeImport(JSON.stringify(asReal('human')));
    await world.commitForgeImport(plan);
    await expect(world.commitForgeImport(plan)).rejects.toThrow(/状況が変わりました/);
    expect(world.getEvents()).toHaveLength(1);
  });

  it('two taps on 登録 register once', async () => {
    const world = await open(freshDbName());
    const plan = world.planForgeImport(JSON.stringify(asReal('human')));
    const outcomes = await Promise.allSettled([world.commitForgeImport(plan), world.commitForgeImport(plan)]);
    expect(outcomes.map((o) => o.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(world.getForgeCharacters()).toHaveLength(1);
    expect(world.getEvents()).toHaveLength(1);
  });
});

describe('G. 既存機能保護', () => {
  it('G1 / G3 / G6: an existing save still reads, its events are untouched, the cast is the cast', async () => {
    const dbName = freshDbName();
    const played = await aPlayedWorld(dbName);
    const eventsBefore = played.getEvents();
    const rowsBefore = (await rawRows(dbName)).filter((r) => !r.key.startsWith('forge_'));
    const cast = ['GALD', 'LINA', 'BAKERY_OWNER'].map((id) => played.getCharacter(id));

    await importInto(played, asReal('human'));
    await importInto(played, asReal('normal-monster'));
    const r2 = resent(asReal('human'), 2, (x) => (x.profile.notes = '更新'));
    await importInto(played, r2);
    await played.rollbackForgeImport('HUM-900001');

    const reopened = await open(dbName);
    expect(reopened.getSaveHealth().health).toBe('ok');
    expect(nonForge(reopened.getEvents())).toEqual(eventsBefore);
    // Every row that is not FORGE's is byte for byte what it was.
    expect((await rawRows(dbName)).filter((r) => !r.key.startsWith('forge_'))).toEqual(rowsBefore);
    expect(['GALD', 'LINA', 'BAKERY_OWNER'].map((id) => reopened.getCharacter(id))).toEqual(cast);
    expect(NPC_REGISTRY.map((e) => e.npcId)).toEqual([
      'PLAYER', 'KAOS', 'GALD', 'LINA', 'ALDEN_GUARD', 'BAKERY_OWNER', 'MARTA', 'GRAVE', 'ALDEN_VILLAGE', 'NEL', 'WORLD',
    ]);
  });

  it('G2: no save migration — the version stays, the steps stay, the rows are new rows', async () => {
    expect(SAVE_VERSION).toBe(3);
    expect(MIGRATIONS.map((m) => m.to)).toEqual([2, 3]);
    const dbName = freshDbName();
    const world = await open(dbName);
    await importInto(world, asReal('human'));
    const rows = await rawRows(dbName);
    // Reopening does not rewrite them (the save's repair pass leaves unknown keys alone) …
    await open(dbName);
    expect(await rawRows(dbName)).toEqual(rows);
    expect(await readMeta(dbName, 'saveSchemaVersion')).toBe(3);
    // … and the last-known-good backup carries them like any other row.
    await (await open(dbName)).snapshotBackup();
    const backup = (await readMeta(dbName, 'worldBackup')) as { rows: { key: string }[] };
    expect(backup.rows.map((r) => r.key)).toEqual(
      expect.arrayContaining(['forge_character_HUM-900001', 'forge_history_HUM-900001']),
    );
  });

  it('G4: TIME SHIFT, the life engine and the news read the same world with or without imports', async () => {
    const dbName = freshDbName();
    const played = await aPlayedWorld(dbName);
    const lifeBefore = readWorldLife(played.getEvents(), played.getClock());
    const newsBefore = aldenNewsTodayForAuthor(played.getEvents(), played.getClock());
    const knownBefore = played.getKnownEvents();

    await importInto(played, asReal('human'));
    await importInto(played, asReal('boss-monster'));
    expect(readWorldLife(played.getEvents(), played.getClock())).toEqual(lifeBefore);
    expect(aldenNewsTodayForAuthor(played.getEvents(), played.getClock())).toEqual(newsBefore);
    // Nothing FORGE did is something the player knows.
    expect(played.getKnownEvents()).toEqual(knownBefore);

    const { shift } = await played.timeShift(2);
    expect(shift.type).toBe('WORLD_TIME_SHIFTED');
    expect(played.getClock().worldYear).toBe(shift.to!.worldYear);
  });

  it('G5: the battle side is untouched — party stats, species and enemies are what they were', async () => {
    const world = await open(freshDbName());
    const stats = world.getPartyStats();
    const species = Object.keys(ENEMY_SPECIES);
    await importInto(world, asReal('boss-monster'));
    await importInto(world, asReal('normal-monster'));
    expect(world.getPartyStats()).toEqual(stats);
    expect(Object.keys(ENEMY_SPECIES)).toEqual(species);
    expect(world.getEnemyIndividuals()).toEqual([]);
  });

  it('a fresh save the author imported into still opens on 「はじめる」', async () => {
    const world = await open(freshDbName());
    await importInto(world, asReal('human'));
    expect(world.hasProgress()).toBe(false);
    expect(world.getKnownEvents()).toEqual([]);
  });

  it('F3: an unknown place is not added to the world', async () => {
    const places = LOCATIONS.map((l) => l.id);
    const world = await open(freshDbName());
    await importInto(world, asReal('boss-monster'));
    expect(LOCATIONS.map((l) => l.id)).toEqual(places);
  });
});

describe('what the save does around imports', () => {
  it('a damaged record holds up only its own character, and is never rewritten', async () => {
    const dbName = freshDbName();
    await open(dbName);
    await putRaw(dbName, [{ key: 'forge_character_HUM-900001', value: { broken: true } }]);
    const world = await open(dbName);
    expect(world.getSaveHealth().health).toBe('ok');
    expect(world.getDamagedForgeIds()).toEqual(['HUM-900001']);
    expect(world.planForgeImport(JSON.stringify(asReal('human'))).decision).toBe('BLOCKED_SAVE_DAMAGED');
    await importInto(world, asReal('normal-monster'));
    const row = (await rawRows(dbName)).find((r) => r.key === 'forge_character_HUM-900001');
    expect(row!.value).toEqual({ broken: true });
  });

  it('the developer’s scenario reset keeps imported characters and their arrival', async () => {
    const world = await open(freshDbName());
    await world.recordGaldLifeChoice('HELP');
    await importInto(world, asReal('human'));
    await world.devResetScenario();
    expect(world.getForgeCharacters().map((r) => r.characterId)).toEqual(['HUM-900001']);
    expect(world.getEvents().map((e) => e.type)).toEqual(['CHARACTER_IMPORTED_FROM_FORGE']);
    expect(world.hasProgress()).toBe(false);
    expect(world.planForgeImport(JSON.stringify(asReal('human'))).decision).toBe('UNCHANGED');
  });

  it('a new world (RESET WORLD) has taken nobody in', async () => {
    const world = await World.open(new MemoryOnlyStore());
    await importInto(world, asReal('human'));
    await world.resetWorld();
    expect(world.getForgeCharacters()).toEqual([]);
    expect(world.planForgeImport(JSON.stringify(asReal('human'))).decision).toBe('NEW');
  });
});
