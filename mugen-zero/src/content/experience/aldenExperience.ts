// ALDEN EXPERIENCE v0.1 — the small things that happen while the world
// turns. Content only: the engine that selects these knows nothing about
// any of it.
//
// House rules:
//  - a NOW event is a few taps, not a scene;
//  - nothing here creates world truth. These are encounters, not canon;
//  - a rumour never names what the player has not found. It says the
//    world moved, and leaves the finding to them;
//  - not everything is sad. Curiosity, warmth and a joke belong here too.

import type { ExperienceEventDef } from '../../core/experience/types';
import type { DialogueLine } from '../dialogue/prologue';

/** What a NOW/NEXT event actually shows. */
export interface TalkContent {
  /** Shown on the place's card, before the player goes in. */
  lines: DialogueLine[];
  /** Kaos's aside afterwards, if she has one. */
  kaosLine?: string;
}

export type TalkEventDef = ExperienceEventDef<TalkContent>;

export const ALDEN_VILLAGE_SPOT = 'ALDEN_VILLAGE';
export const MOONLIGHT_TAVERN_SPOT = 'MOONLIGHT_TAVERN';

// ---- NOW: the village ---------------------------------------------------

const VILLAGER_TRAVELLER: TalkEventDef = {
  eventId: 'ALDEN_VILLAGER_TRAVELLER',
  layer: 'NOW',
  location: ALDEN_VILLAGE_SPOT,
  once: true,
  priority: 40,
  content: {
    lines: [
      { speaker: null, text: '井戸端で、女がたらいを抱えている。' },
      { speaker: '村人', text: '旅人さん？ 最近よく見るね。' },
      { speaker: '村人', text: 'この村、なんにもないでしょ。' },
      { speaker: null, text: '女は笑って、洗濯物を干しに行った。' },
    ],
  },
  dna: {
    emotionTarget: 'WARMTH',
    expectedEffect: 'Alden reads as a place people live in, not a menu.',
  },
};

const VILLAGER_FOREST_QUIET: TalkEventDef = {
  eventId: 'ALDEN_VILLAGER_FOREST_QUIET',
  layer: 'NOW',
  location: ALDEN_VILLAGE_SPOT,
  // Only once the player has actually settled things in the forest.
  requirements: [
    {
      kind: 'ANY_MEMORY_PRESENT',
      types: [
        'PLAYER_KILLED_GALD',
        'PLAYER_SPARED_GALD',
        'PLAYER_HELPED_GALD',
        'PLAYER_CAPTURED_GALD',
      ],
    },
  ],
  once: true,
  priority: 60,
  content: {
    lines: [
      { speaker: null, text: '荷車に薪を積んだ男が、森の方を見ている。' },
      { speaker: '村人', text: '森の方、最近ちょっと静かだな。' },
      { speaker: '村人', text: '……悪いことじゃねぇと思うんだが。' },
      { speaker: null, text: '男は薪を積み直して、坂を下りていった。' },
    ],
  },
  dna: {
    emotionTarget: 'CURIOSITY',
    curiosityTarget: 'What actually changed in the forest?',
    expectedEffect: 'The player connects their own choice to the village talk.',
  },
};

const VILLAGE_LOST_BUTTON: TalkEventDef = {
  eventId: 'ALDEN_CHILD_LOST_BUTTON',
  layer: 'NOW',
  location: ALDEN_VILLAGE_SPOT,
  once: true,
  priority: 30,
  content: {
    lines: [
      { speaker: null, text: '石畳の隙間で、何かが光った。' },
      { speaker: null, text: '真鍮のボタン。誰かの上着から取れたものらしい。' },
      { speaker: '子ども', text: 'あーっ！ それ、ぼくの！' },
      { speaker: null, text: '子どもはボタンをひったくると、礼も言わずに走っていった。' },
      { speaker: null, text: '……坂の上で一度だけ振り返って、手を振った。' },
    ],
    kaosLine: '「今の、お礼だと思う？ わたしは思う。」',
  },
  dna: {
    emotionTarget: 'HUMOR',
    expectedEffect: 'A light beat, so the world is not only heavy choices.',
  },
};

// ---- NOW: the tavern ----------------------------------------------------

const TAVERN_FIRST_VISIT: TalkEventDef = {
  eventId: 'MOONLIGHT_TAVERN_FIRST_VISIT',
  layer: 'NOW',
  location: MOONLIGHT_TAVERN_SPOT,
  once: true,
  priority: 90,
  content: {
    lines: [
      { speaker: null, text: '扉を押すと、煮込みと安い酒の匂いがした。' },
      { speaker: '主人', text: 'いらっしゃい。何も出せねぇ日もあるがな。' },
      { speaker: null, text: '奥の席で、旅人たちが低い声で話している。' },
      { speaker: '主人', text: '噂を聞きたきゃ、座ってな。' },
    ],
  },
  dna: {
    emotionTarget: 'DISCOVERY',
    expectedEffect: 'The tavern is established as the place rumours come from.',
  },
};

/**
 * WORLD RUMOR v0.1 — one per route.
 *
 *   WORLD MEMORY -> WORLD CHANGE -> RUMOR -> curiosity -> exploration
 *
 * Each is gated on the FIRST link of its route's chain, so the rumour
 * arrives while the rest of that life is still unwritten. None of them
 * names the place the player will eventually find.
 */
