// What the player has picked up while exploring.
//
// Deliberately NOT world state. It lives in localStorage beside the
// settings, never in IndexedDB, and never becomes a MEMORY_EVENT — the
// world does not remember that somebody found an acorn, and the counts
// on HOME must not move because of one.
//
// It is also deliberately not an inventory system. There is nothing to
// spend, equip or carry yet; this is the smallest honest record of
// "these were found", so that the find is not thrown away the moment
// the card closes and a real inventory has something to read later.

const STORAGE_KEY = 'mugen-zero-discoveries';
/** Old finds fall off the end rather than growing without limit. */
const MAX_KEPT = 200;

export interface ObtainedItem {
  itemId: string;
  /** ISO timestamp. Real time, not world time: this is not world truth. */
  at: string;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Private mode / blocked storage.
    return null;
  }
}

/** Everything found so far, oldest first. Never throws. */
export function loadObtainedItems(): ObtainedItem[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is ObtainedItem =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as ObtainedItem).itemId === 'string' &&
        typeof (entry as ObtainedItem).at === 'string',
    );
  } catch {
    return [];
  }
}

/** Adds one find and returns the new list. Never throws. */
export function recordObtainedItem(itemId: string, at: Date = new Date()): ObtainedItem[] {
  const next = [...loadObtainedItems(), { itemId, at: at.toISOString() }].slice(-MAX_KEPT);
  const store = storage();
  if (store) {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Full or blocked: the card was still shown, which is the point.
    }
  }
  return next;
}

/** How many of one thing has been found. */
export function obtainedCount(itemId: string): number {
  return loadObtainedItems().filter((entry) => entry.itemId === itemId).length;
}

/** RESET WORLD clears these too: a new world has found nothing. */
export function clearObtainedItems(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}
