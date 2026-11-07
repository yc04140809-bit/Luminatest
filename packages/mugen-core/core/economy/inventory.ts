// THE BAG, AS ARITHMETIC.
//
// No React, no database, no clock: every function here takes a bag and
// gives back a new one. That is deliberate and it is what makes the bag
// testable, undoable and safe to hold in a transaction — the world
// commits the RESULT, so a refused pickup has changed nothing.
//
// Nothing here throws. A bag is player property and the things that go
// wrong with it are ordinary — a full stack, a save from a build that
// knew different items, a quantity that arrived as a string. Every one
// of those has an answer that keeps the player's belongings.

import {
  DEFAULT_MAX_STACK,
  EMPTY_INVENTORY,
  type Inventory,
  type ItemDef,
  type ItemStack,
} from './items';

/** How many of one thing is being held. Nothing held is nought. */
export function getItemCount(inventory: Inventory, itemId: string): number {
  return inventory.find((row) => row.itemId === itemId)?.quantity ?? 0;
}

/** Whether the player has at least this many. */
export function hasItem(inventory: Inventory, itemId: string, quantity = 1): boolean {
  if (quantity <= 0) return true;
  return getItemCount(inventory, itemId) >= quantity;
}

/** How many more of this would go in. */
export function roomFor(inventory: Inventory, def: ItemDef): number {
  const cap = stackCap(def);
  return Math.max(0, cap - getItemCount(inventory, def.itemId));
}

function stackCap(def: ItemDef): number {
  const cap = Math.floor(def.maxStack);
  return Number.isFinite(cap) && cap > 0 ? cap : DEFAULT_MAX_STACK;
}

/** What a change to the bag came to. */
export interface InventoryChange {
  inventory: Inventory;
  /** How many actually moved. Less than asked for is a real answer. */
  moved: number;
}

/**
 * Puts some in, up to what the stack will hold.
 *
 * PARTIAL IS A REAL OUTCOME. Asking to add five when there is room for
 * two adds two and says so, rather than refusing all five or quietly
 * exceeding the cap. A screen that wants all-or-nothing checks
 * `roomFor` first; one that just found something on the ground takes
 * what it can.
 *
 * A new row goes on the END, so the bag reads in the order things were
 * first picked up.
 */
export function addItem(inventory: Inventory, def: ItemDef, quantity = 1): InventoryChange {
  const want = Math.floor(quantity);
  if (!Number.isFinite(want) || want <= 0) return { inventory, moved: 0 };
  const moved = Math.min(want, roomFor(inventory, def));
  if (moved === 0) return { inventory, moved: 0 };
  const at = inventory.findIndex((row) => row.itemId === def.itemId);
  if (at < 0) return { inventory: [...inventory, { itemId: def.itemId, quantity: moved }], moved };
  const next = inventory.map((row, i) =>
    i === at ? { itemId: row.itemId, quantity: row.quantity + moved } : row,
  );
  return { inventory: next, moved };
}

/**
 * Takes some out, and takes the row away when it empties.
 *
 * ALL OR NOTHING, unlike adding — and the asymmetry is on purpose.
 * Spending is a transaction: a shop asked to take three of something
 * and given two has sold at the wrong price, so a request for more
 * than is held removes nothing and reports nought. Finding something is
 * not a transaction, so it takes what fits.
 */
export function removeItem(inventory: Inventory, itemId: string, quantity = 1): InventoryChange {
  const want = Math.floor(quantity);
  if (!Number.isFinite(want) || want <= 0) return { inventory, moved: 0 };
  const held = getItemCount(inventory, itemId);
  if (held < want) return { inventory, moved: 0 };
  const next: ItemStack[] = [];
  for (const row of inventory) {
    if (row.itemId !== itemId) {
      next.push(row);
      continue;
    }
    // An emptied row is GONE rather than kept at nought: a bag showing
    // 「薬草 x0」 is telling the player they have a herb.
    if (row.quantity > want) next.push({ itemId: row.itemId, quantity: row.quantity - want });
  }
  return { inventory: next, moved: want };
}

/**
 * A bag out of a save, whatever the save turns out to hold.
 *
 * ROWS FOR ITEMS THIS BUILD HAS NEVER HEARD OF ARE KEPT. A save written
 * by a build with a herb this one has dropped is a player holding a
 * herb, and forgetting it because the catalogue moved would be taking
 * their property to tidy a table. The row survives; the shop simply
 * cannot price it, which is already how an unsellable thing behaves.
 *
 * Everything else is repaired rather than trusted: duplicate rows are
 * added together (a bag has one row per item, and two is a bug from
 * some older build), quantities are whole and at least one, and
 * anything that is not a row at all is dropped.
 */
export function readInventory(raw: unknown): Inventory {
  if (!Array.isArray(raw)) return EMPTY_INVENTORY;
  const out: ItemStack[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Partial<ItemStack>;
    if (typeof row.itemId !== 'string' || row.itemId === '') continue;
    const quantity = Math.floor(Number(row.quantity));
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const already = out.find((seen) => seen.itemId === row.itemId);
    if (already) already.quantity += quantity;
    else out.push({ itemId: row.itemId, quantity });
  }
  return out;
}
