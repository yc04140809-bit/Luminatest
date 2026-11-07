import { describe, expect, it } from 'vitest';
import {
  BAKERY_HERO,
  BAKERY_LINA_AGAIN,
  BAKERY_LINA_FIRST,
  BAKERY_LINA_FIRST_MARK,
  BAKERY_LINA_FULL,
  BAKERY_LINA_SHORT,
  BAKERY_LINA_SOLD,
  BAKERY_OWNER_DESCRIPTION,
  BAKERY_OWNER_HINTS,
  BAKERY_PEOPLE,
} from './bakeryTalk';
import { BAKERY_OWNER } from '../characters/bakeryOwner';
import { LINA } from '../characters/lina';

/**
 * パン屋 MVP (2026-10-09): Lina sells and chats, her father hints at
 * makings — two talks, never mixed; nothing of Gald, nothing ahead of the
 * player, and the owner left unnamed.
 */

const linaSays = [...BAKERY_LINA_FIRST, ...BAKERY_LINA_AGAIN];
const everything = [
  ...linaSays.map((l) => l.text),
  ...BAKERY_OWNER_HINTS.map((l) => l.text),
  BAKERY_LINA_SOLD,
  BAKERY_LINA_SHORT,
  BAKERY_LINA_FULL,
];

describe('who says what', () => {
  it('Lina’s talk is hers (and the hero’s answers); the owner’s is his alone', () => {
    for (const l of linaSays) expect([LINA.name, BAKERY_HERO]).toContain(l.speaker);
    for (const l of BAKERY_OWNER_HINTS) expect(l.speaker).toBe(BAKERY_OWNER.name);
  });

  it('the switch: Lina first, then 主人 — and the owner has no name of his own', () => {
    expect(BAKERY_PEOPLE.map((p) => p.id)).toEqual(['LINA', 'OWNER']);
    expect(BAKERY_PEOPLE.map((p) => p.name)).toEqual([LINA.name, '主人']);
    expect(BAKERY_OWNER.name).toBe('パン屋の主人');
  });

  it('her first talk is the author’s, once in a world', () => {
    expect(BAKERY_LINA_FIRST.map((l) => l.text)).toEqual([
      'いらっしゃい！',
      '今日も焼きたてだよ！',
      'いい匂いだな。',
      'でしょ？',
      'ちゃんと旅にも持っていけるよ！',
      'ちゃんと？',
      '……ちゃんと！',
      '今ちょっと不安になったぞ。',
    ]);
    expect(BAKERY_LINA_FIRST_MARK.startsWith('talk:')).toBe(true);
  });
});

describe('with the owner chosen', () => {
  it('the shop is said as him, standing there — not as “Lina’s father’s shop”', () => {
    expect(BAKERY_OWNER_DESCRIPTION).toBe('パン屋の主人。素材や焼き方に詳しい。');
    expect(BAKERY_OWNER_DESCRIPTION).not.toMatch(/リナの父|ガルド|歳/);
  });
});

describe('what is never said here', () => {
  it('nothing of Gald, of Lina’s future, of her age', () => {
    for (const t of everything) expect(t).not.toMatch(/ガルド|GALD|将来|未来|歳/i);
  });

  it('the owner’s hints give nothing away about what lies ahead', () => {
    for (const l of BAKERY_OWNER_HINTS) expect(l.text).not.toMatch(/セキリュウガ|封印|遺跡|ケイオス|レシピ/);
  });
});
