import type { World } from '@mugen/core/world/world';
import type { PickupKeeper } from './RoamScene';

/**
 * THE SAVE'S SIDE OF A PLACE'S PICKUPS (2026-10-07): which are taken, read
 * as the walk opens, and taking one through `World.claimPickup` — the
 * thing into the bag and the mark, in one write.
 */
export function pickupKeeper(world: World): PickupKeeper {
  return {
    taken: new Set(world.getTakenPickups()),
    take: (pickupId, itemId, quantity) => world.claimPickup(pickupId, itemId, quantity),
  };
}
