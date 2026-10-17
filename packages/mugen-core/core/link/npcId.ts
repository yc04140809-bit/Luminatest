// A PERSON'S ID — the formal rule, and how old spellings are taken in.
//
// THE RULE. A formal NPC_ID is upper-case: letters, digits and
// underscores, starting with a letter — `GALD`, `LINA`, `MARTA`,
// `ALDEN_GUARD`. Once used it is never renamed and never given to
// anybody else, because saves (`character_<ID>`) and WORLD MEMORY
// (`actors`) hold it forever.
//
// OLD SPELLINGS. Some ids were written before the rule — `alden_marta`
// in the life engine's content. They are not broken and not renamed
// (nothing that is saved holds them, but the rule is to absorb, not to
// rewrite): an ALIAS says which formal id an old spelling means, and the
// boundary — import, validation, anything handing ids across — resolves
// it. Inside the game an alias may keep working exactly as before.
//
// PICTURES ARE NOT PEOPLE. `hero`, `gald` are art ids and live in their
// own field (`artId`); a lower-case id is never a person's id, which is
// half of why the rule is upper-case.
//
// Decided 2026-09-27 (docs/WORLD_LIFE_LINK_DESIGN.md §9). Pure: no
// content is imported here; the registry is handed in.

import type { ArtId, NpcId, PersonKind, PersonStanding, RegionId } from './types';

/** The shape of a formal NPC_ID. */
export const NPC_ID_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/** Whether an id is spelt as a formal NPC_ID (not whether anybody has it). */
export function isFormalNpcId(id: string): boolean {
  return NPC_ID_PATTERN.test(id);
}

/**
 * ONE ENTRY IN THE GAME'S LIST OF WHO EXISTS.
 *
 * The minimum every other table can point at: the id, what to call
 * them, what kind of thing they are, where they belong, their picture
 * (separately), and the old spellings that mean them.
 */
export interface NpcRegistryEntry {
  npcId: NpcId;
  displayName: string;
  kind: PersonKind;
  region: RegionId;
  standing: PersonStanding;
  /** Their picture, if any — never their id. */
  artId: ArtId | null;
  /** Old spellings that mean this person. Accepted at the boundary only. */
  aliases: readonly string[];
}

/** Alias → formal id, from a registry. */
export function aliasTable(entries: readonly NpcRegistryEntry[]): ReadonlyMap<string, NpcId> {
  const table = new Map<string, NpcId>();
  for (const entry of entries) for (const alias of entry.aliases) table.set(alias, entry.npcId);
  return table;
}

/**
 * The formal id an id means, or null if it means nobody.
 *
 * A formal id in the registry is itself; an alias is its person; any
 * other spelling — a lower-case formal id, an art id, a typo — is null.
 * Case is never folded: `lina` is not `LINA` unless somebody wrote it
 * down as an alias, because guessing is how two people end up sharing
 * an id.
 */
export function resolveNpcId(id: string, entries: readonly NpcRegistryEntry[]): NpcId | null {
  if (entries.some((entry) => entry.npcId === id)) return id;
  return aliasTable(entries).get(id) ?? null;
}

/** What is wrong with a registry. Empty: nothing. */
export function registryProblems(entries: readonly NpcRegistryEntry[]): string[] {
  const problems: string[] = [];
  const formal = new Set<string>();
  for (const entry of entries) {
    if (!isFormalNpcId(entry.npcId)) problems.push(`${entry.npcId}: not a formal NPC_ID (upper-case A-Z, 0-9, _)`);
    if (formal.has(entry.npcId)) problems.push(`${entry.npcId}: listed twice`);
    formal.add(entry.npcId);
    if (entry.displayName.trim() === '') problems.push(`${entry.npcId}: no display name`);
  }
  const aliasOwner = new Map<string, string>();
  for (const entry of entries) {
    for (const alias of entry.aliases) {
      if (formal.has(alias)) problems.push(`${alias}: alias of ${entry.npcId} is somebody's formal id`);
      const owner = aliasOwner.get(alias);
      if (owner !== undefined) problems.push(`${alias}: alias of both ${owner} and ${entry.npcId}`);
      aliasOwner.set(alias, entry.npcId);
    }
  }
  return problems;
}

/**
 * The references that mean nobody: every id in `refs` that is neither a
 * formal id in the registry nor an alias of one. Each is reported with
 * where it was found, so a failing test says what to fix.
 */
export function unresolvedIds(
  refs: readonly { id: string; where: string }[],
  entries: readonly NpcRegistryEntry[],
): string[] {
  return refs
    .filter((ref) => resolveNpcId(ref.id, entries) === null)
    .map((ref) => `${ref.id} (in ${ref.where}) is not in the registry`);
}
