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
 * What a piece of equipment does in a fight, as numbers.
 *
 * ZERO FOR EVERYTHING BUT WHAT THE BATTLE ACTUALLY APPLIES. Since
 * 2026-10-07 the battle reads `attack` (through `World.getPartyStats`,
 * added to both ends of the hero's swing) — and nothing else. A
 * non-zero field the fight ignores would put a number on the screen
 * that is not true, so the guard below (`appliedOnly`) refuses one.
 */
export interface EquipmentEffect {
  /** Added to both ends of the attack range. Applied while it is held. */
  attack: number;
  /** For the day 魔力 exists. It does not, so this stays 0. */
  magic: number;
}

export const NO_EFFECT: EquipmentEffect = { attack: 0, magic: 0 };

/**
 * A WEAPON'S OWN ABILITY — applied by the battle while it is held.
 *
 * One kind so far: the battle's first blow, struck at full HP, times
 * `multiplier` (the last multiplier on that blow). Spent by the hero's
 * first swing — plain or a skill — whether it applied or not, so it can
 * never come twice in one fight.
 */
export interface WeaponAbility {
  id: string;
  name: string;
  description: string;
  /** HP full, the battle's first blow only: that blow times `multiplier`. */
  trigger: 'FULL_HP_FIRST_STRIKE';
  multiplier: number;
}

interface EquipmentBase {
  equipmentId: string;
  name: string;
  slot: EquipmentSlot;
  /** Two lines at most: this is read standing up, in a forest. */
  description: string;
  effect: EquipmentEffect;
  /**
   * FOUND, NOT SOLD: not offered on any list until it is owned, so a
   * once-in-a-world find is not given away by a greyed-out row before
   * anybody has come across it.
   */
  foundOnly?: boolean;
  /** Its own ability, applied in battle while it is held. See `WeaponAbility`. */
  ability?: WeaponAbility;
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
  'weapon/training_long_sword': {
    equipmentId: 'weapon/training_long_sword',
    name: '訓練用の長剣',
    slot: 'WEAPON',
    attackKind: 'PHYSICAL',
    weaponType: 'LONG_SWORD',
    description: '剣の扱いを覚えるために作られた、簡素な長剣。',
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
  // 古代遺跡の虹の発見 — once in a world, found walking the ruins
  // (content/exploration/ruinsWalk.ts). Applied in battle while held
  // (2026-10-07): +2 to both ends of the hero's swing, and 先手の一閃.
  'weapon/star_crest_relic_sword': {
    equipmentId: 'weapon/star_crest_relic_sword',
    name: '星紋の遺剣',
    slot: 'WEAPON',
    attackKind: 'PHYSICAL',
    weaponType: 'LONG_SWORD',
    description: '欠けた星の紋様が刻まれた古い剣。長い眠りから目覚めたように、刃に淡い光が宿っている。',
    effect: { attack: 2, magic: 0 },
    foundOnly: true,
    ability: {
      id: 'FIRST_FLASH',
      name: '先手の一閃',
      description: 'HP満タンのとき、戦闘の最初の一撃だけ威力1.25倍。',
      trigger: 'FULL_HP_FIRST_STRIKE',
      multiplier: 1.25,
    },
  },
};

/**
 * What each character starts the game holding and wearing.
 *
 * THE TRAINING SWORD IS DELIBERATELY NOT HERE. It exists in the world
 * and can be held, but nobody starts with it — the brief is explicit
 * that a second weapon for testing must not reach the real starting
 * kit, and a test that granted itself one by editing this would have
 * changed the game to suit itself.
 */
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
 * ONLY WHAT THE BATTLE APPLIES MAY BE WRITTEN.
 *
 * `attack` is read by the fight; `magic` is not (there is no 魔力), so a
 * non-zero `magic` would be displayed and ignored. A test calls this on
 * every definition.
 */
export function appliedOnly(def: EquipmentDef): boolean {
  return def.effect.magic === 0 && Number.isInteger(def.effect.attack) && def.effect.attack >= 0;
}

/** No correction at all — what every weapon but a found one is. */
export function hasNoCorrection(def: EquipmentDef): boolean {
  return def.effect.attack === 0 && def.effect.magic === 0 && !def.ability;
}

/**
 * WHAT A HELD WEAPON BRINGS TO A FIGHT: its attack, and its first-strike
 * ability when it has one. Nothing held, or an id nobody knows, brings
 * nothing.
 */
export function weaponInBattle(equipmentId: string | null): {
  attack: number;
  firstStrike: { name: string; multiplier: number } | null;
} {
  const def = equipmentId ? weaponDefOf(equipmentId) : null;
  if (!def) return { attack: 0, firstStrike: null };
  const ability = def.ability?.trigger === 'FULL_HP_FIRST_STRIKE' ? def.ability : null;
  return {
    attack: def.effect.attack,
    firstStrike: ability ? { name: ability.name, multiplier: ability.multiplier } : null,
  };
}
