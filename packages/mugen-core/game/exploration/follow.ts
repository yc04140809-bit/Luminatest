/**
 * The path someone has walked, and where a companion following them
 * should stand.
 *
 * A companion who steers straight at the person they are following cuts
 * every corner and ends up beside them; one who walks the ground they
 * actually walked stays behind them and turns where they turned. So the
 * trail is the leader's own footsteps, kept just long enough, and the
 * companion aims at the point a fixed distance back along it.
 *
 * Plain numbers and no Phaser, so it can be tested.
 */

export interface TrailPoint {
  x: number;
  y: number;
}

export interface FollowTrailOptions {
  /** How far the leader must move before another footstep is kept. */
  sampleEvery?: number;
  /** How much of the walked path to remember, in world units. */
  remember?: number;
}

export class FollowTrail {
  /**
   * Where the leader is right now. Kept apart from the footsteps so
   * that the distance a companion is asked to keep is measured from the
   * leader themselves, not from the last step that happened to be
   * written down.
   */
  private head: TrailPoint | null = null;
  /** The footsteps behind them, newest first. */
  private steps: TrailPoint[] = [];
  private sampleEvery: number;
  private remember: number;

  constructor(options: FollowTrailOptions = {}) {
    this.sampleEvery = options.sampleEvery ?? 3;
    this.remember = options.remember ?? 220;
  }

  /** Forget everything and start again from here. */
  reset(x: number, y: number): void {
    this.head = { x, y };
    this.steps = [{ x, y }];
  }

  /** The leader is here now. */
  record(x: number, y: number): void {
    this.head = { x, y };
    const last = this.steps[0];
    if (!last) {
      this.steps.unshift({ x, y });
      return;
    }
    if (Math.hypot(x - last.x, y - last.y) < this.sampleEvery) return;
    this.steps.unshift({ x, y });
    this.trim();
  }

  /**
   * The point `distance` back along the walked path, or null while the
   * leader has not yet walked that far — in which case a companion has
   * no business moving anywhere.
   */
  behind(distance: number): TrailPoint | null {
    const path = this.path();
    let walked = 0;
    for (let i = 1; i < path.length; i++) {
      const from = path[i - 1];
      const to = path[i];
      const segment = Math.hypot(to.x - from.x, to.y - from.y);
      if (segment <= 0) continue;
      if (walked + segment >= distance) {
        const t = (distance - walked) / segment;
        return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      }
      walked += segment;
    }
    return null;
  }

  /** How much walked path is remembered, in world units. */
  get walkedLength(): number {
    const path = this.path();
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    }
    return total;
  }

  /** The leader, then their footsteps: newest first. */
  private path(): TrailPoint[] {
    return this.head ? [this.head, ...this.steps] : this.steps;
  }

  private trim(): void {
    let total = 0;
    for (let i = 1; i < this.steps.length; i++) {
      total += Math.hypot(this.steps[i].x - this.steps[i - 1].x, this.steps[i].y - this.steps[i - 1].y);
      if (total > this.remember) {
        this.steps.length = i + 1;
        return;
      }
    }
  }
}
