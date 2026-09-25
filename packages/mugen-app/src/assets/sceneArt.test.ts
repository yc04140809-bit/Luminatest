import { describe, expect, it } from 'vitest';
// The Artifact's resolver, which imports the whole manifest. Fine in a
// test — nothing here is bundled — and it is the thing to agree with.
import { partyArtFor } from '@mugen/content/art';
import { kaosPortraitState, kaosTalkMode } from '@mugen/content/characters/kaosPortraits';
import type { PartyArtState } from '@mugen/core/art/artStates';
import { sceneArt, titleKeyVisual, type SceneCharacter } from './sceneArt';

const file = (src: string | null | undefined) =>
  src ? decodeURIComponent(src).split('/').pop()!.replace(/\?.*$/, '') : null;

/**
 * THE SAME DRAWING THE ARTIFACT WOULD SHOW.
 *
 * Every question a scene in the App asks, answered here and by the
 * Artifact's own resolver, compared by file. If a drawing is replaced
 * or a state re-pointed in the shared art table, this fails until the
 * App's table follows.
 */
describe('scene art', () => {
  const asked: [SceneCharacter, PartyArtState][] = [
    ['kaos', kaosPortraitState(kaosTalkMode(false))],
    ['kaos', kaosPortraitState(kaosTalkMode(true))],
    ['gald', 'talk'],
    ['gald', 'portrait'],
  ];
  for (const [who, state] of asked) {
    it(`${who} ${state} is the Artifact's picture`, async () => {
      const mine = await sceneArt(who, state);
      expect(mine).not.toBeNull();
      expect(file(mine)).toBe(file(partyArtFor(who, state).asset?.src));
    });
  }

  it('shows her ordinary talking picture when calm, and 臨戦 when tense', async () => {
    expect(file(await sceneArt('kaos', kaosPortraitState(kaosTalkMode(false))))).toBe(
      'kaos-talk-default.png',
    );
    expect(file(await sceneArt('kaos', kaosPortraitState(kaosTalkMode(true))))).toBe(
      'kaos-talk-rinsen.png',
    );
  });

  it('has the title key visual', async () => {
    expect(file(await titleKeyVisual())).toBe('title-kaos-keyvisual.webp');
  });
});
