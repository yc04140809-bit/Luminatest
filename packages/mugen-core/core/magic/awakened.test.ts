import { describe, it, expect } from 'vitest';
import { kaosHasAwakened } from './awakened';

describe('whether she has done this before', () => {
  it('is no in a world where nothing has happened', () => {
    expect(kaosHasAwakened([])).toBe(false);
    expect(kaosHasAwakened(['PLAYER_MET_A_MOSS_RABBIT'])).toBe(false);
  });

  it('is yes once the world remembers what became of Gald, whichever it was', () => {
    // She steps forward during that fight, and the only way past that
    // fight is one of these four. So the fact is already recorded.
    for (const type of [
      'PLAYER_KILLED_GALD',
      'PLAYER_SPARED_GALD',
      'PLAYER_HELPED_GALD',
      'PLAYER_CAPTURED_GALD',
    ]) {
      expect(kaosHasAwakened([type]), type).toBe(true);
    }
  });

  it('finds it among everything else the world remembers', () => {
    expect(kaosHasAwakened(['A', 'B', 'PLAYER_SPARED_GALD', 'C'])).toBe(true);
  });

  it('needs no new key in the save, which is the point', () => {
    // A save written before any of this existed still answers correctly,
    // because the answer was already in it.
    expect(kaosHasAwakened(['PLAYER_SPARED_GALD'])).toBe(true);
  });
});
