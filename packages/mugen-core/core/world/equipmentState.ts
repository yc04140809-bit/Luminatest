import {
  EQUIPMENT_SLOTS,
  weaponDefOf,
  type EquipmentSlot,
} from '../../content/equipment/equipment';
import { canEquip } from '../../content/equipment/equipResolve';

// WHAT IS SAVED ABOUT EQUIPMENT, AND NOTHING MORE.
//
// TWO ROWS, NOT ONE, because they answer two questions: what somebody
// is WEARING and what they OWN. A build that dropped a sword should
// forget that it was equipped and keep the fact that it was owned —
// fold them together and losing one loses the other.
//
// NO SCHEMA CHANGE. `saveSchema.ts` states the rule: "A missing field
// is not a migration… a save from before a feature existed needs no
// step at all." A save written before equipment existed has neither
// row, which reads as nothing equipped and nothing owned. SAVE_VERSION
// does not move and no migration step was written.
//
// NOT ONE NUMBER IS STORED. A row holds ids and counts. Rebalance a
// sword and every save is already correct, exactly as changing an
// item's price already leaves every bag correct.

/** Equipped ids by slot, by character. */
export type EquipmentTable = Record<string, Partial<Record<EquipmentSlot, string>>>;

/** How many of each equipment id is owned. */
export type OwnedTable = Record<string, number>;

const isSlot = (key: string): key is EquipmentSlot =>
  (EQUIPMENT_SLOTS as readonly string[]).includes(key);

/**
 * Equipment out of a save, repaired.
 *
 * NEVER FAILS, and drops anything it cannot honestly read: an id this
 * build has never heard of, a slot that does not exist, or a weapon
 * the character is not allowed to hold. The last one matters — a save
 * written when the rules were looser must not leave somebody holding
 * a sword they could never equip now.
 *
 * A DROPPED EQUIP IS NOT A DROPPED ITEM. This only forgets that the
 * thing was worn; `readOwned` keeps it in the bag, so the equipment
 * coming back means it can be put on again.
 */
export function readEquipment(raw: unknown): { value: EquipmentTable; health: 'ok' | 'repaired' } {
  if (raw === undefined) return { value: {}, health: 'ok' };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { value: {}, health: 'repaired' };
  }
  const out: EquipmentTable = {};
  let changed = false;
  for (const [characterId, slots] of Object.entries(raw as Record<string, unknown>)) {
    if (!characterId || !slots || typeof slots !== 'object' || Array.isArray(slots)) {
      changed = true;
      continue;
    }
    const kept: Partial<Record<EquipmentSlot, string>> = {};
    for (const [slot, id] of Object.entries(slots as Record<string, unknown>)) {
      if (!isSlot(slot) || typeof id !== 'string') {
        changed = true;
        continue;
      }
      const weapon = weaponDefOf(id);
      // Unknown to this build, wrong slot, or not theirs to hold.
      if (!weapon || weapon.slot !== slot || !canEquip(characterId, weapon)) {
        changed = true;
        continue;
      }
      kept[slot] = id;
    }
    if (Object.keys(kept).length > 0) out[characterId] = kept;
  }
  return { value: out, health: changed ? 'repaired' : 'ok' };
}

/** What is owned, out of a save, repaired. */
export function readOwned(raw: unknown): { value: OwnedTable; health: 'ok' | 'repaired' } {
  if (raw === undefined) return { value: {}, health: 'ok' };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { value: {}, health: 'repaired' };
  }
  const out: OwnedTable = {};
  let changed = false;
  for (const [id, count] of Object.entries(raw as Record<string, unknown>)) {
    const n = Math.floor(Number(count));
    if (!id || !Number.isFinite(n) || n <= 0) {
      changed = true;
      continue;
    }
    // An id this build does not know is KEPT rather than dropped: it
    // belongs to a newer build, and an older one has no business
    // eating somebody's possessions.
    out[id] = n;
  }
  return { value: out, health: changed ? 'repaired' : 'ok' };
}
