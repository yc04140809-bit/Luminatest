import { describe, expect, it } from 'vitest';
import {
  MAX_PARTY,
  PARTY_FORMATIONS,
  partyFormation,
  PROTOTYPE_PLACEMENTS,
  prototypeStyle,
  type SlotPlacement,
} from './formation';

const SIZES = [1, 2, 3, 4] as const;

/**
 * A party slot's drawing order, insisted upon.
 *
 * `depth` is optional on `SlotPlacement` so that the prototype's creature
 * can keep the `z-index: auto` it has always had — but a PARTY slot with
 * no depth would be a party member drawn in an undefined order against
 * the others, which is a bug rather than a choice. Asserting it here is
 * both the check and what lets the comparisons below read a number.
 */
function depthOf(slot: SlotPlacement): number {
  expect(slot.depth, 'every party slot has a drawing order').toBeDefined();
  return slot.depth as number;
}

describe('party formation', () => {
  it('has a place for everybody, at every party size', () => {
    for (const n of SIZES) {
      expect(partyFormation(n)).toHaveLength(n);
    }
  });

  it('draws four at most', () => {
    expect(MAX_PARTY).toBe(4);
    expect(Object.keys(PARTY_FORMATIONS).map(Number).sort()).toEqual([1, 2, 3, 4]);
  });

  /**
   * The one row that is not provisional.
   *
   * These are the numbers the landscape pass settled on for him and
   * her: 25% in and on the ground, and hard against the edge a step
   * back up the path. They were CSS until the party became one drawing,
   * and this is what stops the move from being a redraw.
   */
  it('stands the two of them exactly where the landscape pass put them', () => {
    expect(partyFormation(2)).toEqual([
      { inset: 0.25, bottom: 0.03, depth: 2 },
      { inset: 0.0, bottom: 0.13, depth: 1 },
    ]);
  });

  it('never puts two of them in the same place', () => {
    for (const n of SIZES) {
      const places = partyFormation(n).map((s) => `${s.inset}/${s.bottom}`);
      expect(new Set(places).size).toBe(n);
    }
  });

  it('never gives two of them the same drawing order', () => {
    for (const n of SIZES) {
      const depths = partyFormation(n).map(depthOf);
      expect(new Set(depths).size).toBe(n);
    }
  });

  it('keeps the front rank nearest the enemy and nearest the viewer', () => {
    for (const n of SIZES) {
      const slots = partyFormation(n);
      for (let i = 1; i < slots.length; i += 1) {
        // Further back up the path, and further from the enemy.
        expect(slots[i].inset).toBeLessThan(slots[i - 1].inset);
        expect(slots[i].bottom).toBeGreaterThan(slots[i - 1].bottom);
        expect(depthOf(slots[i])).toBeLessThan(depthOf(slots[i - 1]));
      }
    }
  });

  it('answers a party size it has no row for rather than throwing', () => {
    expect(partyFormation(0)).toHaveLength(1);
    expect(partyFormation(9)).toHaveLength(MAX_PARTY);
  });
});

/**
 * THE FOREST FIGHT'S CAST.
 *
 * These numbers began as the stylesheet's, unchanged, when the
 * prototype stopped being placed by CSS. The BATTLE SCREEN OVERHAUL
 * moved them once and only once, because a share of the field means a
 * different pixel now: the field WAS the middle band of a three-band
 * screen and is now the whole of it, so everybody had to come down out
 * of the panels above and up out of the commands below.
 *
 * The screen is checked at three widths in e2e/battleFormation.spec.ts;
 * this is the same lock without a browser, so a wrong edit is caught in
 * a second rather than a minute.
 */
