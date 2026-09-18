// Content data: Gald's LIFE ARCHIVE chapters.
// Pure display text keyed by the memory events that source each chapter.
// The projection (core/archive) decides WHICH chapters the player knows;
// this file only says what a known chapter reads like.

import type { GaldLifeChoiceEventType, MemoryEventType } from '../../core/memory/types';

export interface GaldChapterDef {
  id: string;
  title: string;
  summary: string;
}

/** Chapter 01 depends on how the first encounter ended. */
export const GALD_FIRST_ENCOUNTER_CHAPTER: Record<GaldLifeChoiceEventType, GaldChapterDef> = {
  PLAYER_SPARED_GALD: {
    id: 'GALD_CH_FIRST_ENCOUNTER',
    title: '森の盗賊',
    summary: 'グリーンウッドの森で出会った男。戦いのあと、あなたは彼を見逃した。',
  },
  PLAYER_KILLED_GALD: {
    id: 'GALD_CH_FIRST_ENCOUNTER',
    title: '森で終わった命',
    summary: 'グリーンウッドの森で出会った男。戦いのあと、あなたはとどめを刺した。彼の人生は、そこで終わった。',
  },
  PLAYER_HELPED_GALD: {
    id: 'GALD_CH_FIRST_ENCOUNTER',
    title: '手を差し伸べた',
    summary: 'グリーンウッドの森で出会った男。戦いのあと、あなたは彼の傷を治療した。',
  },
  PLAYER_CAPTURED_GALD: {
    id: 'GALD_CH_FIRST_ENCOUNTER',
    title: '捕らえた男',
    summary: 'グリーンウッドの森で出会った男。戦いのあと、あなたは彼を衛兵へ引き渡した。',
  },
};

/** Later chapters, each sourced by one life / reunion event. */
export const GALD_LIFE_CHAPTERS: Partial<Record<MemoryEventType, GaldChapterDef>> = {
  GALD_LEAVES_BANDITS: {
    id: 'GALD_CH_LEFT_FOREST',
    title: '森を去った男',
    summary: '彼は盗賊団を離れ、森から姿を消していた。',
  },
  GALD_ARRIVES_IN_ALDEN: {
    id: 'GALD_CH_ARRIVED',
    title: '流れ着いた先',
    summary: '彼は森を離れ、アルデンへ辿り着いていた。',
  },
  GALD_BECOMES_BAKER: {
    id: 'GALD_CH_NEW_WORK',
    title: '新しい仕事',
    summary: 'かつて盗賊だった男は、アルデンでパンを焼いている。',
  },
  PLAYER_REUNITED_WITH_GALD: {
    id: 'GALD_CH_REUNION',
    title: '……見るな。',
    summary: '三年後。アルデンの小さなパン屋で、あなたは彼と再会した。',
  },

  // HELP
  GALD_WALKS_THE_ROAD: {
    id: 'GALD_CH_TOOK_THE_ROAD',
    title: '街道へ出た男',
    summary: '傷の癒えた彼は森を離れ、街道を歩く者になっていた。',
  },
  GALD_BECOMES_HEALER: {
    id: 'GALD_CH_HEALER',
    title: '傷ついた者に手を差し伸べる男',
    summary: 'かつて人を襲った男は、街道で旅人の傷を診ている。',
  },
  PLAYER_MET_GALD_ON_THE_ROAD: {
    id: 'GALD_CH_REUNION',
    title: '……お前か。',
    summary: '三年後。街道の小さな救護所で、あなたは彼と再会した。',
  },

  // CAPTURE
  GALD_STANDS_TRIAL: {
    id: 'GALD_CH_TRIAL',
    title: '裁きを受けた男',
    summary: '衛兵に引き渡された彼は、アルデンで裁きを受けた。',
  },
  GALD_COMPLETES_SENTENCE: {
    id: 'GALD_CH_SENTENCE_DONE',
    title: '務めを終えた男',
    summary: '彼は科された年月を働き通し、そして自由になった。',
  },
  GALD_WORKS_FOR_ALDEN: {
    id: 'GALD_CH_VILLAGE_WORK',
    title: '村で働く男',
    summary: 'かつて盗賊だった男は、アルデンの街道や家を直して暮らしている。',
  },
  PLAYER_MET_GALD_IN_ALDEN: {
    id: 'GALD_CH_REUNION',
    title: '……久しぶりだな。',
    summary: '三年後。村外れの作業場で、あなたは彼と再会した。',
  },

  // KILL — his life ended; these are what the world kept.
  GALD_IS_BURIED: {
    id: 'GALD_CH_BURIED',
    title: '積まれた石',
    summary: '森の外れ、彼が倒れた場所に、誰かが小さな石を積んだ。',
  },
  GALD_GRAVE_TENDED: {
    id: 'GALD_CH_GRAVE_TENDED',
    title: '置かれていく花',
    summary: '名も刻まれていないその石積みに、誰かが時々、花を置いていく。',
  },
  PLAYER_FOUND_GALD_GRAVE: {
    id: 'GALD_CH_REUNION',
    title: '残された墓',
    summary:
      '三年後。森の入口の石積みに、あなたは彼の名を見つけた。彼の人生はあの日に終わった。けれど、彼が世界に残したものまで消えたわけではない。',
  },
};

/** The single unspoiled "there is more" card (never counts future events). */
export const UNKNOWN_CONTINUATION_TEXT = 'まだ知らない人生がある。';
