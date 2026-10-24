import type { World } from '@mugen/core/world/world';
import { toAbsoluteDay } from '@mugen/core/time/calendar';
import { banterAt, type BanterPlace, type KaosBanter } from '@mugen/content/story/kaosBanter';

/**
 * The roll for whether one of their short exchanges is said (content/story/
 * kaosBanter.ts). In the real game, chance. In DEV (the test server) none is
 * said unless a test asks (`window.__mugenBanterRoll`, as the encounter roll
 * is fixed): so no other test meets one at random.
 */
export function banterRoll(): number {
  if (import.meta.env.DEV) {
    const v = (window as unknown as { __mugenBanterRoll?: number }).__mugenBanterRoll;
    return typeof v === 'number' ? v : 1;
  }
  return Math.random();
}

/** One exchange for this place now, or none (chance, once each, its time come). */
export function banterFor(world: World, place: BanterPlace): KaosBanter | null {
  return banterAt(
    place,
    {
      stage: world.getSekiryugaStage(),
      phase: world.getIncidentPhase(),
      forestVisits: world.getExplorationVisits('GREENWOOD_FOREST'),
      day: toAbsoluteDay(world.getClock()),
    },
    (m) => world.isRead(m),
    banterRoll(),
  );
}
