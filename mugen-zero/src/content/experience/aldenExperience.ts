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
    visualTier: 'FEATURED',
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
    visualTier: 'FEATURED',
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
 * Coming back a second and third time. These are the cheapest possible
 * "he remembers you": no system, no affinity counter — just three
 * greetings that get a little less formal, in order, once each.
 */
const TAVERN_REVISIT_A: TalkEventDef = {
  eventId: 'TAVERN_MASTER_REVISIT_A',
  layer: 'NOW',
  location: MOONLIGHT_TAVERN_SPOT,
  requirements: [{ kind: 'SEEN', eventId: 'MOONLIGHT_TAVERN_FIRST_VISIT' }],
  once: true,
  priority: 6,
  content: {
    lines: [
      { speaker: 'グレイヴ', text: 'また来たな。いつもの席、空いてるぞ。' },
      { speaker: null, text: 'いつもの席、と言われるほど通った覚えはない。' },
    ],
  },
  dna: {
    emotionTarget: 'WARMTH',
    visualTier: 'NORMAL',
    expectedEffect: 'Being recognised, one visit earlier than earned.',
  },
};

const TAVERN_REVISIT_B: TalkEventDef = {
  eventId: 'TAVERN_MASTER_REVISIT_B',
  layer: 'NOW',
  location: MOONLIGHT_TAVERN_SPOT,
  requirements: [{ kind: 'SEEN', eventId: 'TAVERN_MASTER_REVISIT_A' }],
  once: true,
  priority: 5,
  content: {
    lines: [
      { speaker: 'グレイヴ', text: 'よう。……何も訊かねぇんだな、あんた。' },
      { speaker: null, text: 'グレイヴは、少しだけ嬉しそうだった。' },
      { speaker: 'グレイヴ', text: 'いいことだ。' },
    ],
  },
  dna: {
    emotionTarget: 'CURIOSITY',
    visualTier: 'NORMAL',
    curiosityTarget: 'What is he glad not to be asked?',
    expectedEffect: 'The gap he is not filling becomes something the player notices.',
  },
};

/**
 * The one repeatable event in the game, and the floor everything else
 * falls through to. Grave always has a word, so the tavern is never a
 * locked door — that is the whole attachment test: does a face you can go
 * back to make you go back?
 *
 * once:false also keeps it out of the 「✦」 calculation: a familiar
 * greeting is not news.
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
    visualTier: 'NORMAL',
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

// ---- PHASE C: the same news, from other mouths -------------------------
//
// One event is one telling. The village hears a rougher, vaguer version
// than the tavern does, and the notice board hears the official one — but
// none of the three contradicts WORLD MEMORY, and none of them names the
// place the player has to find.

const VILLAGE_RUMOR_SPARED: TalkEventDef = {
  eventId: 'ALDEN_VILLAGE_RUMOR_FOREST_QUIETER',
  layer: 'NOW',
  location: ALDEN_VILLAGE_SPOT,
  requirements: [{ kind: 'MEMORY_PRESENT', type: 'GALD_LEAVES_BANDITS' }],
  once: true,
  priority: 55,
  rarity: 'COMMON',
  content: {
    lines: [
      { speaker: null, text: '桶を抱えた女が、坂の下で足を止めた。' },
      { speaker: '村人', text: '最近、森が静かじゃない？' },
      { speaker: '村人', text: '前は薪拾いも怖かったのに。' },
      { speaker: null, text: '女は、それ以上は知らないという顔をした。' },
    ],
  },
  dna: {
    emotionTarget: 'CURIOSITY',
    visualTier: 'NORMAL',
    curiosityTarget: 'Why has the forest gone quiet?',
    expectedEffect: 'The same world change reaches the player from a second direction.',
  },
};

const VILLAGE_RUMOR_HELPED: TalkEventDef = {
  eventId: 'ALDEN_VILLAGE_RUMOR_ROADSIDE_HELP',
  layer: 'NOW',
  location: ALDEN_VILLAGE_SPOT,
  requirements: [{ kind: 'MEMORY_PRESENT', type: 'GALD_WALKS_THE_ROAD' }],
  once: true,
  priority: 55,
  rarity: 'COMMON',
  content: {
    lines: [
      { speaker: null, text: '井戸端で、女たちが声をひそめている。' },
      { speaker: '村人', text: '街道で助けてもらったって人、うちの人以外にもいるらしいよ。' },
      { speaker: '村人', text: '……三人目だって。' },
      { speaker: null, text: '誰も、その男の名前は言わなかった。' },
    ],
  },
  dna: {
    emotionTarget: 'CURIOSITY',
    visualTier: 'NORMAL',
    curiosityTarget: 'Who keeps helping people on the road?',
    expectedEffect: 'The kindness looks like a pattern, not an incident.',
  },
};

const NOTICE_BOARD: TalkEventDef = {
  eventId: 'ALDEN_NOTICE_BOARD',
  layer: 'NOW',
  location: ALDEN_VILLAGE_SPOT,
  requirements: [
    {
      kind: 'ANY_MEMORY_PRESENT',
      types: ['GALD_LEAVES_BANDITS', 'GALD_WALKS_THE_ROAD', 'GALD_STANDS_TRIAL', 'GALD_IS_BURIED'],
    },
  ],
  once: true,
  priority: 50,
  rarity: 'COMMON',
  content: {
    lines: [
      { speaker: null, text: '教会の前に、板を打ちつけただけの掲示板がある。' },
      { speaker: null, text: '雨に濡れた紙が、何枚も重なって貼られていた。' },
      { speaker: '張り紙', text: '「街道利用者は周辺状況に注意されたし」' },
      { speaker: null, text: 'その下の一枚は、日付が古すぎて読めない。' },
      { speaker: null, text: '誰かが剥がし忘れたまま、季節がいくつも過ぎたらしい。' },
    ],
  },
  dna: {
    emotionTarget: 'DISCOVERY',
    visualTier: 'NORMAL',
    expectedEffect: 'The world keeps records badly, the way a real village would.',
  },
};

// ---- PHASE C: the second seed ------------------------------------------

/**
 * NARRATIVE SEED — ALDEN_UNSIGNED_LETTER.
 *
 * Nothing to do with Gald, nobody's face on it, and no way to follow it
 * up in this build. It exists so the player cannot conclude that every
 * thread in this world belongs to the man from the forest.
 */
