import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { battleEnemyArt } from './battleArt';

/**
 * THE FORGE CREATURES' BATTLE DRAWINGS (作者 2026-10-10).
 *
 * フウミミ and ヒョウレイ: their transparent PNGs made for the battle screen,
 * placed as delivered. The small フウミミ is the same drawing, shown small.
 * イワホロ: not drawn yet — the placeholder until its PNG arrives (then this
 * test moves it to the drawn list). FORGE's reference pictures and sheets are
 * never cut out and used.
 */
describe('the FORGE creatures, as the battle draws them', () => {
  it('フウミミ, ヒョウレイ and the small フウミミ: drawn, from their own delivered files', () => {
    for (const [id, file] of [
      ['fuumimi', 'fuumimi.png'],
      ['hyourei', 'hyourei.png'],
      ['fuumimi_young', 'fuumimi.png'],
    ] as const) {
      const art = battleEnemyArt(id, 'front');
      expect(art.placeholder, id).toBe(false);
      expect(art.asset?.src, id).toContain(file);
    }
  });

  it('イワホロ: still the placeholder, in every state', () => {
    for (const state of ['front', 'down', 'portrait'] as const) {
      const art = battleEnemyArt('iwahoro', state);
      expect(art.placeholder, state).toBe(true);
      expect(art.asset).toBeNull();
    }
  });

  it('no FORGE reference picture or character sheet is imported as battle art', () => {
    const source = readFileSync(new URL('./battleArt.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/CONCEPT|concept|forge\/|\.webp|-sheet|_sheet/);
  });
});
