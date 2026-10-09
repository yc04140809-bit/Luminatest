import { describe, expect, it } from 'vitest';
import {
  TAVERN_GUESTS,
  TAVERN_GUEST_IDS,
  TAVERN_GUEST_NIGHTS,
  TAVERN_GUEST_TALKS,
  guestLabelOf,
  guestLines,
  guestOwnLines,
  tonightsGuestTalk,
} from './tavernGuests';
import { GRAVE_STORY_TALKS } from './graveTalks';
import { tavernTrade } from '../economy/tavernTrades';
import { HERO_SPEAKER } from '../story/sekiryugaArc';

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
  it('is short — one to three of their own lines — under their label, the hero’s answers under the hero', () => {
    for (const t of TAVERN_GUEST_TALKS) {
      expect(guestOwnLines(t).length, t.id).toBeGreaterThanOrEqual(1);
      expect(guestOwnLines(t).length, t.id).toBeLessThanOrEqual(3);
      for (const [i, l] of guestLines(t).entries()) {
        expect(l.speaker).toBe(typeof t.lines[i] === 'string' ? guestLabelOf(t) : HERO_SPEAKER);
      }
    }
    expect(new Set(TAVERN_GUEST_TALKS.map((t) => t.id)).size).toBe(TAVERN_GUEST_TALKS.length);
  });

  it('takes nobody’s part: no Grave, Lina, Gald, Kaos — nothing named that lies ahead', () => {
    const all = TAVERN_GUEST_TALKS.flatMap((t) => guestLines(t).map((l) => l.text)).join('');
    expect(all).not.toMatch(/グレイヴ|リナ|ガルド|ケイオス|セキリュウガ|封印|遺跡/);
    // And none of Grave's own talks is spoken by a guest.
    const graves = GRAVE_STORY_TALKS.flatMap((t) => t.lines.map((l) => l.text));
    for (const t of TAVERN_GUEST_TALKS) for (const l of guestOwnLines(t)) expect(graves).not.toContain(l);
  });

  it('some of it is a laugh, not a hint', () => {
    expect(TAVERN_GUEST_TALKS.some((t) => t.lines.some((l) => typeof l !== 'string'))).toBe(true);
  });
});

describe('what a stranger offers (酒場ハブ化 Phase 1)', () => {
  it('a swap names a swap that exists; the bard opens the archive; words only otherwise', () => {
    for (const t of TAVERN_GUEST_TALKS) {
      if (t.role === 'TRADE' || t.role === 'RARE_TRADE') {
        const trade = tavernTrade(t.tradeId);
        expect(trade, t.id).not.toBeNull();
        expect(!!trade!.rare, t.id).toBe(t.role === 'RARE_TRADE');
      } else expect(t.tradeId, t.id).toBeUndefined();
      expect(t.musicRole === 'ARCHIVE', t.id).toBe(t.role === 'BARD');
    }
  });

  it('each does what the order gives them: rare swaps are the hooded guest’s alone, the archive the bard’s', () => {
    for (const t of TAVERN_GUEST_TALKS) {
      expect(TAVERN_GUESTS[t.guest].roles, t.id).toContain(t.role);
      if (t.role === 'RARE_TRADE') expect(t.guest).toBe('tavern_guest_hooded');
      if (t.guest === 'tavern_guest_hooded') expect(t.role).toBe('RARE_TRADE');
      if (t.role === 'BARD') expect(t.guest).toBe('tavern_guest_bard');
    }
  });

  it('in a fortnight: the bard twice, the hooded guest twice, and swaps on more nights than not', () => {
    const f = Array.from({ length: 14 }, (_, i) => tonightsGuestTalk(i + 1));
    expect(f.filter((t) => t.role === 'BARD')).toHaveLength(2);
    expect(f.filter((t) => t.role === 'RARE_TRADE')).toHaveLength(2);
    expect(f.filter((t) => t.role === 'TRADE').length).toBeGreaterThanOrEqual(6);
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
