import type { SfxId } from '@mugen/content/audio/sfx';
import type { SpecialFxArtKey } from './specialFxArt';

/**
 * EACH CHARACTER'S OWN EFFECTS (作者 2026-10-17: グレイヴ専用「重撃／豪断」, 主人公専用「赤黒斬撃」,
 * ケイオス専用「背後の双翼」). Looks only: nothing here touches what a skill does.
 *
 * ONE SHAPE FOR ALL OF THEM — a type, whose it is, how long, when it lands,
 * and its layers (each a picture from specialFxArt.ts or a shape drawn in
 * specialFx.css, with when it starts and how long it lasts). A skill takes
 * one by its id in SKILL_SPECIAL_FX (the flag); a moment that is not a skill
 * (the counter, the dodge, the finale's 零閃・天衝) by MOMENT_SPECIAL_FX.
 *
 *   グレイヴ   blue-gold, heavy: the blade's own weight breaks the ground — the
 *             lightning is what the blow does, never a spell he casts
 *   主人公    red-black, the red moon: a cut, an afterglow, thin sparks — never
 *             an explosion; his and no one else's
 *   ケイオス   silver-white and black-gold: the twin wings open behind her
 *
 * A new character's language is a new owner here and its types; a new skill
 * of an existing language is one line in SKILL_SPECIAL_FX.
 */

export type SpecialFxOwner = 'grave' | 'hero' | 'kaos';

export type SpecialEffectType =
  // グレイヴ
  | 'grave_juugeki'
  | 'grave_goudan_charge'
  | 'grave_goudan'
  // 主人公
  | 'protagonist_redmoon_slash'
  | 'protagonist_zero_tenshou'
  | 'protagonist_counter_moon'
  | 'protagonist_counter_release'
  | 'protagonist_counter_slash'
  | 'protagonist_evade'
  | 'protagonist_multi_slash'
  | 'protagonist_higanbana'
  // ケイオス
  | 'kaos_twin_wings'
  | 'kaos_twin_wings_light';

/** One layer: a picture or a drawn shape (its class in specialFx.css), from `at` ms for `ms` ms. */
export interface SpecialFxLayer {
  part: string;
  at: number;
  ms: number;
  art?: SpecialFxArtKey;
  /** How many of it (shards, sparks, motes) — each told its index. */
  count?: number;
}

export interface SpecialFxSpec {
  owner: SpecialFxOwner;
  /** What the author calls it. */
  label: string;
  /** Where it stands: on the ground under the one struck, on them, behind the one acting, the whole screen. */
  anchor: 'ground' | 'body' | 'back' | 'screen';
  /** When it lands (ms from its start): the flash, the hold, the shake wait for this. */
  impact: number;
  layers: readonly SpecialFxLayer[];
  /** The sounds at its landing (layered: the blow, then what it does). */
  sfx?: readonly SfxId[];
}

const L = (part: string, at: number, ms: number, more: Partial<SpecialFxLayer> = {}): SpecialFxLayer => ({ part, at, ms, ...more });

