// ENEMY SPECIES — what lives in a place, and how it fights.
//
// A species is not a character. Most of what the player meets in the
// forest is one of many: killing one moss rabbit does not remove moss
// rabbits from Greenwood, any more than it removes rabbits from a wood.
// So everything here describes a KIND, and nothing here is an
// individual — individuals are minted by the world, only when one of
// them turns out to have a life the player can change.
//
// This is also the template every ordinary enemy after this one uses:
// one normal attack, one skill, numbers in the units the battle already
// speaks, and lines that let an animal be an animal.

import mossRabbitArt from '../../assets/enemies/moss-rabbit.png';
import type { LifeChoiceId } from '../../core/flow/types';
import type { DialogueLine } from '../dialogue/prologue';

export type SpeciesId = 'moss_rabbit';

export interface SpeciesSkill {
  name: string;
  /** How many of the player's blows it softens. */
  turns: number;
  /** What fraction of a blow still lands while it holds. */
  damageTaken: number;
  /** How likely it is to use it on a turn it could. */
  chance: number;
  /** Turns before it may be used again — it must not stall a fight. */
  cooldown: number;
  /** And a hard ceiling per battle, for the same reason. */
  maxUses: number;
  /** Shown when it goes up. */
  line: string;
}

export interface EnemySpeciesDef {
  speciesId: SpeciesId;
  name: string;
  /** Where it lives. One place for now; a list when there are two. */
  habitat: string;
  /** Official art, or null while a species has none drawn. */
  portrait: string | null;
  /**
   * How much of the picture is the animal.
   *
   * The art is used exactly as delivered, transparent margins and all,
   * so the drawn creature is smaller than its file. This says how much
   * to enlarge it on screen; it changes no pixel.
   */
  portraitScale: number;
  /** Battle numbers, in the units the existing battle already uses. */
  hp: number;
  attackMin: number;
  attackMax: number;
  /** Its one normal attack. */
  attackName: string;
  skill: SpeciesSkill;
  /** First sight of it, in the battle log. */
  appearLine: string;
  /** When it is beaten. Nothing dies here unless the player decides so. */
  defeatedText: string;
  /**
   * What happens on the rare occasion that one of them turns out to
   * have a life the player can change.
   *
   * Every ordinary enemy after this one fills in the same five things,
   * which is the whole of the template: why this one is different, the
   * question, the four answers in this creature's own words, and what
   * each answer leaves behind. Nothing here argues for an answer.
   */
  individual: {
    /** Why this one is not just another of its kind. */
    scene: DialogueLine[];
    prompt: string;
    options: { id: LifeChoiceId; label: string; sub: string }[];
    /** One line each, and no two of them the same in meaning. */
    aftermath: Record<LifeChoiceId, string>;
  };
}

/**
 * MOSS RABBIT — the first ordinary enemy in Greenwood.
 *
 * Small, timid and not a predator. It fights because something walked
 * into where it lives, or came at it too fast, or frightened it — not
 * because it is evil, and the game never says either that killing it is
 * wrong or that it is fine. That judgement is the player's, which is
 * the whole point of the four answers waiting at the end.
 *
 * It is also the enemy a player learns the battle on, so it is weak on
 * purpose: it hits for a little, it protects itself sometimes, and it
 * is beaten in a handful of turns.
 */
export const MOSS_RABBIT: EnemySpeciesDef = {
  speciesId: 'moss_rabbit',
  name: 'モスラビット',
  habitat: 'GREENWOOD_FOREST',
  portrait: mossRabbitArt,
  // The drawn animal fills about 55% of the height of its file.
  portraitScale: 1.55,
  hp: 22,
  attackMin: 2,
  attackMax: 5,
  attackName: 'リーフタックル',
  skill: {
    name: '苔かくれ',
    turns: 2,
    damageTaken: 0.5,
    chance: 0.4,
    cooldown: 3,
    maxUses: 2,
    // Named in the line, so the player learns what the move is called
    // the same way they learn the attack's name.
    line: 'モスラビットの苔かくれ！ 身を低く丸め、苔と葉が身体を覆う。',
  },
  appearLine: 'モスラビットが飛び出してきた。',
  defeatedText: 'モスラビットは草の上に伏せ、こちらを見ている。',
  individual: {
    // A reason, not a lesson. The player is told what is in front of
    // them and nothing about what to feel — which is what makes HELP
    // something other than a nicer word for SPARE.
    scene: [
      { speaker: null, text: '伏せたモスラビットの後ろ足に、古い蔓がきつく巻きついている。' },
      { speaker: null, text: '逃げようとして、逃げきれなかったのだと分かる。' },
      { speaker: 'ケイオス', text: '……この子、ずっとここにいたのかな。' },
    ],
    prompt: 'この子を、どうしますか？',
    options: [
      { id: 'KILL', label: 'とどめを刺す', sub: 'KILL' },
      { id: 'SPARE', label: 'そのまま行く', sub: 'SPARE' },
      { id: 'HELP', label: '蔓を外してやる', sub: 'HELP' },
      { id: 'CAPTURE', label: '連れて行く', sub: 'CAPTURE' },
    ],
    aftermath: {
      KILL: '小さな体から力が抜けた。苔と葉が、ゆっくりとほどけて落ちた。',
      SPARE: '距離を取って歩きだすと、蔓に繋がれたまま、こちらを見ていた。',
      HELP: '蔓を切ってやると、二、三歩たしかめるように歩いて、林の奥へ消えた。',
      CAPTURE: '腕の中でしばらく震えて、やがて静かになった。連れて歩くことになりそうだ。',
    },
  },
};

export const ENEMY_SPECIES: Record<SpeciesId, EnemySpeciesDef> = {
  moss_rabbit: MOSS_RABBIT,
};

/**
 * The species an individual belongs to, read off its id.
 *
 * Individual ids are `<speciesId>_001`, so the species is in the name.
 * That is deliberate: WORLD MEMORY stores an actor id and nothing else,
 * and a fact about a creature has to stay readable years later without
 * a lookup table having survived alongside it.
 */
export function speciesOfIndividual(individualId: string): EnemySpeciesDef | null {
  const speciesId = individualId.replace(/_\d+$/, '');
  return (ENEMY_SPECIES as Record<string, EnemySpeciesDef>)[speciesId] ?? null;
}

/** What to call an individual in a sentence. */
export function individualName(individualId: string): string {
  return speciesOfIndividual(individualId)?.name ?? individualId;
}
