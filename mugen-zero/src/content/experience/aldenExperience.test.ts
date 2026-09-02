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

  it('the NEXT seed waits until the tavern is familiar, then arrives', () => {
    const before = findAvailableEvents(ALDEN_EXPERIENCE_EVENTS, view([]), { layer: 'NEXT' });
    expect(before).toHaveLength(0);
    const after = findAvailableEvents(
      ALDEN_EXPERIENCE_EVENTS,
      view([], ['MOONLIGHT_TAVERN_FIRST_VISIT']),
      { layer: 'NEXT' },
    );
    expect(after.map((d) => d.eventId)).toEqual(['GREENWOOD_DEEPER_PATH_RUMOR']);
  });

  it('exactly one NEXT event exists, and it plants a seed', () => {
    const next = ALDEN_EXPERIENCE_EVENTS.filter((d) => d.layer === 'NEXT');
    expect(next).toHaveLength(1);
    expect(next[0].dna?.seed).toEqual({ id: 'GREENWOOD_DEEP_PATH', role: 'PLANTS' });
  });

  it('the village has small things to find from the very first visit', () => {
    const now = findAvailableEvents(ALDEN_EXPERIENCE_EVENTS, view([]), {
      location: 'ALDEN_VILLAGE',
    });
    expect(now.length).toBeGreaterThanOrEqual(2);
    expect(now.every((d) => d.layer === 'NOW')).toBe(true);
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
    expect(
      pickEvent(ALDEN_EXPERIENCE_EVENTS, view(['GALD_LEAVES_BANDITS'], allSeen), {
        location: 'ALDEN_VILLAGE',
      }),
    ).toBeNull();
  });
});
