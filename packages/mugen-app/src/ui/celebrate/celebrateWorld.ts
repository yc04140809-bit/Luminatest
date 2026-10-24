import type { World } from '@mugen/core/world/world';
import { itemDef } from '@mugen/content/economy/itemDefs';
import {
  celebrationForCraft,
  celebrationForDiscovery,
  celebrationForItem,
  craftMark,
  discoveryMark,
  gotMark,
} from '@mugen/content/rewards/celebrate';
import { showCelebratePopup } from './celebrateQueue';

/**
 * ハイタッチ, FROM WHAT HAPPENED IN THE WORLD: whether a moment is worth it
 * (content/rewards/celebrate.ts) and remembering that it was had (a read
 * mark, once — no new save row). Each is called right after the thing is
 * in the bag / made / seen.
 */

/**
 * Something went into the bag. `before`: how many were held just before —
 * a thing already held (an old save, before these marks) is not a first.
 */
export function celebrateGain(world: World, itemId: string, before: number): void {
  const def = itemDef(itemId);
  if (!def) return;
  const mark = gotMark(itemId);
  const first = before === 0 && !world.isRead(mark);
  if (!world.isRead(mark)) void world.markRead([mark]).catch(() => {});
  showCelebratePopup(celebrationForItem(def, first));
}

/** One of Grave's handworks made (and what it made, which may be a first too). */
export function celebrateCraft(world: World, craftId: string, name: string): void {
  const mark = craftMark(craftId);
  const first = !world.isRead(mark);
  if (first) void world.markRead([mark]).catch(() => {});
  showCelebratePopup(celebrationForCraft(craftId, name, first));
}

/** Something seen for the first time: a golden find, a new kind of creature. */
export function celebrateDiscovery(world: World, key: string, name: string): void {
  const mark = discoveryMark(key);
  const first = !world.isRead(mark);
  if (first) void world.markRead([mark]).catch(() => {});
  showCelebratePopup(celebrationForDiscovery(key, name, first));
}
