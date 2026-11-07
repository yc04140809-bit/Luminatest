import { describe, expect, it } from 'vitest';
import { INITIAL_LUMI, addLumi, canAfford, readLumi, spendLumi } from './lumi';

describe('the purse', () => {
  it('starts at nothing', () => {
    expect(INITIAL_LUMI).toBe(0);
  });

  it('adds up', () => {
    expect(addLumi(0, 30)).toBe(30);
    expect(addLumi(30, 12)).toBe(42);
  });

  it('cannot be paid a negative or a fraction of a LUMI', () => {
    expect(addLumi(10, -5)).toBe(10);
    expect(addLumi(10, 0)).toBe(10);
    expect(addLumi(10, 0.9)).toBe(10);
    expect(addLumi(10, Number.NaN)).toBe(10);
  });

  it('knows what it can pay for', () => {
    expect(canAfford(10, 10)).toBe(true);
    expect(canAfford(10, 11)).toBe(false);
    expect(canAfford(0, 0)).toBe(true);
    expect(canAfford(0, 1)).toBe(false);
  });

  /**
   * THE ONE RULE. A purse that can go below nought is a shop that can
   * be talked into giving credit, and every guard against that lives
   * here rather than in each screen that happens to spend.
   */
  it('never goes below nothing', () => {
    expect(spendLumi(10, 11)).toBeNull();
    expect(spendLumi(0, 1)).toBeNull();
    expect(spendLumi(10, 10)).toBe(0);
    expect(spendLumi(10, 4)).toBe(6);
  });

  it('refuses a price that is not one', () => {
    expect(spendLumi(10, -5)).toBeNull();
    expect(spendLumi(10, Number.NaN)).toBeNull();
  });

  it('reads nothing out of a save that has never heard of it', () => {
    expect(readLumi(undefined)).toBe(0);
    expect(readLumi(null)).toBe(0);
    expect(readLumi('120')).toBe(0);
  });

  it('repairs a saved purse rather than trusting it', () => {
    expect(readLumi(-40)).toBe(0);
    expect(readLumi(12.7)).toBe(12);
    expect(readLumi(Number.NaN)).toBe(0);
  });
});
