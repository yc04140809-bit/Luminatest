import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — a plain .mjs build script with no type declarations
import { generate, OUTPUT } from '../../../scripts/port-battle-css.mjs';

/**
 * THE BATTLE SCREEN'S STYLESHEET IS THE ARTIFACT'S, SELECTED.
 *
 * `battle.generated.css` is what the port script takes from the
 * Artifact's stylesheet. If the Artifact's battle styles change and the
 * App's file does not, the two screens look different — so this fails
 * until `node scripts/port-battle-css.mjs` is run again.
 */
describe('battle stylesheet', () => {
  it('is exactly what the Artifact\'s stylesheet generates today', () => {
    expect(readFileSync(OUTPUT, 'utf8')).toBe((generate as () => string)());
  });

  it('cannot recolour the rest of the App', () => {
    const css = readFileSync(OUTPUT as string, 'utf8');
    expect(css).not.toMatch(/(^|\n):root\s*\{/);
    expect(css).not.toMatch(/(^|\n)(html|body|\.screen|\.btn)\s*[,{]/);
  });
});
