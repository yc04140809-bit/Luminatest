import { describe, expect, it } from 'vitest';
import { HURT_CHANCE, KAOS_NUDGES, NUDGE_CHANCE, SETTING_OUT_CHANCE, nudgeFor, settingOutTalkFor, type NudgeFacts } from './kaosNudges';
import { KAOS_FACES } from '../characters/kaosFaces';
import { HERO_FACES } from '../characters/heroFaces';
import { HERO_SPEAKER } from './sekiryugaArc';
import { KAOS_BANTERS } from './kaosBanter';
import { GRAVE_CRAFTS, GRAVE_CRAFT_WORDS } from '../economy/graveCraft';
import { itemDef } from '../economy/itemDefs';

const f = (over: Partial<NudgeFacts> = {}): NudgeFacts => ({
  phase: 1,
  forestRegrown: false,
  canCraft: false,
  shopWaiting: false,
  bakeryWaiting: false,
  tavernWaiting: false,
  ...over,
});

describe('Kaos’s light word for the day (2026-10-11)', () => {
  it('not every time; on a day with nothing true, her nothing-in-particular (G, 2026-10-11)', () => {
    expect(nudgeFor(f({ forestRegrown: true }), NUDGE_CHANCE, null)).toBeNull();
    expect(nudgeFor(f(), 0, null)?.topic).toBe('IDLE');
    // Anything true today comes first.
    expect(nudgeFor(f({ forestRegrown: true }), 0, null)?.topic).toBe('FOREST');
  });

  it('says what is true today: somebody waiting first, then the forest, then Grave', () => {
    expect(nudgeFor(f({ shopWaiting: true, forestRegrown: true }), 0, null)?.topic).toBe('SHOP');
    expect(nudgeFor(f({ forestRegrown: true, canCraft: true }), 0, null)?.topic).toBe('FOREST');
    expect(nudgeFor(f({ canCraft: true }), 0, null)?.topic).toBe('CRAFT');
  });

  it('never the same line twice running', () => {
    const a = nudgeFor(f({ forestRegrown: true }), 0, null)!;
    const b = nudgeFor(f({ forestRegrown: true }), 0, a.id)!;
    expect(b.id).not.toBe(a.id);
    expect(b.topic).toBe('FOREST');
  });

  it('in the heavy phase only quiet words — no village errands — and even on a day with nothing, a quiet line', () => {
    const heavy = nudgeFor(f({ phase: 3, shopWaiting: true, forestRegrown: true }), 0, null)!;
    expect(heavy.heavy).toBe(true);
    expect(heavy.topic).toBe('FOREST');
    expect(nudgeFor(f({ phase: 3 }), 0, null)?.topic).toBe('QUIET');
    for (const n of KAOS_NUDGES.filter((x) => x.heavy)) for (const l of n.lines) expect(l.kaosFace ?? 'NORMAL').not.toMatch(/LAUGH|DOYA/);
  });

  it('short: one to three exchanges (five lines at most)', () => {
    for (const n of KAOS_NUDGES) {
      expect(n.lines.length).toBeGreaterThanOrEqual(1);
      expect(n.lines.length).toBeLessThanOrEqual(5);
    }
  });
});

describe('Grave’s handwork (2026-10-11)', () => {
  it('three to five, from what the forest gives — nothing rare, nothing that is a key', () => {
    expect(GRAVE_CRAFTS.length).toBeGreaterThanOrEqual(3);
    expect(GRAVE_CRAFTS.length).toBeLessThanOrEqual(5);
    for (const c of GRAVE_CRAFTS) {
      for (const g of c.give) {
        expect(itemDef(g.itemId), c.id).not.toBeNull();
        expect(['ANCIENT_SHARD', 'OLD_COIN']).not.toContain(g.itemId);
      }
      expect(itemDef(c.get.itemId), c.id).not.toBeNull();
    }
    expect(GRAVE_CRAFT_WORDS.open).toContain('鍛冶屋');
  });
});

