import { describe, expect, it } from 'vitest';
import { KAOS_NUDGES, NUDGE_CHANCE, nudgeFor, type NudgeFacts } from './kaosNudges';
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
  it('not every time, and nothing when nothing is true', () => {
    expect(nudgeFor(f({ forestRegrown: true }), NUDGE_CHANCE, null)).toBeNull();
    expect(nudgeFor(f(), 0, null)).toBeNull();
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

  it('short: one or two lines', () => {
    for (const n of KAOS_NUDGES) {
      expect(n.lines.length).toBeGreaterThanOrEqual(1);
      expect(n.lines.length).toBeLessThanOrEqual(2);
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
      if (c.get.kind === 'ITEM') expect(itemDef(c.get.itemId)).not.toBeNull();
    }
    expect(GRAVE_CRAFT_WORDS.open).toContain('鍛冶屋');
  });
});
