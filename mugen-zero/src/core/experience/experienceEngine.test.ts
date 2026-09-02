import { describe, it, expect } from 'vitest';
import {
  findAvailableEvents,
  isAvailable,
  locationsWithSomethingNew,
  pickEvent,
  recentEmotionsOf,
} from './experienceEngine';
import type { EmotionTarget, ExperienceEventDef, ExperienceWorldView } from './types';

// The engine under test knows nothing about MUGEN. These fixtures are
// deliberately about a different, imaginary game — if a test here ever
// needs Gald, the engine has grown a dependency it must not have.

function view(
  partial: Partial<ExperienceWorldView> & {
    memories?: string[];
    seen?: string[];
    lastSeen?: Record<string, number>;
  },
): ExperienceWorldView {
  const memories = new Set(partial.memories ?? []);
  const seen = new Set(partial.seen ?? []);
  const lastSeen = partial.lastSeen ?? {};
  return {
    hasMemory: (type: string) => memories.has(type),
    hasSeen: (eventId: string) => seen.has(eventId),
    worldYear: partial.worldYear ?? 1,
    worldDay: partial.worldDay ?? 1,
    today: partial.today,
    lastSeenDay: (id: string) => lastSeen[id] ?? null,
    recentEmotions: partial.recentEmotions,
    unresolvedSeeds: partial.unresolvedSeeds,
  };
}

const def = (over: Partial<ExperienceEventDef> = {}): ExperienceEventDef => ({
  eventId: 'E',
  layer: 'NOW',
  location: 'HARBOUR',
  once: true,
  priority: 10,
  content: null,
  ...over,
});

describe('EXPERIENCE ENGINE — availability', () => {
  it('an unconditional event is available', () => {
    expect(isAvailable(def(), view({}))).toBe(true);
  });

  it('a once-event never comes round again', () => {
    expect(isAvailable(def({ eventId: 'A' }), view({ seen: ['A'] }))).toBe(false);
  });

  it('a repeatable event does come round again', () => {
    expect(isAvailable(def({ eventId: 'A', once: false }), view({ seen: ['A'] }))).toBe(true);
  });

  it('every requirement must hold, not just one', () => {
    const d = def({
      requirements: [
        { kind: 'MEMORY_PRESENT', type: 'STORM' },
        { kind: 'MEMORY_ABSENT', type: 'HARVEST' },
      ],
    });
    expect(isAvailable(d, view({ memories: ['STORM'] }))).toBe(true);
    expect(isAvailable(d, view({ memories: ['STORM', 'HARVEST'] }))).toBe(false);
    expect(isAvailable(d, view({ memories: [] }))).toBe(false);
  });

  it('handles each requirement kind', () => {
    const anyOf = def({ requirements: [{ kind: 'ANY_MEMORY_PRESENT', types: ['A', 'B'] }] });
    expect(isAvailable(anyOf, view({ memories: ['B'] }))).toBe(true);
    expect(isAvailable(anyOf, view({ memories: ['C'] }))).toBe(false);

    const year = def({ requirements: [{ kind: 'MIN_WORLD_YEAR', year: 4 }] });
    expect(isAvailable(year, view({ worldYear: 3 }))).toBe(false);
    expect(isAvailable(year, view({ worldYear: 4 }))).toBe(true);

    const after = def({ requirements: [{ kind: 'SEEN', eventId: 'INTRO' }] });
    expect(isAvailable(after, view({}))).toBe(false);
    expect(isAvailable(after, view({ seen: ['INTRO'] }))).toBe(true);

    const before = def({ requirements: [{ kind: 'NOT_SEEN', eventId: 'INTRO' }] });
    expect(isAvailable(before, view({}))).toBe(true);
    expect(isAvailable(before, view({ seen: ['INTRO'] }))).toBe(false);
  });
});

describe('EXPERIENCE ENGINE — selection', () => {
  const defs = [
    def({ eventId: 'LOW', priority: 10 }),
    def({ eventId: 'HIGH', priority: 90 }),
    def({ eventId: 'MID', priority: 50 }),
    def({ eventId: 'ELSEWHERE', location: 'MOUNTAIN', priority: 99 }),
    def({ eventId: 'NEXT_ONE', layer: 'NEXT', priority: 20 }),
  ];

  it('picks the highest priority available event at a place', () => {
    expect(pickEvent(defs, view({}), { location: 'HARBOUR' })?.eventId).toBe('HIGH');
  });

  it('never reaches across places', () => {
    const ids = findAvailableEvents(defs, view({}), { location: 'HARBOUR' }).map((d) => d.eventId);
    expect(ids).not.toContain('ELSEWHERE');
    expect(pickEvent(defs, view({}), { location: 'MOUNTAIN' })?.eventId).toBe('ELSEWHERE');
  });

  it('can be asked for one layer at a time', () => {
    const next = findAvailableEvents(defs, view({}), { layer: 'NEXT' });
    expect(next.map((d) => d.eventId)).toEqual(['NEXT_ONE']);
  });

  it('falls through to the next event once the first is seen', () => {
    expect(pickEvent(defs, view({ seen: ['HIGH'] }), { location: 'HARBOUR' })?.eventId).toBe('MID');
  });

  it('returns null when a place is exhausted — never an error', () => {
    const seen = defs.map((d) => d.eventId);
    expect(pickEvent(defs, view({ seen }), { location: 'HARBOUR' })).toBeNull();
  });

  it('is deterministic: equal priorities keep definition order', () => {
    const tied = [def({ eventId: 'FIRST', priority: 5 }), def({ eventId: 'SECOND', priority: 5 })];
    for (let i = 0; i < 5; i++) {
      expect(findAvailableEvents(tied, view({})).map((d) => d.eventId)).toEqual([
        'FIRST',
        'SECOND',
      ]);
    }
  });

  it('reports which places have something new, and stops when they do not', () => {
    expect(locationsWithSomethingNew(defs, view({}))).toEqual(new Set(['HARBOUR', 'MOUNTAIN']));
    const seen = defs.map((d) => d.eventId);
    expect(locationsWithSomethingNew(defs, view({ seen }))).toEqual(new Set());
  });

  it('a repeatable event is never "something new"', () => {
    const withRegular = [
      ...defs,
      def({ eventId: 'REGULAR', location: 'INN', once: false, priority: 1 }),
    ];
    const seen = defs.map((d) => d.eventId);
    // The inn always has something to play...
    expect(pickEvent(withRegular, view({ seen }), { location: 'INN' })?.eventId).toBe('REGULAR');
    // ...but it is never marked as news.
    expect(locationsWithSomethingNew(withRegular, view({ seen }))).toEqual(new Set());
    expect(locationsWithSomethingNew(withRegular, view({}))).not.toContain('INN');
  });
});


