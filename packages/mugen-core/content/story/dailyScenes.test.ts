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
      ['FUUMIMI_AFTER_KILL', 'VILLAGE', 0],
      ['FUUMIMI_AFTER_SPARE', 'VILLAGE', 0],
      ['FUUMIMI_AFTER_HELP', 'VILLAGE', 0],
      ['FUUMIMI_AFTER_CAPTURE', 'VILLAGE', 0],
      ['LINA_BURNT_BREAD', 'BAKERY_LINA', 0],
      ['OWNER_KILN', 'BAKERY_OWNER', 1],
      ['GRAVE_GREATSWORD', 'TAVERN', 2],
      ['MIREI_TRAVELERS', 'SHOP', 1],
      ['RIZEL_WOODEN_SWORD', 'VILLAGE', 0],
      ['RIZEL_ON_GALD_KILL', 'VILLAGE', 0],
      ['RIZEL_ON_GALD_SPARE', 'VILLAGE', 0],
      ['RIZEL_ON_GALD_HELP', 'VILLAGE', 0],
      ['RIZEL_ON_GALD_CAPTURE', 'VILLAGE', 0],
      ['RIZEL_FIRST_AID', 'VILLAGE', 1],
      // 第1章終盤の伏線 (2026-10-12): Kaos looks at the sky once — after Rizel's.
      ['KAOS_SKY', 'VILLAGE', 2],
      // バルド (2026-10-16): last, so it only takes a day nothing else here wants.
      ['BALDO_FIRST_MEETING', 'VILLAGE', 0],
      // パン屋ルート (OFF-SCREEN LIFE PoC, 2026-10-17): told afterwards, each only once
      // it happened (`truth`) and only where Gald was bandaged — after everything above.
      ['LINA_AFTER_THE_FOREST_EDGE', 'BAKERY_LINA', 0],
      ['RIZEL_SAW_THE_FOREST_EDGE', 'VILLAGE', 0],
      ['OWNER_ON_THE_NEW_HAND', 'BAKERY_OWNER', 0],
      ['LINA_LETTER_TO_ELNA', 'BAKERY_LINA', 0],
    ]);
    // Half a minute or so each: five lines at least, ten at most.
    for (const s of DAILY_SCENES) {
      expect(s.lines.length).toBeGreaterThanOrEqual(5);
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

describe('リゼル (HUM-000001): two ordinary scenes, and one answering what was done about Gald', () => {
  const rizel = (id: string) => DAILY_SCENES.find((s) => s.id === id)!;
  it('met with the wooden sword first; the rest wait until she has been', () => {
    // (バルド's meeting, which also follows hers, counted as seen: this is about hers.)
    const seen = new Set<string>([dailySceneMark('KAOS_DETOUR'), dailySceneMark('BALDO_FIRST_MEETING')]);
    const f = (over: Partial<DailySceneFacts> = {}) => facts({ isRead: (m) => seen.has(m), galdChoice: 'SPARE', phase: 1, ...over });
    expect(dailySceneAt('VILLAGE', f())?.id).toBe('RIZEL_WOODEN_SWORD');
    seen.add(dailySceneMark('RIZEL_WOODEN_SWORD'));
    expect(dailySceneAt('VILLAGE', f())?.id).toBe('RIZEL_ON_GALD_SPARE');
    seen.add(dailySceneMark('RIZEL_ON_GALD_SPARE'));
    expect(dailySceneAt('VILLAGE', f())?.id).toBe('RIZEL_FIRST_AID');
    // First aid waits for the signs (phase 1).
    expect(dailySceneAt('VILLAGE', f({ phase: 0 }))).toBeNull();
  });

  it('the answer about Gald: only the one matching this world, and none without an answer', () => {
    const seen = new Set<string>([dailySceneMark('KAOS_DETOUR'), dailySceneMark('RIZEL_WOODEN_SWORD'), dailySceneMark('BALDO_FIRST_MEETING')]);
    for (const choice of ['KILL', 'SPARE', 'HELP', 'CAPTURE'] as const) {
      expect(dailySceneAt('VILLAGE', facts({ isRead: (m) => seen.has(m), galdChoice: choice }))?.id).toBe(`RIZEL_ON_GALD_${choice}`);
    }
    expect(dailySceneAt('VILLAGE', facts({ isRead: (m) => seen.has(m), galdChoice: null }))).toBeNull();
  });

  it('she reacts from her own values — never naming a right or wrong answer, never praising, never telling what she has in her', () => {
    for (const s of DAILY_SCENES.filter((x) => x.id.startsWith('RIZEL_'))) {
      const text = s.lines.map((l) => l.text).join('');
      expect(text).not.toMatch(/正しい|正解|間違|よくやった|偉い(?!人)|えらい|魔法|回復|治癒|才能/);
    }
    // The four answers, each its own: one line of hers each differs.
    const middles = (['KILL', 'SPARE', 'HELP', 'CAPTURE'] as const).map((c) => rizel(`RIZEL_ON_GALD_${c}`).lines[2].text);
    expect(new Set(middles).size).toBe(4);
    // Her name only once she gives it.
    const sword = rizel('RIZEL_WOODEN_SWORD').lines;
    const named = sword.findIndex((l) => l.speaker === 'リゼル');
    expect(sword.slice(0, named).every((l) => l.speaker !== 'リゼル')).toBe(true);
    expect(sword[named].text).toContain('リゼル');
  });
});

describe('バルド (作者 PROFILE Ver.1.0, 2026-10-16): met once, teasing リゼル — nothing more yet', () => {
  const baldo = DAILY_SCENES.find((s) => s.id === 'BALDO_FIRST_MEETING')!;
  it('only once リゼル is known, and only on a day no other village scene wants', () => {
    const seen = new Set<string>([dailySceneMark('KAOS_DETOUR')]);
    const f = (over: Partial<DailySceneFacts> = {}) => facts({ isRead: (m) => seen.has(m), galdChoice: 'SPARE', phase: 2, ...over });
    // Not before her: her wooden sword is first.
    expect(dailySceneAt('VILLAGE', f())?.id).toBe('RIZEL_WOODEN_SWORD');
    seen.add(dailySceneMark('RIZEL_WOODEN_SWORD'));
    // Everything already here keeps its day: her answer, her first aid, Kaos and the sky — then him.
    for (const id of ['RIZEL_ON_GALD_SPARE', 'RIZEL_FIRST_AID', 'KAOS_SKY'] as const) {
      expect(dailySceneAt('VILLAGE', f())?.id).toBe(id);
      seen.add(dailySceneMark(id));
    }
    expect(dailySceneAt('VILLAGE', f())?.id).toBe('BALDO_FIRST_MEETING');
    // From the very start of the everyday too, once she is known and there is nothing else.
    expect(dailySceneAt('VILLAGE', f({ phase: 0, galdChoice: null }))?.id).toBe('BALDO_FIRST_MEETING');
    // Once.
    seen.add(dailySceneMark('BALDO_FIRST_MEETING'));
    expect(dailySceneAt('VILLAGE', f())).toBeNull();
  });

  it('his face on his own lines; unnamed until she says his name', () => {
    const his = baldo.lines.filter((l) => l.speaker === 'バルド');
    expect(his.length).toBeGreaterThan(0);
    const first = baldo.lines.findIndex((l) => l.speaker === 'バルド');
    const named = baldo.lines.findIndex((l) => l.speaker === 'リゼル' && l.text.includes('バルド'));
    expect(named).toBeGreaterThan(-1);
    expect(named).toBeLessThan(first);
    for (const l of baldo.lines.slice(0, named)) expect(l.speaker).not.toBe('バルド');
    expect(new Set(his.map((l) => l.face ?? 'NORMAL'))).toEqual(new Set(['NORMAL', 'SMILE_EYES_CLOSED', 'ANGRY']));
  });

  it('not yet (作者判断 2026-10-16): no gift for the sword seen or hinted, no エルナ, no Gald, no raid', () => {
    const text = baldo.lines.map((l) => l.text).join('');
    expect(text).not.toMatch(/才能|向いて|筋がいい|素質|エルナ|ガルド|盗賊|襲撃|治療/);
  });
});

describe('フウミミ (MON-000002 / IND-43452DFD): what follows each answer, a day or more after', () => {
  const seen = new Set<string>([dailySceneMark('KAOS_DETOUR')]);
  it('only the one for the answer given, and not on the day it was given', () => {
    for (const choice of ['KILL', 'SPARE', 'HELP', 'CAPTURE'] as const) {
      const f = (day: number) => facts({ day, isRead: (m) => seen.has(m), fuumimi: { choice, day: 10 } });
      expect(dailySceneAt('VILLAGE', f(10))?.id).not.toMatch(/^FUUMIMI/);
      expect(dailySceneAt('VILLAGE', f(11))?.id).toBe(`FUUMIMI_AFTER_${choice}`);
    }
    expect(dailySceneAt('VILLAGE', facts({ day: 11, isRead: (m) => seen.has(m), fuumimi: null }))?.id).toBe('RIZEL_WOODEN_SWORD');
  });

  it('each answer is followed by something different, and none is called right or wrong', () => {
    const after = (['KILL', 'SPARE', 'HELP', 'CAPTURE'] as const).map((c) =>
      DAILY_SCENES.find((s) => s.id === `FUUMIMI_AFTER_${c}`)!.lines.map((l) => l.text).join(''),
    );
    expect(new Set(after).size).toBe(4);
    for (const text of after) expect(text).not.toMatch(/正しい|正解|間違|よかった|ひどい|かわいそう/);
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
    // Tomorrow, Lina's — or, on coming back into the village, Rizel's (whichever comes first).
    await again.advanceDay();
    expect(again.getDailyScene('BAKERY_LINA')?.id).toBe('LINA_BURNT_BREAD');
    expect(again.getDailyScene('VILLAGE')?.id).toBe('RIZEL_WOODEN_SWORD');
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
