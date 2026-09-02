import { describe, it, expect } from 'vitest';
import { seedState, seedStatuses, unresolvedSeedCount } from './narrativeSeeds';
import type { NarrativeSeedDef } from './types';
import { ALDEN_NARRATIVE_SEEDS } from '../../content/narrative/aldenSeeds';
import { ALDEN_EXPERIENCE_EVENTS } from '../../content/experience/aldenExperience';

const SEEDS: NarrativeSeedDef[] = [
  {
    seedId: 'A_MYSTERY',
    title: 'A mystery',
    sourceEventId: 'SHOW_A',
    relatedCharacters: [],
    relatedLocations: [],
  },
  {
    seedId: 'B_MYSTERY',
    title: 'A mystery with an answer',
    sourceEventId: 'SHOW_B',
    resolvedByEventId: 'ANSWER_B',
    relatedCharacters: [],
    relatedLocations: [],
  },
];

const seen = (...ids: string[]) => (id: string) => ids.includes(id);

describe('NARRATIVE SEED v0.1', () => {
  it('a seed nobody has met is planted, not known', () => {
    expect(seedState(SEEDS[0], seen())).toBe('SEED');
    expect(seedStatuses(SEEDS, seen())[0].playerKnown).toBe(false);
  });

  it('showing it to the player hints it, and nothing more', () => {
    expect(seedState(SEEDS[0], seen('SHOW_A'))).toBe('HINTED');
    expect(seedStatuses(SEEDS, seen('SHOW_A'))[0].playerKnown).toBe(true);
  });

  it('only its own answer resolves it', () => {
    expect(seedState(SEEDS[1], seen('SHOW_B'))).toBe('HINTED');
    expect(seedState(SEEDS[1], seen('SHOW_B', 'ANSWER_B'))).toBe('RESOLVED');
    // An answer the player never reached the question for is still resolved:
    // the world moved on without them.
    expect(seedState(SEEDS[1], seen('ANSWER_B'))).toBe('RESOLVED');
  });

  it('counts only the questions the player is actually carrying', () => {
    expect(unresolvedSeedCount(SEEDS, seen())).toBe(0);
    expect(unresolvedSeedCount(SEEDS, seen('SHOW_A'))).toBe(1);
    expect(unresolvedSeedCount(SEEDS, seen('SHOW_A', 'SHOW_B'))).toBe(2);
    expect(unresolvedSeedCount(SEEDS, seen('SHOW_A', 'SHOW_B', 'ANSWER_B'))).toBe(1);
  });
});

describe("Alden's seeds", () => {
  it('every seed is shown by an event that really exists', () => {
    for (const seed of ALDEN_NARRATIVE_SEEDS) {
      const source = ALDEN_EXPERIENCE_EVENTS.find((e) => e.eventId === seed.sourceEventId);
      expect(source, `${seed.seedId} has no source event`).toBeDefined();
      expect(source!.dna?.seed?.id).toBe(seed.seedId);
    }
  });

  it('nothing in this build answers anything yet', () => {
    for (const seed of ALDEN_NARRATIVE_SEEDS) {
      expect(seed.resolvedByEventId).toBeUndefined();
    }
  });

  it('one thread belongs to nobody, so the world is not all about Gald', () => {
    const ownerless = ALDEN_NARRATIVE_SEEDS.filter((s) => s.relatedCharacters.length === 0);
    expect(ownerless.length).toBeGreaterThanOrEqual(1);
    // And none of them is Gald's.
    for (const seed of ALDEN_NARRATIVE_SEEDS) {
      expect(seed.relatedCharacters).not.toContain('GALD');
    }
  });
});
