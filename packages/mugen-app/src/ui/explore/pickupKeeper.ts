import type { World } from '@mugen/core/world/world';
import { regrowthOf } from '@mugen/content/exploration/regrowth';
import type { PickupKeeper } from './RoamScene';
import { celebrateDiscovery, celebrateGain } from '../celebrate/celebrateWorld';

/**
 * THE SAVE'S SIDE OF A PLACE'S PICKUPS (2026-10-07): which are taken, read
 * as the walk opens, and taking one through `World.claimPickup` — the
 * thing into the bag and the mark, in one write.
 *
 * And (2026-10-11) what a pickup that has grown back holds
 * (content/exploration/regrowth.ts), and the two of them high-fiving when
 * what was got or seen is a first (ui/celebrate).
 */
export function pickupKeeper(world: World): PickupKeeper {
  return {
    taken: new Set(world.getTakenPickups()),
    take: async (pickupId, itemId, quantity) => {
      const before = world.getItemCount(itemId);
      const moved = await world.claimPickup(pickupId, itemId, quantity);
      if (moved > 0) celebrateGain(world, itemId, before);
      return moved;
    },
    // A golden find's thing (2026-10-11): into the bag, every time one is found.
    give: async (itemId, quantity) => {
      const before = world.getItemCount(itemId);
      const moved = await world.addItem(itemId, quantity);
      if (moved > 0) celebrateGain(world, itemId, before);
      return moved;
    },
    // Grown back: what it holds now (only once taken before; else as the first time).
    regrownItems: (pickupId) => (world.hasEverTakenPickup(pickupId) ? (regrowthOf(pickupId)?.items ?? null) : null),
    // A golden find seen for the first time.
    found: (findId, label) => celebrateDiscovery(world, findId, label),
  };
}
