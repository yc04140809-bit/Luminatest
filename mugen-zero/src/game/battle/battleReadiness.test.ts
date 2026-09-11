// WHAT THE BATTLE MUST NOT LEARN.
//
// Three claims that are easy to make in a design round and easy to
// quietly break in the round after it. None of them is about what the
// fight DOES — they are about what it knows, and a thing that knows
// nothing about speed cannot be made wrong by speed.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beatMs, BATTLE_SPEEDS, type BattleSpeed } from './battleSpeed';
import { createBattle, castMagic, playerAttack, playerDefend, type EnemySpec } from './battleLogic';
import { decideTurn } from './magicChoice';
import { MAGIC_DEFS } from '../../content/magic/magicDefs';
import { partyFormation, MAX_PARTY } from '../../ui/battle/formation';

const here = join(__dirname);
const rngMid = () => 0.5;
const DUMMY: EnemySpec = { name: 'かかし', hp: 120, attackMin: 4, attackMax: 6 };

describe('D. how fast it is shown is not part of what happens', () => {
  it('never reaches the battle at all', () => {
    // Read rather than reasoned about: the moment the fight imports
    // anything about speed, a build that runs at twice speed is a
    // different game from one that does not, and no amount of careful
    // arithmetic downstream can put that back.
    const source = readFileSync(join(here, 'battleLogic.ts'), 'utf8');
    expect(source).not.toMatch(/battleSpeed/);
    expect(source).not.toMatch(/\bspeed\b/);
  });

  it('is the same fight at every speed, blow for blow', () => {
    const runs = BATTLE_SPEEDS.map(() => {
      let state = createBattle(DUMMY, undefined, { magicUnlocked: true });
      for (let i = 0; i < 6; i++) {
        state = i % 3 === 0 ? playerDefend(state, rngMid, 'ATTACK') : playerAttack(state, rngMid, 'ATTACK');
      }
      return state;
    });
    for (const run of runs) {
      expect(run.enemyHp).toBe(runs[0].enemyHp);
      expect(run.playerHp).toBe(runs[0].playerHp);
      expect(run.log).toEqual(runs[0].log);
    }
  });

  it('shortens the theatre and nothing else, and never to nothing', () => {
    expect(beatMs(400, 1)).toBe(400);
    expect(beatMs(400, 2)).toBeLessThan(400);
    for (const speed of [1, 2, 3] as BattleSpeed[]) {
      expect(beatMs(0, speed)).toBe(0);
      expect(beatMs(120, speed)).toBeGreaterThan(0);
    }
  });
});

describe('C. an unattended player presses the buttons a player would', () => {
  it('only ever answers with one of the three things a player can do', () => {
    // There is no fourth action reachable from AUTO. If a plan ever
    // comes back naming something the command row cannot do, AUTO has
    // started being a second battle system.
    let state = createBattle(DUMMY, undefined, { magicUnlocked: true });
    const seen = new Set<string>();
    for (let i = 0; i < 30 && state.outcome === 'ONGOING'; i++) {
      const plan = decideTurn(state, MAGIC_DEFS);
      expect(['ATTACK', 'MAGIC', 'GUARD']).toContain(plan.action);
      seen.add(plan.action);
      if (plan.action === 'MAGIC') {
        const spell = MAGIC_DEFS.find((m) => m.id === plan.magicId);
        expect(spell, plan.magicId ?? 'none').toBeDefined();
        state = castMagic(state, spell!, rngMid, 'ATTACK');
      } else if (plan.action === 'GUARD') {
        state = playerDefend(state, rngMid, 'ATTACK');
      } else {
        state = playerAttack(state, rngMid, 'ATTACK');
      }
    }
    // And it is not one button held down: a fight it plays out uses
    // more than a single answer.
    expect(seen.size).toBeGreaterThan(1);
  });

  it('decides from the fight and nothing else, so the same fight decides the same', () => {
    const state = createBattle(DUMMY, undefined, { magicUnlocked: true });
    expect(decideTurn(state, MAGIC_DEFS)).toEqual(decideTurn(state, MAGIC_DEFS));
  });

  it('never plans a spell she cannot pay for', () => {
    const broke = { ...createBattle(DUMMY, undefined, { magicUnlocked: true }), playerMp: 0 };
    const plan = decideTurn(broke, MAGIC_DEFS);
    expect(plan.magicId).toBeNull();
  });
});

describe('E. a party that is going to grow', () => {
  it('has somewhere to stand for one through four, today', () => {
    for (let count = 1; count <= MAX_PARTY; count++) {
      expect(partyFormation(count), `${count}`).toHaveLength(count);
    }
  });

  it('draws nobody off the field, however many there are', () => {
    for (let count = 1; count <= MAX_PARTY; count++) {
      for (const slot of partyFormation(count)) {
        expect(slot.inset).toBeGreaterThanOrEqual(0);
        expect(slot.inset).toBeLessThan(1);
        expect(slot.bottom).toBeGreaterThanOrEqual(0);
        expect(slot.bottom).toBeLessThan(1);
      }
    }
  });

  it('keeps the front of the party in front of the back of it', () => {
    // Depth is what makes four people read as a formation rather than
    // a row, and getting it backwards puts the hero behind everybody.
    for (let count = 2; count <= MAX_PARTY; count++) {
      const depths = partyFormation(count).map((slot) => slot.depth);
      expect(new Set(depths).size, `${count}`).toBe(count);
    }
  });
});
