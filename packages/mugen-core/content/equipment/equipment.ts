import type { WeaponType } from '../characters/battleProfiles';

// WHAT SOMEBODY IS CARRYING.
//
// THE SAME SPLIT AS EVERYTHING ELSE IN THIS CODEBASE, for the same
// reason: `EquipmentDef` is a fact about the WORLD — what a sword is —
// and `CharacterEquipment` is a fact about the PLAYER — that they have
// it on. The first is content and never saved, the second is a save
// row holding ids and nothing else. Rebalance a sword and every save
// in existence is already correct, because no save ever recorded a
// number about it.
//
// EQUIPMENT IS NOT A SKIN. Equipment is battle data that may one day
// carry a correction; a skin changes the picture and can never carry
// one. Neither crosses, which is why equipment holds no image and a
// skin holds no number.

/**
 * Where a thing goes.
 *
 * All four exist from the start so the screen can show what is coming,
 * but only the weapon can be operated — the rest have no definitions
 * and no handler, and that is what `OPERABLE_SLOTS` says out loud
 * rather than leaving to a comment.
 */
export type EquipmentSlot = 'WEAPON' | 'OUTFIT' | 'ACCESSORY_1' | 'ACCESSORY_2';

export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  'WEAPON',
  'OUTFIT',
  'ACCESSORY_1',
  'ACCESSORY_2',
];

/** What a player may actually change today. */
export const OPERABLE_SLOTS: readonly EquipmentSlot[] = ['WEAPON'];

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  WEAPON: '武器',
  OUTFIT: '衣装',
  ACCESSORY_1: 'アクセサリ1',
  ACCESSORY_2: 'アクセサリ2',
};

/**
 * What a piece of equipment could do, when anything is allowed to.
 *
 * ZERO TODAY, EVERY FIELD, AND DELIBERATELY. The shape exists so that
 * a corrective weapon is a data change rather than a migration — but
 * the battle does not read this yet, and until it does a non-zero
 * value would put a number on the screen that the fight ignores.
 * Showing a correction that does not apply is the screen lying, so the
 * guard below refuses to let one be written.
 */
export interface EquipmentEffect {
  /** Added to both ends of the attack range. */
  attack: number;
  /** For the day 魔力 exists. It does not. */
  magic: number;
}

export const NO_EFFECT: EquipmentEffect = { attack: 0, magic: 0 };

interface EquipmentBase {
  equipmentId: string;
  name: string;
  slot: EquipmentSlot;
  /** Two lines at most: this is read standing up, in a forest. */
  description: string;
  effect: EquipmentEffect;
}

/**
 * A WEAPON IS ONE OF TWO THINGS, and they are not the same shape.
 *
 * THIS IS WHERE THE CANON CONFLICT LANDS. The brief calls Kaos's
 * weapon type 「MAGIC」, but `MAGIC` is a BattleStyle and has never
 * been a WeaponType — those are 長剣, 二刀短剣, 槍 and 弓, and
 * `WEAPON_CANON` leaves Kaos out on purpose because 魔法 is how she
 * fights rather than a thing in her hands.
 *
 * So rather than widen `WeaponType` and make 「魔法の剣」 expressible,
 * a weapon is a union: a PHYSICAL one carries a weapon type, a MAGIC
 * one carries none because it has none. The grimoire is a focus for
 * the magic she already has — it does not give her a weapon type and
 * it does not change her battle style, exactly as the brief asks.
 *
 * Optional fields would have been the other way to write this, and
 * would have made a physical weapon with no weapon type constructible;
 * every screen reading one would then have to rule that out.
 */
export type WeaponDefinition = EquipmentBase &
  ({ slot: 'WEAPON' } & (
    | { attackKind: 'PHYSICAL'; weaponType: WeaponType }
    | { attackKind: 'MAGIC' }
  ));

export type EquipmentDef = EquipmentBase | WeaponDefinition;

/**
 * The weapons that exist. Author-given, and changeable here alone.
 *
 * `acquisition` is written down because 「初期装備」 is a fact about
 * the world that something has to act on — see `INITIAL_EQUIPMENT` —
 * and a comment could not be acted on.
 */
export const WEAPON_DEFS: Record<string, WeaponDefinition> = {
  'weapon/worn_long_sword': {
    equipmentId: 'weapon/worn_long_sword',
    name: '使い込まれた長剣',
    slot: 'WEAPON',
    attackKind: 'PHYSICAL',
    weaponType: 'LONG_SWORD',
    description: '幾度もの戦いを経て、刃には無数の傷が刻まれている。',
    effect: NO_EFFECT,
  },
  'weapon/old_grimoire': {
    equipmentId: 'weapon/old_grimoire',
    name: '古い魔導書',
    slot: 'WEAPON',
    // NO `weaponType`. She has not been given one and this does not
    // hand her one; it is what her magic is focused through.
    attackKind: 'MAGIC',
    description: '持ち主の魔力に反応し、忘れられた文字が静かに浮かび上がる。',
    effect: NO_EFFECT,
  },
};

/** What each character starts the game holding and wearing. */
export const INITIAL_EQUIPMENT: Record<string, Partial<Record<EquipmentSlot, string>>> = {
  hero: { WEAPON: 'weapon/worn_long_sword' },
  kaos: { WEAPON: 'weapon/old_grimoire' },
};

export function weaponDefOf(equipmentId: string): WeaponDefinition | null {
  return WEAPON_DEFS[equipmentId] ?? null;
}

export function equipmentDefOf(equipmentId: string): EquipmentDef | null {
  return weaponDefOf(equipmentId);
}

/**
 * NOT ONE PIECE OF EQUIPMENT MAY CARRY A NUMBER YET.
 *
 * Enforced rather than asked for: the battle does not read `effect`,
 * so anything non-zero would be displayed and ignored. A test calls
 * this; the day the correction is wired in, this goes and the test
 * changes with it.
 */
export function hasNoCorrection(def: EquipmentDef): boolean {
  return def.effect.attack === 0 && def.effect.magic === 0;
}
