import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ARIA_FACES, LEVI_FACES } from '@mugen/content/characters/companionFaces';

describe('アリア・レヴィの表情、絵として (2026-10-12)', () => {
  it('every face is imported as delivered, by name', () => {
    const source = readFileSync(new URL('./companionFaces.ts', import.meta.url), 'utf8');
    for (const f of ARIA_FACES) expect(source).toContain(`aria-face-${f.toLowerCase()}.png`);
    for (const f of LEVI_FACES) expect(source).toContain(`levi-face-${f.toLowerCase()}.png`);
  });
});
