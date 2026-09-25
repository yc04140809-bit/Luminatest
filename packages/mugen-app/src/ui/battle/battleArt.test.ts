import { describe, expect, it } from 'vitest';
// The Artifact's resolvers, which import the whole manifest. Fine in a
// test — nothing here is bundled — and they are the thing to agree with.
import { enemyArtFor, partyArtFor } from '@mugen/content/art';
import { BATTLE_UI } from '@mugen/assets';
import { heroPose, kaosPose, enemyPose } from '@mugen/game/battle/battleArtState';
import type { ResolvedArt } from '@mugen/core/art/artStates';
import {
  AS_PERSON,
  BATTLE_UI_FRAMES,
  battleEnemyArt,
  battlePartyArt,
} from './battleArt';

const file = (src: string | null | undefined) =>
  src ? decodeURIComponent(src).split('/').pop()!.replace(/\?.*$/, '') : null;

/** Same drawing, same state it resolved to, same face and box. */
function same<S extends string>(mine: ResolvedArt<S>, theirs: ResolvedArt<S>) {
  expect(mine.state).toBe(theirs.state);
  expect(file(mine.asset?.src)).toBe(file(theirs.asset?.src));
  expect(mine.asset?.face).toEqual(theirs.asset?.face);
  expect(mine.asset?.box).toEqual(theirs.asset?.box);
  expect(mine.asset?.facing).toEqual(theirs.asset?.facing);
}

/**
 * THE APP'S BATTLEFIELD DRAWS WHAT THE ARTIFACT'S DOES.
 *
 * Every state the still field can be in — nobody acting, her ordinary
 * form — asked of both tables and compared file for file, face box for
 * face box.
 */
describe('battle art', () => {
  const still = { beat: 'NONE' as const, downed: false };

  it('draws him as the Artifact does', () => {
    same(battlePartyArt('hero', heroPose(still)), partyArtFor('hero', heroPose(still)));
  });

  it('draws her as the Artifact does', () => {
    same(battlePartyArt('kaos', kaosPose(still)), partyArtFor('kaos', kaosPose(still)));
  });

  it('draws the moss rabbit as the Artifact does', () => {
    same(battleEnemyArt('moss_rabbit', enemyPose(still)), enemyArtFor('moss_rabbit', enemyPose(still)));
  });

  it('draws Gald, fought as a person, as the Artifact does', () => {
    const state = AS_PERSON[enemyPose(still)] ?? 'battle_idle';
    same(battlePartyArt('gald', state), partyArtFor('gald', state));
  });

  it('carries every UI frame the Artifact draws, by the same name', () => {
    // `barAlt` is registered in the manifest and drawn by nothing in the
    // Artifact's battle screen, so the App does not ship it either.
    const drawn = Object.keys(BATTLE_UI).filter((name) => name !== 'barAlt');
    expect(Object.keys(BATTLE_UI_FRAMES).sort()).toEqual(drawn.sort());
    for (const [name, src] of Object.entries(BATTLE_UI_FRAMES)) {
      expect(file(src), name).toBe(file((BATTLE_UI as Record<string, string>)[name]));
    }
  });
});
