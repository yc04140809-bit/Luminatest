import { describe, it, expect } from 'vitest';
import { ALDEN_EXPERIENCE_EVENTS } from './aldenExperience';
import { findAvailableEvents, pickEvent } from '../../core/experience/experienceEngine';
import type { ExperienceWorldView } from '../../core/experience/types';

function view(memories: string[], seen: string[] = [], worldYear = 1): ExperienceWorldView {
  return {
    hasMemory: (t) => memories.includes(t),
    hasSeen: (id) => seen.includes(id),
    worldYear,
    worldDay: 1,
  };
}

const ROUTE_RUMORS = [
  ['GALD_LEAVES_BANDITS', 'ALDEN_RUMOR_GALD_LEFT_THE_BANDITS'],
  ['GALD_WALKS_THE_ROAD', 'ALDEN_RUMOR_GALD_ON_THE_ROAD'],
  ['GALD_STANDS_TRIAL', 'ALDEN_RUMOR_GALD_SENTENCED'],
  ['GALD_IS_BURIED', 'ALDEN_RUMOR_STONES_AT_THE_FOREST'],
] as const;

describe('ALDEN EXPERIENCE — rumours follow world memory', () => {
  it.each(ROUTE_RUMORS)('%s produces exactly its own rumour', (memory, rumorId) => {
    const available = findAvailableEvents(ALDEN_EXPERIENCE_EVENTS, view([memory]), {
      location: 'MOONLIGHT_TAVERN',
    }).map((d) => d.eventId);
    expect(available).toContain(rumorId);
    for (const [, otherId] of ROUTE_RUMORS) {
      if (otherId !== rumorId) expect(available).not.toContain(otherId);
    }
  });

  it('a world where nothing has happened yet has no rumours at all', () => {
    const available = findAvailableEvents(ALDEN_EXPERIENCE_EVENTS, view([]), {
      location: 'MOONLIGHT_TAVERN',
    }).map((d) => d.eventId);
    for (const [, rumorId] of ROUTE_RUMORS) expect(available).not.toContain(rumorId);
  });

  it('no rumour names the place the player has to find', () => {
    const forbidden = ['パン屋', '救護所', '作業場', '墓'];
    for (const [, rumorId] of ROUTE_RUMORS) {
      const def = ALDEN_EXPERIENCE_EVENTS.find((d) => d.eventId === rumorId)!;
      const text = def.content.lines.map((l) => l.text).join('');
      for (const word of forbidden) {
        expect(text, `${rumorId} must not say ${word}`).not.toContain(word);
      }
      expect(text).not.toContain('ガルド');
    }
  });
});

describe('ALDEN EXPERIENCE — the shape of a session', () => {
  it('the tavern greets you before it gossips at you', () => {
    // With a rumour already due, the first visit still comes first.
    expect(
      pickEvent(ALDEN_EXPERIENCE_EVENTS, view(['GALD_LEAVES_BANDITS']), {
        location: 'MOONLIGHT_TAVERN',
      })?.eventId,
    ).toBe('MOONLIGHT_TAVERN_FIRST_VISIT');
  });

  it("the tavern's NEXT seeds wait until it is familiar, then arrive", () => {
    const tavernNext = (seen: string[]) =>
      findAvailableEvents(ALDEN_EXPERIENCE_EVENTS, view([], seen), {
        layer: 'NEXT',
        location: 'MOONLIGHT_TAVERN',
      }).map((d) => d.eventId);
    expect(tavernNext([])).toHaveLength(0);
    expect(tavernNext(['MOONLIGHT_TAVERN_FIRST_VISIT'])).toEqual([
      'TAVERN_MASTER_OLD_GREATSWORD',
      'GREENWOOD_DEEPER_PATH_RUMOR',
    ]);
  });

  it('every NEXT event plants a seed, and none of them resolves one yet', () => {
    const next = ALDEN_EXPERIENCE_EVENTS.filter((d) => d.layer === 'NEXT');
    expect(next.map((d) => d.dna?.seed?.id).sort()).toEqual([
      'ALDEN_UNSIGNED_LETTER',
      'GREENWOOD_DEEP_PATH',
      'TAVERN_MASTER_OLD_GREATSWORD',
    ]);
    expect(next.every((d) => d.dna?.seed?.role === 'PLANTS')).toBe(true);
  });

  it('most of the world is not a clue', () => {
    // If everything were foreshadowing, nothing would be.
    const withSeed = ALDEN_EXPERIENCE_EVENTS.filter((d) => d.dna?.seed).length;
    expect(withSeed).toBeLessThan(ALDEN_EXPERIENCE_EVENTS.length / 3);
  });

  it('the tavern master never explains himself in this build', () => {
    const sword = ALDEN_EXPERIENCE_EVENTS.find(
      (d) => d.eventId === 'TAVERN_MASTER_OLD_GREATSWORD',
    )!;
    const text = sword.content.lines.map((l) => l.text).join('');
    // He is clearly someone. What he was is not on the page.
    for (const spoiler of ['冒険者', '戦士団', '戦場', '傭兵', '騎士']) {
      expect(text, `Grave must not be explained by "${spoiler}"`).not.toContain(spoiler);
    }
  });

  it('the tavern always has a word, even when it has no news', () => {
    const everythingSeen = ALDEN_EXPERIENCE_EVENTS.map((d) => d.eventId);
    const event = pickEvent(ALDEN_EXPERIENCE_EVENTS, view([], everythingSeen), {
      location: 'MOONLIGHT_TAVERN',
    });
    expect(event?.eventId).toBe('TAVERN_MASTER_IDLE');
    expect(event?.once).toBe(false);
  });

  it('the village has small things to find from the very first visit', () => {
    const now = findAvailableEvents(ALDEN_EXPERIENCE_EVENTS, view([]), {
      location: 'ALDEN_VILLAGE',
      layer: 'NOW',
    });
    expect(now.length).toBeGreaterThanOrEqual(2);
  });

  it('covers four different feelings, not four of the same', () => {
    const targets = new Set(
      ALDEN_EXPERIENCE_EVENTS.map((d) => d.dna?.emotionTarget).filter(Boolean),
    );
    for (const wanted of ['DISCOVERY', 'HUMOR', 'CURIOSITY', 'WARMTH']) {
      expect(targets, `no event targets ${wanted}`).toContain(wanted);
    }
  });

  it('is not all one note: curiosity, warmth and a joke are all present', () => {
    const targets = new Set(ALDEN_EXPERIENCE_EVENTS.map((d) => d.dna?.emotionTarget));
    expect(targets).toContain('CURIOSITY');
    expect(targets).toContain('WARMTH');
    expect(targets).toContain('HUMOR');
  });

  it('every event carries its DNA and a unique id', () => {
    const ids = ALDEN_EXPERIENCE_EVENTS.map((d) => d.eventId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of ALDEN_EXPERIENCE_EVENTS) {
      expect(d.dna?.expectedEffect, `${d.eventId} needs an expectedEffect`).toBeTruthy();
      expect(d.content.lines.length).toBeGreaterThan(0);
    }
  });

  it('a village walked dry goes quiet instead of repeating itself', () => {
    const allSeen = ALDEN_EXPERIENCE_EVENTS.map((d) => d.eventId);
    const worldView = {
      ...view(['GALD_LEAVES_BANDITS'], allSeen),
      // The one repeatable villager beat is still resting.
      today: 1,
      lastSeenDay: () => 1,
    };
    expect(pickEvent(ALDEN_EXPERIENCE_EVENTS, worldView, { location: 'ALDEN_VILLAGE' })).toBeNull();
  });
});
