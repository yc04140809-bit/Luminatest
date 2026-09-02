// Survey copy. Questions are deliberately neutral: no leading wording,
// no praise of the game's own systems, nothing that hints at content the
// player has not reached.

import type {
  LostFrequency,
  MemorableMoment,
  ReunionRecognition,
} from '../../core/playtest/types';

export const SURVEY_INTRO_LINES = [
  { speaker: 'ケイオス', text: 'ここまで付き合ってくれてありがと。' },
  { speaker: 'ケイオス', text: '最後に、この世界で感じたこと……少しだけ教えて？' },
];

export const RATING_LABELS = {
  continueInterest: {
    question: 'この先もMUGEN ZEROを遊びたいと思いましたか？',
    low: '思わなかった',
    high: 'とても思った',
  },
  galdFutureInterest: {
    question: 'ガルドのその後が気になりましたか？',
    low: '気にならなかった',
    high: 'とても気になった',
  },
  worldImpactFeeling: {
    question: '自分の選択が、この世界に影響したと感じましたか？',
    low: '感じなかった',
    high: 'とても感じた',
  },
  archiveInterest: {
    question: 'LIFE ARCHIVEをもっと集めたいと思いましたか？',
    low: '思わなかった',
    high: 'とても思った',
  },
  // Round 2: does the mechanism generalise beyond Gald, and did the
  // world make them curious while they were walking around in it?
  moreLivesInterest: {
    question: 'この仕組みで、もっと多くの人物の「その後」を見てみたいと思いましたか？',
    low: '思わなかった',
    high: 'とても思った',
  },
  nextCuriosity: {
    question: '探索中、「次に何が起こるんだろう」と感じましたか？',
    low: '感じなかった',
    high: 'とても感じた',
  },
} as const;

export const LOST_QUESTION = '次に何をすればよいか分からなくなる場面はありましたか？';

export const LOST_OPTIONS: Array<{ id: LostFrequency; label: string }> = [
  { id: 'NONE', label: 'なかった' },
  { id: 'SOME', label: '少しあった' },
  { id: 'OFTEN', label: 'かなりあった' },
];

export const WISH_COMMENT_QUESTION =
  'もっとやってみたかったこと、気になったことがあれば教えてください。';

export const REUNION_QUESTION = '再会した人物が、最初に出会った盗賊だと気づきましたか？';

export const REUNION_OPTIONS: Array<{ id: ReunionRecognition; label: string }> = [
  { id: 'IMMEDIATE', label: 'すぐ気づいた' },
  { id: 'LATER', label: '途中で気づいた' },
  { id: 'NOT_RECOGNIZED', label: '気づかなかった' },
  { id: 'NOT_APPLICABLE', label: '再会していない' },
];

export const MOMENT_QUESTION = '一番印象に残った場面は？';

export const MOMENT_LABELS: Record<MemorableMoment, string> = {
  KAOS: 'ケイオスとの出会い',
  GALD_ENCOUNTER: 'ガルドとの出会い',
  BATTLE: '戦闘',
  LIFE_CHOICE: '人生を選んだ瞬間',
  TIME_SHIFT: 'TIME SHIFT',
  BAKERY: 'パン屋',
  REUNION: '再会',
  LIFE_ARCHIVE: 'LIFE ARCHIVE',
  OTHER: 'その他',
};

export const FREE_COMMENT_QUESTION =
  '良かったところ、分かりにくかったところ、もっとこうしてほしいところなど、自由に教えてください。';

export const KAOS_THANKS_LINE = '「ありがと。君が見たMUGENのこと、ちゃんと覚えておくね。」';
