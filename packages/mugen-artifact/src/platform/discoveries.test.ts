import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearObtainedItems,
  loadObtainedItems,
  obtainedCount,
  recordObtainedItem,
} from './discoveries';

/** The smallest thing that behaves like localStorage. */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = memoryStorage();
});

describe('obtained items', () => {
  it('starts empty', () => {
    expect(loadObtainedItems()).toEqual([]);
    expect(obtainedCount('FOREST_HERB')).toBe(0);
  });

  it('keeps what was found, in the order it was found', () => {
    recordObtainedItem('FOREST_HERB');
    recordObtainedItem('ROUND_ACORN');
    recordObtainedItem('FOREST_HERB');
    expect(loadObtainedItems().map((e) => e.itemId)).toEqual([
      'FOREST_HERB',
      'ROUND_ACORN',
      'FOREST_HERB',
    ]);
    expect(obtainedCount('FOREST_HERB')).toBe(2);
  });

  it('drops the oldest rather than growing without limit', () => {
    for (let i = 0; i < 260; i++) recordObtainedItem(`ITEM_${i}`);
    const kept = loadObtainedItems();
    expect(kept).toHaveLength(200);
    expect(kept[kept.length - 1].itemId).toBe('ITEM_259');
  });

  it('survives rubbish in storage instead of throwing', () => {
    localStorage.setItem('mugen-zero-discoveries', '{ not json');
    expect(loadObtainedItems()).toEqual([]);
    localStorage.setItem('mugen-zero-discoveries', '[1, null, {"itemId":"OK","at":"x"}]');
    expect(loadObtainedItems().map((e) => e.itemId)).toEqual(['OK']);
  });

  it('works at all with no storage available', () => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    expect(loadObtainedItems()).toEqual([]);
    expect(() => recordObtainedItem('FOREST_HERB')).not.toThrow();
  });

  it('a new world has found nothing', () => {
    recordObtainedItem('FOREST_HERB');
    clearObtainedItems();
    expect(loadObtainedItems()).toEqual([]);
  });
});