describe('EXPERIENCE CONTROL v0.2 — pacing', () => {
  const withEmotion = (id: string, emotion: EmotionTarget, priority = 10) =>
    def({
      eventId: id,
      priority,
      dna: { emotionTarget: emotion, expectedEffect: 'test' },
    });

  it('a repeatable event rests for its cooldown, then returns', () => {
    const regular = def({ eventId: 'REGULAR', once: false, cooldownDays: 5 });
    expect(isAvailable(regular, view({ lastSeen: { REGULAR: 10 }, today: 12 }))).toBe(false);
    expect(isAvailable(regular, view({ lastSeen: { REGULAR: 10 }, today: 15 }))).toBe(true);
    // Never played: nothing to wait for.
    expect(isAvailable(regular, view({ today: 12 }))).toBe(true);
  });

  it('a once-event ignores cooldown entirely', () => {
    const single = def({ eventId: 'ONCE', once: true, cooldownDays: 99 });
    expect(isAvailable(single, view({ lastSeen: { ONCE: 1 }, today: 2 }))).toBe(true);
  });

  it('rarity nudges an event down its tier without blocking it', () => {
    const defs = [
      def({ eventId: 'RARE_ONE', priority: 10, rarity: 'RARE' }),
      def({ eventId: 'PLAIN', priority: 10 }),
    ];
    expect(findAvailableEvents(defs, view({})).map((d) => d.eventId)).toEqual([
      'PLAIN',
      'RARE_ONE',
    ]);
    // Alone, the rare one still plays.
    expect(pickEvent([defs[0]], view({}))?.eventId).toBe('RARE_ONE');
  });

  it('breaks a run of the same feeling, among equals', () => {
    const defs = [withEmotion('JOKE_B', 'HUMOR'), withEmotion('KIND', 'WARMTH')];
    // Nothing recent: definition order wins.
    expect(pickEvent(defs, view({}))?.eventId).toBe('JOKE_B');
    // Two jokes just landed: take the other one.
    expect(pickEvent(defs, view({ recentEmotions: ['HUMOR', 'HUMOR'] }))?.eventId).toBe('KIND');
  });

  it('never lets variety outrank importance', () => {
    const defs = [
      withEmotion('BIG_NEWS', 'HUMOR', 90),
      withEmotion('SMALL_TALK', 'WARMTH', 10),
    ];
    // The joke-shaped event is the important one; it still goes first.
    expect(pickEvent(defs, view({ recentEmotions: ['HUMOR', 'HUMOR'] }))?.eventId).toBe(
      'BIG_NEWS',
    );
  });

  it('would rather repeat a feeling than leave the player nothing', () => {
    const only = [withEmotion('ONLY_JOKE', 'HUMOR')];
    expect(pickEvent(only, view({ recentEmotions: ['HUMOR', 'HUMOR'] }))?.eventId).toBe(
      'ONLY_JOKE',
    );
  });

  it('stops planting questions once too many are open', () => {
    const seedDef = def({
      eventId: 'NEW_MYSTERY',
      priority: 90,
      dna: { emotionTarget: 'CURIOSITY', expectedEffect: 'x', seed: { id: 'S', role: 'PLANTS' } },
    });
    const ordinary = def({ eventId: 'ORDINARY', priority: 10 });
    const defs = [seedDef, ordinary];
    expect(pickEvent(defs, view({ unresolvedSeeds: 0 }))?.eventId).toBe('NEW_MYSTERY');
    expect(pickEvent(defs, view({ unresolvedSeeds: 2 }))?.eventId).toBe('ORDINARY');
    // ...unless holding back would mean showing nothing at all.
    expect(pickEvent([seedDef], view({ unresolvedSeeds: 5 }))?.eventId).toBe('NEW_MYSTERY');
  });

  it('reads recent feelings off the events actually played', () => {
    const defs = [withEmotion('A', 'HUMOR'), withEmotion('B', 'WARMTH'), def({ eventId: 'C' })];
    expect(recentEmotionsOf(defs, ['B', 'C', 'A'], 3)).toEqual(['WARMTH', 'HUMOR']);
    expect(recentEmotionsOf(defs, ['B', 'A'], 1)).toEqual(['WARMTH']);
  });

  it('stays deterministic: the same world plays the same sequence', () => {
    const defs = [withEmotion('A', 'HUMOR'), withEmotion('B', 'WARMTH', 20)];
    const v = view({ recentEmotions: ['WARMTH'] });
    const picks = Array.from({ length: 5 }, () => pickEvent(defs, v)?.eventId);
    expect(new Set(picks).size).toBe(1);
  });
});
