import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DAILY_SCENES, dailySceneAt, dailySceneMark, type DailySceneFacts } from './dailyScenes';
import { ALDEN_EXPERIENCE_EVENTS } from '../experience/aldenExperience';
import { World } from '../../core/world/world';
import { IdbMemoryStore, WORLD_STATE_STORE } from '../../core/memory/idbStore';
import { openDatabase, txDone } from '../../core/memory/idbSchema';
import { readDailyScene } from '../../core/world/dailySceneState';
import { SAVE_VERSION } from '../../core/world/saveSchema';
import { GALD_FUTURE_VISION_ID } from '../events/galdLifeChoice';

/** 襲撃前の日常 (2026-10-10): small things that happen, after セキリュウガ, one a day, each once, paying nothing. */

const facts = (over: Partial<DailySceneFacts> = {}): DailySceneFacts => ({
  stage: 'SETTLED',
  phase: 0,
  day: 10,
  lastDay: null,
  isRead: () => false,
  ...over,
});

async function settledWorld(name = `daily-${Math.random()}`) {
  const w = await World.open(new IdbMemoryStore(name));
  await w.recordGaldLifeChoice('SPARE');
  await w.markExperienceSeen(GALD_FUTURE_VISION_ID);
  for (const s of ['RUMOR', 'TOLD', 'BEATEN', 'SETTLED'] as const) await w.advanceSekiryugaArc(s);
  return { w, name };
}

describe('the five', () => {
  it('who, where, and from which phase of the signs', () => {
    expect(DAILY_SCENES.map((s) => [s.id, s.place, s.from])).toEqual([
      ['KAOS_DETOUR', 'VILLAGE', 0],
      ['LINA_BURNT_BREAD', 'BAKERY_LINA', 0],
      ['OWNER_KILN', 'BAKERY_OWNER', 1],
      ['GRAVE_GREATSWORD', 'TAVERN', 2],
      ['MIREI_TRAVELERS', 'SHOP', 1],
    ]);
    for (const s of DAILY_SCENES) {
      expect(s.lines.length).toBeGreaterThanOrEqual(6);
      expect(s.lines.length).toBeLessThanOrEqual(10);
    }
  });

  it('the two already written for the talk spots are taken word for word, her remark last', () => {
    for (const s of DAILY_SCENES.filter((x) => x.takenFrom)) {
      const event = ALDEN_EXPERIENCE_EVENTS.find((e) => e.eventId === s.takenFrom)!;
      expect(s.lines.slice(0, event.content.lines.length)).toEqual(event.content.lines);
      const rest = s.lines.slice(event.content.lines.length);
      expect(rest).toEqual(event.content.kaosLine ? [{ speaker: 'ケイオス', text: event.content.kaosLine.slice(1, -1) }] : []);
    }
    expect(DAILY_SCENES.filter((x) => x.takenFrom).map((x) => x.takenFrom)).toEqual([
      'ALDEN_KAOS_DETOUR',
      'TAVERN_MASTER_OLD_GREATSWORD',
    ]);
  });

  it('Lina’s is about bread and nothing else: not Gald, not her future', () => {
    const lina = DAILY_SCENES.find((s) => s.id === 'LINA_BURNT_BREAD')!;
    const text = lina.lines.map((l) => l.text).join('');
    expect(text).not.toMatch(/ガルド|将来|大人になったら/);
  });
});

