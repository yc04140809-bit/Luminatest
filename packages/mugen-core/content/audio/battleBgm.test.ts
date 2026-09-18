import { describe, expect, it } from 'vitest';
import {
  BATTLE_BGM_IDS,
  DEFAULT_BATTLE_BGM,
  battleBgmLabel,
  isBattleBgm,
  nextBattleBgm,
} from './battleBgm';
import { BGM_ASSETS } from '@mugen/assets';

/**
 * THE FIGHTING MUSIC, AND ROOM FOR MORE OF IT.
 *
 * One piece is registered — 通常戦闘① — and the ① in its own title says
 * what is coming. Everything here is written so that the day a second
 * one is added, the only change is a line in the list: the control, the
 * saved choice, the cycling order and the fallback all read it.
 */
describe('the list of fighting music', () => {
  it('is never empty, because a fight has to sound like something', () => {
    expect(BATTLE_BGM_IDS.length).toBeGreaterThan(0);
    expect(DEFAULT_BATTLE_BGM).toBe(BATTLE_BGM_IDS[0]);
  });

  it('names only pieces the game actually has', () => {
    for (const id of BATTLE_BGM_IDS) {
      expect(id in BGM_ASSETS, id).toBe(true);
      expect(BGM_ASSETS[id], `${id} has a file`).toBeTruthy();
    }
  });

  it('knows one of its own from anything else', () => {
    expect(isBattleBgm(DEFAULT_BATTLE_BGM)).toBe(true);
    expect(isBattleBgm('ALDEN_VILLAGE')).toBe(false);
    expect(isBattleBgm('NORMAL_BATTLE_Z')).toBe(false);
    expect(isBattleBgm(null)).toBe(false);
    expect(isBattleBgm(undefined)).toBe(false);
    expect(isBattleBgm('')).toBe(false);
  });
});

describe('pressing ♪', () => {
  /**
   * With one piece registered, pressing it returns the same piece —
   * and that is the correct answer rather than a special case. The
   * player presses, nothing changes, nothing breaks, and the day a
   * second piece is added the same press starts doing something.
   */
  it('moves to the next one, and comes round again', () => {
    let at: string = DEFAULT_BATTLE_BGM;
    const seen = new Set<string>();
    for (let i = 0; i < BATTLE_BGM_IDS.length; i++) {
      seen.add(at);
      at = nextBattleBgm(at);
    }
    expect(seen.size).toBe(BATTLE_BGM_IDS.length);
    expect(at).toBe(DEFAULT_BATTLE_BGM); // all the way round
  });

  it('always lands on something playable, whatever it was handed', () => {
    for (const junk of [null, undefined, '', 'ALDEN_VILLAGE', 'NORMAL_BATTLE_Z']) {
      expect(isBattleBgm(nextBattleBgm(junk)), String(junk)).toBe(true);
    }
  });
});

describe('what the control says', () => {
  it('counts rather than names: the titles are long and the chip is small', () => {
    expect(battleBgmLabel(DEFAULT_BATTLE_BGM)).toBe(`1/${BATTLE_BGM_IDS.length}`);
  });

  /** 1/1 also tells a player who pressed it why nothing happened. */
  it('reads as the first of however many there are, for an unknown choice', () => {
    expect(battleBgmLabel(null)).toBe(`1/${BATTLE_BGM_IDS.length}`);
    expect(battleBgmLabel('ALDEN_VILLAGE')).toBe(`1/${BATTLE_BGM_IDS.length}`);
  });
});
