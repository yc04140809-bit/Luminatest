// WHAT ADOPTING A FORGE CHARACTER CHECKS AGAINST.
//
// One place for the game-side facts the adoption planner needs
// (core/forge/content.ts `planForgeAdoption`): the hand-written people
// an NPC_ID may already belong to, the regions a character may be
// placed in, the places a wished-for village can be matched against,
// and the ids the game already uses for something else. Shared by the
// command line, the dev server and the import screen, so all three
// decide the same way.
//
// Deliberately does NOT import the adopted characters themselves
// (forgeContent.ts): the tools pass in the content they read from disk,
// and the dev import screen must not reload every time a file it wrote
// changes the build's index.

import type { ForgeAdoptionView } from '../../core/forge/content';
import type { ForgeContent } from '../../core/forge/types';
import { NPC_REGISTRY } from '../people/registry';
import { LOCATIONS } from '../locations/alden';
import { ENEMY_SPECIES } from '../enemies/species';
import { unmappedIssues } from './forgeVocabularyAdapter';

/** Regions an adopted character can be placed in (the registry's, minus the world itself). */
export const FORGE_PLACEABLE_REGIONS: readonly string[] = [
  ...new Set(NPC_REGISTRY.filter((entry) => entry.kind !== 'SYSTEM').map((entry) => entry.region)),
];

/**
 * `extraVoidIds`: retired ids carried by the FORGE export the file came
 * in, refused even before they reach the ledger.
 */
export function forgeAdoptionView(content: ForgeContent, extraVoidIds: readonly string[] = []): ForgeAdoptionView {
  return {
    content,
    people: NPC_REGISTRY,
    regions: FORGE_PLACEABLE_REGIONS,
    locations: Object.fromEntries(LOCATIONS.map((place) => [place.id, place.name])),
    // Ids the game already gives to other things. None can take the
    // HUM-/MON- shape today; checked anyway, so that stays true.
    reservedIds: new Set([
      ...NPC_REGISTRY.flatMap((entry) => [entry.npcId, ...entry.aliases]),
      ...Object.keys(ENEMY_SPECIES),
    ]),
    // The game holds no FORGE picture files yet: every asset is metadata only.
    knownAssetIds: new Set(),
    unmapped: unmappedIssues,
    extraVoidIds,
  };
}
