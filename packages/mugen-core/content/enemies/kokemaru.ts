// コケマル — FORGE MON-000010 (作者判断 2026-10-10: an ordinary creature of the
// forest; ordinary FORGE creatures join the forest's ordinary fights unless
// there is a reason not — docs/MONSTER_INTRODUCTION.md).
//
// A round-eyed serpent of moss and pale scales, curious (0.8) and quick to
// go at things (aggression 0.8), that picks up what catches its eye (FORGE:
// 収集) and wanders where people live (人里への迷い込み). Met in the forest
// from the signs' third phase, when the forest's creatures are said to be
// running from something (the rumour 「森の奴ら、何かから逃げてるんじゃな
// いか？」 is already there) and turn up nearer the village than they
// should. The first time, a few lines; after that, an ordinary fight. Not
// a boss.
//
// FORGE IS REFERENCED, NEVER COPIED: only the IDs are held here. The
// individual FORGE sent (IND-7798AECD — 群れに馴染めない・魔力変異・警戒)
// is not the one fought: it is kept for later, untouched. The seeds
// (負傷している・人間との共存可能性・人間への恐怖) are the individual
// stories' to use, not an ordinary fight's.
//
// HOW IT FIGHTS, from FORGE's combat aptitude, in what the battle can say:
//
//   physical 0.92  投石: the hardest single blows in the forest (5–8)
//   speed 0.96     the battle has no turn order: a short fight that hurts
//                  for its length (low health, 80)
//   defense 0.42   no resistance; its footing breaks easily (poise 4)
//   《地形同化》   it melts into the moss for a blow; curled up and hiding
//                  more once it is hurt (眠ると身体が丸く収まる)
//   闇に弱い・強い光を嫌う   the battle has no darkness; and its own second
//                  element is light, so the star is NOT made a weakness
//                  (kept by FORGE only; the author's to confirm)
//   《高速移動》・毒付与   not used: ヒョウレイ's is the forest's quick one,
//                  and poison waits for a battle that knows it
//
// It is not drawn yet for the battle screen: the placeholder stands in until
// its transparent PNG is delivered (FORGE's concept picture is not used).

import type { EnemySpeciesDef } from './species';
import type { DialogueLine } from '../dialogue/prologue';

/** FORGE's character ID (referenced, not copied). */
export const KOKEMARU_CHARACTER_ID = 'MON-000010';
/** FORGE's individual (群れに馴染めない・魔力変異 — kept for later; not the one met in ordinary fights). */
export const KOKEMARU_FORGE_INDIVIDUAL_ID = 'IND-7798AECD';

export const KOKEMARU: EnemySpeciesDef = {
  speciesId: 'kokemaru',
  name: 'コケマル',
  habitat: 'GREENWOOD_FOREST',
  hp: 80,
  attackMin: 5,
  attackMax: 8,
  attackName: '投石',
  affinity: {},
  poise: {
    max: 4,
    perHit: 1,
    perGuardedHit: 2,
    staggerTurns: 1,
    staggerDamageTaken: 1.5,
    breakLine: 'コケマルが体勢を崩した！ 苔の背中がずるりと傾く。',
    recoverLine: 'コケマルは体をくねらせて、また鎌首をもたげた。',
  },
  phases: [
    {
      id: 'CURLED',
      atOrBelow: 0.4,
      line: 'コケマルは体を丸めて、苔の中に半分隠れた。',
      skillChance: 0.6,
    },
  ],
  skill: {
    name: '地形同化',
    turns: 1,
    damageTaken: 0.4,
    chance: 0.35,
    cooldown: 2,
    maxUses: 3,
    line: 'コケマルの地形同化！ 苔の体が、地面の苔と見分けがつかなくなった。',
  },
  appearLine: '足もとの苔が、むくりと起き上がった。丸い眼が、こちらを見ている。',
  defeatedText: 'コケマルはくるりと身をひるがえし、茂みの奥へ逃げていった。',
  individual: {
    scene: [
      { speaker: null, text: 'コケマルの口もとから、つやのある丸いどんぐりがこぼれ落ちた。' },
      { speaker: 'ケイオス', text: '……集めてたのかな。大事そうにしてる。' },
    ],
    prompt: 'この生き物の人生を、どうしますか？',
    options: [
      { id: 'KILL', label: 'とどめを刺す', sub: 'KILL' },
      { id: 'SPARE', label: 'そのまま行かせる', sub: 'SPARE' },
      { id: 'HELP', label: 'どんぐりを返してやる', sub: 'HELP' },
      { id: 'CAPTURE', label: '捕まえる', sub: 'CAPTURE' },
    ],
    aftermath: {
      KILL: '苔の体が静かに伸びて、もう動かなかった。',
      SPARE: '道を空けると、コケマルはどんぐりをくわえ直して、森の奥へ消えた。',
      HELP: 'どんぐりを転がしてやると、コケマルはそれをくわえて、一度だけ振り返った。',
      CAPTURE: '思ったよりおとなしく、腕の中で丸くなった。',
    },
  },
};

/** The first time it is met in the forest — a few lines, once. */
export const KOKEMARU_FIRST_SIGHT: readonly DialogueLine[] = [
  { speaker: null, text: '苔の塊だと思ったものが、くねりと動いた。' },
  { speaker: null, text: '丸い眼が、興味深そうにこちらを見ている。その口に、小石をくわえていた。' },
  { speaker: 'ケイオス', text: '……かわいい顔してるけど、あれ、投げてくるよ！' },
];
