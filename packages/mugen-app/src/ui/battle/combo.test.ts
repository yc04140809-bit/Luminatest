import { describe, expect, it } from 'vitest';
import type { PartyBeat } from '@mugen/game/battle/partyBattle';
import { NO_COMBO, comboAfter } from './combo';

// COMBO (作者 実機 2026-10-24): shown only; the party's blows add, a creature acting ends it, a broken one's lost turn does not.

const beat = (b: Partial<PartyBeat>): PartyBeat => ({ actor: 'hero', kind: 'ATTACK', target: 'enemy', amount: 10, read: 'PLAIN', ...b });

describe('COMBO', () => {
  it('climbs with each blow the party lands, and adds their damage', () => {
    let c = NO_COMBO;
    c = comboAfter(c, beat({ actor: 'hero', amount: 12 }));
    c = comboAfter(c, beat({ actor: 'kaos', kind: 'MAGIC', amount: 5 }));
    expect(c).toEqual({ hits: 2, damage: 17 });
  });

  it('a move of several blows (重撃・豪断) adds each', () => {
    expect(comboAfter({ hits: 1, damage: 10 }, beat({ actor: 'grave', kind: 'TECH', amount: 30 }), 2)).toEqual({ hits: 3, damage: 40 });
  });

  it('goes on through a broken creature\'s lost turns — the party\'s moment', () => {
    const c = { hits: 4, damage: 80 };
    expect(comboAfter(c, beat({ actor: 'enemy', kind: 'ENEMY_BROKEN', target: 'enemy', amount: 0 }))).toBe(c);
  });

  it('ends when a creature acts; 月影\'s counter on that turn starts the next', () => {
    const c = { hits: 4, damage: 80 };
    expect(comboAfter(c, beat({ actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'hero', amount: 20 }))).toEqual(NO_COMBO);
    expect(comboAfter(c, beat({ actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'hero', amount: 0, missed: true, counter: 9 }))).toEqual({ hits: 1, damage: 9 });
  });

  it('a guard, a mend, a blow on nobody leave it as it was', () => {
    const c = { hits: 3, damage: 40 };
    expect(comboAfter(c, beat({ kind: 'DEFEND', target: 'hero', amount: 0 }))).toBe(c);
    expect(comboAfter(c, beat({ actor: 'kaos', kind: 'MEND', target: 'hero', amount: 30 }))).toBe(c);
  });
});
