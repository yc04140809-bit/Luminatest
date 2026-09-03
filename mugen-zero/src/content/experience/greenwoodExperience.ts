// GREENWOOD EXPERIENCE v0.1 — the small things the forest has to say.
//
// Same shape and same engine as the village and the tavern: these are
// ExperienceEventDefs, chosen by the EXPERIENCE DIRECTOR and played by
// the same dialogue renderer. Nothing here is a new system, and nothing
// here writes world truth — they are things the player bumps into on a
// walk, not canon.
//
// They are kept in their own registry rather than added to the Alden
// one, because the Alden list also decides which places wear a 「✦」 on
// the map. The forest says what it has to say when you walk to it.
//
// House rules, inherited: a few taps, never a scene; nothing names what
// the player has not found; and not everything has to mean something.

import type { TalkEventDef } from './aldenExperience';

export const GREENWOOD_FOREST_SPOT = 'GREENWOOD_FOREST';

const MOSSED_MARKER: TalkEventDef = {
  eventId: 'GREENWOOD_MOSSED_MARKER',
  layer: 'NOW',
  location: GREENWOOD_FOREST_SPOT,
  once: true,
  priority: 50,
  content: {
    lines: [
      { speaker: null, text: '苔むした石が、道の脇に半分埋まっている。' },
      { speaker: 'ケイオス', text: '道しるべかな。字はもう読めないけど。' },
      { speaker: null, text: '誰かがここを通った。わかるのは、それだけだ。' },
    ],
    kaosLine: '読めない道しるべって、なんかいいよね。',
  },
  dna: {
    emotionTarget: 'QUIET',
    curiosityTarget: 'Who walked this path before, and where were they going?',
    expectedEffect: 'The forest reads as a place with a past, not a level.',
    characters: ['KAOS'],
  },
};

const BIRDS_GO_QUIET: TalkEventDef = {
  eventId: 'GREENWOOD_BIRDS_GO_QUIET',
  layer: 'NOW',
  location: GREENWOOD_FOREST_SPOT,
  once: true,
  priority: 46,
  content: {
    lines: [
      { speaker: null, text: '鳥の声が、ふいにやんだ。' },
      { speaker: 'ケイオス', text: '……なんかいる？' },
      { speaker: null, text: '数えるほどの間があって、また鳴きはじめた。' },
      { speaker: 'ケイオス', text: 'いなかったね。' },
    ],
  },
  dna: {
    emotionTarget: 'CURIOSITY',
    curiosityTarget: 'Was something there?',
    expectedEffect: 'A moment of tension that resolves into nothing, so the next one counts.',
    characters: ['KAOS'],
  },
};

const COLD_ASHES: TalkEventDef = {
  eventId: 'GREENWOOD_COLD_ASHES',
  layer: 'NOW',
  location: GREENWOOD_FOREST_SPOT,
  once: true,
  priority: 44,
  content: {
    lines: [
      { speaker: null, text: '灰の跡がある。火は、とうに冷えている。' },
      { speaker: 'ケイオス', text: '昨日じゃないね。もっと前。' },
      { speaker: null, text: '誰かがここで夜を越して、朝には行ってしまった。' },
    ],
  },
  dna: {
    emotionTarget: 'QUIET',
    expectedEffect: 'Other people use this forest, and the player is not the first.',
    characters: ['KAOS'],
  },
};

/**
 * The one that comes round again.
 *
 * Without it the forest runs out of things to say after three walks and
 * every arrival becomes an object. It is deliberately the smallest event
 * in the game: two lines and no question.
 */
const LIGHT_THROUGH_LEAVES: TalkEventDef = {
  eventId: 'GREENWOOD_LIGHT_THROUGH_LEAVES',
  layer: 'NOW',
  location: GREENWOOD_FOREST_SPOT,
  once: false,
  cooldownDays: 1,
  priority: 18,
  content: {
    lines: [
      { speaker: null, text: '葉のあいだから光が落ちて、道に模様をつくっている。' },
      { speaker: 'ケイオス', text: '……きれい。' },
    ],
  },
  dna: {
    emotionTarget: 'QUIET',
    expectedEffect: 'Arriving is worth it even when nothing happens.',
    characters: ['KAOS'],
  },
};

export const GREENWOOD_EXPERIENCE_EVENTS: readonly TalkEventDef[] = [
  MOSSED_MARKER,
  BIRDS_GO_QUIET,
  COLD_ASHES,
  LIGHT_THROUGH_LEAVES,
];
