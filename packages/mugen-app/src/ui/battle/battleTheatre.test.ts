import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as theatre from './battleTheatre';
import { createBattle, playerAttack } from '@mugen/game/battle/battleLogic';
import { specOf } from '@mugen/game/battle/enemySpec';
import { MOSS_RABBIT } from '@mugen/content/enemies/species';

/**
 * THE SAME TEMPO AS THE ARTIFACT.
 *
 * The Artifact's battle screen keeps its timings as private constants.
 * This reads them out of its source and holds the App's copies equal,
 * so a change to how long a swing lasts over there fails here until it
 * is made here too.
 */
const source = readFileSync(
  fileURLToPath(new URL('../../../../mugen-artifact/src/ui/battle/BattleUIPrototype.tsx', import.meta.url)),
  'utf8',
);

function constant(name: string): number {
  const m = source.match(new RegExp(`const ${name} = ([0-9.]+);`));
  if (!m) throw new Error(`${name} not found in the Artifact's battle screen`);
  return Number(m[1]);
}

function table(name: string): Record<string, number> {
  const m = source.match(new RegExp(`const ${name}: Record<string, number> = \\{([\\s\\S]*?)\\n\\};`));
  if (!m) throw new Error(`${name} not found in the Artifact's battle screen`);
  const out: Record<string, number> = {};
  for (const row of m[1].matchAll(/^\s*([A-Z]+): ([0-9]+),/gm)) out[row[1]] = Number(row[2]);
  return out;
}

describe('battle theatre timings', () => {
  it('holds each beat as long as the Artifact does', () => {
    expect(theatre.BEAT_MS).toEqual(table('BEAT_MS'));
    expect(theatre.BEAT_MIN_MS).toEqual(table('BEAT_MIN_MS'));
  });

  for (const name of [
    'KNOCKDOWN_MS',
    'DEFEAT_WAIT_MS',
    'VICTORY_WAIT_MS',
    'HIT_FX_MS',
    'HIT_FX_FLOOR_MS',
    'CONTACT_AT',
    'REACTION_LAG_MS',
    'SAY_HOLD_MS',
  ] as const) {
    it(`${name} is the Artifact's`, () => {
      expect(theatre[name]).toBe(constant(name));
    });
  }

  it('never lets ×2 make a beat unreadably short', () => {
    for (const step of Object.keys(theatre.BEAT_MS)) {
      expect(theatre.beatLength(step, 2)).toBeGreaterThanOrEqual(theatre.BEAT_MIN_MS[step]);
      expect(theatre.beatLength(step, 2)).toBeLessThanOrEqual(theatre.beatLength(step, 1));
    }
  });
});

/**
 * THE KILLING BLOW HAS NO ANSWER.
 *
 * The core carries the previous turn's enemy action forward when a blow
 * finishes the creature, so a screen that reads it alone shows a
 * counter-attack that never happened. The theatre must not.
 */
describe('what the creature did this turn', () => {
  it('answers an ordinary turn, and not the one that beat it', () => {
    let state = createBattle(specOf(MOSS_RABBIT), () => 0.5);
    let sawAnAnswer = false;
    for (let i = 0; i < 100 && state.outcome === 'ONGOING'; i++) {
      const next = playerAttack(state, () => 0.5);
      if (next.outcome === 'ONGOING' && next.lastEnemyAction === 'ATTACK') {
        expect(theatre.answerOf(next)).toEqual(['TACKLE', 'HURT']);
        sawAnAnswer = true;
      }
      if (next.outcome === 'VICTORY') {
        // The field still says what it said last turn…
        expect(next.lastEnemyAction).toBe(state.lastEnemyAction);
        // …and the theatre does not replay it.
        expect(theatre.answerOf(next)).toEqual([]);
        expect(theatre.answered(next)).toBe(false);
      }
      state = next;
    }
    expect(state.outcome).toBe('VICTORY');
    expect(sawAnAnswer).toBe(true);
  });
});