describe('状況別の会話 (作者指示 2026-10-11)', () => {
  const out = (over: Partial<NudgeFacts> = {}) => ({ phase: 1 as const, ...over });

  it('setting out hurt: 「その傷で行くつもり？」 — more likely than the rest, and in the heavy phase too', () => {
    const hurt = settingOutTalkFor(out({ hurt: true }), HURT_CHANCE - 0.01, null, true)!;
    expect(hurt.topic).toBe('HURT');
    expect(hurt.lines.map((l) => l.text)).toContain('その傷で行くつもり？');
    expect(settingOutTalkFor(out({ hurt: true }), HURT_CHANCE, null, true)).toBeNull();
    expect(settingOutTalkFor({ phase: 3, hurt: true }, 0, null, true)?.topic).toBe('HURT');
  });

  it('her magic low: 「今日は魔法、控えめにな。」; else now and then which way — only after the first one was had', () => {
    expect(settingOutTalkFor(out({ lowMp: true }), 0, null, true)?.topic).toBe('LOW_MP');
    expect(settingOutTalkFor(out(), 0, null, true)?.id).toBe('WHICH_WAY_2');
    expect(settingOutTalkFor(out(), 0, null, false)).toBeNull();
    expect(settingOutTalkFor(out(), SETTING_OUT_CHANCE, null, true)).toBeNull();
    // Healthy and full: never the hurt or the magic line.
    for (let r = 0; r < 1; r += 0.05) expect(['HURT', 'LOW_MP']).not.toContain(settingOutTalkFor(out(), r, null, true)?.topic);
  });

  it('coming back: a close call first, then a lucky day, then the day\'s errands; a light purse, a long day, the tavern again', () => {
    expect(nudgeFor(f({ reckless: true, lucky: true, shopWaiting: true }), 0, null)?.topic).toBe('RECKLESS');
    expect(nudgeFor(f({ lucky: true, shopWaiting: true }), 0, null)?.topic).toBe('LUCKY');
    expect(nudgeFor(f({ poor: true }), 0, null)?.topic).toBe('POOR');
    expect(nudgeFor(f({ late: true }), 0, null)?.topic).toBe('LATE');
    expect(nudgeFor(f({ tavernYesterday: true }), 0, null)?.topic).toBe('PUKU');
    expect(nudgeFor(f({ canCraft: true }), 0, ['CRAFT_1', 'CRAFT_2'])?.id).toBe('CRAFT_3');
  });

  it('not said again soon: a topic whose lines were all said lately gives way', () => {
    expect(nudgeFor(f({ lucky: true, poor: true }), 0, ['LUCKY_1'])?.topic).toBe('POOR');
    expect(nudgeFor(f({ lucky: true }), 0, ['LUCKY_1', 'IDLE_1'])).toBeNull();
  });

  it('the heavy phase: only the serious ones', () => {
    expect(nudgeFor(f({ phase: 3, poor: true, late: true, lucky: true }), 0, null)?.topic).toBe('QUIET');
    expect(nudgeFor(f({ phase: 3, reckless: true }), 0, null)?.topic).toBe('RECKLESS');
  });

  it('every face named is one she or he has; she speaks to him as キミ or あなた, never 師匠; nobody calls him undying', () => {
    for (const n of KAOS_NUDGES) {
      for (const l of n.lines) {
        if (l.kaosFace) expect(KAOS_FACES as readonly string[], n.id).toContain(l.kaosFace);
        if (l.heroFace) expect(HERO_FACES as readonly string[], n.id).toContain(l.heroFace);
        if (l.speaker !== HERO_SPEAKER) expect(l.text, n.id).not.toContain('師匠');
        expect(l.text, n.id).not.toMatch(/不死|死なない/);
      }
    }
    expect(KAOS_NUDGES.find((n) => n.id === 'LATE_1')!.lines.at(-1)!.text).toBe('キミ、そう言って長いんだから。');
    expect(KAOS_NUDGES.find((n) => n.id === 'RECKLESS_1')!.lines[0].text).toBe('歳を取らないからって、命まで雑に扱わないでよ。');
  });
});

describe('the two of them, all their short exchanges (2026-10-11)', () => {
  it('she never calls him 師匠, and nobody calls him undying (不老だが不死ではない)', () => {
    for (const b of KAOS_BANTERS) {
      for (const l of b.lines) {
        if (l.speaker !== HERO_SPEAKER) expect(l.text, b.id).not.toContain('師匠');
        expect(l.text, b.id).not.toMatch(/不死|死なない/);
      }
    }
  });
});
