// AUTOMATED QA — what a check is allowed to say.
//
// The whole value of this file is one rule: a check may only report PASS
// for something it actually looked at. "The build compiled" is not "the
// game is correct", and a report that blurs the two is worse than no
// report, because it costs a human the review they thought they had.

import type { MemoryEvent } from '../memory/types';
import type { ExperienceEventDef, ExperienceWorldView } from '../experience/types';
import type { NarrativeSeedDef, NarrativeSeedStatus } from '../narrative/types';

export type QaStatus =
  /** Verified here, right now, by looking at the real data. */
  | 'PASS'
  /** Verified here, and it is wrong. */
  | 'FAIL'
  /** True but suspicious — worth a human's eye, not a blocker. */
  | 'WARN'
  /** Not checked by this report. Says who does check it, if anyone. */
  | 'NOT_TESTED'
  /** A person has to look. Usually anything about how something feels. */
  | 'MANUAL';

export interface QaCheck {
  id: string;
  group: string;
  status: QaStatus;
  /** What was found. One line, specific, with numbers where there are any. */
  detail: string;
  /** How it was established — or, for NOT_TESTED, who does establish it. */
  how: string;
}

export interface QaBuildInfo {
  appVersion: string;
  commit: string;
  builtAt: string;
  environment: string;
}

/** A screen this build touched, and why a human might need to look at it. */
export interface VisualChange {
  screen: string;
  changed: boolean;
  reason: string;
}

export interface QaWorldSnapshot {
  worldYear: number;
  worldDay: number;
  absoluteDay: number;
  /** The life choice the player made, or 'NONE'. */
  route: string;
  events: readonly MemoryEvent[];
  timeShifts: number;
  futureSites: readonly {
    id: string;
    requiredMemory: string;
    discoveryType: string;
    onMap: boolean;
    discovered: boolean;
  }[];
  /** Chapters that exist in canon, and how many the player actually knows. */
  canonChapters: number;
  knownChapters: number;
}

export interface QaExperienceSnapshot {
  seenEventIds: readonly string[];
  recentEventIds: readonly string[];
  lastSeenDay: Record<string, number>;
}

export interface QaRegistrySnapshot {
  eventDefs: readonly ExperienceEventDef[];
  seedDefs: readonly NarrativeSeedDef[];
  seeds: readonly NarrativeSeedStatus[];
  /**
   * The four routes: the choice the player makes, and the first world
   * fact it produces. The rest of each chain is walked through
   * lifeEventChain, so no route's shape is hard-coded here.
   */
  routeMemories: readonly { route: string; choice: string; memory: string }[];
  /** Life events as { produces, requires } — enough to walk a chain. */
  lifeEventChain: readonly { type: string; requiredMemory: string }[];
  locations: readonly string[];
}

/** Measured in the browser, when there is one. Absent under vitest. */
export interface QaViewport {
  width: number;
  height: number;
  documentScrollWidth: number;
}

export interface QaInput {
  build: QaBuildInfo;
  generatedAt: string;
  world: QaWorldSnapshot;
  experience: QaExperienceSnapshot;
  registry: QaRegistrySnapshot;
  experienceView: ExperienceWorldView;
  visualChanges: readonly VisualChange[];
  viewport?: QaViewport;
}
