import { describe, it, expect } from 'vitest';
import {
  EXPLORATION_ENCOUNTER_WEIGHTS,
  GREENWOOD_DISCOVERY_SPOTS,
  nextDiscoverySpot,
  resolveExplorationEncounter,
  type DiscoveryCategory,
} from './discovery';

/** An rng that hands out the numbers it was given, then repeats the last. */
function scripted(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('resolveExplorationEncounter', () => {
  it('obeys a forced category, for testing each route', () => {
    for (const forced of ['EVENT', 'ITEM', 'BATTLE'] as DiscoveryCategory[]) {
      expect(resolveExplorationEncounter({ forced, rng: () => 0.99 })).toBe(forced);
    }
  });

  it('draws by weight', () => {
    // EVENT 0-50, ITEM 50-75, BATTLE 75-100 of the total.
    expect(resolveExplorationEncounter({ rng: () => 0.1 })).toBe('EVENT');
    expect(resolveExplorationEncounter({ rng: () => 0.6 })).toBe('ITEM');
    expect(resolveExplorationEncounter({ rng: () => 0.9 })).toBe('BATTLE');
  });

  it('re-rolls once when the draw repeats the last arrival', () => {
    // First draw would be BATTLE again; the second lands on EVENT.
    const rng = scripted([0.9, 0.1]);
    expect(resolveExplorationEncounter({ previous: 'BATTLE', rng })).toBe('EVENT');
  });

  it('accepts the repeat if the re-roll says so, rather than looping', () => {
    const rng = scripted([0.9, 0.9]);
    expect(resolveExplorationEncounter({ previous: 'BATTLE', rng })).toBe('BATTLE');
  });

  it('never returns a category whose weight is zero', () => {
    const weights = { EVENT: 1, ITEM: 0, BATTLE: 0 };
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(resolveExplorationEncounter({ weights, rng: () => r })).toBe('EVENT');
    }
  });

  it('stays in the three categories over many draws', () => {
    const seen = new Set<DiscoveryCategory>();
    let previous: DiscoveryCategory | null = null;
    for (let i = 0; i < 400; i++) {
      const got = resolveExplorationEncounter({ previous, rng: () => (i * 37 % 100) / 100 });
      seen.add(got);
      previous = got;
    }
    expect([...seen].sort()).toEqual(['BATTLE', 'EVENT', 'ITEM']);
  });

  it('ships weights that add up to something a human can read', () => {
    const total = Object.values(EXPLORATION_ENCOUNTER_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

describe('nextDiscoverySpot', () => {
  const player = { x: 180, y: 440 };

  it('never puts the next ring where the last one was', () => {
    for (const spot of GREENWOOD_DISCOVERY_SPOTS) {
      for (let i = 0; i < 20; i++) {
        const next = nextDiscoverySpot({ previousId: spot.id, from: player, rng: () => i / 20 });
        expect(next.id).not.toBe(spot.id);
      }
    }
  });

  it('never puts it within a few steps of the player', () => {
    const standing = { x: 180, y: 120 };
    for (let i = 0; i < 20; i++) {
      const next = nextDiscoverySpot({ previousId: null, from: standing, rng: () => i / 20 });
      expect(Math.hypot(next.x - standing.x, next.y - standing.y)).toBeGreaterThanOrEqual(130);
    }
  });

  it('would rather be close than not exist at all', () => {
    // One spot, and the player is standing on it.
    const only = [{ id: 'ONLY', x: 100, y: 100 }];
    const next = nextDiscoverySpot({ spots: only, previousId: null, from: { x: 100, y: 100 } });
    expect(next.id).toBe('ONLY');
  });

  it('gives way on distance before it gives up on not repeating', () => {
    const spots = [
      { id: 'A', x: 100, y: 100 },
      { id: 'B', x: 104, y: 100 },
    ];
    const next = nextDiscoverySpot({ spots, previousId: 'A', from: { x: 100, y: 100 } });
    expect(next.id).toBe('B');
  });

  it('keeps every shipped spot inside the field, away from the edges', () => {
    for (const spot of GREENWOOD_DISCOVERY_SPOTS) {
      expect(spot.x).toBeGreaterThanOrEqual(90);
      expect(spot.x).toBeLessThanOrEqual(270);
      expect(spot.y).toBeGreaterThanOrEqual(100);
      // Well above where the player walks in, so it is seen ahead.
      expect(spot.y).toBeLessThanOrEqual(360);
    }
    expect(new Set(GREENWOOD_DISCOVERY_SPOTS.map((s) => s.id)).size).toBe(
      GREENWOOD_DISCOVERY_SPOTS.length,
    );
  });
});
