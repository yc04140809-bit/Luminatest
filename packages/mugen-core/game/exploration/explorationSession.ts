import type { Direction } from '../../content/characters/explorationSprites';
import type { DiscoveryCategory } from './discovery';

/**
 * The forest, held while the player is somewhere else.
 *
 * A fight happens on its own screen, which tears the Phaser canvas down
 * and builds a new one on the way back. Without this the two of them
 * would reappear at the entrance every time, and "I walked all the way
 * up there" would be undone by winning — so where they stood, which way
 * they were facing, and which ring is waiting next are kept here for the
 * few seconds it takes.
 *
 * It is runtime state and nothing more. It is not saved, it never
 * reaches WORLD MEMORY, and walking out of the forest on purpose clears
 * it: coming back through the trees is arriving, not resuming.
 */
export interface ExplorationSessionState {
  player: { x: number; y: number };
  companion: { x: number; y: number };
  facing: Direction;
  companionFacing: Direction;
  /** Where the next gold ring stands, decided before leaving. */
  spotId: string;
  /** What the last arrival turned out to be, so it is less likely twice. */
  lastCategory: DiscoveryCategory | null;
}

export class ExplorationSession {
  private state: ExplorationSessionState | null = null;

  /** What to restore, or null for a fresh walk in. */
  read(): ExplorationSessionState | null {
    return this.state;
  }

  save(state: ExplorationSessionState): void {
    this.state = { ...state };
  }

  /** Remember what the last arrival was, without touching positions. */
  rememberCategory(category: DiscoveryCategory | null): void {
    if (this.state) this.state = { ...this.state, lastCategory: category };
  }

  clear(): void {
    this.state = null;
  }
}