describe('the prototype cast', () => {
  it('stands where the overhaul stood them', () => {
    expect(PROTOTYPE_PLACEMENTS).toEqual({
      enemy: { edge: 'left', inset: 0.1, bottom: 0.42 },
      enemyDowned: { edge: 'left', inset: 0.06, bottom: 0.36 },
      hero: { edge: 'right', inset: 0.32, bottom: 0.27, depth: 2 },
      kaos: { edge: 'right', inset: 0.14, bottom: 0.33, depth: 1 },
      summon: { edge: 'right', inset: 0.46, bottom: 0.28, depth: 2 },
    });
  });

  /**
   * The band everybody stands in, said as a rule rather than as five
   * numbers: feet clear of the commands along the bottom, heads clear
   * of the turn order and the party column along the top. It is the
   * thing the overhaul is actually asking of this table, and it will
   * still be asking it when the numbers are tuned again.
   */
  it('leaves the corners of the field to the reading', () => {
    for (const [who, place] of Object.entries(PROTOTYPE_PLACEMENTS)) {
      expect(place.bottom, `${who} stands above the commands`).toBeGreaterThanOrEqual(0.26);
      expect(place.bottom, `${who} stands under the panels`).toBeLessThanOrEqual(0.45);
    }
  });

  /** And that the middle of the field is nobody's, which is where the
      fighting is drawn. */
  it('keeps the middle of the field empty', () => {
    for (const [who, place] of Object.entries(PROTOTYPE_PLACEMENTS)) {
      expect(place.inset, `${who} stays on its own side`).toBeLessThan(0.5);
    }
  });

  it('writes a placement as the percentages a stylesheet would have', () => {
    expect(prototypeStyle('enemy')).toEqual({ left: '10%', bottom: '42%' });
    expect(prototypeStyle('enemyDowned')).toEqual({ left: '6%', bottom: '36%' });
    expect(prototypeStyle('hero')).toEqual({ right: '32%', bottom: '27%', zIndex: 2 });
    expect(prototypeStyle('kaos')).toEqual({ right: '14%', bottom: '33%', zIndex: 1 });
    expect(prototypeStyle('summon')).toEqual({ right: '46%', bottom: '28%', zIndex: 2 });
  });

  /**
   * `z-index: auto` and `z-index: 0` are not the same declaration: zero
   * makes a stacking context and auto does not, so anything inside with
   * a z-index of its own would start being measured against the actor
   * instead of the page. The creature had no z-index, and a style object
   * that carries `zIndex: 0` would quietly give it one.
   */
  it('gives the creature no z-index at all, rather than a zero', () => {
    expect('zIndex' in prototypeStyle('enemy')).toBe(false);
    expect('zIndex' in prototypeStyle('enemyDowned')).toBe(false);
  });

  it('measures each actor from its own side of the field', () => {
    expect('right' in prototypeStyle('enemy')).toBe(false);
    expect('left' in prototypeStyle('hero')).toBe(false);
    expect('left' in prototypeStyle('kaos')).toBe(false);
  });

  it('keeps the summon in front of the two of them and clear of the creature', () => {
    // Same edge as the party, further in than the hero: it stands
    // between them and the fight rather than beside either.
    expect(PROTOTYPE_PLACEMENTS.summon.edge).toBe(PROTOTYPE_PLACEMENTS.hero.edge);
    expect(PROTOTYPE_PLACEMENTS.summon.inset).toBeGreaterThan(PROTOTYPE_PLACEMENTS.hero.inset);
    expect(PROTOTYPE_PLACEMENTS.summon.bottom).toBeLessThan(PROTOTYPE_PLACEMENTS.enemy.bottom);
  });

  it('lays the beaten creature lower and further into the grass than it stood', () => {
    expect(PROTOTYPE_PLACEMENTS.enemyDowned.bottom).toBeLessThan(PROTOTYPE_PLACEMENTS.enemy.bottom);
    expect(PROTOTYPE_PLACEMENTS.enemyDowned.inset).toBeLessThan(PROTOTYPE_PLACEMENTS.enemy.inset);
    expect(PROTOTYPE_PLACEMENTS.enemyDowned.edge).toBe(PROTOTYPE_PLACEMENTS.enemy.edge);
  });
});
