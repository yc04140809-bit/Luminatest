// EVERYBODY: the hand-written registry, and the characters adopted from
// CHARACTER FORGE (content/forge) that it does not already have.
//
// `NPC_REGISTRY` (registry.ts) stays the hand-written list and is never
// written by a tool. Adopted characters join here, from the build's own
// content — the same for every player. An adopted character whose
// NPC_ID is an existing person adds nothing here: that person is
// already listed, under the name the game already uses.

import type { NpcRegistryEntry } from '../../core/link/npcId';
import { forgeRegistryEntries } from '../forge/forgeContent';
import { NPC_REGISTRY } from './registry';

export const ALL_NPCS: readonly NpcRegistryEntry[] = [...NPC_REGISTRY, ...forgeRegistryEntries(NPC_REGISTRY)];

/** An entry by formal id, hand-written or adopted, or null. */
export function personEntry(npcId: string): NpcRegistryEntry | null {
  return ALL_NPCS.find((entry) => entry.npcId === npcId) ?? null;
}
