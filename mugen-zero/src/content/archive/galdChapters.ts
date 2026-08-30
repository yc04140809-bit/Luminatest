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
};

/** The single unspoiled "there is more" card (never counts future events). */
export const UNKNOWN_CONTINUATION_TEXT = 'まだ知らない人生がある。';
