// フウミミ — FORGE MON-000002, the individual IND-43452DFD (作者判断 2026-10-10).
//
// The first creature in MUGEN ZERO met as SOMEBODY from the start: one
// individual, at the forest's edge, once — after セキリュウガ's part is
// over and the signs have begun. It goes at the player; beaten, it turns out
// to have been shielding a small one of its kind; and the four answers are
// asked of it, as of Gald. NORMAL, not a boss. Not set about the forest in
// numbers.
//
// FORGE IS REFERENCED, NEVER COPIED: only its IDs are held here (as
// セキリュウガ's are, sekiryugaBattle.ts). Nothing is written into
// content/forge. The body FORGE describes is being brought into line with
// the approved picture and sent again; nothing here describes how it looks.
//
// HOW IT FIGHTS, from FORGE's combat aptitude, in what the battle can
// already say (no new battle rule — 《捕縛》 and 《温度操作》 wait):
//
//   physical 0.30   突進 hits lightly (lighter than the rabbit at most)
//   defense  0.85   a sword glances off (physical −50%), and its footing
//                   holds (poise 7)
//   magic    0.66   it is a thing of magic: Kaos's star goes in where the
//                   blade does not — the fight asks for her
//   speed    0.67   the battle has no turn order; shown in how it moves
//                   (its lines) and in 《擬態》 coming round often
//   weak: ice, thunder   kept as the affinity says; the party has only the
//                   star for now, so it cannot be used yet
//
// Its four answers differ in KIND and in WHEN, not in being right: ending it
// leaves something now; handing it to the hunter pays now and tells where it
// came from; helping costs a herb now and leaves it unafraid near the
// forest; letting it go gives nothing now. What follows is a small scene
// back in the village (content/story/dailyScenes.ts), one for each answer.

import type { EnemySpeciesDef } from './species';
import type { SekiryugaStage } from '../../core/world/storyArc';
import type { IncidentPhase } from '../../core/world/aldenIncident';
import type { DialogueLine } from '../dialogue/prologue';
import type { LifeChoiceId } from '../../core/flow/types';

/** FORGE's character ID (referenced, not copied). */
export const FUUMIMI_CHARACTER_ID = 'MON-000002';
/** FORGE's individual ID — kept as it is, never turned into an NPC_ID. */
export const FUUMIMI_INDIVIDUAL_ID = 'IND-43452DFD';

export const FUUMIMI: EnemySpeciesDef = {
  speciesId: 'fuumimi',
  name: 'フウミミ',
  habitat: 'GREENWOOD_FOREST',
  hp: 88,
  attackMin: 2,
  attackMax: 4,
  attackName: '突進',
  affinity: {
    physicalResistance: 0.5,
    elementWeakness: { ICE: 0.5, THUNDER: 0.5 },
  },
  poise: {
    max: 7,
    perHit: 1,
    perGuardedHit: 2,
    staggerTurns: 1,
    staggerDamageTaken: 1.5,
    breakLine: 'フウミミの翅が乱れた！ 体が大きく傾く。',
    recoverLine: 'フウミミは翅を震わせ、また宙に浮いた。',
  },
  phases: [
    {
      id: 'GUARDING',
      atOrBelow: 0.5,
      line: 'フウミミは後ろへ下がらない。何かを背にしているように見える。',
      skillChance: 0.6,
    },
  ],
  skill: {
    name: '擬態',
    turns: 2,
    damageTaken: 0.5,
    chance: 0.45,
    cooldown: 2,
    maxUses: 3,
    line: 'フウミミの擬態！ 姿がまわりの景色に溶けて、刃先がそれる。',
  },
  appearLine: '翅の音がした。目で追うより先に、それはもう目の前にいた。',
  defeatedText: 'フウミミは地面に降り、それでも翅を広げたまま動かない。',
  individual: {
    scene: [
      { speaker: null, text: 'フウミミが膝を折った。それでも、背中の向こうを隠すように翅を広げている。' },
      { speaker: null, text: '翅の陰で、小さな同じ生き物が震えていた。' },
      { speaker: '{HERO}', text: '……何だ？' },
      { speaker: 'ケイオス', text: 'この子……。' },
      { speaker: 'ケイオス', text: 'わたしたちを襲いたかったわけじゃ、ないのかもしれないね。' },
    ],
    prompt: 'この生き物の人生を、どうしますか？',
    options: [
      { id: 'KILL', label: 'とどめを刺す', sub: 'KILL' },
      { id: 'SPARE', label: 'そのまま行かせる', sub: 'SPARE' },
      { id: 'HELP', label: '薬草を置いて、道を空ける', sub: 'HELP' },
      { id: 'CAPTURE', label: '捕まえて、猟師に引き渡す', sub: 'CAPTURE' },
    ],
    aftermath: {
      KILL: '翅が静かに閉じた。体の奥の光が消えたあと、小さな欠片がひとつ残った。小さい方は、森の奥へ逃げていった。',
      SPARE: '道を空けると、フウミミは小さい方を抱えるようにして、森の奥へ消えた。',
      HELP: '薬草を置いて下がると、フウミミはしばらくこちらを見ていた。逃げようとは、しなかった。',
      CAPTURE: '暴れはしなかった。猟師は珍しそうに眺めて、礼を置いていった。小さい方は、いつのまにかいなくなっていた。',
    },
  },
};

