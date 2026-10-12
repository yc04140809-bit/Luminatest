// WHO FIGHTS IN A PARTY FIGHT (game/battle/partyBattle.ts), 2026-10-12.
//
// The hero and Kaos from what the world already holds — their own health
// (the hero's bar and Kaos's, as getPartyCondition keeps them), Kaos's magic,
// his swing with his weapon, and the status screen's 防御力 and 素早さ — and
// グレイヴ as he comes for a while (ヴァルシール戦, 一時同行): his numbers
// provisional, set to his shape, not his final balance.
//
//   グレイヴ   HP high · no MP · attack high · defense high · speed low
//             (a heavy blade: BREAK will be his — not here yet)

import type { PartyMemberSpec } from '../../game/battle/partyBattle';
import type { HeroSkillSpec } from '../../game/battle/battleLogic';
import type { MagicDef } from '../../core/magic/magic';
import { SHOWN_ONLY_STATS } from './characterStats';
import { GRAVE_SPEAKER } from './graveFaces';

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
    },
  ];
}
