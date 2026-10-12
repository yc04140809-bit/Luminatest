// WHO FIGHTS IN A PARTY FIGHT (game/battle/partyBattle.ts), 2026-10-12.
//
// The hero and Kaos from what the world already holds — their own health
// (the hero's bar and Kaos's, as getPartyCondition keeps them), Kaos's magic,
// his swing with his weapon, and the status screen's 防御力 and 素早さ — and
// グレイヴ as he comes for a while (ヴァルシール戦, 一時同行): his numbers
// provisional, set to his shape, not his final balance.
//
//   グレイヴ   HP high · no MP · attack high · defense high · speed low
//             (a heavy blade: his swing wears a creature's footing twice as much)
//
// THEIR TECHNIQUES (通常スキル3種, 2026-10-12) — one each, no finishers yet:
//   主人公    月影の構え  guard +30%, evasion 25%, a counter at 0.8 — 2 turns, no MP
//   ケイオス  星癒の羽    a heal at the end of the target's own turn — 3 turns, MP 8
//   グレイヴ  重撃・豪断  1.6× a swing, BREAK 4 — no MP, no cooldown (as yet)

import type { PartyMemberSpec, PartyTechnique } from '../../game/battle/partyBattle';
import type { HeroSkillSpec } from '../../game/battle/battleLogic';
import type { MagicDef } from '../../core/magic/magic';
import { SHOWN_ONLY_STATS } from './characterStats';
import { GRAVE_SPEAKER } from './graveFaces';

/** 主人公: 月影の構え — he takes the blow on his blade and answers it. */
export const MOON_GUARD_TECH: PartyTechnique = { id: 'moon_guard', name: '月影の構え', kind: 'MOON_GUARD', mpCost: 0, target: 'SELF', turns: 2 };
/** ケイオス: 星癒の羽 — star feathers on one of them, healing at the end of their turns. */
export const STAR_FEATHER: PartyTechnique = { id: 'star_feather', name: '星癒の羽', kind: 'REGEN', mpCost: 8, target: 'ALLY', turns: 3 };
/** グレイヴ: 重撃・豪断 — the heavy blade's whole weight; it breaks a creature's footing. */
export const GOUDAN: PartyTechnique = { id: 'goudan', name: '重撃・豪断', kind: 'HEAVY', mpCost: 0, target: 'ENEMY', power: 1.6, breakPower: 4 };

/** グレイヴ, beside them for a while. Provisional numbers (作者 2026-10-12: 仮値でよい). */
export const GRAVE_GUEST: PartyMemberSpec = {
  id: 'grave',
  name: GRAVE_SPEAKER,
  maxHp: 180,
  maxMp: 0,
  attackMin: 14,
  attackMax: 20,
  defense: 22,
  speed: 8,
  breakPower: 2,
  techniques: [GOUDAN],
};

export interface PartyFacts {
  heroName: string;
  heroLevel: number;
  kaosLevel: number;
  /** The world's condition, as getPartyCondition() gives it. */
  condition: {
    hero: { currentHp: number; maxHp: number };
    kaos: { currentHp: number; maxHp: number; currentMp: number; maxMp: number };
  };
  /** His swing with what he holds (getPartyStats). */
  heroAttack: { min: number; max: number };
  heroSkills: readonly HeroSkillSpec[];
  /** The spells Kaos has (availableMagic). */
  kaosMagic: readonly MagicDef[];
}

const grow = (g: { base: number; perLevel: number }, level: number) => g.base + Math.floor(g.perLevel * Math.max(0, Math.floor(level) - 1));

/** The hero and Kaos as a party fight takes them, each their own. */
export function heroAndKaos(f: PartyFacts): PartyMemberSpec[] {
  const hs = SHOWN_ONLY_STATS.hero;
  const ks = SHOWN_ONLY_STATS.kaos;
  const kaosAttack = ks.attack!;
  const lift = Math.floor(kaosAttack.perLevel * Math.max(0, Math.floor(f.kaosLevel) - 1));
  return [
    {
      id: 'hero',
      name: f.heroName,
      maxHp: f.condition.hero.maxHp,
      hp: f.condition.hero.currentHp,
      maxMp: 0,
      attackMin: f.heroAttack.min,
      attackMax: f.heroAttack.max,
      defense: grow(hs.defense, f.heroLevel),
      speed: grow(hs.speed, f.heroLevel),
      skills: f.heroSkills,
      techniques: [MOON_GUARD_TECH],
    },
    {
      id: 'kaos',
      name: 'ケイオス',
      maxHp: f.condition.kaos.maxHp,
      hp: f.condition.kaos.currentHp,
      maxMp: f.condition.kaos.maxMp,
      mp: f.condition.kaos.currentMp,
      attackMin: kaosAttack.min + lift,
      attackMax: kaosAttack.max + lift,
      defense: grow(ks.defense, f.kaosLevel),
      speed: grow(ks.speed, f.kaosLevel),
      magic: f.kaosMagic,
      techniques: [STAR_FEATHER],
      magicPower: grow(ks.magic, f.kaosLevel),
    },
  ];
}
