// アルデン村 — THE SIGNS BEFORE (予兆フェーズ, 2026-10-10).
//
// What is said as the incident's phase rises (core/world/aldenIncident.ts),
// mixed into what is already there — the village's rumours (villageRumors
// INCIDENT_1–3), a word from Kaos as they head out (the region map), and
// Grave once things are plainly wrong. Nobody says the village will be
// attacked. Nobody explains what is coming, who Kaos is, the war with the
// machines, or the ruins' truth. Monsters are not added: the moss rabbits
// already there are scared, bolder, out where they should not be.

import type { DialogueLine } from '../dialogue/prologue';
import { HERO_SPEAKER } from './sekiryugaArc';
import type { IncidentPhase } from '../../core/world/aldenIncident';

const KAOS = 'ケイオス';
const HERO = HERO_SPEAKER;
const GRAVE = 'グレイヴ';

/** Kaos senses something — once per phase, as they set out. */
export const INCIDENT_KAOS_TALKS: Readonly<Record<1 | 2 | 3, readonly DialogueLine[]>> = {
  1: [
    { speaker: KAOS, text: '……ん？' },
    { speaker: HERO, text: 'どうした？' },
    { speaker: KAOS, text: 'ううん。なんでもない♪' },
  ],
  2: [
    { speaker: KAOS, text: '……この感じ。' },
    { speaker: HERO, text: 'また何か分かるのか？' },
    { speaker: KAOS, text: '分かんないから困ってるの。' },
  ],
  3: [
    { speaker: KAOS, text: 'しばらく、村から遠くへ行かない方がいいかも。' },
    { speaker: HERO, text: '理由は？' },
    { speaker: KAOS, text: '勘。' },
    { speaker: HERO, text: '雑だな。' },
    { speaker: KAOS, text: '神様の勘を舐めないでよ。' },
  ],
};

/** readMarks id for her word at this phase (read to its end). */
export const incidentKaosMark = (phase: 1 | 2 | 3): string => `talk:INCIDENT_KAOS_${phase}`;

/** Her word owed now: the lowest phase reached and not yet heard (one at a time). */
export function incidentKaosOwed(phase: IncidentPhase, isRead: (mark: string) => boolean): 1 | 2 | 3 | null {
  for (const p of [1, 2, 3] as const) if (p <= phase && !isRead(incidentKaosMark(p))) return p;
  return null;
}

/** Grave, from phase 2 — once, in place of his greeting. He knows less than she does. */
export const INCIDENT_GRAVE_TALK: readonly DialogueLine[] = [
  { speaker: GRAVE, text: '最近、森が静かすぎる。' },
  { speaker: HERO, text: '静かな方がいいんじゃないのか？' },
  { speaker: GRAVE, text: '森ってのはな。うるせぇくらいが普通なんだよ。' },
];
export const INCIDENT_GRAVE_ID = 'INCIDENT_GRAVE_QUIET';
export const INCIDENT_GRAVE_MARK = `talk:${INCIDENT_GRAVE_ID}`;
export const INCIDENT_GRAVE_FROM: IncidentPhase = 2;
