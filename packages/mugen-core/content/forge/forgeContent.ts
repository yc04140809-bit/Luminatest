// THE CHARACTERS ADOPTED FROM CHARACTER FORGE, AS THE GAME SEES THEM.
//
// Content, in the build, the same for every player (core/forge/content.ts
// explains how they get here). This module reads the generated index
// once, turns each FORGE file into the game's own definition through the
// vocabulary adapter (forgeVocabularyAdapter.ts — the only place FORGE's
// words become the game's), and hands the rest of the game what it needs:
//
//   the registry of who exists   → `forgeRegistryEntries` — EVERY adopted
//                                  character (content/people/allPeople.ts)
//   the WORLD LIFE ENGINE        → `forgeCores` — only LIFE ACTORS
//   GOD VIEW's life roster       → `forgeWorldPeople` — only LIFE ACTORS
//
// ADOPTED IS NOT "HAS A LIFE". Adoption means official content. Whether
// the life engine follows one as an individual is the ledger's
// `lifeActor`, decided by the author: people by default, a creature only
// when it is one particular individual the story tracks. A common monster
// fought again and again is adopted and has no seeds of its own.
//
// A person the game already had keeps everything they had. When FORGE's
// definition is adopted AS an existing NPC_ID (HUM-000003 is LINA), the
// hand-written entry, core and name stay exactly as they are.

import { FORGE_BASELINE_DATA, FORGE_ROSTER_DATA, FORGE_VOID_DATA } from './index.generated';
import { contentFromData } from '../../core/forge/content';
import { forgeDisplayName, forgeKindOf } from '../../core/forge/record';
import { zeroCharacterDefinition, type ZeroCharacterDefinition } from './forgeVocabularyAdapter';
import type { ForgeContent, ForgeDeployPackage, ForgeKind } from '../../core/forge/types';
import type { NpcRegistryEntry } from '../../core/link/npcId';
import type { NpcCore } from '../../core/life/types';
import { NPC_REGISTRY } from '../people/registry';

const read = contentFromData(FORGE_ROSTER_DATA, FORGE_VOID_DATA, FORGE_BASELINE_DATA);

/** Everything adopted, as built into this copy of the game. */
export const FORGE_CONTENT: ForgeContent = read.content;
/** What could not be read (a test keeps this empty). */
export const FORGE_CONTENT_PROBLEMS: readonly string[] = read.problems;

/** Where an adopted character lives before the author places them. */
export const UNPLACED_REGION = 'UNPLACED';

export interface ForgeNpc {
  npcId: string;
  characterId: string;
  kind: ForgeKind;
  /** What FORGE calls them. For an existing person, the game's own name wins (see registry). */
  forgeName: string;
  region: string | null;
  lifeActor: boolean;
  /** FORGE's file, verbatim. */
  forge: ForgeDeployPackage;
  /** The game's definition of them, through the vocabulary adapter. */
  definition: ZeroCharacterDefinition;
}

/** Every adopted character whose definition could be read. */
export function forgeNpcs(content: ForgeContent = FORGE_CONTENT): ForgeNpc[] {
  return content.roster.characters.flatMap((entry) => {
    const forge = content.baselines[entry.characterId];
    if (!forge) return [];
    return [
      {
        npcId: entry.npcId,
        characterId: entry.characterId,
        kind: forgeKindOf(entry),
        forgeName: forgeDisplayName(forge),
        region: entry.region,
        lifeActor: entry.lifeActor,
        forge,
        definition: zeroCharacterDefinition(forge, entry),
      },
    ];
  });
}

/** FORGE Character ID → NPC_ID, as adopted. */
export function forgeCorrespondence(content: ForgeContent = FORGE_CONTENT): Readonly<Record<string, string>> {
  return Object.fromEntries(content.roster.characters.map((entry) => [entry.characterId, entry.npcId]));
}

/** FORGE's retired ids. Never adopted. */
export const FORGE_VOID_IDS: readonly string[] = FORGE_CONTENT.voidIds;

/**
 * The ids a hand-written table already covers, with each person's old
 * spellings: the life engine still calls MARTA `alden_marta`, and a FORGE
 * definition adopted as MARTA must not become a second MARTA there.
 */
function coveredBy(ids: readonly string[]): Set<string> {
  const covered = new Set(ids);
  for (const entry of NPC_REGISTRY) {
    const names = [entry.npcId, ...entry.aliases];
    if (names.some((name) => covered.has(name))) for (const name of names) covered.add(name);
  }
  return covered;
}

/** Registry entries for adopted characters the hand-written registry does not already have. */
export function forgeRegistryEntries(
  hand: readonly NpcRegistryEntry[],
  content: ForgeContent = FORGE_CONTENT,
): NpcRegistryEntry[] {
  const known = coveredBy(hand.map((entry) => entry.npcId));
  return forgeNpcs(content)
    .filter((npc) => !known.has(npc.npcId))
    .map((npc) => ({
      npcId: npc.npcId,
      displayName: npc.forgeName,
      kind: npc.definition.entityType,
      region: npc.region ?? UNPLACED_REGION,
      // ZERO's own default for display (never read by rules). Not derived
      // from FORGE's importance, which is a free string kept verbatim.
      standing: 'ORDINARY',
      artId: null,
      aliases: [],
    }));
}

/** Life-engine cores for adopted LIFE ACTORS that have none written by hand. Only mapped vocabulary. */
export function forgeCores(hand: readonly NpcCore[], content: ForgeContent = FORGE_CONTENT): NpcCore[] {
  const known = coveredBy(hand.map((core) => core.npcId));
  return forgeNpcs(content)
    .filter((npc) => npc.lifeActor && !known.has(npc.npcId))
    .map((npc) => ({ npcId: npc.npcId, ...npc.definition.life }));
}

/** GOD VIEW's life roster: adopted LIFE ACTORS not already on it. */
export function forgeWorldPeople(
  handIds: readonly string[],
  content: ForgeContent = FORGE_CONTENT,
): { npcId: string; name: string; region: string; standing: 'PRINCIPAL' | 'ORDINARY' }[] {
  const known = coveredBy(handIds);
  return forgeNpcs(content)
    .filter((npc) => npc.lifeActor && !known.has(npc.npcId))
    .map((npc) => ({
      npcId: npc.npcId,
      name: npc.forgeName,
      region: npc.region ?? UNPLACED_REGION,
      // ZERO's display default, as above — never FORGE's importance read as a rank.
      standing: 'ORDINARY',
    }));
}

/** The game's definitions of every adopted character (the vocabulary adapter's output). */
export function forgeDefinitions(content: ForgeContent = FORGE_CONTENT): ZeroCharacterDefinition[] {
  return forgeNpcs(content).map((npc) => npc.definition);
}
