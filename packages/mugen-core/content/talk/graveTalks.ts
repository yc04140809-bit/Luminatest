// WHAT THE TAVERN'S MASTER (グレイヴ) HAS OWED — the stories the world can
// make due, for the talk queue (core/talk/talkQueue.ts).
//
// His FIRST MEETING is not here: its words are the shared scenario's, with
// one line the App rewrites to match how it draws him (mugen-app tavern.tsx),
// so the App adds it to this list itself — at the highest priority, so that
// walking in for the first time with a story already due always starts with
// his introduction, then the story after its bridge.

import type { TalkEvent } from '../../core/talk/talkQueue';
import { stageReached, type SekiryugaStage } from '../../core/world/storyArc';
import {
  SEKIRYUGA_AFTER_BRIDGE,
  SEKIRYUGA_AFTER_TALK,
  SEKIRYUGA_TAVERN_BRIDGE,
  SEKIRYUGA_TAVERN_EVENT,
} from '../story/sekiryugaArc';

/** What his queue reads of the world. */
export interface GraveTalkContext {
  /** Met him already in this save (his meeting is not owed) — see `hasMetGrave`. */
  met: boolean;
  /** The first boss route has begun (after Gald, any answer). */
  arcOpen: boolean;
  stage: SekiryugaStage;
  /** Whether a one-time talk has been heard to its end (readMarks `talk:<id>`). */
  heard: (id: string) => boolean;
}

export const GRAVE_MEETING_ID = 'GRAVE_MEETING';
export const GRAVE_SEKIRYUGA_STORY_ID = 'GRAVE_SEKIRYUGA_STORY';
export const GRAVE_AFTER_SEKIRYUGA_ID = 'GRAVE_AFTER_SEKIRYUGA';

/** His meeting's place in the queue — the App supplies its words. */
export const GRAVE_MEETING_PRIORITY = 100;

/**
 * HIS MEETING, ONCE IN A SAVE (2026-10-07): marked in readMarks when it has
 * been read to its end, and never owed again — not on walking back in, not
 * after the app is closed and opened.
 */
export const GRAVE_MEETING_MARK = `talk:${GRAVE_MEETING_ID}`;

/**
 * Whether this save has met him. The mark — or, for a save from before the
 * mark existed (no `readMarks` row at all reads as nothing read), his
 * story already told: it is only ever told with or after his meeting.
 */
export function hasMetGrave(isRead: (id: string) => boolean, stage: SekiryugaStage): boolean {
  return isRead(GRAVE_MEETING_MARK) || stageReached(stage, 'TOLD');
}

export const GRAVE_STORY_TALKS: readonly TalkEvent<GraveTalkContext>[] = [
  {
    // セキリュウガ: due from the first rumour until he has told it.
    id: GRAVE_SEKIRYUGA_STORY_ID,
    priority: 50,
    onEntry: true,
    due: (c) => c.arcOpen && c.stage === 'RUMOR',
    lines: SEKIRYUGA_TAVERN_EVENT,
    bridge: SEKIRYUGA_TAVERN_BRIDGE,
  },
  {
    // After it was seen to stop: once.
    id: GRAVE_AFTER_SEKIRYUGA_ID,
    priority: 40,
    onEntry: true,
    due: (c) => stageReached(c.stage, 'SETTLED') && !c.heard(GRAVE_AFTER_SEKIRYUGA_ID),
    lines: SEKIRYUGA_AFTER_TALK,
    bridge: SEKIRYUGA_AFTER_BRIDGE,
  },
];
