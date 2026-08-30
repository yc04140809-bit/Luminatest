// PlaytestFeedbackService — the only thing the UI talks to.
//
// UI -> PlaytestFeedbackService -> FeedbackStore -> IndexedDB.
// Swapping in a remote store later needs no UI change.

import type { World } from '../world/world';
import type {
  FeedbackStore,
  MemorableMoment,
  PlaytestFeedback,
  PlaytestRoute,
  Rating,
  ReunionRecognition,
} from './types';
import { FREE_COMMENT_MAX_LENGTH } from './types';
import { getPlaySessionId } from './playSession';
import { summarizeFeedback, type PlaytestSummary } from './summary';
import { feedbackToCsv } from './csv';

export interface SurveyAnswers {
  continueInterest: Rating;
  galdFutureInterest: Rating;
  reunionRecognition: ReunionRecognition;
  worldImpactFeeling: Rating;
  archiveInterest: Rating;
  memorableMoment: MemorableMoment;
  freeComment: string;
}

function randomId(): string {
  const globalCrypto = typeof crypto !== 'undefined' ? crypto : undefined;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID();
  return `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class PlaytestFeedbackService {
  private constructor(private readonly store: FeedbackStore) {}

  static async open(store: FeedbackStore): Promise<PlaytestFeedbackService> {
    await store.init();
    return new PlaytestFeedbackService(store);
  }

  getAll(): Promise<PlaytestFeedback[]> {
    return this.store.getAll();
  }

  async getSummary(): Promise<PlaytestSummary> {
    return summarizeFeedback(await this.getAll());
  }

  async toCsv(): Promise<string> {
    return feedbackToCsv(await this.getAll());
  }

  /** Whether this playthrough has already answered. */
  hasAnswered(): Promise<boolean> {
    return this.store.hasFeedbackForSession(getPlaySessionId());
  }

  /**
   * Saves one answer set. Resolves only after the write committed, so the
   * UI can never show a thank-you for feedback that was not stored.
   * Rejects if this session already answered (1 session = 1 feedback).
   */
  async submit(answers: SurveyAnswers, world: World): Promise<PlaytestFeedback> {
    const feedback: PlaytestFeedback = {
      id: randomId(),
      createdAt: new Date().toISOString(),
      playSessionId: getPlaySessionId(),
      route: (world.getGaldLifeChoice() ?? 'UNKNOWN') as PlaytestRoute,
      continueInterest: answers.continueInterest,
      galdFutureInterest: answers.galdFutureInterest,
      reunionRecognition: answers.reunionRecognition,
      worldImpactFeeling: answers.worldImpactFeeling,
      archiveInterest: answers.archiveInterest,
      memorableMoment: answers.memorableMoment,
      freeComment: answers.freeComment.slice(0, FREE_COMMENT_MAX_LENGTH),
      // Minimal observation context — not a copy of world history.
      worldYear: world.getClock().worldYear,
      worldDay: world.getClock().worldDay,
      knownChapterCount: world.getLifeArchive()[0]?.chapters.length ?? 0,
      completedCoreExperience: world.hasReunitedWithGald(),
    };
    await this.store.add(feedback);
    return feedback;
  }

  /** DEV tooling only. */
  deleteAll(): Promise<void> {
    return this.store.deleteAll();
  }
}

/**
 * Which "most memorable moment" options this player may be shown.
 * Driven by what the player actually reached — offering 「パン屋」 to
 * someone who killed Gald would leak a future they never earned.
 */
export function availableMemorableMoments(world: World): MemorableMoment[] {
  const moments: MemorableMoment[] = ['KAOS'];
  if (world.getGaldLifeChoice() !== null) {
    moments.push('GALD_ENCOUNTER', 'BATTLE', 'LIFE_CHOICE');
  }
  if (world.getKnownEvents().some((e) => e.type === 'WORLD_TIME_SHIFTED')) {
    moments.push('TIME_SHIFT');
  }
  if (world.hasReunitedWithGald()) {
    moments.push('BAKERY', 'REUNION');
  }
  if ((world.getLifeArchive()[0]?.chapters.length ?? 0) > 0) {
    moments.push('LIFE_ARCHIVE');
  }
  moments.push('OTHER');
  return moments;
}

/**
 * The survey is offered once the player has actually made Gald's life
 * choice — the moment the hypothesis under test has something to say.
 * Never mid-play.
 */
export function isSurveyAvailable(world: World): boolean {
  return world.getGaldLifeChoice() !== null;
}
