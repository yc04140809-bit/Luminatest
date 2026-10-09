import { describe, expect, it } from 'vitest';
import {
  TAVERN_GUESTS,
  TAVERN_GUEST_IDS,
  TAVERN_GUEST_NIGHTS,
  TAVERN_GUEST_TALKS,
  guestLabelOf,
  guestLines,
  tonightsGuestTalk,
} from './tavernGuests';
import { GRAVE_STORY_TALKS } from './graveTalks';

/** 酒場の客 (2026-10-09): five silhouettes, any number of strangers. */

describe('the five', () => {
  it('are the order’s five ids, each with a plain label and no name', () => {
    expect([...TAVERN_GUEST_IDS].sort()).toEqual(
      ['tavern_guest_bard', 'tavern_guest_female', 'tavern_guest_hooded', 'tavern_guest_male', 'tavern_guest_warrior'].sort(),
    );
    const labels = ['客', '旅人', '冒険者', '吟遊詩人', '怪しい客', '戦士'];
    for (const id of TAVERN_GUEST_IDS) expect(labels).toContain(TAVERN_GUESTS[id].label);
    for (const t of TAVERN_GUEST_TALKS) expect(labels, t.id).toContain(guestLabelOf(t));
  });

  it('every one of them has something to say', () => {
    for (const id of TAVERN_GUEST_IDS) expect(TAVERN_GUEST_TALKS.some((t) => t.guest === id), id).toBe(true);
  });
});

describe('what a stranger says', () => {
  it('is short — one to three lines — and all theirs', () => {
    for (const t of TAVERN_GUEST_TALKS) {
      expect(t.lines.length, t.id).toBeGreaterThanOrEqual(1);
      expect(t.lines.length, t.id).toBeLessThanOrEqual(3);
      for (const l of guestLines(t)) expect(l.speaker).toBe(guestLabelOf(t));
    }
    expect(new Set(TAVERN_GUEST_TALKS.map((t) => t.id)).size).toBe(TAVERN_GUEST_TALKS.length);
  });

  it('takes nobody’s part: no Grave, Lina, Gald, Kaos — nothing named that lies ahead', () => {
    const all = TAVERN_GUEST_TALKS.flatMap((t) => t.lines).join('');
    expect(all).not.toMatch(/グレイヴ|リナ|ガルド|ケイオス|セキリュウガ|封印|遺跡/);
    // And none of Grave's own talks is spoken by a guest.
    const graves = GRAVE_STORY_TALKS.flatMap((t) => t.lines.map((l) => l.text));
    for (const t of TAVERN_GUEST_TALKS) for (const l of t.lines) expect(graves).not.toContain(l);
  });
});

describe('本日の客', () => {
  it('turns with the day, and every name in the turn is a talk', () => {
    for (const id of TAVERN_GUEST_NIGHTS) expect(TAVERN_GUEST_TALKS.some((t) => t.id === id), id).toBe(true);
    expect(tonightsGuestTalk(1).id).toBe(TAVERN_GUEST_NIGHTS[0]);
    expect(tonightsGuestTalk(2).id).toBe(TAVERN_GUEST_NIGHTS[1]);
    expect(tonightsGuestTalk(1 + TAVERN_GUEST_NIGHTS.length).id).toBe(TAVERN_GUEST_NIGHTS[0]);
    // Every talk comes round.
    const seen = new Set(Array.from({ length: TAVERN_GUEST_NIGHTS.length }, (_, i) => tonightsGuestTalk(i + 1).id));
    expect(seen.size).toBe(TAVERN_GUEST_TALKS.length);
  });

  it('the hooded guest is rare: one night in seven', () => {
    const nights = Array.from({ length: 28 }, (_, i) => tonightsGuestTalk(i + 1).guest);
    expect(nights.filter((g) => g === 'tavern_guest_hooded')).toHaveLength(4);
  });

  it('every silhouette is seen within a week or so', () => {
    const fortnight = new Set(Array.from({ length: 14 }, (_, i) => tonightsGuestTalk(i + 1).guest));
    expect(fortnight.size).toBe(5);
  });
});
