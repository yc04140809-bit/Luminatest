// GALD — the numbers of the one fight the story turns on.
//
// He is not a moss rabbit and he must not fight like one. This is the
// fight the whole vertical slice is built to arrive at: the player is
// about to be asked what becomes of a man, and they should have spent
// long enough opposite him to have formed a view. At thirty health he
// went down in three taps, which is not long enough to have felt
// anything about anybody.
//
// Longer, and — this is the part that matters — longer in a way that is
// about him. He is a bandit who has done this before: he covers up when
// he is losing, he can be knocked off his guard, and when there is
// nothing left he stops fighting like a robber and starts fighting like
// somebody who is not going to get another chance.

import type { EnemySpec } from '../../game/battle/battleLogic';
import { GALD } from '../characters/gald';

export const GALD_BATTLE: EnemySpec = {
  name: `盗賊 ${GALD.name}`,
  // A little over twice the moss rabbit's, and the fight is meant to
  // read as two to three minutes rather than one.
  hp: 220,
  // Lowered from 4-8 after measuring it: at 4-8 an attack-only player
  // lost this fight one time in eighteen and won the rest on fifteen
  // health. A fight the story has to come out of — the four answers are
  // on the other side of it — cannot be a coin flip in the tail, and it
  // is the DAMAGE that made it one rather than the length. He still
  // takes two thirds of the player's health on the way.
  attackMin: 3,
  attackMax: 5,
  attackName: '短剣',
  appearLine: `${GALD.unknownName}が短剣を構えた。`,
  skill: {
    name: '受け流し',
    turns: 2,
    damageTaken: 0.45,
    chance: 0.35,
    cooldown: 3,
    maxUses: 3,
    line: `${GALD.unknownName}は短剣を寝かせ、こちらの間合いを測っている。`,
  },
  /**
   * He has more footing than an animal and it costs more to take, but
   * once it is gone he is wide open — a man who has over-committed does
   * not recover the way something small and quick does.
   */
  poise: {
    max: 7,
    perHit: 1,
    perGuardedHit: 2,
    staggerTurns: 2,
    staggerDamageTaken: 1.6,
    breakLine: `${GALD.unknownName}の構えが崩れた！ 短剣の切っ先が下がる。`,
    recoverLine: `${GALD.unknownName}は息を整え、短剣を握りなおした。`,
  },
  phases: [
    {
      id: 'SERIOUS',
      atOrBelow: 0.62,
      line: `${GALD.unknownName}の目つきが変わった。「……やるじゃねえか」`,
      skillChance: 0.55,
    },
    {
      id: 'DESPERATE',
      atOrBelow: 0.25,
      // He stops covering up. There is no version of this where he
      // walks away by being careful.
      line: `${GALD.unknownName}は防ぐのをやめた。「ここで退けねえんだよ！」`,
      attack: 1.55,
      skillChance: 0.05,
    },
  ],
};
