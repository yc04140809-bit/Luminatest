// PLAYTEST FEEDBACK — tester opinions, NOT world canon.
//
// This layer is deliberately separate from WORLD MEMORY, PLAYER KNOWLEDGE
// and the LIFE ARCHIVE. Nothing here may change the world, and the world
// never reads from here.

import type { LifeChoiceId } from '../flow/types';

export type PlaytestRoute = LifeChoiceId | 'UNKNOWN';

export type ReunionRecognition = 'IMMEDIATE' | 'LATER' | 'NOT_RECOGNIZED' | 'NOT_APPLICABLE';

export type MemorableMoment =
  | 'KAOS'
  | 'GALD_ENCOUNTER'
  | 'BATTLE'
  | 'LIFE_CHOICE'
  | 'TIME_SHIFT'
  | 'BAKERY'
  | 'REUNION'
  | 'LIFE_ARCHIVE'
  | 'OTHER';

/** 1..5 Likert answer. */
export type Rating = 1 | 2 | 3 | 4 | 5;

/** How often the player did not know what to do next. */
export type LostFrequency = 'NONE' | 'SOME' | 'OFTEN';

export const FREE_COMMENT_MAX_LENGTH = 1000;

/**
 * The round-3 questions ask for a moment, not an essay. A short box says
 * "one line is enough" more honestly than any placeholder text could.
 */
export const SHORT_ANSWER_MAX_LENGTH = 200;

export interface PlaytestFeedback {
  id: string;
  createdAt: string;
  /** Anonymous per-playthrough id. No account, no personal data. */
  playSessionId: string;
  route: PlaytestRoute;

  continueInterest: Rating;
  galdFutureInterest: Rating;
  reunionRecognition: ReunionRecognition;
  worldImpactFeeling: Rating;
  archiveInterest: Rating;
  memorableMoment: MemorableMoment;
  freeComment: string;

  /**
   * Added for the second playtest round. Optional on purpose: feedback
   * saved by the first round has no such fields, and old rows must keep
   * reading back cleanly (no IndexedDB migration, no lost answers).
   */
  moreLivesInterest?: Rating;
  nextCuriosity?: Rating;
  lostFrequency?: LostFrequency;
  wishComment?: string;

  /**
   * Round 3 — the MUGEN CORE EXPERIENCE questions.
   *
   * These exist to test one causal chain and nothing else: meet someone,
   * choose, be remembered, come back, and feel that the world kept the
   * memory. Optional like their predecessors, so rounds 1 and 2 keep
   * reading back with no migration and no lost answers.
   */
  reunionMeaning?: Rating;
  mugenMoment?: string;
  aliveMoment?: string;
  unnaturalMoment?: string;
  boringMoment?: string;
  confusingMoment?: string;

  /** Minimal observation context — never a copy of world history. */
  worldYear: number;
  worldDay: number;
  knownChapterCount: number;
  completedCoreExperience: boolean;
}

/**
 * Storage boundary for feedback. Phase H ships the IndexedDB
 * implementation; a remote one can be dropped in later without the UI
 * changing.
 */
export interface FeedbackStore {
  init(): Promise<void>;
  getAll(): Promise<PlaytestFeedback[]>;
  /** Rejects if this play session already answered (1 session = 1 feedback). */
  add(feedback: PlaytestFeedback): Promise<void>;
  hasFeedbackForSession(playSessionId: string): Promise<boolean>;
  /** DEV tooling only. */
  deleteAll(): Promise<void>;
  close(): void;
}
