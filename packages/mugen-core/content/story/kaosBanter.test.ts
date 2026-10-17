import { describe, expect, it } from 'vitest';
import { BANTER_CHANCE, KAOS_BANTERS, banterAt, banterMark, type BanterFacts } from './kaosBanter';
import { KAOS_FACES } from '../characters/kaosFaces';
import { HERO_FACES } from '../characters/heroFaces';
import { HERO_SPEAKER } from './sekiryugaArc';

/** 主人公×ケイオス — short exchanges (作者指示 2026-10-11). */

const facts = (over: Partial<BanterFacts> = {}): BanterFacts => ({ stage: 'NONE', phase: 0, forestVisits: 0, day: 1, ...over });
const none = () => false;

describe('what they are', () => {
  it('short — two to four lines — and between the two of them: each has the hero answering and her speaking', () => {
    for (const b of KAOS_BANTERS) {
      expect(b.lines.length, b.id).toBeGreaterThanOrEqual(2);
      expect(b.lines.length, b.id).toBeLessThanOrEqual(4);
      expect(b.lines.some((l) => l.speaker === HERO_SPEAKER), b.id).toBe(true);
      expect(b.lines.some((l) => l.speaker === 'ケイオス'), b.id).toBe(true);
      for (const l of b.lines) expect(l.text.length, b.id).toBeLessThanOrEqual(30);
    }
    expect(new Set(KAOS_BANTERS.map((b) => b.id)).size).toBe(KAOS_BANTERS.length);
  });

  it('every line of hers names a face, from the ten — and not always the same one', () => {
    const used = new Set<string>();
    for (const b of KAOS_BANTERS) {
      for (const l of b.lines.filter((x) => x.speaker === 'ケイオス')) {
        expect(KAOS_FACES, `${b.id}: ${l.text}`).toContain(l.kaosFace);
        used.add(l.kaosFace!);
      }
    }
    // PUKU is used, and among the six first faces at least five are.
    expect(used.has('PUKU')).toBe(true);
    expect(['NORMAL', 'SMILE', 'PUKU', 'SURPRISED', 'TROUBLED', 'SERIOUS'].filter((f) => used.has(f)).length).toBeGreaterThanOrEqual(5);
    // PUKU is not on every other line.
    const all = KAOS_BANTERS.flatMap((b) => b.lines.filter((l) => l.speaker === 'ケイオス'));
    expect(all.filter((l) => l.kaosFace === 'PUKU').length).toBeLessThan(all.length / 3);
  });

  it('every line of his names a face too, from his', () => {
    for (const b of KAOS_BANTERS) for (const l of b.lines.filter((x) => x.speaker === HERO_SPEAKER)) expect(HERO_FACES, `${b.id}: ${l.text}`).toContain(l.heroFace);
  });

  it('both places have some, and they move nothing (no reward, no memory: only lines)', () => {
    expect(KAOS_BANTERS.filter((b) => b.place === 'SETTING_OUT').length).toBeGreaterThanOrEqual(4);
    expect(KAOS_BANTERS.filter((b) => b.place === 'HOMECOMING').length).toBeGreaterThanOrEqual(4);
    expect(banterMark('X')).toBe('talk:BANTER_X');
  });
});

describe('when one is said', () => {
  it('not every time: only under the chance', () => {
    expect(banterAt('HOMECOMING', facts(), none, BANTER_CHANCE)).toBeNull();
    expect(banterAt('HOMECOMING', facts(), none, 0.99)).toBeNull();
    expect(banterAt('HOMECOMING', facts(), none, 0)?.place).toBe('HOMECOMING');
  });

  it('each once in a world: heard, the next — then none', () => {
    const heard = new Set<string>();
    const said: string[] = [];
    for (let i = 0; i < 20; i++) {
      const b = banterAt('HOMECOMING', facts({ stage: 'SETTLED', day: 5, forestVisits: 4 }), (m) => heard.has(m), 0);
      if (!b) break;
      said.push(b.id);
      heard.add(banterMark(b.id));
    }
    expect(new Set(said).size).toBe(said.length);
    expect(said.length).toBe(KAOS_BANTERS.filter((b) => b.place === 'HOMECOMING').length);
  });

  it('waits for its time: 「……また森？」 after a few visits to the forest', () => {
    const ids = (f: BanterFacts) => {
      const heard = new Set<string>();
      const out: string[] = [];
      for (let b = banterAt('SETTING_OUT', f, (m) => heard.has(m), 0); b; b = banterAt('SETTING_OUT', f, (m) => heard.has(m), 0)) {
        out.push(b.id);
        heard.add(banterMark(b.id));
      }
      return out;
    };
    expect(ids(facts({ forestVisits: 2 }))).not.toContain('AGAIN_THE_FOREST');
    expect(ids(facts({ forestVisits: 3 }))).toContain('AGAIN_THE_FOREST');
  });

  it('when the signs grow heavy (phase 3), only the serious ones are said', () => {
    const heard = new Set<string>();
    const out: string[] = [];
    const f = facts({ stage: 'SETTLED', phase: 3, day: 9, forestVisits: 9 });
    for (const place of ['SETTING_OUT', 'HOMECOMING'] as const) {
      for (let b = banterAt(place, f, (m) => heard.has(m), 0); b; b = banterAt(place, f, (m) => heard.has(m), 0)) {
        out.push(b.id);
        heard.add(banterMark(b.id));
      }
    }
    for (const id of out) expect(KAOS_BANTERS.find((b) => b.id === id)!.heavy, id).toBe(true);
    expect(out.length).toBeGreaterThan(0);
  });
});
