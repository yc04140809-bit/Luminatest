// WHAT A PERSON HAS TO SAY, IN ORDER — the talk queue.
//
// A person (the tavern's master today; anyone later) may have several
// things owed to the player at once: meeting them for the first time, and
// a story the world has made due. They are said in ONE sitting, highest
// priority first, and each after the first opens with its own `bridge` —
// a line or two that turns from the one before ("そういや……"), so two
// events never run together as if they were one.
//
// Pure. Which events are due is each event's own `due` (read from the
// world by whoever builds the context); what finishing one records is the
// caller's (its `id` names it). Nothing here reads or writes a save.

import type { DialogueLine } from '../../content/dialogue/prologue';

export interface TalkEvent<C> {
  id: string;
  /** Higher is said first. A first meeting outranks every story. */
  priority: number;
  /** Whether it is owed now. */
  due: (context: C) => boolean;
  /** Starts by itself as the player walks in (a story), or waits for 「話す」 (a meeting alone). */
  onEntry: boolean;
  lines: readonly DialogueLine[];
  /** Said before `lines` when something else was said first, in the same sitting. */
  bridge?: readonly DialogueLine[];
}

/** One stretch of a sitting: an event's lines, with its bridge when it follows another. */
export interface TalkStep {
  id: string;
  lines: readonly DialogueLine[];
}

/** The events owed now, highest priority first (ties in the order given). */
export function dueTalks<C>(events: readonly TalkEvent<C>[], context: C): TalkEvent<C>[] {
  return events
    .map((event, at) => ({ event, at }))
    .filter(({ event }) => event.due(context))
    .sort((a, b) => b.event.priority - a.event.priority || a.at - b.at)
    .map(({ event }) => event);
}

/** One sitting: every owed event in turn, each after the first opened by its bridge. */
export function sitting<C>(due: readonly TalkEvent<C>[]): TalkStep[] {
  return due.map((event, i) => ({
    id: event.id,
    lines: i > 0 && event.bridge ? [...event.bridge, ...event.lines] : event.lines,
  }));
}

/** Whether walking in starts a sitting by itself: something owed starts on entry. */
export function startsOnEntry<C>(due: readonly TalkEvent<C>[]): boolean {
  return due.some((event) => event.onEntry);
}
