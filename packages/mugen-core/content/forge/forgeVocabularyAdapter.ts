// FORGE → MUGEN ZERO ADAPTER: the one place FORGE's words become the game's.
//
//   FORGE JSON → import validation → THIS ADAPTER → MUGEN ZERO character
//   definition → (for life actors only) the WORLD LIFE ENGINE
//
// FORGE and the game grew separate vocabularies. FORGE says 「植物」,
// 「森」, 「薄明性」, 「一般NPC」, 「慎重」; the game says PERSON,
// GREENWOOD_FOREST, ORDINARY, CURIOUS. Nothing crosses between the two
// except through the tables below, written out by hand:
//
//   - The game's vocabulary is never renamed to fit FORGE's.
//   - A FORGE value that is not in a table is UNMAPPED: reported on the
//     review screen and in the ledger's warnings, and left out of the
//     game's definition. It is never matched to "something similar".
//   - Where the game has no vocabulary for a field at all (activity time,
//     species classification — today), every value is UNMAPPED with that
//     reason, until the game grows one.
//   - The FORGE file itself is kept verbatim in content/forge/characters/,
//     so nothing is lost by leaving a value unmapped: add a table entry
//     and the next build reads it.
//
// When FORGE gains a new category, it is added HERE — no change to the
// WORLD LIFE ENGINE or anything else in the core.

import type { ForgeDeployPackage, ForgeIssue, ForgeRosterEntry } from '../../core/forge/types';
import type { PersonKind, PersonStanding } from '../../core/link/types';
import { forgeDisplayName } from '../../core/forge/record';
import { LOCATIONS } from '../locations/alden';
import { ENEMY_SPECIES } from '../enemies/species';

/**
 * THE TABLES. Every entry is a decision that the FORGE word and the game
 * word mean the same thing. Empty tables are deliberate: no pairing has
 * been decided yet, so every such value is reported as UNMAPPED.
 */
export const FORGE_VOCABULARY = {
  /** characterType → the game's kind of entity (core/link/types.ts PersonKind). */
  characterType: { human: 'PERSON', monster: 'CREATURE' } as Readonly<Record<string, PersonKind>>,
  /** profile.importance → standing (how much the story is about them; never read by rules). */
  importance: { 一般NPC: 'ORDINARY' } as Readonly<Record<string, PersonStanding>>,
  /**
   * aptitudes key → the WORLD LIFE ENGINE's aptitude (content/world: MAGIC,
   * SWORD, HEALING). Humans only: a FORGE human's aptitudes are potential,
   * which is what the engine means. The engine has no commerce or social
   * aptitude, so those stay UNMAPPED rather than inventing one.
   */
  aptitude: { magic: 'MAGIC', sword: 'SWORD', healing: 'HEALING' } as Readonly<Record<string, string>>,
  /** profile.core.personality → engine trait (CURIOUS, GENTLE, TIMID, …). None decided yet. */
  trait: {} as Readonly<Record<string, string>>,
  /** profile.core.values → engine value (FAMILY, WONDER, …). None decided yet. */
  value: {} as Readonly<Record<string, string>>,
  /** profile.core.desires / ecology.desire → engine desire. None decided yet. */
  desire: {} as Readonly<Record<string, string>>,
} as const;

/**
 * Fields matched by the game's own names rather than a table: a habitat
 * is a place (LOCATIONS, by its official name, exactly), a species is an
 * existing species (ENEMY_SPECIES, by name, exactly). Anything else is
 * UNMAPPED — 「森」 is a kind of place, not a place.
 */
const PLACE_BY_NAME: ReadonlyMap<string, string> = new Map(LOCATIONS.map((place) => [place.name, place.id]));
const SPECIES_BY_NAME: ReadonlyMap<string, string> = new Map(
  Object.values(ENEMY_SPECIES).map((species) => [species.name, species.speciesId]),
);

/** Fields the game has no vocabulary for yet. Every value of these is UNMAPPED. */
const NO_GAME_VOCABULARY: Readonly<Record<string, string>> = {
  'profile.classification': '種族分類',
  'profile.activityTime': '活動時間',
};

/**
 * THE MUGEN ZERO CHARACTER DEFINITION: what the game reads about an
 * adopted character, in its own words. Built from the FORGE file and the
 * ledger entry every time; never stored separately, never in a save.
 */
export interface ZeroCharacterDefinition {
  characterId: string;
  npcId: string;
  entityType: PersonKind;
  encounterRole: 'NORMAL' | 'BOSS' | null;
  displayName: string;
  /** Null: FORGE's importance is UNMAPPED. */
  standing: PersonStanding | null;
  region: string | null;
  lifeActor: boolean;
  /** Monsters: the species, and the existing species it is, if any. */
  species: { name: string; speciesId: string | null } | null;
  /** A place id, or null when FORGE's habitat is UNMAPPED or absent. */
  habitat: string | null;
  /** Only what the tables map. */
  life: { traits: string[]; values: string[]; desires: string[]; aptitudes: Record<string, number> };
  unmapped: UnmappedValue[];
}