export const SPECIAL_FX: Readonly<Record<SpecialEffectType, SpecialFxSpec>> = {
  // ---- グレイヴ: 重撃 — straight down; the ground under it breaks ------------------------------
  grave_juugeki: {
    owner: 'grave',
    label: '重撃（縦：叩き落とす・地面破砕）',
    anchor: 'ground',
    impact: 60,
    layers: [
      L('gj-bolt', 0, 640, { art: 'graveImpact' }),
      L('gj-flash', 60, 180),
      L('gj-crack', 60, 780),
      L('gj-shards', 60, 560, { count: 7 }),
      L('gj-dust', 80, 700),
      L('gj-glow', 240, 520),
    ],
    sfx: ['battle_hit_heavy', 'battle_magic_earth'],
  },
  // ---- グレイヴ: 豪断 — the blade gathers its lightning, then cleaves across -----------------------
  grave_goudan_charge: {
    owner: 'grave',
    label: '豪断の溜め（大剣に青金の雷）',
    anchor: 'body',
    impact: 0,
    layers: [L('gc-aura', 0, 340), L('gc-bolts', 0, 340)],
  },
  grave_goudan: {
    owner: 'grave',
    label: '豪断（斜め：断ち割る・亀裂に雷）',
    anchor: 'ground',
    impact: 50,
    layers: [
      L('gd-slash', 0, 440),
      L('gd-core', 10, 260),
      L('gd-wave', 50, 440),
      L('gd-crack', 50, 860),
      L('gd-bolts', 70, 460),
      L('gj-shards', 50, 560, { count: 7 }),
      L('gd-glow', 320, 520),
    ],
    sfx: ['battle_attack_heavy_strike', 'battle_magic_thunder'],
  },

  // ---- 主人公: the red moon -------------------------------------------------------------------
  protagonist_redmoon_slash: {
    owner: 'hero',
    label: '赤黒の三日月斬撃',
    anchor: 'body',
    impact: 110,
    layers: [L('rm-line', 0, 170), L('rm-crescent', 30, 400, { art: 'heroCrescent' }), L('rm-sparks', 110, 260), L('rm-glow', 170, 420)],
    sfx: ['battle_hit'],
  },
  protagonist_zero_tenshou: {
    owner: 'hero',
    label: '零閃・天衝（一瞬の静止 → 月弧 → 斬り上げ）',
    anchor: 'screen',
    impact: 420,
    layers: [
      L('zt-dim', 0, 1150),
      L('zt-line', 120, 200),
      L('zt-crescent', 180, 460, { art: 'heroCrescent' }),
      L('zt-rise', 420, 440, { art: 'heroCrescent' }),
      L('zt-split', 420, 280),
      L('rm-sparks', 430, 320),
      L('zt-glow', 600, 560),
    ],
    sfx: ['battle_skill_slash', 'battle_finisher_hit'],
  },
  protagonist_counter_moon: {
    owner: 'hero',
    label: '月影の構え（月弧・刃筋の残光・張り詰めた気配）',
    anchor: 'back',
    impact: 0,
    layers: [L('cm-arc', 0, 720, { art: 'heroCrescent' }), L('cm-edge', 60, 720), L('cm-ring', 0, 520)],
  },
  protagonist_counter_release: {
    owner: 'hero',
    label: '月影の反撃（止まっていた月弧が放たれる）',
    anchor: 'back',
    impact: 0,
    layers: [L('cr-flare', 0, 240, { art: 'heroCrescent' })],
  },
  protagonist_counter_slash: {
    owner: 'hero',
    label: '月影の反撃（三日月の斬撃が飛ぶ）',
    anchor: 'body',
    impact: 90,
    layers: [L('rm-line', 0, 140), L('cs-crescent', 0, 340, { art: 'heroCrescent' }), L('rm-sparks', 90, 240), L('rm-glow', 150, 360)],
    sfx: ['battle_hit'],
  },
  protagonist_evade: {
    owner: 'hero',
    label: '月影の回避（すり抜けた輪郭）',
    anchor: 'body',
    impact: 0,
    layers: [L('ev-outline', 0, 420)],
  },
  protagonist_multi_slash: {
    owner: 'hero',
    label: '十二方向の斬撃（十字 → 斜め十字 → 開く）— 試作',
    anchor: 'body',
    impact: 150,
    layers: [L('ms-cross', 0, 220), L('ms-x', 80, 240), L('ms-burst', 150, 560, { art: 'heroTwelve' }), L('rm-sparks', 160, 280)],
    sfx: ['battle_skill_slash', 'battle_hit'],
  },
  protagonist_higanbana: {
    owner: 'hero',
    label: '彼岸花の斬撃（外へ花開く）— 試作',
    anchor: 'body',
    impact: 140,
    layers: [L('hb-bloom', 0, 760, { art: 'heroHiganbana' }), L('rm-sparks', 140, 300), L('rm-glow', 260, 480)],
    sfx: ['battle_skill_slash', 'battle_hit'],
  },

  // ---- ケイオス: the twin wings behind her ------------------------------------------------------
  kaos_twin_wings: {
    owner: 'kaos',
    label: '背後の双翼（白銀×黒金）',
    anchor: 'back',
    impact: 160,
    layers: [L('kw-halo', 0, 620), L('kw-wings', 0, 560, { art: 'kaosWings' }), L('kw-flash', 60, 220), L('kw-motes', 60, 540, { count: 10 })],
    sfx: ['battle_buff'],
  },
  kaos_twin_wings_light: {
    owner: 'kaos',
    label: '背後の双翼（軽）',
    anchor: 'back',
    impact: 120,
    layers: [L('kw-wings light', 0, 440, { art: 'kaosWings' }), L('kw-motes', 40, 420, { count: 6 })],
  },
};

/**
 * THE FLAG: a skill (by its id in the game's data) → the effects it plays, in order. Only the
 * skills listed here have one; every other plays as it did.
 */
export const SKILL_SPECIAL_FX: Readonly<Record<string, readonly SpecialEffectType[]>> = {
  // グレイヴ 重撃・豪断 (partyMembers GOUDAN): the downward blow, the blade gathering, the cleave.
  goudan: ['grave_juugeki', 'grave_goudan_charge', 'grave_goudan'],
  // 主人公 《瞬断》 (heroSkills SHUNDAN): his red moon.
  shundan: ['protagonist_redmoon_slash'],
  // 主人公 月影の構え (partyMembers MOON_GUARD_TECH).
  moon_guard: ['protagonist_counter_moon'],
  // ケイオス 彗星撃 — her greatest: the wings in full; 星光弾 — a lighter opening of them.
  comet_strike: ['kaos_twin_wings'],
  starlight_bolt: ['kaos_twin_wings_light'],
};

/** The moments that are not a skill of their own. */
export const MOMENT_SPECIAL_FX = {
  /** 月影の構え's counter: his waiting moon let go, flying at the creature. */
  counter: ['protagonist_counter_release', 'protagonist_counter_slash'],
  /** 月影の構え's dodge. */
  evade: ['protagonist_evade'],
  /** The finale's 零閃・天衝 (STOPPED's first line). */
  zeroTenshou: ['protagonist_zero_tenshou'],
} as const satisfies Record<string, readonly SpecialEffectType[]>;

/** A skill's effects, by its id (none: an empty list). */
export function specialFxOf(skillId: string | undefined): readonly SpecialEffectType[] {
  return (skillId && SKILL_SPECIAL_FX[skillId]) || [];
}

/** How long a type lasts, start to last layer gone. */
export function specialFxLength(type: SpecialEffectType): number {
  return Math.max(...SPECIAL_FX[type].layers.map((l) => l.at + l.ms));
}
