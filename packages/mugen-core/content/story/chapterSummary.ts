// 「あなたの第1章」 (段階5, 作者 2026-11-03/11-07 採用 — E9 navy plate, C1 share image).
//
// After the departure (the finale's last scene, the hero looking at the memo once more — C2), the chapter is
// told back to the player in seven rows: how long they stayed, what they answered (him, and the creature),
// whom they met, what they heard, how much of other lives they have kept, and how much happened that they
// do not know yet. Nothing here is stored: every row is read off the world as it is (and `met:<id>` marks,
// written as somebody named first speaks to them). The same rows go on the picture to keep (C1).

import type { LifeChoiceId } from '../../core/flow/types';

export const CHAPTER_SUMMARY_TITLE = 'あなたの第1章';
/** Over the title, small. */
export const CHAPTER_SUMMARY_KICKER = '第1章　おわり';
/** At the foot of the picture to keep. */
export const CHAPTER_SUMMARY_SIGN = 'MUGEN ZERO 試遊版';

/** What was answered, said back in the past tense (the four answers' own words — LIFE_CHOICE_OPTIONS). */
export const SUMMARY_ANSWER: Readonly<Record<LifeChoiceId, string>> = {
  KILL: 'とどめを刺した',
  SPARE: '見逃した',
  HELP: '傷を治療した',
  CAPTURE: '衛兵へ引き渡した',
};
/** The creature never met (the forest's other answer is not on every path). */
export const SUMMARY_NOT_MET = 'まだ出会っていない';

/**
 * WHO COUNTS AS MET: the people of the first chapter with a name, by the names they speak under. Kaos and
 * the hero are not counted (she is with them from the first page); nor are the nameless (村人, 衛兵, 旅人…).
 */
export const CHAPTER_ONE_PEOPLE: readonly { id: string; speakers: readonly string[] }[] = [
  { id: 'gald', speakers: ['ガルド', '盗賊', '盗賊 ガルド'] },
  { id: 'lina', speakers: ['リナ'] },
  { id: 'baker', speakers: ['パン屋の主人', '主人'] },
  { id: 'grave', speakers: ['グレイヴ', 'マスター'] },
  { id: 'mirei', speakers: ['ミレイ'] },
  { id: 'rizel', speakers: ['リゼル'] },
  { id: 'baldo', speakers: ['バルド'] },
  { id: 'aria', speakers: ['アリア'] },
  { id: 'levi', speakers: ['レヴィ'] },
];

export const metMark = (id: string): string => `met:${id}`;

/** The person a speaker's name belongs to (null: not one of them — Kaos, the hero, the nameless). */
export function personBySpeaker(speaker: string | null | undefined): string | null {
  if (!speaker) return null;
  return CHAPTER_ONE_PEOPLE.find((p) => p.speakers.includes(speaker))?.id ?? null;
}

export interface ChapterSummaryFacts {
  /** The day it ended on (day 1 counts as one). */
  days: number;
  gald: LifeChoiceId | null;
  fuumimi: LifeChoiceId | null;
  met: number;
  rumors: number;
  records: number;
  unknown: number;
}

export type ChapterSummaryRowId = 'DAYS' | 'GALD' | 'FUUMIMI' | 'MET' | 'RUMORS' | 'RECORDS' | 'UNKNOWN';

export interface ChapterSummaryRow {
  id: ChapterSummaryRowId;
  label: string;
  value: string;
}

/** The seven rows, in order. */
export function chapterSummaryRows(f: ChapterSummaryFacts): ChapterSummaryRow[] {
  return [
    { id: 'DAYS', label: '過ごした日数', value: `${f.days}日` },
    { id: 'GALD', label: 'ガルドへの答え', value: f.gald ? SUMMARY_ANSWER[f.gald] : '―' },
    { id: 'FUUMIMI', label: 'フウミミへの答え', value: f.fuumimi ? SUMMARY_ANSWER[f.fuumimi] : SUMMARY_NOT_MET },
    { id: 'MET', label: '出会った人', value: `${f.met}人` },
    { id: 'RUMORS', label: '聞いた噂話', value: `${f.rumors}件` },
    { id: 'RECORDS', label: '人生の記録', value: `${f.records}件` },
    { id: 'UNKNOWN', label: 'まだ知らない出来事', value: `${f.unknown}件` },
  ];
}