export interface UnmappedValue {
  field: string;
  value: string;
  reason: 'NOT_IN_TABLE' | 'NO_GAME_VOCABULARY';
}

const words = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((w): w is string => typeof w === 'string' && w.length > 0) : [];
const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** FORGE's values, turned into the game's where a table says so. Pure. */
export function adaptForgeVocabulary(definition: ForgeDeployPackage): {
  entityType: PersonKind;
  standing: PersonStanding | null;
  species: ZeroCharacterDefinition['species'];
  habitat: string | null;
  life: ZeroCharacterDefinition['life'];
  unmapped: UnmappedValue[];
} {
  const unmapped: UnmappedValue[] = [];
  const miss = (field: string, value: string, reason: UnmappedValue['reason'] = 'NOT_IN_TABLE') =>
    unmapped.push({ field, value, reason });
  const lookup = <T,>(table: Readonly<Record<string, T>>, field: string, value: string): T | null => {
    if (Object.prototype.hasOwnProperty.call(table, value)) return table[value];
    miss(field, value);
    return null;
  };
  const listed = (table: Readonly<Record<string, string>>, field: string, values: string[]) =>
    values.flatMap((v) => {
      const got = lookup(table, field, v);
      return got ? [got] : [];
    });

  const profile = definition.profile;
  const entityType = lookup(FORGE_VOCABULARY.characterType, 'characterType', definition.characterType) ?? 'PERSON';
  const importance = text(profile.importance);
  const standing = importance ? lookup(FORGE_VOCABULARY.importance, 'profile.importance', importance) : null;

  for (const [field, label] of Object.entries(NO_GAME_VOCABULARY)) {
    const value = text(profile[field.slice('profile.'.length)]);
    if (value) miss(`${field}（${label}）`, value, 'NO_GAME_VOCABULARY');
  }

  const habitatName = text(profile.habitat);
  let habitat: string | null = null;
  if (habitatName) {
    habitat = PLACE_BY_NAME.get(habitatName) ?? null;
    if (!habitat) miss('profile.habitat', habitatName);
  }

  let species: ZeroCharacterDefinition['species'] = null;
  const life: ZeroCharacterDefinition['life'] = { traits: [], values: [], desires: [], aptitudes: {} };
  if (definition.characterType === 'monster') {
    const name = definition.identity.speciesName ?? '';
    species = { name, speciesId: SPECIES_BY_NAME.get(name) ?? null };
    const desire = text(definition.ecology?.desire);
    if (desire) life.desires = listed(FORGE_VOCABULARY.desire, 'ecology.desire', [desire]);
  } else {
    const core = (profile.core ?? {}) as Record<string, unknown>;
    life.traits = listed(FORGE_VOCABULARY.trait, 'profile.core.personality', words(core.personality));
    life.values = listed(FORGE_VOCABULARY.value, 'profile.core.values', words(core.values));
    life.desires = listed(FORGE_VOCABULARY.desire, 'profile.core.desires', words(core.desires));
    for (const [key, value] of Object.entries(definition.aptitudes)) {
      const mapped = lookup(FORGE_VOCABULARY.aptitude, 'aptitudes', key);
      if (mapped) life.aptitudes[mapped] = value;
    }
  }
  return { entityType, standing, species, habitat, life, unmapped };
}

/** The game's definition of one adopted character. */
export function zeroCharacterDefinition(
  definition: ForgeDeployPackage,
  entry: Pick<ForgeRosterEntry, 'characterId' | 'npcId' | 'region' | 'lifeActor' | 'encounterRole'>,
): ZeroCharacterDefinition {
  const adapted = adaptForgeVocabulary(definition);
  return {
    characterId: entry.characterId,
    npcId: entry.npcId,
    encounterRole: entry.encounterRole,
    displayName: forgeDisplayName(definition),
    region: entry.region,
    lifeActor: entry.lifeActor,
    ...adapted,
  };
}

/** The adapter's report for the review screen and the ledger: one warning per UNMAPPED value. */
export function unmappedIssues(definition: ForgeDeployPackage): ForgeIssue[] {
  return adaptForgeVocabulary(definition).unmapped.map((u) => ({
    code: 'UNMAPPED_VOCABULARY',
    path: u.field,
    message:
      u.reason === 'NO_GAME_VOCABULARY'
        ? `UNMAPPED: ${u.field}「${u.value}」— MUGEN ZERO にまだこの分類がありません。FORGE の値は保持し、ゲームの定義には入れません。`
        : `UNMAPPED: ${u.field}「${u.value}」— 対応表（forgeVocabularyAdapter）にありません。似た値へは変換せず、ゲームの定義には入れません。`,
  }));
}