const UNSIGNED_LETTER: TalkEventDef = {
  eventId: 'ALDEN_UNSIGNED_LETTER',
  layer: 'NEXT',
  location: ALDEN_VILLAGE_SPOT,
  once: true,
  priority: 45,
  rarity: 'UNCOMMON',
  content: {
    lines: [
      { speaker: null, text: '宿の戸口に、封のない手紙が挟まっていた。' },
      { speaker: null, text: '宛名はない。差出人の名もない。' },
      { speaker: null, text: '一行だけ、丁寧な字で書かれている。' },
      { speaker: '手紙', text: '「まだ、間に合います」' },
      { speaker: null, text: '……何に、とは書かれていない。' },
      { speaker: null, text: 'あなたは手紙を畳んで、荷物にしまった。' },
    ],
    kaosLine: '「……わたし宛じゃ、ないよね？」',
  },
  dna: {
    emotionTarget: 'CURIOSITY',
    visualTier: 'FEATURED',
    curiosityTarget: 'Who wrote it, and what is still in time?',
    expectedEffect: 'A thread with no owner — proof the world is bigger than Gald.',
    seed: { id: 'ALDEN_UNSIGNED_LETTER', role: 'PLANTS' },
  },
};

// ---- PHASE D: NOW event pack -------------------------------------------

/** Kaos, doing nothing in particular, on purpose. */
const KAOS_DETOUR: TalkEventDef = {
  eventId: 'ALDEN_KAOS_DETOUR',
  layer: 'NOW',
  location: ALDEN_VILLAGE_SPOT,
  once: true,
  priority: 35,
  rarity: 'UNCOMMON',
  content: {
    lines: [
      { speaker: null, text: '石段に、ケイオスが座っていた。' },
      { speaker: 'ケイオス', text: 'ねえ。' },
      { speaker: 'ケイオス', text: '冒険ってさ。' },
      { speaker: 'ケイオス', text: 'たまには何もしないのも、冒険じゃない？' },
      { speaker: null, text: 'あなたは、しばらく黙って隣に座っていた。' },
      { speaker: null, text: '坂の下で、誰かが洗濯物を取り込んでいる。' },
      { speaker: 'ケイオス', text: '……うん。こういうの。' },
    ],
  },
  dna: {
    emotionTarget: 'WARMTH',
    visualTier: 'NORMAL',
    expectedEffect: 'Doing nothing is allowed here, and she says so.',
    // No seed. This one really is just this.
  },
};

/** A man, his cat, and his wounded pride. */
const VILLAGE_CAT: TalkEventDef = {
  eventId: 'ALDEN_VILLAGER_CAT',
  layer: 'NOW',
  location: ALDEN_VILLAGE_SPOT,
  requirements: [{ kind: 'SEEN', eventId: 'MOONLIGHT_TAVERN_FIRST_VISIT' }],
  once: true,
  priority: 25,
  rarity: 'COMMON',
  content: {
    lines: [
      { speaker: null, text: '男が、屋根の上をじっと見上げている。' },
      { speaker: '村人', text: 'うちの猫な。' },
      { speaker: '村人', text: '……俺より酒場のマスターになついてるんだよ。' },
      { speaker: null, text: '屋根の上の猫は、こちらを一度見て、目を閉じた。' },
    ],
  },
  dna: {
    emotionTarget: 'HUMOR',
    visualTier: 'NORMAL',
    expectedEffect: 'A joke that quietly says Grave is liked here.',
  },
};

/** Something small was going through your things. */
const VILLAGE_CREATURE: TalkEventDef = {
  eventId: 'ALDEN_SMALL_CREATURE',
  layer: 'NOW',
  location: ALDEN_VILLAGE_SPOT,
  once: false,
  cooldownDays: 30,
  priority: 15,
  rarity: 'UNCOMMON',
  content: {
    lines: [
      { speaker: null, text: '足元で、何かが動いた。' },
      { speaker: null, text: '小さな生き物が、あなたの荷物に鼻先を突っ込んでいる。' },
      { speaker: null, text: '目が合った。' },
      { speaker: null, text: '……逃げられた。' },
    ],
  },
  dna: {
    emotionTarget: 'HUMOR',
    visualTier: 'NORMAL',
    expectedEffect: 'The world moves on its own, in ways that do not concern the player.',
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
    visualTier: 'FEATURED',
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
  TAVERN_REVISIT_A,
  TAVERN_REVISIT_B,
  TAVERN_IDLE,
  VILLAGER_FOREST_QUIET,
  VILLAGE_RUMOR_SPARED,
  VILLAGE_RUMOR_HELPED,
  NOTICE_BOARD,
  UNSIGNED_LETTER,
  KAOS_DETOUR,
  VILLAGER_TRAVELLER,
  VILLAGE_LOST_BUTTON,
  VILLAGE_CAT,
  VILLAGE_CREATURE,
];

/** Shown when a place has nothing new — never a dead end, just quiet. */
export const NOTHING_NEW_LINES: Record<string, string> = {
  ALDEN_VILLAGE: '今日の村は、いつもどおりだ。',
  MOONLIGHT_TAVERN: '今夜は、めぼしい話は聞こえてこない。',
};