const RUMOR_SPARED: TalkEventDef = {
  eventId: 'ALDEN_RUMOR_GALD_LEFT_THE_BANDITS',
  layer: 'NOW',
  location: MOONLIGHT_TAVERN_SPOT,
  requirements: [{ kind: 'MEMORY_PRESENT', type: 'GALD_LEAVES_BANDITS' }],
  once: true,
  priority: 80,
  content: {
    lines: [
      { speaker: null, text: '隣の席の男が、連れに話している。' },
      { speaker: '旅人', text: '森の盗賊団、一人減ったらしいぞ。' },
      { speaker: '旅人', text: '殺られたわけじゃねぇって話だ。' },
      { speaker: '旅人', text: '……足を洗ったのかね。物好きな。' },
    ],
  },
  dna: {
    emotionTarget: 'CURIOSITY',
    curiosityTarget: 'Where did the man you spared go?',
    expectedEffect: 'The player wonders what became of him, without being told.',
  },
};

const RUMOR_HELPED: TalkEventDef = {
  eventId: 'ALDEN_RUMOR_GALD_ON_THE_ROAD',
  layer: 'NOW',
  location: MOONLIGHT_TAVERN_SPOT,
  requirements: [{ kind: 'MEMORY_PRESENT', type: 'GALD_WALKS_THE_ROAD' }],
  once: true,
  priority: 80,
  content: {
    lines: [
      { speaker: null, text: '隣の席の男が、包帯の巻かれた腕をさすっている。' },
      { speaker: '旅人', text: '街道で、手当てしてくれた奴がいてな。' },
      { speaker: '旅人', text: '金は取らねぇって。' },
      { speaker: '旅人', text: '……名前は、聞きそびれた。' },
    ],
  },
  dna: {
    emotionTarget: 'CURIOSITY',
    curiosityTarget: 'Who is treating people on the road?',
    expectedEffect: 'The player suspects, but is not told, who it is.',
  },
};

const RUMOR_CAPTURED: TalkEventDef = {
  eventId: 'ALDEN_RUMOR_GALD_SENTENCED',
  layer: 'NOW',
  location: MOONLIGHT_TAVERN_SPOT,
  requirements: [{ kind: 'MEMORY_PRESENT', type: 'GALD_STANDS_TRIAL' }],
  once: true,
  priority: 80,
  content: {
    lines: [
      { speaker: null, text: '衛兵が二人、隅の席で飲んでいる。' },
      { speaker: '衛兵', text: 'あの森の男、裁きは終わったとよ。' },
      { speaker: '衛兵', text: '首は繋がった。働かされるがな。' },
      { speaker: '衛兵', text: '……続くかね、あれが。' },
    ],
  },
  dna: {
    emotionTarget: 'CURIOSITY',
    curiosityTarget: 'Does a sentence change a man?',
    expectedEffect: 'The player wants to see whether he lasted.',
  },
};

const RUMOR_KILLED: TalkEventDef = {
  eventId: 'ALDEN_RUMOR_STONES_AT_THE_FOREST',
  layer: 'NOW',
  location: MOONLIGHT_TAVERN_SPOT,
  requirements: [{ kind: 'MEMORY_PRESENT', type: 'GALD_IS_BURIED' }],
  once: true,
  priority: 80,
  content: {
    lines: [
      { speaker: null, text: '主人が、誰にともなく言った。' },
      { speaker: '主人', text: '森の入口に、石が積んであるんだと。' },
      { speaker: '主人', text: '名前も知らねぇ男のために、誰かが積んだ。' },
      { speaker: null, text: '奥の席が、少し静かになった。' },
    ],
  },
  dna: {
    emotionTarget: 'QUIET',
    curiosityTarget: 'Who builds a cairn for a bandit?',
    expectedEffect: 'The KILL route feels like it left something behind.',
  },
};

// ---- NEXT: the one seed -------------------------------------------------

/**
 * The single NEXT event. It plants a question this build deliberately
 * does not answer — and says so in world terms, so it reads as "not yet"
 * rather than as a dead end or a missing feature.
 */
const NEXT_DEEPER_PATH: TalkEventDef = {
  eventId: 'GREENWOOD_DEEPER_PATH_RUMOR',
  layer: 'NEXT',
  location: MOONLIGHT_TAVERN_SPOT,
  requirements: [{ kind: 'SEEN', eventId: 'MOONLIGHT_TAVERN_FIRST_VISIT' }],
  once: true,
  priority: 70,
  content: {
    lines: [
      { speaker: null, text: '古い猟師が、地図を指でなぞっている。' },
      { speaker: '猟師', text: 'グリーンウッドの奥にな、地図にない道がある。' },
      { speaker: '猟師', text: '入った奴は戻ってくる。何も持たずにな。' },
      { speaker: '猟師', text: '「何もなかった」って言うんだ。全員がだ。' },
      { speaker: null, text: '猟師は地図を畳んで、それきり何も言わなかった。' },
    ],
    kaosLine: '「……そこ、わたしもまだ見てないんだ。いつか、一緒に行こ。」',
  },
  dna: {
    emotionTarget: 'CURIOSITY',
    curiosityTarget: 'What is down the path that is not on the map?',
    expectedEffect: 'The player leaves this build wanting the next one.',
    seed: { id: 'GREENWOOD_DEEP_PATH', role: 'PLANTS' },
  },
};

/** Every NOW / NEXT event in the Alden region. */
export const ALDEN_EXPERIENCE_EVENTS: readonly TalkEventDef[] = [
  TAVERN_FIRST_VISIT,
  RUMOR_SPARED,
  RUMOR_HELPED,
  RUMOR_CAPTURED,
  RUMOR_KILLED,
  NEXT_DEEPER_PATH,
  VILLAGER_FOREST_QUIET,
  VILLAGER_TRAVELLER,
  VILLAGE_LOST_BUTTON,
];

/** Shown when a place has nothing new — never a dead end, just quiet. */
export const NOTHING_NEW_LINES: Record<string, string> = {
  ALDEN_VILLAGE: '今日の村は、いつもどおりだ。',
  MOONLIGHT_TAVERN: '今夜は、めぼしい話は聞こえてこない。',
};
