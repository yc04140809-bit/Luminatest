import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { battleEnemyArt } from './battleArt';

/**
 * PROVISIONAL ART (作者 2026-10-10): フウミミ, ヒョウレイ and the small フウミミ
 * have no battle PNG yet. They show the placeholder until their transparent
 * PNGs made for the battle screen arrive — FORGE's reference pictures are not
 * cut out and used. When one arrives, its entry gets a `front`; this test is
 * then updated to say so.
 */
describe('creatures still waiting for their battle drawings', () => {
  it('fought and shown with the placeholder for now — every state', () => {
    for (const id of ['fuumimi', 'hyourei', 'fuumimi_young']) {
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
