// THE CHARACTERS ADOPTED FROM CHARACTER FORGE, AS THE GAME SEES THEM.
//
// Content, in the build, the same for every player (core/forge/content.ts
// explains how they get here). This module reads the generated index
// once and hands the rest of the game what it needs, each in the shape
// the rest of the game already uses:
//
//   the registry of who exists   → `forgeRegistryEntries`
//                                  (content/people/allPeople.ts)
//   the WORLD LIFE ENGINE        → `forgeCores` (content/world/mugenWorld.ts)
//   GOD VIEW's roster            → `forgeWorldPeople`
//
// NOTHING IS INVENTED ON THE WAY. The life engine's traits, values and
// desires are FORGE's own words, verbatim: the engine's existing seed
// kinds speak a different vocabulary ('CURIOUS', 'FAMILY'), so a FORGE
// character's 「慎重」 resonates with nothing until the author writes
// something that listens for it — rather than being mapped onto a
// guess. Aptitudes carry over for humans only, because there the two
// mean the same thing (potential, not skill); a monster's are its
// species' combat potential, which is not what the engine means.
//
// A person the game already had keeps everything they had. When FORGE's
// definition is adopted AS an existing NPC_ID (HUM-000003 is LINA), the
// hand-written entry, core and name stay exactly as they are.

import { FORGE_BASELINE_DATA, FORGE_ROSTER_DATA, FORGE_VOID_DATA } from './index.generated';
import { contentFromData } from '../../core/forge/content';
import { forgeDisplayName, forgeKindOf } from '../../core/forge/record';
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
  definition: ForgeDeployPackage;
}

/** Every adopted character whose definition could be read. */
export function forgeNpcs(content: ForgeContent = FORGE_CONTENT): ForgeNpc[] {
  return content.roster.characters.flatMap((entry) => {
    const definition = content.baselines[entry.characterId];
    if (!definition) return [];
    return [
      {
        npcId: entry.npcId,
        characterId: entry.characterId,
        kind: forgeKindOf(entry),
        forgeName: forgeDisplayName(definition),
        region: entry.region,
        definition,
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
      kind: npc.kind === 'HUMAN' ? 'PERSON' : 'CREATURE',
      region: npc.region ?? UNPLACED_REGION,
      standing: 'ORDINARY',
      artId: null,
      aliases: [],
    }));
}

/** Life-engine cores for adopted characters that have none written by hand. */
export function forgeCores(hand: readonly NpcCore[], content: ForgeContent = FORGE_CONTENT): NpcCore[] {
  const known = coveredBy(hand.map((core) => core.npcId));
  return forgeNpcs(content)
    .filter((npc) => !known.has(npc.npcId))
    .map((npc) => coreOf(npc));
}

function coreOf(npc: ForgeNpc): NpcCore {
  const d = npc.definition;
  const words = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((w): w is string => typeof w === 'string' && w.length > 0) : [];
  if (d.characterType === 'human') {
    const core = (d.profile.core ?? {}) as Record<string, unknown>;
    return {
      npcId: npc.npcId,
      traits: words(core.personality),
      values: words(core.values),
      desires: words(core.desires),
      aptitudes: Object.fromEntries(Object.entries(d.aptitudes).map(([key, value]) => [key.toUpperCase(), value])),
    };
  }
  const desire = d.ecology?.desire;
  return {
    npcId: npc.npcId,
    traits: [],
    values: [],
    desires: typeof desire === 'string' && desire ? [desire] : [],
    aptitudes: {},
  };
}

/** GOD VIEW roster rows for adopted characters not already on it. */
export function forgeWorldPeople(
  handIds: readonly string[],
  content: ForgeContent = FORGE_CONTENT,
): { npcId: string; name: string; region: string; standing: 'ORDINARY' }[] {
  const known = coveredBy(handIds);
  return forgeNpcs(content)
    .filter((npc) => !known.has(npc.npcId))
    .map((npc) => ({ npcId: npc.npcId, name: npc.forgeName, region: npc.region ?? UNPLACED_REGION, standing: 'ORDINARY' }));
}
