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

/**
 * Same state it resolved to, and the same drawing, face and box — except where the App already has
 * the battle drawing of 2026-10-16 (作者「戦闘画面キャラクター差し替え」, `*-battle-v2.png`) and the
 * Artifact does not yet: then the same person, facing the same way, the face box inside the drawing.
 * A drawing redrawn under its own name (`<name>-v2.png`): the Artifact's `<name>.png`.
 */
function same<S extends string>(mine: ResolvedArt<S>, theirs: ResolvedArt<S>) {
  expect(mine.state).toBe(theirs.state);
  const m = file(mine.asset?.src);
  if (m?.endsWith('-battle-v2.png')) {
    expect(file(theirs.asset?.src)?.split('-')[0]).toBe(m.split('-')[0]);
    expect(mine.asset?.facing).toEqual(theirs.asset?.facing);
    const face = mine.asset?.face;
    expect(face).toBeDefined();
    expect(face!.x + face!.width).toBeLessThanOrEqual(face!.fileW);
    expect(face!.y + face!.height).toBeLessThanOrEqual(face!.fileH);
    return;
  }
  // A drawing the App has redrawn (作者 2026-10-16「ガルド素材既存分と差し替え」, `<name>-v2.png`): the
  // Artifact's own drawing by the same name, the same way round.
  if (m?.endsWith('-v2.png')) {
    expect(m.replace(/-v2\.png$/, '.png')).toBe(file(theirs.asset?.src));
    expect(mine.asset?.facing).toEqual(theirs.asset?.facing);
    return;
  }
  expect(m).toBe(file(theirs.asset?.src));
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

  /** EVERY STATE A TURN CAN PUT SOMEBODY IN, on both tables. */
  const beats = ['NONE', 'STRIKE', 'TACKLE', 'HIDE', 'HURT', 'MAGIC'];
  for (const beat of beats) {
    for (const downed of [false, true]) {
      for (const casting of [false, true]) {
        for (const awakened of [false, true]) {
          const view = { beat, downed, casting, awakened };
          const label = JSON.stringify(view);
          it(`matches the Artifact for ${label}`, () => {
            same(battlePartyArt('hero', heroPose(view)), partyArtFor('hero', heroPose(view)));
            same(battlePartyArt('kaos', kaosPose(view)), partyArtFor('kaos', kaosPose(view)));
            same(
              battleEnemyArt('moss_rabbit', enemyPose(view)),
              enemyArtFor('moss_rabbit', enemyPose(view)),
            );
            const person = AS_PERSON[enemyPose(view)] ?? 'battle_idle';
            same(battlePartyArt('gald', person), partyArtFor('gald', person));
          });
        }
      }
    }
  }

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

describe('グレイヴの戦闘立ち絵 (2026-10-12)', () => {
  it('registered as delivered: facing left, as the hero and Kaos', async () => {
    const { battlePartyArt } = await import('./battleArt');
    const art = battlePartyArt('grave', 'battle_idle');
    expect(art.placeholder).toBe(false);
    expect(art.asset?.src).toContain('grave-battle-v2');
    expect(art.asset?.facing).toBe('left');
  });
});

describe('アリア・レヴィの戦闘立ち絵 (正式加入前提 2026-10-12)', () => {
  it('registered for the release: facing left, a face box inside the drawing', async () => {
    const { battlePartyArt } = await import('./battleArt');
    for (const id of ['aria', 'levi'] as const) {
      const art = battlePartyArt(id, 'battle_idle');
      expect(art.placeholder).toBe(false);
      expect(art.asset?.src).toContain(`${id}-battle`);
      expect(art.asset?.facing).toBe('left');
      const face = art.asset?.face;
      expect(face).toBeDefined();
      expect(face!.x + face!.width).toBeLessThanOrEqual(face!.fileW);
      expect(face!.y + face!.height).toBeLessThanOrEqual(face!.fileH);
    }
  });
});

describe('ヴァルシール第2形態の基準素材 (作者採用 2026-10-12)', () => {
  it('registered as delivered: the base drawing, facing right toward the party, its box the whole drawing', async () => {
    const { battleEnemyArt } = await import('./battleArt');
    const art = battleEnemyArt('valsheel_form2', 'front');
    expect(art.placeholder).toBe(false);
    expect(art.asset?.src).toContain('valsheel-form2');
    expect(art.asset?.facing).toBe('right');
    expect(art.asset?.box).toMatchObject({ fileW: 1086, fileH: 1448 });
  });
});
