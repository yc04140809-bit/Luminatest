// Aggregation for the dev-side playtest view. Pure functions.

import type {
  MemorableMoment,
  PlaytestFeedback,
  ReunionRecognition,
} from './types';

export interface PlaytestSummary {
  responseCount: number;
  /** null when there is nothing to average — never NaN or Infinity. */
  continueInterestAvg: number | null;
  galdFutureInterestAvg: number | null;
  worldImpactFeelingAvg: number | null;
  archiveInterestAvg: number | null;
  reunionRecognitionCounts: Record<ReunionRecognition, number>;
  memorableMomentCounts: Record<MemorableMoment, number>;
}

const RECOGNITION_KEYS: ReunionRecognition[] = [
  'IMMEDIATE',
  'LATER',
  'NOT_RECOGNIZED',
  'NOT_APPLICABLE',
];

const MOMENT_KEYS: MemorableMoment[] = [
  'KAOS',
  'GALD_ENCOUNTER',
  'BATTLE',
  'LIFE_CHOICE',
  'TIME_SHIFT',
  'BAKERY',
  'REUNION',
  'LIFE_ARCHIVE',
  'OTHER',
];

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(mean * 10) / 10;
}

export function summarizeFeedback(feedback: PlaytestFeedback[]): PlaytestSummary {
  const reunionRecognitionCounts = Object.fromEntries(
    RECOGNITION_KEYS.map((k) => [k, 0]),
  ) as Record<ReunionRecognition, number>;
  const memorableMomentCounts = Object.fromEntries(MOMENT_KEYS.map((k) => [k, 0])) as Record<
    MemorableMoment,
    number
  >;

  for (const item of feedback) {
    if (item.reunionRecognition in reunionRecognitionCounts) {
      reunionRecognitionCounts[item.reunionRecognition]++;
    }
    if (item.memorableMoment in memorableMomentCounts) {
      memorableMomentCounts[item.memorableMoment]++;
    }
  }

  return {
    responseCount: feedback.length,
    continueInterestAvg: average(feedback.map((f) => f.continueInterest)),
    galdFutureInterestAvg: average(feedback.map((f) => f.galdFutureInterest)),
    worldImpactFeelingAvg: average(feedback.map((f) => f.worldImpactFeeling)),
    archiveInterestAvg: average(feedback.map((f) => f.archiveInterest)),
    reunionRecognitionCounts,
    memorableMomentCounts,
  };
}
