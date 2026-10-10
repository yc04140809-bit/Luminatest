import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { battleEnemyArt } from './battleArt';

/**
 * THE FORGE CREATURES' BATTLE DRAWINGS (作者 2026-10-10).
 *
 * フウミミ and ヒョウレイ: their transparent PNGs made for the battle screen,
 * placed as delivered. The small フウミミ is the same drawing, shown small.
 * イワホロ: its transparent PNG, placed as delivered. コケマル: not drawn yet —
 * the placeholder until a transparent PNG arrives (the picture so far has an
 * opaque white ground; then this test moves it to the drawn list). FORGE's reference pictures and sheets are
 * never cut out and used.
 */
describe('the FORGE creatures, as the battle draws them', () => {
  it('フウミミ, ヒョウレイ, the small フウミミ and イワホロ: drawn, from their own delivered files', () => {
    for (const [id, file] of [
      ['fuumimi', 'fuumimi.png'],
      ['hyourei', 'hyourei.png'],
      ['fuumimi_young', 'fuumimi.png'],
      ['iwahoro', 'iwahoro.png'],
    ] as const) {
      const art = battleEnemyArt(id, 'front');
      expect(art.placeholder, id).toBe(false);
      expect(art.asset?.src, id).toContain(file);
    }
  });

  it('コケマル: still the placeholder, in every state', () => {
    for (const id of ['kokemaru'] as const) {
      for (const state of ['front', 'down', 'portrait'] as const) {
        const art = battleEnemyArt(id, state);
        expect(art.placeholder, `${id} ${state}`).toBe(true);
        expect(art.asset).toBeNull();
      }
    }
  });

  it('no FORGE reference picture or character sheet is imported as battle art', () => {
    const source = readFileSync(new URL('./battleArt.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/CONCEPT|concept|forge\/|\.webp|-sheet|_sheet/);
  });
});
