// WHO EXISTS — the one list every other table points at.
//
// THE FORMAL IDS. Every person, place-that-holds-seeds and system actor
// the game's content refers to is listed here once, by its formal
// NPC_ID (upper-case — see core/link/npcId.ts). Current state, the life
// engine's people, WORLD MEMORY's actors, the experience events' casts
// and the narrative seeds all point into this list, and a test
// (registry.test.ts) fails the build if any of them points at nobody.
//
// BUILT ON `WORLD_PEOPLE` (content/world/mugenWorld.ts), the life
// engine's roster for GOD VIEW, which stays as it is; the test keeps the
// two in agreement. Added here: GRAVE (the tavern's master, already cast
// in the experience events) and WORLD (the actor time passes under).
//
// NOTHING HERE DECIDES CANON. A display name is what to call somebody
// on a developer's screen; standing is how much the story is about them
// for somebody looking at the world. Family is NOT here — it lives in
// current state (CharacterState), where only the author puts it. In
// particular MARTA is listed so her id is formal, and nothing more:
// who she is to anybody has not been decided (2026-09-27), and nothing
// may give her a parent, a child or a spouse until it is.
//
// PICTURES ARE A SEPARATE FIELD. `artId` is the picture's id
// (content/art/partyArt.ts), which for some people is spelt like their
// NPC_ID and for others (hero, kaos, gald) is not. Neither is ever used
// in place of the other.

import type { NpcRegistryEntry } from '../../core/link/npcId';

export const ALDEN = 'ALDEN';
export const PORT_TOWN = 'PORT_TOWN';

export const NPC_REGISTRY: readonly NpcRegistryEntry[] = [
  // The player and the one who travels with them.
  {
    npcId: 'PLAYER',
    displayName: 'プレイヤー',
    kind: 'PLAYER',
    region: ALDEN,
    standing: 'PRINCIPAL',
    artId: 'hero',
    aliases: [],
  },
  {
    npcId: 'KAOS',
    displayName: 'ケイオス',
    kind: 'COMPANION',
    region: ALDEN,
    standing: 'PRINCIPAL',
    artId: 'kaos',
    aliases: [],
  },
  // Alden.
  {
    npcId: 'GALD',
    displayName: 'ガルド',
    kind: 'PERSON',
    region: ALDEN,
    standing: 'PRINCIPAL',
    artId: 'gald',
    aliases: [],
  },
  {
    npcId: 'LINA',
    displayName: 'リナ',
    kind: 'PERSON',
    region: ALDEN,
    standing: 'PRINCIPAL',
    artId: 'LINA',
    aliases: [],
  },
  {
    npcId: 'ALDEN_GUARD',
    displayName: 'アルデンの衛兵',
    kind: 'PERSON',
    region: ALDEN,
    standing: 'PRINCIPAL',
    artId: null,
    aliases: [],
  },
  {
    npcId: 'BAKERY_OWNER',
    displayName: 'パン屋の主人',
    kind: 'PERSON',
    region: ALDEN,
    standing: 'ORDINARY',
    artId: 'BAKERY_OWNER',
    aliases: [],
  },
  {
    // Formal id only. Her place in anybody's family is not decided.
    npcId: 'MARTA',
    displayName: 'マルタ',
    kind: 'PERSON',
    region: ALDEN,
    standing: 'ORDINARY',
    artId: null,
    // The life engine's content still spells her this way; it keeps
    // working there, and the boundary reads it as MARTA.
    aliases: ['alden_marta'],
  },
  {
    npcId: 'GRAVE',
    displayName: 'グレイヴ',
    kind: 'PERSON',
    region: ALDEN,
    standing: 'ORDINARY',
    artId: null,
    aliases: [],
  },
  {
    npcId: 'ALDEN_VILLAGE',
    displayName: 'アルデン村',
    kind: 'PLACE',
    region: ALDEN,
    standing: 'PLACE',
    artId: null,
    aliases: [],
  },
  // The port two days north.
  {
    npcId: 'NEL',
    displayName: 'ネル',
    kind: 'PERSON',
    region: PORT_TOWN,
    standing: 'ORDINARY',
    artId: null,
    aliases: [],
  },
  // The world itself: the actor a stretch of time is recorded under
  // (life engine `advanceTime`, and canon with nobody named).
  {
    npcId: 'WORLD',
    displayName: '世界',
    kind: 'SYSTEM',
    region: 'WORLD',
    standing: 'SYSTEM',
    artId: null,
    aliases: [],
  },
];

/** A registry entry by formal id, or null. Aliases are not looked up here — use `resolveNpcId`. */
export function registryEntry(npcId: string): NpcRegistryEntry | null {
  return NPC_REGISTRY.find((entry) => entry.npcId === npcId) ?? null;
}
