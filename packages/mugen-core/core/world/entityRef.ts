// WHAT KIND OF THING AN ID NAMES — the first step toward one way of
// referring to everything the world remembers (作者判断 2026-10-10,
// docs/WORLD_LIFE_ENTITY_REF.md).
//
// Every ID keeps the meaning it already has and is never translated:
//
//   MON-000008     a monster species (FORGE)        MONSTER_SPECIES
//   moss_rabbit    a species of MUGEN ZERO's own    MONSTER_SPECIES
//   IND-2262C6F7   a monster individual (FORGE)     MONSTER_INDIVIDUAL
//   moss_rabbit_001  an individual the game named   MONSTER_INDIVIDUAL
//   GALD, RIZEL    an NPC_ID (people and the rest of the registry,
//                  the player and Kaos included)    NPC
//
// The kind is read off the ID's own shape, so nothing new needs saving: an
// NPC_ID is upper-case letters, digits and `_` (core/link/npcId.ts), and a
// FORGE ID carries a `-`, so the two can never be taken for each other.
// A human's FORGE ID (HUM-…) is not a reference — a person is referred to by
// their NPC_ID; the HUM-ID stays in FORGE's ledger.
//
// Pure, and used by nothing yet: the shape is fixed now so that WORLD
// MEMORY and the WORLD LIFE ENGINE can grow into it later without any ID
// being replaced.

import { isFormalNpcId } from '../link/npcId';

export type WorldEntityType = 'NPC' | 'MONSTER_SPECIES' | 'MONSTER_INDIVIDUAL';

export interface WorldEntityRef {
  entityType: WorldEntityType;
  /** The ID itself, exactly as it is held everywhere else. */
  entityRef: string;
}

const FORGE_SPECIES = /^MON-\d{6}$/;
const FORGE_INDIVIDUAL = /^IND-[0-9A-F]{8}$/;
const ZERO_SPECIES = /^[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)*$/;
const ZERO_INDIVIDUAL = /^[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)*_\d{3}$/;

/** The kind of thing `id` names, with the ID unchanged — or null for anything that is not a reference. */
export function entityRefOf(id: string): WorldEntityRef | null {
  if (FORGE_SPECIES.test(id) || ZERO_SPECIES.test(id)) return { entityType: 'MONSTER_SPECIES', entityRef: id };
  if (FORGE_INDIVIDUAL.test(id) || ZERO_INDIVIDUAL.test(id)) return { entityType: 'MONSTER_INDIVIDUAL', entityRef: id };
  if (isFormalNpcId(id)) return { entityType: 'NPC', entityRef: id };
  return null;
}
