// WHERE THE TWO OF THEM STAND, AND HOW MUCH ROOM THEY NEED.
//
// Four numbers that are really one decision — how far apart the hero
// and Kaos are — written apart from the scene so that the decision can
// be checked without booting Phaser. It used to live inside the scene,
// where nothing could reach it, and the three numbers disagreed with
// each other for as long as that was true: see the note on the start
// position below.

// The player comes in from the right and the forest goes on to the left.
// Given as places on the clearing rather than as pixels, so they hold
// whatever shape the field turns out to be on this phone.
export const PLAYER_START_ON_GROUND = { along: 0.84, depth: 0.72 };
/**
 * And where she is standing when it opens.
 *
 * THE THIRD PLACE THE GAP IS WRITTEN DOWN, and the one that was not
 * keeping up with the other two. `FOLLOW_DISTANCE` governs the gap
 * while they walk and `COMPANION_MIN_GAP` is the closest the path may
 * ever squeeze them — but neither has any say over where the two of
 * them are simply PUT when the forest opens, and that is the first
 * thing a player looks at. It was 61px on a 844-wide phone: closer than
 * the minimum gap, let alone the follow distance, so the two of them
 * stood inside each other before anybody had moved.
 *
 * Moved back along the path towards the follow distance — 98px at
 * 844×390, 115 at 932×360, 100 at 800×360 — so the pose the forest
 * opens on is close to the one it settles into.
 *
 * Not further: her wings reach 73px to her right, and at 0.96 the tip
 * of one hangs 3 to 14 pixels past the edge of the field on every size
 * the game is judged on. 0.94 is the last place on the path that has
 * her whole, which matters more than the last thirteen pixels of gap.
 */
export const COMPANION_START_ON_GROUND = { along: 0.94, depth: 0.95 };
// Both move with her size, every time it changes, because the room two
// people need is a share of how big they are. At 0.42 these were 96 and
// 64; at 0.50 she is a fifth wider again, and a gap that did not grow
// with her is a gap she stands inside.
export const FOLLOW_DISTANCE = 115;
/** She never comes closer than this to him, whatever the path says. */
export const COMPANION_MIN_GAP = 77;
