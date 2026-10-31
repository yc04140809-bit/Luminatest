import { describe, expect, it } from 'vitest';
import { dueTalks, sitting, startsOnEntry, type TalkEvent } from './talkQueue';
import {
  GRAVE_AFTER_SEKIRYUGA_ID,
  GRAVE_MEETING_ID,
  GRAVE_MEETING_PRIORITY,
  GRAVE_SEKIRYUGA_STORY_ID,
  GRAVE_STORY_TALKS,
  type GraveTalkContext,
} from '../../content/talk/graveTalks';
import { SEKIRYUGA_TAVERN_BRIDGE, SEKIRYUGA_TAVERN_EVENT } from '../../content/story/sekiryugaArc';

/**
 * THE TALK QUEUE: everything a person owes the player, in one sitting,
 * highest first, each after the first opened by its bridge.
 */

const MEETING: TalkEvent<GraveTalkContext> = {
  id: GRAVE_MEETING_ID,
  priority: GRAVE_MEETING_PRIORITY,
  onEntry: false,
  due: (c) => !c.met,
  lines: [{ speaker: 'グレイヴ', text: 'グレイヴだ。ここの主人をやってる。' }],
};
const ALL = [MEETING, ...GRAVE_STORY_TALKS];
const ctx = (over: Partial<GraveTalkContext>): GraveTalkContext => ({
  met: false,
  arcOpen: true,
  stage: 'NONE',
  heard: () => false,
  ...over,
});

describe('the tavern master', () => {
  it('never met, a rumour heard: his meeting first, then the bridge, then the story — and it starts on entry', () => {
    const due = dueTalks(ALL, ctx({ stage: 'RUMOR' }));
    expect(due.map((e) => e.id)).toEqual([GRAVE_MEETING_ID, GRAVE_SEKIRYUGA_STORY_ID]);
    expect(startsOnEntry(due)).toBe(true);
    const steps = sitting(due);
    expect(steps[0].lines).toEqual(MEETING.lines);
    expect(steps[1].lines).toEqual([...SEKIRYUGA_TAVERN_BRIDGE, ...SEKIRYUGA_TAVERN_EVENT]);
    expect(steps[1].lines[1]).toEqual({ speaker: 'グレイヴ', text: 'そういや……お前ら、遺跡の話は聞いたか？' });
  });

  it('already met: the story alone, no bridge', () => {
    const steps = sitting(dueTalks(ALL, ctx({ met: true, stage: 'RUMOR' })));
    expect(steps.map((s) => s.id)).toEqual([GRAVE_SEKIRYUGA_STORY_ID]);
    expect(steps[0].lines).toBe(SEKIRYUGA_TAVERN_EVENT);
  });

  it('only his meeting owed: it waits for 「話す」, as it always did', () => {
    const due = dueTalks(ALL, ctx({ arcOpen: false }));
    expect(due.map((e) => e.id)).toEqual([GRAVE_MEETING_ID]);
    expect(startsOnEntry(due)).toBe(false);
  });

  it('after セキリュウガ: once, then never again', () => {
    expect(dueTalks(ALL, ctx({ met: true, stage: 'BEATEN' })).map((e) => e.id)).toEqual([]);
    expect(dueTalks(ALL, ctx({ met: true, stage: 'SETTLED' })).map((e) => e.id)).toEqual([GRAVE_AFTER_SEKIRYUGA_ID]);
    expect(
      dueTalks(ALL, ctx({ met: true, stage: 'SETTLED', heard: (id) => id === GRAVE_AFTER_SEKIRYUGA_ID })),
    ).toEqual([]);
  });

  it('nothing due while the story is told and not yet looked into', () => {
    expect(dueTalks(ALL, ctx({ met: true, stage: 'TOLD' }))).toEqual([]);
  });
});

describe('the queue itself', () => {
  it('ties keep their written order; a first event never gets its bridge', () => {
    const a: TalkEvent<null> = { id: 'a', priority: 1, onEntry: false, due: () => true, lines: [{ speaker: null, text: 'a' }], bridge: [{ speaker: null, text: 'ba' }] };
    const b: TalkEvent<null> = { ...a, id: 'b', lines: [{ speaker: null, text: 'b' }], bridge: [{ speaker: null, text: 'bb' }] };
    const steps = sitting(dueTalks([a, b], null));
    expect(steps.map((s) => s.lines.map((l) => l.text))).toEqual([['a'], ['bb', 'b']]);
  });
});
