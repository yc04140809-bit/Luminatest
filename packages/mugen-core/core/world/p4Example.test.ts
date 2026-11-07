import { describe, it, expect } from 'vitest';
import type { MemoryEvent } from '../memory/types';
import { findDueLifeEvents, resolveDueLifeEvents, type BloomPossible } from '../events/eventEngine';
import { bloomCheckAt, bloomPossible } from '../life/worldReading';
import { GALD_SAVES_LINA_DEF, LIFE_TICK_DEFS, RIZEL_TENDS_GALD_DEF } from '../../content/events/offScreenLife';

/**
 * 選考資料 P4「条件 → 行動」の実例（docs/TIGS2027_BUILD.md、作者 2026-10-20）.
 *
 * The page says: the player treated Gald → it stays in WORLD MEMORY → a
 * seed 「借りを返さねばならない」 grows in him → with the treatment on record,
 * a night gone by, and him not yet on the road → the next night he stands
 * in front of リナ → リゼル, who saw it, is left with 「ただの盗賊じゃないの
 * かもしれない」 → and that is what lets her bind his wounds.
 *
 * Every condition the page names is a real one: take any of them away and
 * the event does not happen. And the page names no condition the code does
 * not have (リナ being in danger is the event's description, not a rule).
 */

const event = (type: MemoryEvent['type'], worldDay: number, actors: string[]): MemoryEvent => ({
  id: `evt_${type.toLowerCase()}`,
  type,
  worldYear: 1,
  worldDay,
  location: 'GREENWOOD_FOREST',
  actors,
  importance: 'MAJOR',
  createdAt: 'x',
});

const treated = event('PLAYER_HELPED_GALD', 1, ['PLAYER', 'GALD']);
const nextDay = { worldYear: 1, worldDay: 2 };

/** What comes due, asking the people the way the world does. */
const due = (events: MemoryEvent[], at = nextDay, possible: BloomPossible = bloomPossible) =>
  findDueLifeEvents(LIFE_TICK_DEFS, events, at, possible).map((d) => d.def.type);

describe('P4: ガルドがリナを庇う — the conditions on the page, and only those', () => {
  it('the rule is exactly the four lines on the page', () => {
    expect(GALD_SAVES_LINA_DEF.requiredMemory).toBe('PLAYER_HELPED_GALD');
    expect(GALD_SAVES_LINA_DEF.minElapsedDays).toBe(1);
    expect(GALD_SAVES_LINA_DEF.unless).toEqual(['GALD_WALKS_THE_ROAD']);
    expect(GALD_SAVES_LINA_DEF.bloom).toBe('GALD_WOULD_STAND_FOR_SOMEONE');
    // The seed condition, as the life engine words it.
    const check = bloomCheckAt('GALD_WOULD_STAND_FOR_SOMEONE', [treated], nextDay)!;
    expect(check.reasons.map((r) => r.requirement)).toEqual(['seed GALD_REDEMPTION ≥ GROWING']);
    expect(check.met).toBe(true);
  });

  it('all four hold → the next night, at the forest edge, he stands in front of her', () => {
    expect(due([treated])).toContain('GALD_SAVES_LINA');
    const [saved] = resolveDueLifeEvents(LIFE_TICK_DEFS, [treated], nextDay, () => 'x', bloomPossible)
      .map((r) => r.event)
      .filter((e) => e.type === 'GALD_SAVES_LINA');
    expect(saved.worldDay).toBe(2);
    expect(saved.location).toBe('GREENWOOD_FOREST');
    expect(saved.actors).toEqual(['GALD', 'LINA', 'RIZEL']);
  });

  it('not treated (let go instead) → it never happens, and no 「借りを返さねばならない」 grows in him', () => {
    const spared = { ...treated, type: 'PLAYER_SPARED_GALD' as const };
    expect(due([spared], { worldYear: 1, worldDay: 30 })).not.toContain('GALD_SAVES_LINA');
    expect(bloomCheckAt('GALD_WOULD_STAND_FOR_SOMEONE', [spared], nextDay)!.met).toBe(false);
  });

  it('no night gone by yet → not yet', () => {
    expect(due([treated], { worldYear: 1, worldDay: 1 })).not.toContain('GALD_SAVES_LINA');
  });

  it('already out on the road → not at the forest edge', () => {
    const road = event('GALD_WALKS_THE_ROAD', 1, ['GALD']);
    expect(due([treated, road])).not.toContain('GALD_SAVES_LINA');
  });

  it('the seed is not there to ask → it does not happen, whatever else holds', () => {
    const withoutTheSeed: BloomPossible = (id, events, at) =>
      id !== 'GALD_WOULD_STAND_FOR_SOMEONE' && bloomPossible(id, events, at);
    expect(due([treated], nextDay, withoutTheSeed)).not.toContain('GALD_SAVES_LINA');
  });
});

describe('P4: リゼルが手当てする — what she saw is the condition', () => {
  const saved = event('GALD_SAVES_LINA', 2, ['GALD', 'LINA', 'RIZEL']);

  it('the rule: his standing in front of リナ on record, the same day, and what it left in her', () => {
    expect(RIZEL_TENDS_GALD_DEF.requiredMemory).toBe('GALD_SAVES_LINA');
    expect(RIZEL_TENDS_GALD_DEF.minElapsedDays).toBe(0);
    expect(RIZEL_TENDS_GALD_DEF.bloom).toBe('RIZEL_SEES_GALD_DIFFERENTLY');
    const check = bloomCheckAt('RIZEL_SEES_GALD_DIFFERENTLY', [treated, saved], nextDay)!;
    expect(check.reasons.map((r) => r.requirement)).toEqual(['seed SEEN_DIFFERENTLY ≥ DORMANT']);
    expect(check.met).toBe(true);
    expect(due([treated, saved])).toContain('RIZEL_TENDS_GALD');
  });

  it('she was not there to see it → nothing is left in her, and she does not bind his wounds', () => {
    const unseen = { ...saved, actors: ['GALD', 'LINA'] };
    expect(bloomCheckAt('RIZEL_SEES_GALD_DIFFERENTLY', [treated, unseen], nextDay)!.met).toBe(false);
    expect(due([treated, unseen])).not.toContain('RIZEL_TENDS_GALD');
  });
});
