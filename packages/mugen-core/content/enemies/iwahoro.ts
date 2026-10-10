// イワホロ — FORGE MON-000009 (作者判断 2026-10-10: an ordinary creature of the
// forest; ordinary FORGE creatures join the forest's ordinary fights unless
// there is a reason not — docs/MONSTER_INTRODUCTION.md).
//
// A floating thing of stone and moss that carries the forest's plants about
// (FORGE: 植物の媒介者), guards its nest (巣の防衛) and comes at what comes
// near (aggression 0.63, caution 0.14). Met in the forest from the signs'
// second phase — hungrier, bolder, nearer the edge than it should be. The
// first time, a few lines; after that, an ordinary fight. Not a boss.
//
// FORGE IS REFERENCED, NEVER COPIED: only the IDs are held here. The
// individual FORGE sent (IND-E32B5633, 飢餓) is not the one
// fought: it is kept for later, untouched. The species' seeds (復讐・人間への
// 憎悪) are the individual stories' to use, not an ordinary fight's.
//
// HOW IT FIGHTS, from FORGE's combat aptitude, in what the battle can say:
//
//   physical 0.42  吸収: its blow (as damage — there is no draining yet)
//   magic 0.50 · defense 0.44 · speed 0.54   an even, steady creature
//   強い光を嫌う   read as: Kaos's star goes in hard (star WEAK) — the one
//                  light the battle has (an interpretation; the author's to confirm)
//   土に弱い       the battle has no earth; kept by FORGE only
//   《高速移動》   rarely (ヒョウレイ's is its own, and often); poison and
//                  paralysis wait for a battle that knows them
//   巣の防衛       cornered, it hits harder
//
// It is not drawn yet for the battle screen: the placeholder stands in until
// its transparent PNG is delivered (FORGE's concept picture is not used).

import type { EnemySpeciesDef } from './species';
import type { DialogueLine } from '../dialogue/prologue';
import { starAffinity } from '../../game/battle/damageType';

/** FORGE's character ID (referenced, not copied). */
export const IWAHORO_CHARACTER_ID = 'MON-000009';
/** FORGE's individual (飢餓 — kept for later; not the one met in ordinary fights). */
export const IWAHORO_FORGE_INDIVIDUAL_ID = 'IND-E32B5633';

export const IWAHORO: EnemySpeciesDef = {
  speciesId: 'iwahoro',
  name: 'イワホロ',
  habitat: 'GREENWOOD_FOREST',
  hp: 135,
  attackMin: 3,
  attackMax: 5,
  attackName: '吸収',
  affinity: starAffinity('WEAK'),
  poise: {
    max: 5,
    perHit: 1,
    perGuardedHit: 2,
    staggerTurns: 1,
    staggerDamageTaken: 1.5,
    breakLine: 'イワホロの石の殻がずれた！ 体が大きく傾く。',
    recoverLine: 'イワホロは殻を鳴らして、また宙に浮き直した。',
  },
  phases: [
    {
      id: 'NEST',
      atOrBelow: 0.35,
      line: 'イワホロは退かない。後ろにあるものを守るように、尾を振り上げた。',
      attack: 1.4,
      skillChance: 0.1,
    },
  ],
  skill: {
    name: '高速移動',
    turns: 1,
    damageTaken: 0.5,
    chance: 0.25,
    cooldown: 3,
    maxUses: 2,
    line: 'イワホロの高速移動！ 石の体が、音もなく横へ滑った。',
  },
  appearLine: '苔むした石が、宙に浮いた。大きな眼が、こちらを向く。',
  defeatedText: 'イワホロは地面すれすれまで沈み、森の奥へ漂っていった。',
  individual: {
    scene: [
      { speaker: null, text: 'イワホロの殻の隙間から、細い根が垂れている。ひどく痩せているのが分かる。' },
      { speaker: 'ケイオス', text: '……お腹、空いてたのかな。' },
    ],
    prompt: 'この生き物の人生を、どうしますか？',
    options: [
      { id: 'KILL', label: 'とどめを刺す', sub: 'KILL' },
      { id: 'SPARE', label: 'そのまま行かせる', sub: 'SPARE' },
      { id: 'HELP', label: '木の実を置いていく', sub: 'HELP' },
      { id: 'CAPTURE', label: '捕まえる', sub: 'CAPTURE' },
    ],
    aftermath: {
      KILL: '石の殻が崩れて、苔と根だけが残った。',
      SPARE: '道を空けると、イワホロはゆっくりと森の奥へ漂っていった。',
      HELP: '木の実を置くと、イワホロは根を伸ばして、それを抱えこんだ。',
      CAPTURE: '石の殻は思ったより軽かった。',
    },
  },
};

/** The first time it is met in the forest — a few lines, once. */
export const IWAHORO_FIRST_SIGHT: readonly DialogueLine[] = [
  { speaker: null, text: '苔むした石だと思ったものが、ゆっくりと宙に浮いた。' },
  { speaker: null, text: '大きな眼が一つ、こちらを見ている。' },
  { speaker: 'ケイオス', text: '……石じゃない。生きてる。来るよ！' },
];
