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

/**
 * Meeting Grave. He is drawn as a man who has clearly been something
 * else, and the scene refuses to say what — the scars and the sword do
 * the talking, and he changes the subject.
 */
const TAVERN_FIRST_VISIT: TalkEventDef = {
  eventId: 'MOONLIGHT_TAVERN_FIRST_VISIT',
  layer: 'NOW',
  location: MOONLIGHT_TAVERN_SPOT,
  once: true,
  priority: 90,
  content: {
    lines: [
      { speaker: null, text: '扉を押すと、煮込みと安い酒の匂いがした。' },
      { speaker: null, text: 'カウンターの奥に、腕を組んだ大男が立っている。' },
      { speaker: null, text: '顔の古い傷が、ランプの明かりで一瞬だけ深く見えた。' },
      { speaker: 'マスター', text: 'お、旅人さん。見ない顔だな。' },
      { speaker: 'マスター', text: 'グレイヴだ。ここの主人をやってる。' },
      { speaker: 'グレイヴ', text: 'この店は、何を探す人でも歓迎だ。' },
      { speaker: 'グレイヴ', text: '酒でも飲んで、ゆっくりしていきな。' },
      { speaker: 'グレイヴ', text: '……噂なら、タダってわけにはいかねぇがな。' },
      { speaker: null, text: 'そう言って、彼は笑った。' },
    ],
  },
  dna: {
    emotionTarget: 'DISCOVERY',
    curiosityTarget: 'Who was this man before he poured drinks?',
    expectedEffect: 'The tavern gets a face, and the face raises a question.',
  },
};

/**
 * NARRATIVE SEED — TAVERN_MASTER_OLD_GREATSWORD.
 *
 * The sword on the wall is real, used, and unexplained. This build plants
 * it and does not pick it up: the payoff is a future NEXT/LIFE event.
 * Grave's deflection is written so it reads as "he won't say", never as
 * "the writer forgot".
 */
const TAVERN_GREATSWORD: TalkEventDef = {
  eventId: 'TAVERN_MASTER_OLD_GREATSWORD',
  layer: 'NEXT',
  location: MOONLIGHT_TAVERN_SPOT,
  requirements: [{ kind: 'SEEN', eventId: 'MOONLIGHT_TAVERN_FIRST_VISIT' }],
  once: true,
  priority: 75,
  content: {
    lines: [
      { speaker: null, text: '壁に、両手剣が一振り掛けてある。' },
      { speaker: null, text: '飾りではない。刃こぼれが、いくつも埋めた跡ごと残っている。' },
      { speaker: null, text: '柄の革は、握られ続けて黒く光っていた。' },
      { speaker: 'グレイヴ', text: '……それが気になるか。' },
      { speaker: null, text: 'グレイヴはグラスを拭く手を止めなかった。' },
      { speaker: 'グレイヴ', text: '重いぞ。今の俺じゃ、もう振れねぇ。' },
      { speaker: null, text: 'あなたは、いつ振っていたのかを訊かなかった。' },
      { speaker: 'グレイヴ', text: '……賢いな、あんた。' },
    ],
    kaosLine: '「あの人ね。……訊かれるのを、待ってると思う。」',
  },
  dna: {
    emotionTarget: 'CURIOSITY',
    curiosityTarget: "Whose sword is that, and what did he do with it?",
    expectedEffect: 'The player files Grave away as someone with a story to come.',
    seed: { id: 'TAVERN_MASTER_OLD_GREATSWORD', role: 'PLANTS' },
  },
};

/** A joke, so the tavern is not only portents. */
const TAVERN_STEW: TalkEventDef = {
  eventId: 'TAVERN_MASTER_STEW',
  layer: 'NOW',
  location: MOONLIGHT_TAVERN_SPOT,
  requirements: [{ kind: 'SEEN', eventId: 'MOONLIGHT_TAVERN_FIRST_VISIT' }],
  once: true,
  priority: 20,
  content: {
    lines: [
      { speaker: 'グレイヴ', text: '今日のシチューはやめとけ。' },
      { speaker: null, text: '厨房の方から、焦げた匂いがしている。' },
      { speaker: 'グレイヴ', text: '俺が焦がした。' },
      { speaker: 'グレイヴ', text: '……剣より鍋のほうが難しいんだよ、これが。' },
    ],
  },
  dna: {
    emotionTarget: 'HUMOR',
    expectedEffect: 'Grave is likeable, not just ominous.',
  },
};

/**
 * The one repeatable event in the game. Grave always has a word, so the
 * tavern is never a locked door — that is the whole attachment test:
 * does a face you can go back to make you go back?
 *
 * It is deliberately once:false, which also keeps it out of the 「✦」
 * calculation: a familiar greeting is not news.
 */
const TAVERN_IDLE: TalkEventDef = {
  eventId: 'TAVERN_MASTER_IDLE',
  layer: 'NOW',
  location: MOONLIGHT_TAVERN_SPOT,
  requirements: [{ kind: 'SEEN', eventId: 'MOONLIGHT_TAVERN_FIRST_VISIT' }],
  once: false,
  priority: 1,
  content: {
    lines: [
      { speaker: 'グレイヴ', text: 'また来たな。そこ空いてるぞ。' },
      { speaker: null, text: 'グレイヴはグラスを拭きながら、少しだけ肩をすくめた。' },
      { speaker: 'グレイヴ', text: '今夜は、めぼしい話は入ってきてねぇ。' },
    ],
  },
  dna: {
    emotionTarget: 'WARMTH',
    expectedEffect: 'Coming back is never punished with an empty room.',
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
      { speaker: 'グレイヴ', text: 'そういや、森の方で妙な話を聞いたな。' },
      { speaker: null, text: '彼は顎で、隣の席の男たちを指した。' },
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
      { speaker: 'グレイヴ', text: 'そういや、街道で妙な話を聞いたな。' },
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
      { speaker: 'グレイヴ', text: '衛兵が二人、隅で飲んでる。声がでかいんだ、あいつら。' },
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
      { speaker: null, text: 'グレイヴが、誰にともなく言った。' },
      { speaker: 'グレイヴ', text: '森の入口に、石が積んであるんだと。' },
      { speaker: 'グレイヴ', text: '名前も知らねぇ男のために、誰かが積んだ。' },
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
  TAVERN_GREATSWORD,
  RUMOR_SPARED,
  RUMOR_HELPED,
  RUMOR_CAPTURED,
  RUMOR_KILLED,
  NEXT_DEEPER_PATH,
  TAVERN_STEW,
  TAVERN_IDLE,
  VILLAGER_FOREST_QUIET,
  VILLAGER_TRAVELLER,
  VILLAGE_LOST_BUTTON,
];

/** Shown when a place has nothing new — never a dead end, just quiet. */
export const NOTHING_NEW_LINES: Record<string, string> = {
  ALDEN_VILLAGE: '今日の村は、いつもどおりだ。',
  MOONLIGHT_TAVERN: '今夜は、めぼしい話は聞こえてこない。',
};
