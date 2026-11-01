import type { EventCgKey } from '@mugen/assets/keys';
import type { LifeEventType } from '../../core/memory/types';

/**
 * A POSSIBILITY, SHOWN WHERE AN ANSWER'S OWN THREE YEARS DRAW NOTHING (作者 2026-11-01).
 *
 * TIME SHIFT shows a possibility — 「3年後を見せる」 — so whatever was answered, there is a picture of him (or of
 * his grave). 見逃す (ROUTE D) leaves the bandits and the game never says where he goes; the look ahead still shows
 * one life he could come to — the roadside healer — its line in the list and its picture.
 *
 * Only on that screen, and only where the answer's own years have no picture: nothing is written anywhere, and
 * what follows TIME SHIFT is decided as it always was, by the smaller chances of the world.
 */
export interface VisionPossibility {
  /** The answer's own years contain this… */
  after: LifeEventType;
  /** …and the look ahead shows this as what could follow (its words, as WORLD MEMORY would say it). */
  shows: LifeEventType;
  eventCg: EventCgKey;
  eventCgAlt: string;
}

export const VISION_POSSIBILITIES: readonly VisionPossibility[] = [
  {
    after: 'GALD_LEAVES_BANDITS',
    shows: 'GALD_BECOMES_HEALER',
    eventCg: 'GALD_HEALER',
    eventCgAlt: '街道の休憩所で、旅人の腕に包帯を巻く男',
  },
];
