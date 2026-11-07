// THREE ORDINARY ENEMIES TO COME — their ROLES only (作者判断 2026-10-10).
//
// Names, looks and the official IDs are made in FORGE and handed over later.
// Until then MUGEN ZERO decides none of them: every slot's `name` and
// `forgeId` are null, nothing here is a provisional official name, and no
// slot is fought anywhere yet. When FORGE hands one over it becomes an
// `EnemySpeciesDef` (species.ts) — referenced by its ID, as セキリュウガ is
// (MON-000007), never copied into content/forge.
//
// What a slot does say is what the fight is FOR, in words the battle
// already speaks: the resistances and weaknesses of `EnemyAffinity`, footing
// (`poise`), a gathered blow told before it lands (`EnemyMoveSet.charge`).
// What the battle cannot say yet is listed as `needs`, so nobody mistakes a
// wish for a feature:
//
//   EVASION   a blow that can miss — there is no miss in the battle today
//   SPEED     who acts first, or acting twice — turns simply alternate
//   GROUP     more than one at a time — a battle holds one creature
//
// Fleeing (the creature running from the fight) is not wanted now.

import type { EnemyAffinity } from '../../game/battle/damageType';

export type EnemySlotId = 'RUINS_GUARDIAN' | 'FOREST_SHELL' | 'FOREST_SWIFT';

/** Relative to the moss rabbit (124 health, hits 2–5), the template every ordinary enemy follows. */
export type Relative = 'LOWER' | 'SAME' | 'HIGHER';

export type BattleNeed = 'EVASION' | 'SPEED' | 'GROUP';

export interface EnemySlot {
  slotId: EnemySlotId;
  /** Where it lives (one place each, for now). */
  habitat: 'ANCIENT_RUINS' | 'GREENWOOD_FOREST';
  /** The role, in the author's words (2026-10-10). */
  role: string;
  /** From when it is met: always, or once セキリュウガ's part is over. */
  from: 'ALWAYS' | 'SETTLED';
  health: Relative;
  /**
   * How it takes a sword and a spell, as `EnemyAffinity` will hold it —
   * which side resists and which gives. The numbers are FORGE's to set.
   */
  takes: { physical: 'RESISTS' | 'NORMAL' | 'WEAK'; magic: 'RESISTS' | 'NORMAL' | 'WEAK' };
  /** Its footing: harder to break than the rabbit's, or the same. */
  poise: Relative;
  /** A gathered blow, told the turn before (EnemyMoveSet.charge). */
  tellsItsBlow: boolean;
  /** Whether the four answers can be asked of one (the creature's own scene). */
  fourAnswers: boolean;
  /** What the battle does not do yet, that this role asks for. */
  needs: readonly BattleNeed[];
  /** What the fight teaches, that no other enemy does. */
  teaches: string;
  /** Not decided here: FORGE's. */
  name: null;
  forgeId: null;
}

export const ENEMY_SLOTS: readonly EnemySlot[] = [
  {
    slotId: 'RUINS_GUARDIAN',
    habitat: 'ANCIENT_RUINS',
    role: '遺跡系。古代の守護体／古い仕掛け。機械であることを明示しすぎない。高防御寄り。',
    from: 'SETTLED',
    health: 'HIGHER',
    takes: { physical: 'RESISTS', magic: 'RESISTS' },
    poise: 'HIGHER',
    tellsItsBlow: true,
    fourAnswers: false,
    needs: [],
    teaches: '固いものには、溜めの予告を見て身構え、崩れた隙に《瞬断》を入れる。',
    name: null,
    forgeId: null,
  },
  {
    slotId: 'FOREST_SHELL',
    habitat: 'GREENWOOD_FOREST',
    role: '森系。硬い殻を持つ小型魔物。物理防御高め。魔法に弱い。',
    from: 'ALWAYS',
    health: 'SAME',
    takes: { physical: 'RESISTS', magic: 'WEAK' },
    poise: 'HIGHER',
    tellsItsBlow: false,
    fourAnswers: true,
    needs: [],
    teaches: '剣が通りにくい相手には、ケイオスの魔法を使う。',
    name: null,
    forgeId: null,
  },
  {
    slotId: 'FOREST_SWIFT',
    habitat: 'GREENWOOD_FOREST',
    role: '森系。素早い小型魔物。HP低め。回避・速度高め。複数出現することがある。',
    from: 'ALWAYS',
    health: 'LOWER',
    takes: { physical: 'NORMAL', magic: 'NORMAL' },
    poise: 'SAME',
    tellsItsBlow: false,
    fourAnswers: true,
    needs: ['EVASION', 'SPEED', 'GROUP'],
    teaches: '当たりにくく数が多い相手には、手数と全体攻撃で向き合う。',
    name: null,
    forgeId: null,
  },
];

/**
 * How a slot's `takes` reads as the battle's affinity, once FORGE sets the
 * numbers: which fields will be filled. Used to check a slot asks only for
 * what `EnemyAffinity` can hold.
 */
export function affinityFieldsFor(slot: EnemySlot): (keyof EnemyAffinity)[] {
  const fields: (keyof EnemyAffinity)[] = [];
  if (slot.takes.physical === 'RESISTS') fields.push('physicalResistance');
  if (slot.takes.physical === 'WEAK') fields.push('physicalWeakness');
  if (slot.takes.magic === 'RESISTS') fields.push('magicResistance');
  if (slot.takes.magic === 'WEAK') fields.push('magicWeakness');
  return fields;
}
