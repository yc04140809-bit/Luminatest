import { describe, expect, it } from 'vitest';
import {
  MEMORY_ROWS,
  NAME_LIMIT,
  actingSideOf,
  displayName,
  memoryDepth,
  memoryRows,
  turnOrderLine,
  type TurnActor,
} from './battleHud';
import type { BattleArcana } from './battleArcana';

const YOU: TurnActor = { id: 'hero', name: 'あなた', side: 'ALLY' };
const IT: TurnActor = { id: 'moss_rabbit', name: 'モスラビット', side: 'ENEMY' };
const HER: TurnActor = { id: 'kaos', name: 'ケイオス', side: 'ALLY' };
const ARIA: TurnActor = { id: 'aria', name: 'アリア', side: 'ALLY' };

/**
 * TURN ORDER.
 *
 * A strip that has to be true: a player who learns to read it and then
 * finds it was decorative stops reading everything else on the screen.
 */
describe('the turn order strip', () => {
  it('reads left to right, starting from whoever is acting', () => {
    const line = turnOrderLine([YOU, IT], 0, 5);
    expect(line.map((s) => s.actor.name)).toEqual([
      'あなた',
      'モスラビット',
      'あなた',
      'モスラビット',
      'あなた',
    ]);
    expect(line[0].acting).toBe(true);
    expect(line.slice(1).every((s) => !s.acting)).toBe(true);
  });

  it('starts from the creature when it is the creature acting', () => {
    const line = turnOrderLine([YOU, IT], 1, 4);
    expect(line[0].actor.id).toBe('moss_rabbit');
    expect(line[0].acting).toBe(true);
    expect(line[1].actor.id).toBe('hero');
  });

  /**
   * The whole point of a list rather than two drawn faces: a party of
   * three plus a creature is a longer roster and no change to the code.
   */
  it('shows four different faces before it comes round again', () => {
    const line = turnOrderLine([YOU, HER, ARIA, IT], 0, 5);
    expect(line.map((s) => s.actor.id)).toEqual(['hero', 'kaos', 'aria', 'moss_rabbit', 'hero']);
    expect(line.map((s) => s.round)).toEqual([0, 0, 0, 0, 1]);
  });

  it('survives an index that has run off either end of the roster', () => {
    expect(turnOrderLine([YOU, IT], 7, 2)[0].actor.id).toBe('moss_rabbit');
    expect(turnOrderLine([YOU, IT], -1, 2)[0].actor.id).toBe('moss_rabbit');
  });

  it('is nothing at all rather than a crash when there is nobody', () => {
    expect(turnOrderLine([], 0, 5)).toEqual([]);
    expect(turnOrderLine([YOU], 0, 0)).toEqual([]);
  });
});

/**
 * WHOSE TURN THE SCREEN IS DRAWING.
 *
 * Being hit is not a turn of your own: the hero flinching happens
 * during the creature's turn, and a strip that lit the party for it
 * would be pointing at the wrong person at the exact moment the player
 * is looking to see who just hit them.
 */
describe('who is acting', () => {
  it('gives the party its own swing and her spell', () => {
    expect(actingSideOf('STRIKE')).toBe('ALLY');
    expect(actingSideOf('MAGIC')).toBe('ALLY');
    expect(actingSideOf('GUARD')).toBe('ALLY');
  });

  it('gives the creature its charge, its hiding, AND the flinch it caused', () => {
    expect(actingSideOf('TACKLE')).toBe('ENEMY');
    expect(actingSideOf('HIDE')).toBe('ENEMY');
    expect(actingSideOf('HURT')).toBe('ENEMY');
  });

  it('treats nothing playing as the player being next', () => {
    expect(actingSideOf(null)).toBe('ALLY');
    expect(actingSideOf('NONE')).toBe('ALLY');
  });
});

/**
 * NAMES, CUT THE SAME WAY WHEREVER THEY APPEAR.
 *
 * The panels used to leave this to CSS, so a name was cut at whatever
 * width its own panel happened to be — and cut mid-character, with no
 * mark to say anything was missing. 「盗賊 ガル」 does not tell a player
 * whether that is the whole name.
 */
