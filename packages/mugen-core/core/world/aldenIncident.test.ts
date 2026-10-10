import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { NO_INCIDENT, countIncident, incidentCounting, incidentPhaseFor, readIncident, type IncidentRow } from './aldenIncident';
import { SEKIRYUGA_STAGES } from './storyArc';
import { GALD_FUTURE_VISION_ID } from '../../content/events/galdLifeChoice';
import { World } from './world';
import { IdbMemoryStore, WORLD_STATE_STORE } from '../memory/idbStore';
import { openDatabase, txDone } from '../memory/idbSchema';
import { SAVE_VERSION } from './saveSchema';
import { rumorsFor, VILLAGE_RUMORS } from '../../content/story/villageRumors';
import { INCIDENT_KAOS_TALKS, INCIDENT_GRAVE_TALK, incidentKaosOwed, incidentKaosMark } from '../../content/story/aldenIncident';

/** ALDEN INCIDENT 予兆フェーズ (2026-10-10): a hidden point moved by doing, its phase, and nothing more. */

/** Past Gald and his look ahead: the route open. */
async function pastGald(w: World) {
  await w.recordGaldLifeChoice('SPARE');
  await w.markExperienceSeen(GALD_FUTURE_VISION_ID);
}

/** セキリュウガ's part over (SETTLED): from here the incident counts. */
async function settledWorld(w: World) {
  await pastGald(w);
  for (const stage of ['RUMOR', 'TOLD', 'BEATEN', 'SETTLED'] as const) await w.advanceSekiryugaArc(stage);
}

const count = (row: IncidentRow, kind: Parameters<typeof countIncident>[1], day: number, id?: string) =>
  countIncident(row, kind, day, id) ?? row;

