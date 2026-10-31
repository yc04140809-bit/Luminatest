import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * THE BATTLE SCREEN'S PIECES ARE THE ARTIFACT'S PIECES.
 *
 * The App's battle screen is a reproduction of the Artifact's, and the
 * way it stays one is that these files are not rewritten — they are
 * copied, at the same paths relative to `src/`, so every import inside
 * them resolves unchanged. Where the field puts people, how big they
 * are drawn, what the HUD corners hold: the Artifact decides, and this
 * test fails the day the two copies say different things.
 *
 * Copies rather than imports because importing across packages would
 * drag the Artifact's own platform code and its whole art manifest
 * into the App — the same reason the audio player is a copy.
 * Changing one of these means changing both, and this is what says so.
 */
export const COPIED_FROM_ARTIFACT = [
  'ui/battle/formation.ts',
  'ui/battle/battleCamera.ts',
  'ui/battle/battleHud.ts',
  'ui/battle/battleArcana.ts',
  'ui/battle/BattleHud.tsx',
  'ui/battle/BattleIcons.tsx',
  'ui/battle/battleMessage.ts',
  'ui/battle/stagecraft.ts',
  'ui/battle/HitFx.tsx',
  'ui/battle/blows.ts',
  'ui/battle/MagicTray.tsx',
  'ui/battle/ItemTray.tsx',
  'ui/battle/AwakeningScene.tsx',
  'ui/art/CharacterArt.tsx',
  'ui/common/Ornament.tsx',
] as const;

const appSrc = fileURLToPath(new URL('../../', import.meta.url));
const artifactSrc = fileURLToPath(new URL('../../../../mugen-artifact/src/', import.meta.url));

describe('battle screen pieces copied from the Artifact', () => {
  for (const file of COPIED_FROM_ARTIFACT) {
    it(`${file} is still the Artifact's`, () => {
      expect(readFileSync(appSrc + file, 'utf8')).toBe(readFileSync(artifactSrc + file, 'utf8'));
    });
  }
});