/** Before the fight, at the forest's edge. Nobody explains it. */
export const FUUMIMI_ENCOUNTER_LINES: readonly DialogueLine[] = [
  { speaker: null, text: '森の入口の茂みが、かすかに鳴った。' },
  { speaker: null, text: '翅のある小さな生き物が、こちらを睨んでいる。この辺りでは見ない姿だ。' },
  { speaker: 'ケイオス', text: '……気が立ってる。来るよ！' },
];

/** What each answer leaves right away (the rest comes later, or never). */
export const FUUMIMI_ANSWER_NOW = {
  /** Something of the light inside it. */
  KILL: { item: { itemId: 'MANA_SHARD', quantity: 1 } },
  SPARE: {},
  /** A herb set down for it (if one is carried). */
  HELP: { gives: { itemId: 'FOREST_HERB', quantity: 1 } },
  /** The hunter's thanks. */
  CAPTURE: { lumi: 30 },
} as const;

/**
 * Whether it is at the forest's edge now: once セキリュウガ's part is over,
 * from the signs' first phase, until the four answers have been given (then
 * never again — it is somebody, met once).
 */
export function fuumimiWaiting(facts: { stage: SekiryugaStage; phase: IncidentPhase; answered: boolean }): boolean {
  return facts.stage === 'SETTLED' && facts.phase >= 1 && !facts.answered;
}

/** The world's side of an answer: what it needs to keep it, and to leave what it leaves now. */
export interface FuumimiAnswerWorld {
  recordCreatureLifeChoice(individualId: string, choice: LifeChoiceId): Promise<unknown>;
  addItem(itemId: string, quantity?: number): Promise<number>;
  removeItem(itemId: string, quantity?: number): Promise<number>;
  addLumi(amount: number): Promise<number>;
  getItemCount(itemId: string): number;
}

/**
 * The answer given: into WORLD MEMORY first (under its own FORGE individual
 * ID), then what it leaves now — a shard, a herb set down (only if one is
 * carried), the hunter's thanks, or nothing. Resolves once all is written.
 */
export async function answerFuumimi(world: FuumimiAnswerWorld, choice: LifeChoiceId): Promise<void> {
  await world.recordCreatureLifeChoice(FUUMIMI_INDIVIDUAL_ID, choice);
  if (choice === 'KILL') {
    const { itemId, quantity } = FUUMIMI_ANSWER_NOW.KILL.item;
    await world.addItem(itemId, quantity);
  } else if (choice === 'HELP') {
    const { itemId, quantity } = FUUMIMI_ANSWER_NOW.HELP.gives;
    if (world.getItemCount(itemId) >= quantity) await world.removeItem(itemId, quantity);
  } else if (choice === 'CAPTURE') {
    await world.addLumi(FUUMIMI_ANSWER_NOW.CAPTURE.lumi);
  }
}
