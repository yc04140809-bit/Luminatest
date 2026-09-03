import { describe, it, expect } from 'vitest';
import { direct, pickEvent, buildExperienceState, DEFAULT_DIRECTOR_CONTROL } from './director';
import type { ExperienceEventDef, ExperienceWorldView } from './types';

// Like the engine's tests, these are about an imaginary game. The
// director must never need to know what MUGEN is.

function view(
  partial: Partial<ExperienceWorldView> & { memories?: string[]; seen?: string[] } = {},
): ExperienceWorldView {
  const memories = new Set(partial.memories ?? []);
  const seen = new Set(partial.seen ?? []);
  return {
    hasMemory: (t) => memories.has(t),
    hasSeen: (id) => seen.has(id),
    worldYear: partial.worldYear ?? 1,
    worldDay: partial.worldDay ?? 1,
    today: partial.today ?? 1,
    lastSeenDay: () => null,
    recentEventIds: partial.recentEventIds,
    recentEmotions: partial.recentEmotions,
    unresolvedSeeds: partial.unresolvedSeeds,
    lifeEventAvailable: partial.lifeEventAvailable,
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

const joke = (id: string, priority = 10) =>
  def({ eventId: id, priority, dna: { emotionTarget: 'HUMOR', expectedEffect: 'a laugh' } });
const kind = (id: string, priority = 10) =>
  def({ eventId: id, priority, dna: { emotionTarget: 'WARMTH', expectedEffect: 'a welcome' } });

describe('EXPERIENCE DIRECTOR — reading the recent past', () => {
  it('derives feelings, faces and layers from the event log alone', () => {
    const defs = [
      joke('A'),
      def({
        eventId: 'B',
        layer: 'NEXT',
        dna: { emotionTarget: 'CURIOSITY', expectedEffect: 'x', characters: ['SMITH'] },
      }),
    ];
    const state = buildExperienceState(defs, view({ recentEventIds: ['B', 'A'] }));
    expect(state.recentEmotions).toEqual(['CURIOSITY', 'HUMOR']);
    expect(state.recentCharacters).toEqual(['SMITH']);
    expect(state.recentLayers).toEqual(['NEXT', 'NOW']);
    expect(state.eventsSinceLastSurprise).toBe(0);
  });

  it('a player who has just arrived is not in a drought', () => {
    expect(buildExperienceState([], view({})).eventsSinceLastSurprise).toBe(0);
  });

  it('ignores ids it does not recognise instead of failing', () => {
    const state = buildExperienceState([joke('A')], view({ recentEventIds: ['GONE', 'A'] }));
    expect(state.recentEmotions).toEqual(['HUMOR']);
  });
});

describe('EXPERIENCE DIRECTOR — pacing rules', () => {
  it('pushes down a feeling the player just had, twice over', () => {
    const defs = [joke('JOKE'), kind('KIND')];
    // Nothing recent: the author's order stands.
    expect(pickEvent(defs, view({}))?.eventId).toBe('JOKE');
    expect(pickEvent(defs, view({ recentEventIds: ['JOKE_EARLIER'] }))?.eventId).toBe('JOKE');
    // Two jokes just landed: take the other one.
    const after = view({ recentEmotions: ['HUMOR', 'HUMOR'] });
    expect(pickEvent(defs, after)?.eventId).toBe('KIND');
  });

  it('pushes down a face the player just met', () => {
    const withSmith = (id: string) =>
      def({
        eventId: id,
        dna: { emotionTarget: 'WARMTH', expectedEffect: 'x', characters: ['SMITH'] },
      });
    const played = withSmith('SMITH_EARLIER');
    const again = withSmith('SMITH_AGAIN');
    const other = def({ eventId: 'SOMEONE_ELSE', priority: 9 });
    const defs = [played, again, other];
    expect(pickEvent(defs, view({}))?.eventId).toBe('SMITH_EARLIER');
    // He was here a moment ago; give the street to somebody else.
    const met = view({ recentEventIds: ['SMITH_EARLIER'], seen: ['SMITH_EARLIER'] });
    expect(pickEvent(defs, met)?.eventId).toBe('SOMEONE_ELSE');
  });

  it('holds back new questions once too many are open', () => {
    const seedDef = def({
      eventId: 'NEW_MYSTERY',
      priority: 30,
      dna: { emotionTarget: 'CURIOSITY', expectedEffect: 'x', seed: { id: 'S', role: 'PLANTS' } },
    });
    const ordinary = def({ eventId: 'ORDINARY', priority: 20 });
    const defs = [seedDef, ordinary];
    expect(pickEvent(defs, view({ unresolvedSeeds: 0 }))?.eventId).toBe('NEW_MYSTERY');
    expect(pickEvent(defs, view({ unresolvedSeeds: 2 }))?.eventId).toBe('ORDINARY');
    // It is a penalty, not a gate: the only thing here still plays.
    expect(pickEvent([seedDef], view({ unresolvedSeeds: 5 }))?.eventId).toBe('NEW_MYSTERY');
  });

  it('a big enough question is still worth asking', () => {
    const bigSeed = def({
      eventId: 'THE_BODY',
      priority: 90,
      dna: { emotionTarget: 'CURIOSITY', expectedEffect: 'x', seed: { id: 'S', role: 'PLANTS' } },
    });
    const chatter = def({ eventId: 'CHATTER', priority: 10 });
    expect(pickEvent([bigSeed, chatter], view({ unresolvedSeeds: 4 }))?.eventId).toBe('THE_BODY');
  });

  it('protects a LIFE beat from being buried by ambient chatter', () => {
    // The quietest possible LIFE beat against the loudest possible noise.
    const life = def({ eventId: 'HE_CAME_BACK', layer: 'LIFE', priority: 1 });
    const loud = def({ eventId: 'MARKET_NOISE', priority: 99 });
    expect(pickEvent([loud, life], view({}))?.eventId).toBe('HE_CAME_BACK');
  });

  it('prefers talk of a life that moved on while that life is still findable', () => {
    const rumour = def({
      eventId: 'RUMOUR',
      priority: 20,
      requirements: [{ kind: 'MEMORY_PRESENT', type: 'HE_LEFT' }],
    });
    const chatter = def({ eventId: 'CHATTER', priority: 24 });
    const withMemory = { memories: ['HE_LEFT'] };
    expect(pickEvent([chatter, rumour], view(withMemory))?.eventId).toBe('CHATTER');
    expect(
      pickEvent([chatter, rumour], view({ ...withMemory, lifeEventAvailable: true }))?.eventId,
    ).toBe('RUMOUR');
  });

  it('lifts a NEXT beat when the window has been nothing but NOW', () => {
    const next = def({ eventId: 'A_PATH', layer: 'NEXT', priority: 10 });
    const now = def({ eventId: 'A_CART', priority: 12 });
    const defs = [now, next];
    expect(pickEvent(defs, view({}))?.eventId).toBe('A_CART');
    const threeNows = view({ recentEventIds: ['N1', 'N2', 'N3'] });
    // Unknown ids give no layers, so the rule does not fire on guesswork.
    expect(pickEvent(defs, threeNows)?.eventId).toBe('A_CART');
    const played = [def({ eventId: 'N1' }), def({ eventId: 'N2' }), def({ eventId: 'N3' })];
    expect(
      pickEvent([...defs, ...played], view({ recentEventIds: ['N1', 'N2', 'N3'] }))?.eventId,
    ).toBe('A_PATH');
  });

  it('nudges curiosity after a whole window without a discovery', () => {
    const curious = def({
      eventId: 'ODD_LIGHT',
      priority: 10,
      dna: { emotionTarget: 'CURIOSITY', expectedEffect: 'x' },
    });
    const plain = def({ eventId: 'PLAIN', priority: 12 });
    expect(pickEvent([plain, curious], view({}))?.eventId).toBe('PLAIN');
    const dry = view({ recentEmotions: ['HUMOR', 'WARMTH', 'HUMOR'] });
    expect(pickEvent([plain, curious], dry)?.eventId).toBe('ODD_LIGHT');
  });

  it('never pushes down a core beat, whatever it just showed', () => {
    const core = def({
      eventId: 'THE_MEETING',
      priority: 30,
      core: true,
      dna: {
        emotionTarget: 'HUMOR',
        expectedEffect: 'x',
        characters: ['SMITH'],
        seed: { id: 'S', role: 'PLANTS' },
      },
    });
    const rival = def({ eventId: 'RIVAL', priority: 20 });
    const loaded = view({ recentEmotions: ['HUMOR', 'HUMOR', 'HUMOR'], unresolvedSeeds: 9 });
    expect(pickEvent([core, rival], loaded)?.eventId).toBe('THE_MEETING');
    const hits = direct([core, rival], loaded).scores[0].hits;
    expect(hits.every((h) => h.delta >= 0)).toBe(true);
  });
});

describe('EXPERIENCE DIRECTOR — what it must never do', () => {
  it('never makes an ineligible event eligible', () => {
    const locked = def({
      eventId: 'LOCKED',
      priority: 99,
      requirements: [{ kind: 'MEMORY_PRESENT', type: 'NEVER_HAPPENED' }],
    });
    const open = def({ eventId: 'OPEN', priority: 1 });
    const decision = direct([locked, open], view({}));
    expect(decision.selected?.eventId).toBe('OPEN');
    expect(decision.scores.map((s) => s.def.eventId)).not.toContain('LOCKED');
  });

  it('allows a quiet moment: nothing eligible means nothing happens', () => {
    const decision = direct([def({ eventId: 'A' })], view({ seen: ['A'] }));
    expect(decision.selected).toBeNull();
    expect(decision.quiet).toBe(true);
    expect(decision.scores).toEqual([]);
  });

  it('never invents an event to fill silence', () => {
    expect(direct([], view({ recentEmotions: ['HUMOR', 'HUMOR', 'HUMOR'] })).selected).toBeNull();
  });

  it('touches nothing: the same view can be directed over and over', () => {
    const defs = [joke('A'), kind('B', 12)];
    const v = view({ recentEventIds: ['A'] });
    const picks = Array.from({ length: 5 }, () => direct(defs, v).selected?.eventId);
    expect(new Set(picks).size).toBe(1);
    // The view is a read-only window; directing it cannot have changed it.
    expect(v.hasSeen('A')).toBe(false);
  });

  it('explains itself: every adjustment carries a rule and a reason', () => {
    const defs = [joke('A'), kind('B')];
    const decision = direct(defs, view({ recentEmotions: ['HUMOR', 'HUMOR'] }));
    const jokeScore = decision.scores.find((s) => s.def.eventId === 'A');
    expect(jokeScore?.base).toBe(10);
    expect(jokeScore?.final).toBe(10 - 2 * DEFAULT_DIRECTOR_CONTROL.emotionRepeatPenalty);
    expect(jokeScore?.hits[0]).toMatchObject({ rule: 'EMOTION_REPEAT' });
    expect(jokeScore?.hits[0].reason).toContain('HUMOR');
  });
});
