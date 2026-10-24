import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  celebrationForCraft,
  celebrationForDiscovery,
  celebrationForItem,
  type Celebration,
} from '@mugen/content/rewards/celebrate';
import { itemDef } from '@mugen/content/economy/itemDefs';
import { CELEBRATE_MS, COOLDOWN_MS, CelebrateQueue, DEDUPE_MS, MAX_WAITING, MOMENT_MS } from './celebrateQueue';

const first = (id: string) => celebrationForItem(itemDef(id)!, true)!;
const found = (key: string) => celebrationForDiscovery(key, key, true)!;

describe('ハイタッチ: one at a time, never too often', () => {
  let settings: { rewardPopup: boolean };
  let q: CelebrateQueue;
  beforeEach(() => {
    vi.useFakeTimers();
    settings = { rewardPopup: true };
    q = new CelebrateQueue(() => Date.now(), settings);
  });
  afterEach(() => vi.useRealTimers());

  const shownKey = () => q.getShown()?.key ?? null;

  it('shows one, for about a second and a half, then nothing', () => {
    q.push(first('FOREST_HERB'));
    expect(shownKey()).toBeNull();
    vi.advanceTimersByTime(MOMENT_MS);
    expect(shownKey()).toBe('FIRST_ITEM:FOREST_HERB');
    expect(CELEBRATE_MS).toBeGreaterThanOrEqual(1200);
    expect(CELEBRATE_MS).toBeLessThanOrEqual(1800);
    vi.advanceTimersByTime(CELEBRATE_MS);
    expect(q.getShown()).toBeNull();
  });

  it('several at one moment: only the one most worth showing', () => {
    q.push(first('FOREST_HERB'));
    q.push(celebrationForCraft('CRAFT_HERB_BUNDLE', '薬草束', true));
    q.push(found('HERB_PATCH'));
    vi.advanceTimersByTime(MOMENT_MS);
    expect(shownKey()).toBe('DISCOVERY:HERB_PATCH');
    expect(q.pending()).toEqual([]);
  });

  it('one arriving while another shows waits its turn, after a breath', () => {
    q.push(first('FOREST_HERB'));
    vi.advanceTimersByTime(MOMENT_MS);
    q.push(first('FOREST_NUT'));
    vi.advanceTimersByTime(MOMENT_MS);
    expect(shownKey()).toBe('FIRST_ITEM:FOREST_HERB');
    expect(q.pending().map((c) => c.key)).toEqual(['FIRST_ITEM:FOREST_NUT']);
    vi.advanceTimersByTime(CELEBRATE_MS - MOMENT_MS);
    expect(q.getShown()).toBeNull();
    vi.advanceTimersByTime(COOLDOWN_MS);
    expect(shownKey()).toBe('FIRST_ITEM:FOREST_NUT');
  });

  it('the same thing again close together is once', () => {
    const shard = celebrationForItem(itemDef('MANA_SHARD')!, false)!;
    q.push(shard);
    vi.advanceTimersByTime(MOMENT_MS);
    q.push(shard);
    vi.advanceTimersByTime(MOMENT_MS);
    expect(q.pending()).toEqual([]);
    vi.advanceTimersByTime(CELEBRATE_MS + COOLDOWN_MS);
    expect(q.getShown()).toBeNull();
    // Long after: a treat again is a moment again.
    vi.advanceTimersByTime(DEDUPE_MS);
    q.push(shard);
    vi.advanceTimersByTime(MOMENT_MS);
    expect(shownKey()).toBe('RARE:MANA_SHARD');
  });

  it('never more than a few wait; the least worth showing is let go', () => {
    q.push(first('FOREST_HERB'));
    vi.advanceTimersByTime(MOMENT_MS);
    const later: Celebration[] = [first('FOREST_NUT'), first('IRON_ORE'), found('NUT_CACHE')];
    for (const c of later) {
      q.push(c);
      vi.advanceTimersByTime(MOMENT_MS);
    }
    expect(q.pending()).toHaveLength(MAX_WAITING);
    expect(q.pending().map((c) => c.key)).toEqual(['FIRST_ITEM:FOREST_NUT', 'DISCOVERY:NUT_CACHE']);
  });

  it('the screen changing drops what waits and what shows', () => {
    q.push(first('FOREST_HERB'));
    vi.advanceTimersByTime(MOMENT_MS);
    q.push(first('FOREST_NUT'));
    q.clear();
    vi.advanceTimersByTime(5000);
    expect(q.getShown()).toBeNull();
    expect(q.pending()).toEqual([]);
  });

  it('off: nothing at all', () => {
    settings.rewardPopup = false;
    q.push(found('HERB_PATCH'));
    vi.advanceTimersByTime(MOMENT_MS);
    expect(q.getShown()).toBeNull();
  });
});
