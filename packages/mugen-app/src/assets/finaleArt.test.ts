import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('第1章終盤の背景・一枚絵 (2026-10-12)', () => {
  it('the delivered pictures are imported by name, as delivered', () => {
    const source = readFileSync(new URL('./finaleArt.ts', import.meta.url), 'utf8');
    for (const f of [
      'location-alden-village.webp',
      'location-alden-village-broken.png',
      'location-ruins-depths.png',
      'battle/grassland.png',
      'event-ruins-unsealing.png',
      'event-ruins-unsealing-refused.png',
      'event-valsheel-awakening.png',
    ])
      expect(source).toContain(f);
  });
});
