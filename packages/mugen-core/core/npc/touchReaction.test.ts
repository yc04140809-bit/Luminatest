import { describe, expect, it } from 'vitest';
import { BASIC_EXPRESSIONS, pickTouchReaction, touchMood, type TouchFacts } from './touchReaction';
import { SHOP_MIREI } from '../../content/npc/shopMirei';

/** NPCタッチ反応システム PHASE 1 (2026-10-07): ミレイ. */

const BEFORE: TouchFacts = { galdDecided: false, arcStage: 0 };
const AFTER: TouchFacts = { galdDecided: true, arcStage: 4 };

/** A seeded generator, so a thousand taps are the same thousand every run. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function draw(tap: number, facts: TouchFacts, n = 4000, seed = 7) {
  const rng = seeded(seed);
  const out = { NORMAL: 0, EMOTION: 0, CONDITIONAL: 0, PREMIUM: 0 } as Record<string, number>;
  const faces = new Set<string>();
  const texts = new Set<string>();
  for (let i = 0; i < n; i++) {
    const r = pickTouchReaction(SHOP_MIREI, tap, facts, null, rng);
    out[r.kind] += 1;
    faces.add(r.expression);
    texts.add(r.text);
  }
  return { out, faces, texts };
}

describe('ミレイ — what she has to say', () => {
  it('the seven faces, each with its lines (2–4), ten-plus everyday-and-feeling lines, rare ones', () => {
    for (const face of BASIC_EXPRESSIONS) {
      const lines = SHOP_MIREI.lines[face] ?? [];
      expect(lines.length, face).toBeGreaterThanOrEqual(2);
      expect(lines.length, face).toBeLessThanOrEqual(4);
    }
    const all = BASIC_EXPRESSIONS.flatMap((f) => SHOP_MIREI.lines[f] ?? []);
    expect(all.length).toBeGreaterThanOrEqual(10);
    expect(SHOP_MIREI.premium.length).toBeGreaterThanOrEqual(3);
    expect(SHOP_MIREI.premium.length).toBeLessThanOrEqual(6);
  });

  it('the author’s words, as written', () => {
    expect(SHOP_MIREI.name).toBe('ミレイ');
    expect(SHOP_MIREI.lines.NORMAL).toContain('いらっしゃい。今日は何を探してるの？');
    expect(SHOP_MIREI.lines.EMBARRASSED).toContain('別に、照れてなんか……ないわ');
    expect(SHOP_MIREI.premium.map((p) => p.text)).toContain('……あなたが来る気がしてた');
  });
});

describe('the draw', () => {
  it('first taps: about 70 / 20 / 7 / 3 once the ruins are open', () => {
    const { out } = draw(1, AFTER);
    expect(out.NORMAL / 4000).toBeGreaterThan(0.64);
    expect(out.NORMAL / 4000).toBeLessThan(0.76);
    expect(out.EMOTION / 4000).toBeGreaterThan(0.16);
    expect(out.EMOTION / 4000).toBeLessThan(0.24);
    expect(out.CONDITIONAL / 4000).toBeGreaterThan(0.04);
    expect(out.CONDITIONAL / 4000).toBeLessThan(0.1);
    expect(out.PREMIUM / 4000).toBeGreaterThan(0.01);
    expect(out.PREMIUM / 4000).toBeLessThan(0.05);
  });

  it('a kind with nothing to say in this world falls back to the everyday lines (no conditional before the ruins)', () => {
    const { out, texts } = draw(1, BEFORE);
    expect(out.CONDITIONAL).toBe(0);
    expect(texts.has('ガルドのこと、気になってるんでしょう？')).toBe(false);
  });

  it('the Gald line only after his four answers', () => {
    expect(draw(8, BEFORE, 6000).texts.has('ガルドのこと、気になってるんでしょう？')).toBe(false);
    expect(draw(8, AFTER, 6000).texts.has('ガルドのこと、気になってるんでしょう？')).toBe(true);
  });

  it('tapped again and again: calm, then warm (4–6), then tired (7+) — 呆れ・照れ・怒り and no everyday line', () => {
    expect([1, 3, 4, 6, 7, 20].map((t) => touchMood(SHOP_MIREI, t))).toEqual(['calm', 'calm', 'warm', 'warm', 'tired', 'tired']);
    const warm = draw(5, BEFORE);
    expect(warm.out.EMOTION).toBeGreaterThan(draw(1, BEFORE).out.EMOTION * 1.5);
    const tired = draw(9, BEFORE);
    expect(tired.out.NORMAL).toBe(0);
    for (const face of tired.faces) {
      expect(['EXASPERATED', 'EMBARRASSED', 'ANGRY', 'HAPPY', 'NORMAL'], face).toContain(face);
    }
    expect(tired.faces.has('ANGRY')).toBe(true);
    // The rare line a little likelier when tired.
    expect(tired.out.PREMIUM).toBeGreaterThan(draw(1, BEFORE).out.PREMIUM);
  });

  it('never the same line twice running when another could be said', () => {
    const rng = seeded(11);
    let last: string | null = null;
    for (let i = 0; i < 500; i++) {
      const r = pickTouchReaction(SHOP_MIREI, 1 + (i % 9), AFTER, last, rng);
      expect(r.text).not.toBe(last);
      expect(r.text).not.toBe('');
      last = r.text;
    }
  });

  it('every face a line comes with is one of hers, and every line is hers', () => {
    const { faces } = draw(5, AFTER, 6000);
    for (const f of faces) expect(BASIC_EXPRESSIONS).toContain(f);
  });
});
