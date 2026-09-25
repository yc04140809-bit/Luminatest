import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BATTLE_BACKGROUND_KEYS } from '@mugen/assets/keys';
import { BATTLE_BACKGROUND_OF, battleBackgroundFor } from './battleBackgrounds';

const FILES = fileURLToPath(new URL('../../../mugen-assets/files/backgrounds/battle/', import.meta.url));

/** Width and height, read from a PNG's own header. */
function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('battle backgrounds', () => {
  it('fights the greenwood on the forest painting', () => {
    expect(battleBackgroundFor('GREENWOOD_FOREST')).toBe('FOREST');
  });

  it('gives no other place a painting yet, rather than a guess', () => {
    expect(Object.keys(BATTLE_BACKGROUND_OF)).toEqual(['GREENWOOD_FOREST']);
    expect(battleBackgroundFor('ALDEN_VILLAGE')).toBeNull();
  });

  it('has all six paintings, as delivered: landscape, 1672x941', () => {
    expect([...BATTLE_BACKGROUND_KEYS].sort()).toEqual(
      ['BEACH', 'CITY', 'FOREST', 'GRASSLAND', 'RUINS', 'SWAMP'],
    );
    for (const key of BATTLE_BACKGROUND_KEYS) {
      expect(pngSize(`${FILES}${key.toLowerCase()}.png`), key).toEqual({ width: 1672, height: 941 });
    }
  });
});
