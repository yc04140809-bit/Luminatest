import { describe, it, expect } from 'vitest';
import { homeMemorySummary } from './homeSummary';
import type { MemoryEvent } from '../../core/memory/types';
import type { NarrativeSeedStatus } from '../../core/narrative/types';

const event = (over: Partial<MemoryEvent>): MemoryEvent => ({
  id: `e${Math.random()}`,
  type: 'PLAYER_SPARED_GALD',
  worldYear: 1,
  worldDay: 1,
  actors: ['PLAYER', 'GALD'],
  importance: 'CRITICAL',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const seed = (playerKnown: boolean, state: NarrativeSeedStatus['state']): NarrativeSeedStatus => ({
  def: {
    seedId: 's',
    title: 't',
    sourceEventId: 'x',
    relatedCharacters: [],
    relatedLocations: [],
  },
  state,
  playerKnown,
});

describe('HOME summary', () => {
  it('an untouched world says nothing rather than zero-everything', () => {
    const summary = homeMemorySummary([], []);
    expect(summary).toEqual({
      memories: 0,
      encounters: 0,
      reunions: 0,
      openThreads: 0,
      latest: null,
    });
  });

  it('counts people, not actors: the player and the world are neither', () => {
    const summary = homeMemorySummary(
      [
        event({ actors: ['PLAYER', 'GALD'] }),
        event({ type: 'WORLD_TIME_SHIFTED', actors: ['WORLD'] }),
        event({ type: 'GALD_BECOMES_BAKER', actors: ['GALD'] }),
      ],
      [],
    );
    expect(summary.encounters).toBe(1);
    expect(summary.memories).toBe(3);
  });

  it('a reunion is going back, not choosing', () => {
    const summary = homeMemorySummary(
      [event({ type: 'PLAYER_SPARED_GALD' }), event({ type: 'PLAYER_REUNITED_WITH_GALD' })],
      [],
    );
    // The choice is not a reunion; walking back into his life is.
    expect(summary.reunions).toBe(1);
  });

  it('carries only the questions the player actually met', () => {
    const summary = homeMemorySummary(
      [],
      [seed(true, 'HINTED'), seed(false, 'SEED'), seed(true, 'RESOLVED')],
    );
    expect(summary.openThreads).toBe(1);
  });

  it('the latest memory is the last one written, in the player’s words', () => {
    const summary = homeMemorySummary(
      [
        event({ type: 'PLAYER_SPARED_GALD', worldYear: 1, worldDay: 1 }),
        event({ type: 'WORLD_TIME_SHIFTED', worldYear: 4, worldDay: 4, actors: ['WORLD'] }),
      ],
      [],
    );
    expect(summary.latest?.worldYear).toBe(4);
    expect(summary.latest?.label).not.toBe('WORLD_TIME_SHIFTED');
    expect(summary.latest?.label.length).toBeGreaterThan(2);
  });
});
