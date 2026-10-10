// ヒョウレイ — FORGE MON-000008 (作者判断 2026-10-10).
//
// An ordinary creature of the forest, made to be fought in ordinary fights:
// NOT a boss, NOT a creature of one event. Before the raid it is first only
// talked about (a rumour in the signs' second phase, villageRumors
// INC_SHINING_WINGS); a little after that, it is met in the forest like any
// other creature (content/enemies/encounters.ts). The first time, a few
// lines; after that, an ordinary fight.
//
// FORGE IS REFERENCED, NEVER COPIED: only the IDs are held here. The
// individual FORGE sent (IND-2262C6F7 — injured, once helped by a person) is
// NOT the one fought: it is kept for later, untouched.
//
// HOW IT FIGHTS, from FORGE's combat aptitude, in what the battle can say:
//
//   speed   0.80   there is no turn order; shown as 《高速移動》 — it slips
//                  out from under a blow, often (a short, frequent guard)
//   special 0.71   …which is where its strangeness lives
//   defense 0.61   a sword glances off a little (physical −20%), footing 6
//   physical 0.34  毒針: a sharp sting (no poison — there is no such state yet)
//   magic   0.32   the star goes in as normal
//   weak: earth, darkness — the battle has neither element; kept by FORGE only
//   《麻痺付与》 waits for a battle that knows paralysis.
//
// Aggression 0.15: it does not hunt people. It is met because it is there,
// and it leaves when beaten — nothing here says it dies.

import type { EnemySpeciesDef } from './species';
import type { DialogueLine } from '../dialogue/prologue';

/** FORGE's character ID (referenced, not copied). */
export const HYOUREI_CHARACTER_ID = 'MON-000008';
/** FORGE's individual (kept for later; not the one met in ordinary fights). */
export const HYOUREI_FORGE_INDIVIDUAL_ID = 'IND-2262C6F7';

export const HYOUREI: EnemySpeciesDef = {
  speciesId: 'hyourei',
  name: 'ヒョウレイ',
  habitat: 'GREENWOOD_FOREST',
  hp: 100,
  attackMin: 3,
  attackMax: 5,
  attackName: '毒針',
  affinity: { physicalResistance: 0.2 },
  poise: {
    max: 6,
    perHit: 1,
    perGuardedHit: 2,
    staggerTurns: 1,
    staggerDamageTaken: 1.5,
    breakLine: 'ヒョウレイの翼の光が乱れた！ 高度が落ちる。',
    recoverLine: 'ヒョウレイは翼を広げ直し、また音もなく浮いた。',
  },
  skill: {
    name: '高速移動',
    turns: 1,
    damageTaken: 0.3,
    chance: 0.5,
    cooldown: 1,
    maxUses: 4,
    line: 'ヒョウレイの高速移動！ 光の尾を残して、刃の下からすり抜けた。',
  },
  appearLine: '冷たい風が吹いた。光る翼の獣が、木々の間に浮かんでいる。',
  defeatedText: 'ヒョウレイの翼の光が弱まり、森の奥へ退いていった。',
  individual: {
    scene: [
      { speaker: null, text: 'ヒョウレイは逃げずに、こちらをじっと見ている。' },
      { speaker: null, text: '翼の光が、呼吸に合わせてゆっくりと明滅している。' },
      { speaker: 'ケイオス', text: '……この子、さっきから一度も本気で来てない。' },
    ],
    prompt: 'この生き物の人生を、どうしますか？',
    options: [
      { id: 'KILL', label: 'とどめを刺す', sub: 'KILL' },
      { id: 'SPARE', label: 'そのまま行かせる', sub: 'SPARE' },
      { id: 'HELP', label: '木の実を置いていく', sub: 'HELP' },
      { id: 'CAPTURE', label: '捕まえる', sub: 'CAPTURE' },
    ],
    aftermath: {
      KILL: '翼の光が消えた。森の中が、少しだけ暗くなった気がした。',
      SPARE: '道を空けると、ヒョウレイは音もなく水辺の方へ消えた。',
      HELP: 'ヒョウレイは木の実をひとつ咥えて、水辺の方へ消えた。',
      CAPTURE: 'ヒョウレイは抵抗しなかった。羽根の冷たさが、腕に残った。',
    },
  },
};

/** The first time it is met in the forest — a few lines, once. */
export const HYOUREI_FIRST_SIGHT: readonly DialogueLine[] = [
  { speaker: null, text: '水辺の方から、冷たい風が吹いた。' },
  { speaker: null, text: '光る翼の獣が、木々の間に浮かんでいる。噂の通りの姿だ。' },
  { speaker: 'ケイオス', text: '……あれが、噂の子かな。気をつけて、すごく速いよ。' },
];