describe('when one happens', () => {
  it('nothing before セキリュウガ’s part is over', () => {
    for (const stage of ['NONE', 'RUMOR', 'TOLD', 'BEATEN'] as const) {
      for (const s of DAILY_SCENES) expect(dailySceneAt(s.place, facts({ stage, phase: 3 }))).toBeNull();
    }
    expect(dailySceneAt('VILLAGE', facts())?.id).toBe('KAOS_DETOUR');
  });

  it('one a day: once one has been seen today, nothing more until tomorrow', () => {
    expect(dailySceneAt('BAKERY_LINA', facts({ lastDay: 10 }))).toBeNull();
    expect(dailySceneAt('BAKERY_LINA', facts({ lastDay: 9 }))?.id).toBe('LINA_BURNT_BREAD');
  });

  it('each once; and some wait for the signs', () => {
    const seen = new Set([dailySceneMark('LINA_BURNT_BREAD')]);
    expect(dailySceneAt('BAKERY_LINA', facts({ isRead: (m) => seen.has(m) }))).toBeNull();
    expect(dailySceneAt('BAKERY_OWNER', facts({ phase: 0 }))).toBeNull();
    expect(dailySceneAt('BAKERY_OWNER', facts({ phase: 1 }))?.id).toBe('OWNER_KILN');
    expect(dailySceneAt('SHOP', facts({ phase: 0 }))).toBeNull();
    expect(dailySceneAt('SHOP', facts({ phase: 1 }))?.id).toBe('MIREI_TRAVELERS');
    expect(dailySceneAt('TAVERN', facts({ phase: 1 }))).toBeNull();
    expect(dailySceneAt('TAVERN', facts({ phase: 2 }))?.id).toBe('GRAVE_GREATSWORD');
    // Phase 3 does not shut them (nothing is lost by coming late).
    expect(dailySceneAt('TAVERN', facts({ phase: 3 }))?.id).toBe('GRAVE_GREATSWORD');
  });
});

describe('in a world', () => {
  it('seen to its end: read, today its day, kept across a reload — and nothing paid, nothing moved', async () => {
    const { w, name } = await settledWorld();
    const before = {
      lumi: w.getLumi(),
      bag: JSON.stringify(w.getInventory()),
      point: w.getIncidentPoint(),
      memory: w.getKnownEvents().map((e) => e.id),
    };
    expect(w.getDailyScene('VILLAGE')?.id).toBe('KAOS_DETOUR');
    expect(await w.finishDailyScene('KAOS_DETOUR')).toBe(true);
    expect(w.isRead(dailySceneMark('KAOS_DETOUR'))).toBe(true);
    // One a day: Lina's waits for tomorrow.
    expect(w.getDailyScene('BAKERY_LINA')).toBeNull();
    expect(await w.finishDailyScene('KAOS_DETOUR')).toBe(false);
    expect({
      lumi: w.getLumi(),
      bag: JSON.stringify(w.getInventory()),
      point: w.getIncidentPoint(),
      memory: w.getKnownEvents().map((e) => e.id),
    }).toEqual(before);

    const again = await World.open(new IdbMemoryStore(name));
    expect(again.getDailySceneDay()).toBe(w.getDailySceneDay());
    expect(again.getDailyScene('VILLAGE')).toBeNull();
    expect(again.getDailyScene('BAKERY_LINA')).toBeNull();
    // Tomorrow, Lina's.
    await again.advanceDay();
    expect(again.getDailyScene('BAKERY_LINA')?.id).toBe('LINA_BURNT_BREAD');
    expect(again.getDailyScene('VILLAGE')).toBeNull();
    expect(again.getSaveHealth().version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(3);
    await again.resetWorld();
    expect(again.getDailySceneDay()).toBeNull();
  });

  it('a save from before has none; a broken row opens as none, never thrown', async () => {
    expect(readDailyScene(undefined)).toEqual({ value: { lastDay: null }, health: 'ok' });
    expect(readDailyScene({ lastDay: 4 })).toEqual({ value: { lastDay: 4 }, health: 'ok' });
    for (const junk of ['x', 3, { lastDay: -1 }, { lastDay: 1.5 }, { lastDay: '2' }]) {
      expect(readDailyScene(junk)).toEqual({ value: { lastDay: null }, health: 'repaired' });
    }
    const { name } = await settledWorld();
    const d = await openDatabase(name);
    const tx = d.transaction(WORLD_STATE_STORE, 'readwrite');
    tx.objectStore(WORLD_STATE_STORE).put({ key: 'dailyScene', value: { lastDay: 'soon' } });
    await txDone(tx);
    d.close();
    const w = await World.open(new IdbMemoryStore(name));
    expect(w.getDailySceneDay()).toBeNull();
    expect(w.getDailyScene('VILLAGE')?.id).toBe('KAOS_DETOUR');
  });
});
