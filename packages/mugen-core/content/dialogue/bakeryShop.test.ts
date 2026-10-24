import { describe, expect, it } from 'vitest';
import { BAKERY_SHOP_DESCRIPTION, BAKERY_SHOP_LINES } from './bakeryShop';
import { BAKERY_OWNER } from '../characters/bakeryOwner';
import { LINA } from '../characters/lina';
import { SEKIRYUGA_RUMORS } from '../story/sekiryugaArc';

/**
 * 作者決定 (2026-10-08): the bakery's 看板娘 is Lina — fourteen, the baker's
 * daughter, nothing added. Gald is not mentioned in the bakery's everyday
 * words: Lina and Gald belong to the story's own events and the three years
 * after, and will be written in with the story and WORLD MEMORY when they are.
 * The shop's rumour is still told by 「道具屋」 until a shopkeeper is decided.
 */

const everythingSaidAtTheBakery = [
  BAKERY_SHOP_DESCRIPTION,
  ...BAKERY_SHOP_LINES.map((l) => l.text),
  SEKIRYUGA_RUMORS.BAKERY.text,
];

describe('the bakery, today', () => {
  it('is the owner and Lina, and nobody else', () => {
    expect(new Set(BAKERY_SHOP_LINES.map((l) => l.speaker))).toEqual(new Set([BAKERY_OWNER.name, LINA.name]));
    expect(SEKIRYUGA_RUMORS.BAKERY.speaker).toBe(BAKERY_OWNER.name);
  });

  it('says nothing of Gald', () => {
    for (const text of everythingSaidAtTheBakery) expect(text).not.toMatch(/ガルド|GALD/i);
  });
});

describe('the shop’s rumour', () => {
  it('is told by 「道具屋」 — no shopkeeper is decided yet', () => {
    expect(SEKIRYUGA_RUMORS.SHOP.speaker).toBe('道具屋');
  });
});