describe('how long a name is allowed to be', () => {
  it('shows a short name exactly as it is', () => {
    expect(displayName('あなた')).toBe('あなた');
    expect(displayName('盗賊 ガルド')).toBe('盗賊 ガルド');
    expect(displayName('モスラビット')).toBe('モスラビット');
  });

  it('shows ten through, and marks the eleventh', () => {
    expect(displayName('あいうえおかきくけこ')).toBe('あいうえおかきくけこ');
    expect(displayName('あいうえおかきくけこさ')).toBe('あいうえおかきくけこ…');
    expect(NAME_LIMIT).toBe(10);
  });

  it('cuts by CHARACTER, not by UTF-16 unit', () => {
    // Each of these is one character and two units. Counting units
    // would cut this in half — and half of one of them is not a
    // character at all, it is a broken glyph.
    const wide = '𠀋𠀋𠀋𠀋𠀋𠀋𠀋𠀋𠀋𠀋';
    expect(displayName(wide)).toBe(wide);
    expect([...displayName(`${wide}𠀋`)]).toHaveLength(11);
    expect(displayName(`${wide}𠀋`).endsWith('…')).toBe(true);
  });

  it('never returns something longer than the rule allows', () => {
    for (const name of ['', 'a', 'アルデン村のパン屋の主人', '盗賊 ガルド', '𠀋'.repeat(40)]) {
      expect([...displayName(name)].length).toBeLessThanOrEqual(NAME_LIMIT + 1);
    }
  });

  it('takes a different limit for a panel with different room', () => {
    expect(displayName('あいうえおかき', 4)).toBe('あいうえ…');
    expect(displayName('あいうえおかき', 0)).toBe('…');
  });
});

/**
 * 記憶の深さ.
 *
 * The average completion of the pages the player has anything of. It
 * has to be the book's own number: a decorative percentage in the
 * corner of a fight is the sort of thing that survives for a year and
 * then turns out to have meant nothing.
 */
describe('how deep the memory runs', () => {
  const page = (progress: number): BattleArcana =>
    ({ arcanaId: `a${progress}`, progress }) as unknown as BattleArcana;

  it('is nothing when the book is empty', () => {
    expect(memoryDepth([])).toBe(0);
  });

  it('is the average of what has been put back together', () => {
    expect(memoryDepth([page(40), page(100)])).toBe(70);
    expect(memoryDepth([page(30), page(30), page(30)])).toBe(30);
  });

  it('is a whole percent, and never outside nought and a hundred', () => {
    expect(memoryDepth([page(33), page(34)])).toBe(34);
    expect(memoryDepth([page(-20), page(180)])).toBe(50);
  });
});

/**
 * THE PANEL'S LINES.
 *
 * Newest first, padded with question marks, and never invented. What is
 * above the question marks came from the world in the world's own
 * words; the question marks are lines the player can still fill.
 */
describe('what the corner panel says', () => {
  it('says nothing but question marks about a world with no memory', () => {
    expect(memoryRows([])).toEqual(['？？？', '？？？', '？？？', '？？？']);
    expect(memoryRows([])).toHaveLength(MEMORY_ROWS);
  });

  it('puts what just happened at the top', () => {
    expect(memoryRows(['はじめ', 'つぎ', 'いま'])).toEqual(['いま', 'つぎ', 'はじめ', '？？？']);
  });

  it('keeps the newest four of a long memory and drops the rest', () => {
    expect(memoryRows(['1', '2', '3', '4', '5', '6'])).toEqual(['6', '5', '4', '3']);
  });

  it('ignores blank lines rather than showing an empty bullet', () => {
    expect(memoryRows(['ある', '   ', ''])).toEqual(['ある', '？？？', '？？？', '？？？']);
  });

  it('fills whatever number of rows it is asked for', () => {
    expect(memoryRows(['ある'], 2)).toEqual(['ある', '？？？']);
    expect(memoryRows(['ある'], 0)).toEqual([]);
  });
});