describe('the phases', () => {
  it('0–2 平常, 3–5 違和感, 6–9 異変, 10+ 直前', () => {
    expect([0, 2, 3, 5, 6, 9, 10, 40].map(incidentPhaseFor)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});

describe('what moves it, and how often', () => {
  it('a win, a walk out, a first place: +1 each', () => {
    let r = NO_INCIDENT;
    r = count(r, 'WIN', 1);
    r = count(r, 'EXPLORE', 1);
    r = count(r, 'PLACE', 1, 'GREENWOOD_FOREST');
    expect(r.aldenIncidentPoint).toBe(3);
    expect(r.aldenIncidentPhase).toBe(1);
  });

  it('reading a rumour is not a step — the world moves by what is done, and the rumours show it (作者判断 2026-10-10)', () => {
    const r = count(NO_INCIDENT, 'WIN', 1);
    // Anything that is not one of the four steps (as a rumour read once was) counts for nothing.
    expect(countIncident(r, 'RUMOR' as never, 1, 'INC_BEASTS_RESTLESS')).toBeNull();
    expect(countIncident(NO_INCIDENT, 'RUMOR' as never, 1, 'SEKIRYUGA_ROUTE')).toBeNull();
    // A save from before, holding RUMOR keys, reads as it was: the keys are kept and mean nothing.
    const old = readIncident({ aldenIncidentPoint: 4, aldenIncidentPhase: 1, counted: ['RUMOR:X', 'WIN@3'], sinceRest: true });
    expect(old).toEqual({
      value: { aldenIncidentPoint: 4, aldenIncidentPhase: 1, counted: ['RUMOR:X', 'WIN@3'], sinceRest: true },
      health: 'ok',
    });
  });

  it('the same thing again does not count: a win twice in a day, a place twice ever', () => {
    let r = count(NO_INCIDENT, 'WIN', 1);
    expect(countIncident(r, 'WIN', 1)).toBeNull();
    r = count(r, 'PLACE', 1, 'GREENWOOD_FOREST');
    expect(countIncident(r, 'PLACE', 5, 'GREENWOOD_FOREST')).toBeNull();
    expect(countIncident(r, 'PLACE', 5)).toBeNull();
    // Another day, a win counts again — and only today's day key is kept.
    r = count(r, 'WIN', 2);
    expect(r.aldenIncidentPoint).toBe(3);
    expect(r.counted.filter((k) => k.startsWith('WIN@'))).toEqual(['WIN@2']);
  });

  it('a rest counts only after something else did — resting over and over moves nothing', () => {
    expect(countIncident(NO_INCIDENT, 'REST', 1)).toBeNull();
    let r = count(NO_INCIDENT, 'WIN', 1);
    r = count(r, 'REST', 1);
    expect(r.aldenIncidentPoint).toBe(2);
    expect(countIncident(r, 'REST', 2)).toBeNull();
    for (let d = 2; d < 30; d++) r = count(r, 'REST', d);
    expect(r.aldenIncidentPoint).toBe(2);
  });

  it('a day of play moves it by a few at most — phase 3 takes a few days out', () => {
    let r = NO_INCIDENT;
    let day = 1;
    const aDay = () => {
      for (let i = 0; i < 5; i++) r = count(r, 'WIN', day);
      for (let i = 0; i < 5; i++) r = count(r, 'EXPLORE', day);
      r = count(r, 'REST', day);
      day += 1;
    };
    aDay();
    expect(r.aldenIncidentPoint).toBe(3);
    aDay();
    aDay();
    expect(r.aldenIncidentPhase).toBe(2);
    aDay();
    expect(r.aldenIncidentPhase).toBe(3);
  });
});

describe('the row', () => {
  it('a save from before reads as 0; a broken row is repaired; a phase that disagrees with the point is put right', () => {
    expect(readIncident(undefined)).toEqual({ value: NO_INCIDENT, health: 'ok' });
    expect(readIncident('x').health).toBe('repaired');
    expect(readIncident({ aldenIncidentPoint: 7, aldenIncidentPhase: 0, counted: [], sinceRest: false }).value.aldenIncidentPhase).toBe(2);
  });

  it('nothing counts until セキリュウガ’s part is over (SETTLED) — not before Gald, not on the route, not at BEATEN', async () => {
    expect(SEKIRYUGA_STAGES.filter(incidentCounting)).toEqual(['SETTLED']);
    const db = `incident-${Math.random()}`;
    const w = await World.open(new IdbMemoryStore(db));
    const tryAll = async () => {
      for (const kind of ['WIN', 'EXPLORE', 'REST'] as const) expect(await w.addIncident(kind)).toBe(false);
      expect(await w.addIncident('PLACE', 'GREENWOOD_FOREST')).toBe(false);
      expect(w.getIncidentPoint()).toBe(0);
    };
    await tryAll();
    await pastGald(w);
    await tryAll();
    for (const stage of ['RUMOR', 'TOLD', 'BEATEN'] as const) {
      expect(await w.advanceSekiryugaArc(stage)).toBe(true);
      await tryAll();
    }
    expect(await w.advanceSekiryugaArc('SETTLED')).toBe(true);
    // Now it counts — and the forest, walked before, counts once as a place now.
    expect(await w.addIncident('PLACE', 'GREENWOOD_FOREST')).toBe(true);
    expect(w.getIncidentPoint()).toBe(1);
    expect((await World.open(new IdbMemoryStore(db))).getIncidentPoint()).toBe(1);
  });

  it('kept by the world across a reload, under the same save version; a reset world starts at 0', async () => {
    const db = `incident-${Math.random()}`;
    const w = await World.open(new IdbMemoryStore(db));
    await settledWorld(w);
    expect(w.getIncidentPoint()).toBe(0);
    expect(w.getIncidentPhase()).toBe(0);
    await w.addIncident('WIN');
    await w.addIncident('EXPLORE');
    await w.addIncident('PLACE', 'GREENWOOD_FOREST');
    expect(await w.addIncident('WIN')).toBe(false);
    const again = await World.open(new IdbMemoryStore(db));
    expect(again.getIncidentPoint()).toBe(3);
    expect(again.getIncidentPhase()).toBe(1);
    expect(again.getSaveHealth().version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(3);
    await again.resetWorld();
    expect(again.getIncidentPoint()).toBe(0);
  });

  it('a broken row in a save opens as 0, never thrown', async () => {
    const db = `incident-${Math.random()}`;
    await World.open(new IdbMemoryStore(db));
    const d = await openDatabase(db);
    const tx = d.transaction(WORLD_STATE_STORE, 'readwrite');
    tx.objectStore(WORLD_STATE_STORE).put({ key: 'aldenIncident', value: { aldenIncidentPoint: -3 } });
    await txDone(tx);
    d.close();
    const w = await World.open(new IdbMemoryStore(db));
    expect(w.getIncidentPoint()).toBe(0);
  });
});

describe('what is said', () => {
  const base = { arcOpen: false, stage: 'NONE' as const };
  const ids = (phase: number) => rumorsFor({ ...base, incidentPhase: phase }).map((r) => r.id).filter((id) => id.startsWith('INC_'));

  it('phase 0 says nothing; each phase adds to the last', () => {
    expect(ids(0)).toEqual([]);
    expect(rumorsFor(base).some((r) => r.id.startsWith('INC_'))).toBe(false);
    expect(ids(1).length).toBeGreaterThan(0);
    expect(ids(2).length).toBeGreaterThan(ids(1).length);
    expect(ids(3).length).toBeGreaterThan(ids(2).length);
    for (const id of ids(1)) expect(ids(2)).toContain(id);
  });

  it('nobody says the village will be attacked; nothing of who Kaos is, the machines or the ruins’ truth', () => {
    const said = [
      ...VILLAGE_RUMORS.filter((r) => r.id.startsWith('INC_')).map((r) => r.text),
      ...Object.values(INCIDENT_KAOS_TALKS).flat().map((l) => l.text),
      ...INCIDENT_GRAVE_TALK.map((l) => l.text),
    ].join('');
    expect(said).not.toMatch(/襲われる|襲撃|攻めて|滅び|AI|機械|戦争|古代|遺跡の真実|女神/);
  });

  it('her word: the lowest phase reached and not yet heard, one at a time', () => {
    const read = new Set<string>();
    const isRead = (m: string) => read.has(m);
    expect(incidentKaosOwed(0, isRead)).toBeNull();
    expect(incidentKaosOwed(2, isRead)).toBe(1);
    read.add(incidentKaosMark(1));
    expect(incidentKaosOwed(2, isRead)).toBe(2);
    read.add(incidentKaosMark(2));
    expect(incidentKaosOwed(2, isRead)).toBeNull();
    expect(incidentKaosOwed(3, isRead)).toBe(3);
  });
});
