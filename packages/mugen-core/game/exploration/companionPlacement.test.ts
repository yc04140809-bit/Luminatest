import { describe, expect, it } from 'vitest';
import { GREENWOOD_GROUND, fieldForScreen, groundPoint } from './walkable';
import {
  COMPANION_MIN_GAP,
  COMPANION_START_ON_GROUND,
  FOLLOW_DISTANCE,
  PLAYER_START_ON_GROUND,
} from './companionPlacement';

/**
 * WHERE THE TWO OF THEM STAND WHEN THE FOREST OPENS.
 *
 * The gap between the hero and Kaos is written down in three places:
 * `FOLLOW_DISTANCE` governs it while they walk, `COMPANION_MIN_GAP` is
 * the closest the path may ever squeeze them, and the two START
 * positions decide it before anybody has moved. Only the first two had
 * anything checking them, and the third quietly disagreed: it put her
 * 61 pixels from him on a 844-wide phone — closer than the minimum gap,
 * let alone the follow distance — so the forest opened on the two of
 * them standing inside each other, and every later size change made it
 * worse without a single test noticing.
 *
 * The phones the game is judged on, and the ultrawide a phone becomes
 * when its address bar retracts.
 */
const SCREENS: readonly [number, number][] = [
  [800, 360],
  [844, 390],
  [915, 412],
  [932, 360],
];

function startGap(width: number, height: number): number {
  const field = fieldForScreen(width, height);
  const hero = groundPoint(GREENWOOD_GROUND, field, PLAYER_START_ON_GROUND.along, PLAYER_START_ON_GROUND.depth);
  const kaos = groundPoint(
    GREENWOOD_GROUND,
    field,
    COMPANION_START_ON_GROUND.along,
    COMPANION_START_ON_GROUND.depth,
  );
  return Math.hypot(kaos.x - hero.x, kaos.y - hero.y);
}

describe('the pose the forest opens on', () => {
  it('never starts them closer than the path would ever squeeze them', () => {
    for (const [w, h] of SCREENS) {
      expect(startGap(w, h), `${w}x${h}`).toBeGreaterThanOrEqual(COMPANION_MIN_GAP);
    }
  });

  it('starts them at about the distance they walk at', () => {
    // Not exactly: the path runs out before the follow distance does on
    // the narrower screens, and having her whole on screen matters more
    // than the last few pixels of gap. Within a quarter of it.
    for (const [w, h] of SCREENS) {
      expect(startGap(w, h), `${w}x${h}`).toBeGreaterThan(FOLLOW_DISTANCE * 0.75);
    }
  });

  /**
   * Her wings reach 73px to her right at this size, and the path's own
   * edge is not the field's. A start position further along than this
   * hangs a wingtip off the side of the forest.
   */
  it('has all of her on screen, wings included', () => {
    const KAOS_SOURCE_HEIGHT = 638;
    const KAOS_RIGHT_OF_ANCHOR = 259; // back view: 502 wide, anchor at 243
    for (const [w, h] of SCREENS) {
      const field = fieldForScreen(w, h);
      const scale = Math.round(field.height * 0.5) / KAOS_SOURCE_HEIGHT;
      const kaos = groundPoint(
        GREENWOOD_GROUND,
        field,
        COMPANION_START_ON_GROUND.along,
        COMPANION_START_ON_GROUND.depth,
      );
      expect(kaos.x + KAOS_RIGHT_OF_ANCHOR * scale, `${w}x${h} right wingtip`).toBeLessThanOrEqual(
        field.width,
      );
    }
  });

  it('keeps her behind him rather than beside him', () => {
    expect(COMPANION_START_ON_GROUND.along).toBeGreaterThan(PLAYER_START_ON_GROUND.along);
    // Nearer the camera as well as further back up the path, so the two
    // of them read as two people on a path rather than one silhouette.
    expect(COMPANION_START_ON_GROUND.depth).toBeGreaterThan(PLAYER_START_ON_GROUND.depth);
  });

  it('moves the gaps with her size, because room is a share of how big somebody is', () => {
    expect(FOLLOW_DISTANCE).toBeGreaterThan(COMPANION_MIN_GAP);
  });
});
