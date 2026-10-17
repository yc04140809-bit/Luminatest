import type { Direction } from '../../content/characters/explorationSprites';

/**
 * Which way a character is facing, given where they are going.
 *
 * The bigger axis wins: a walk that is mostly sideways shows the side
 * view even if it drifts up the screen, and a walk that is mostly up or
 * down shows the back or the front. A dead heat keeps him facing up or
 * down, which is what walking into a forest looks like.
 *
 * Its own file, with no Phaser in it, because this is the one piece of
 * the sprite work that can be wrong in a way a screenshot will not show.
 */
export function directionFor(dx: number, dy: number, current: Direction): Direction {
  if (dx === 0 && dy === 0) return current;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'back' : 'front';
}
