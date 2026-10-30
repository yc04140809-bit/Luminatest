import { describe, it, expect } from 'vitest';
import { memoryMeta, PERSON_WORDS, PLACE_WORDS, WEIGHT_WORDS } from './memoryWords';

describe('a WORLD MEMORY card in the player’s words (タスクB)', () => {
  const names = { PLAYER: 'ノエル', GALD: '盗賊' };

  it('where, who and how much — never an id', () => {
    const parts = memoryMeta({ location: 'GREENWOOD_FOREST', actors: ['PLAYER', 'GALD'], importance: 'MAJOR' }, names);
    expect(parts).toEqual([
      { kind: 'where', text: 'グリーンウッドの森' },
      { kind: 'who', text: 'ノエル・盗賊' },
      { kind: 'weight', text: '大きな出来事' },
    ]);
  });

  it('anything not written in the table is left out, not shown as itself', () => {
    const parts = memoryMeta({ location: 'WORLD', actors: ['WORLD', 'IND-43452DFD'], importance: 'NORMAL' }, names);
    expect(parts).toEqual([]);
    const some = memoryMeta({ location: 'UNKNOWN', actors: ['PLAYER', 'IND-1'], importance: 'AMBIENT' }, names);
    expect(some).toEqual([{ kind: 'who', text: 'ノエル' }]);
  });

  it('Gald is the 盗賊 until the screen knows him by his name', () => {
    expect(PERSON_WORDS.GALD).toBe('盗賊');
    expect(memoryMeta({ location: 'GREENWOOD_GRAVE', actors: ['PLAYER', 'GALD'], importance: 'MAJOR' }, { PLAYER: 'A', GALD: 'ガルド' })[1].text).toBe('A・ガルド');
  });

  it('no word in the tables is an id', () => {
    for (const w of [...Object.values(PLACE_WORDS), ...Object.values(PERSON_WORDS), ...Object.values(WEIGHT_WORDS)]) expect(w).not.toMatch(/[A-Z_]{3,}/);
  });
});
