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

/** The shape of the tables — also what a test passes to try a future entry. */
export interface ForgeVocabulary {
  characterType: Readonly<Record<string, PersonKind>>;
  importance: Readonly<Record<string, PersonStanding>>;
  aptitude: Readonly<Record<string, string>>;
  trait: Readonly<Record<string, string>>;
  value: Readonly<Record<string, string>>;
  desire: Readonly<Record<string, string>>;
}

/**
 * THE TABLES. Every entry is a decision that the FORGE word and the game
 * word mean the same thing. Empty tables are deliberate: no pairing has
 * been decided yet, so every such value is reported as UNMAPPED.
 *
 * DECIDED 2026-09-27 (docs/FORGE_IMPORT.md §0):
 *   - importance: only 一般NPC → ORDINARY. 重要人物・主要人物・特殊NPC
 *     and every other value stay UNMAPPED until the author fixes the
 *     criteria.
 *   - trait / value / desire: EMPTY until FORGE's official word lists
 *     have been seen and the pairing is decided. Until then FORGE's
 *     personality, values and desires do not touch the life engine's
 *     seeds or growth at all.
 * Adding an entry never loses anything: FORGE's own value stays in
 * content/forge/characters/<ID>.json, and the definition is rebuilt
 * from it on every build.
 */
export const FORGE_VOCABULARY: ForgeVocabulary = {
  /** characterType → the game's kind of entity (core/link/types.ts PersonKind). */
  characterType: { human: 'PERSON', monster: 'CREATURE' },
  /** profile.importance → standing (how much the story is about them; never read by rules). */
  importance: { 一般NPC: 'ORDINARY' },
  /**
   * aptitudes key → the WORLD LIFE ENGINE's aptitude (content/world: MAGIC,
   * SWORD, HEALING). Humans only: a FORGE human's aptitudes are potential,
   * which is what the engine means. The engine has no commerce or social
   * aptitude, so those stay UNMAPPED rather than inventing one.
   */
  aptitude: { magic: 'MAGIC', sword: 'SWORD', healing: 'HEALING' },
  /** profile.core.personality → engine trait (CURIOUS, GENTLE, TIMID, …). None decided yet. */
  trait: {},
  /** profile.core.values → engine value (FAMILY, WONDER, …). None decided yet. */
  value: {},
  /** profile.core.desires / ecology.desire → engine desire. None decided yet. */
  desire: {},
};

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
export function adaptForgeVocabulary(
  definition: ForgeDeployPackage,
  vocabulary: ForgeVocabulary = FORGE_VOCABULARY,
): {
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
  const entityType = lookup(vocabulary.characterType, 'characterType', definition.characterType) ?? 'PERSON';
  const importance = text(profile.importance);
  const standing = importance ? lookup(vocabulary.importance, 'profile.importance', importance) : null;

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
    if (desire) life.desires = listed(vocabulary.desire, 'ecology.desire', [desire]);
  } else {
    const core = (profile.core ?? {}) as Record<string, unknown>;
    life.traits = listed(vocabulary.trait, 'profile.core.personality', words(core.personality));
    life.values = listed(vocabulary.value, 'profile.core.values', words(core.values));
    life.desires = listed(vocabulary.desire, 'profile.core.desires', words(core.desires));
    for (const [key, value] of Object.entries(definition.aptitudes)) {
      const mapped = lookup(vocabulary.aptitude, 'aptitudes', key);
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

/**
 * FORGE FIELDS THE GAME KEEPS BUT NEVER USES — SOURCE DATA PRESERVED,
 * GAME MAPPING = UNUSED.
 *
 * Kept verbatim in content/forge/characters/<ID>.json and read by nothing
 * in the game: not the character's looks, not the WORLD LIFE ENGINE
 * (SEED / GROWTH / VINE / BLOOM), not personality, abilities or event
 * conditions. `visualDiversity` in particular is FORGE's own generation
 * and diversity bookkeeping (decided 2026-09-28): what it says is never
 * checked against, corrected by, or turned into anything in the game.
 * Listed so the review screen can say so, field by field.
 */
export const FORGE_SOURCE_ONLY_FIELDS: readonly string[] = [
  'visualDiversity',
  'visualDirection',
  'visualReviewStatus',
  'visualReviewChecklist',
  'lifeAxis',
  'worldViewAxis',
  'relationshipPotential',
  'relationshipRefs',
  'equipment',
  'seeds',
  'dramaHooks',
  'worldMemory',
  'worldLifeEngine',
  'worldAssignment',
  'productionChecklist',
  'characterHistory',
  'combat',
  'bossEncounter',
  'assets',
];

/** The source-only fields this file actually carries (non-empty), each with a short look at its value. */
export function sourceOnlyFields(definition: ForgeDeployPackage): { field: string; value: string }[] {
  const empty = (v: unknown) =>
    v === null || v === undefined || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);
  return FORGE_SOURCE_ONLY_FIELDS.filter((field) => !empty((definition as Record<string, unknown>)[field])).map((field) => {
    const text = JSON.stringify((definition as Record<string, unknown>)[field]);
    return { field, value: text.length > 160 ? `${text.slice(0, 160)}…` : text };
  });
}

/**
 * AGE BANDS FOR ONE WARNING ONLY (decided 2026-09-28, docs/FORGE_IMPORT.md §0).
 *
 * `profile.age` is the character's age — the fact. `visualDiversity.ageGroup`
 * is FORGE's picture-making aid, not an age. These bands exist only to
 * notice when the two plainly disagree and say so:
 *
 *   - never used to make an ageGroup from an age, or an age from an ageGroup;
 *   - never used to correct either side — both stay exactly as FORGE sent them;
 *   - an ageGroup that is not one of these five is UNMAPPED and not compared.
 */
export const FORGE_AGE_GROUP_BANDS: Readonly<Record<string, { min: number; max: number }>> = {
  child: { min: 0, max: 12 },
  teen: { min: 13, max: 17 },
  young_adult: { min: 18, max: 29 },
  adult: { min: 30, max: 49 },
  older_adult: { min: 50, max: Number.POSITIVE_INFINITY },
};

/**
 * Contradictions inside one FORGE file, as warnings. Nothing is corrected
 * and adoption is never stopped. Today: profile.age against
 * visualDiversity.ageGroup.
 */
export function consistencyIssues(definition: ForgeDeployPackage): ForgeIssue[] {
  const out: ForgeIssue[] = [];
  const rawAge = definition.profile?.age;
  const ageText = typeof rawAge === 'number' ? String(rawAge) : typeof rawAge === 'string' ? rawAge.trim() : '';
  const age = /^\d{1,3}$/.test(ageText) ? Number(ageText) : null;
  const visual = definition.visualDiversity as Record<string, unknown> | null;
  const group = visual && typeof visual.ageGroup === 'string' ? visual.ageGroup.trim() : '';
  if (!group) return out;
  const band = Object.prototype.hasOwnProperty.call(FORGE_AGE_GROUP_BANDS, group) ? FORGE_AGE_GROUP_BANDS[group] : null;
  if (!band) {
    out.push({
      code: 'UNMAPPED_VOCABULARY',
      path: 'visualDiversity.ageGroup',
      message: `UNMAPPED: visualDiversity.ageGroup「${group}」— 警告判定用の年齢帯（child／teen／young_adult／adult／older_adult）にない値です。比較せず、そのまま保持します。`,
    });
    return out;
  }
  if (age !== null && (age < band.min || age > band.max)) {
    out.push({
      code: 'AGE_VISUAL_GROUP_MISMATCH',
      path: 'visualDiversity.ageGroup',
      message: `WARNING: AGE / VISUAL AGE GROUP MISMATCH — SOURCE AGE: ${age} ／ VISUAL AGE GROUP: ${group} ／ SOURCE DATA PRESERVED ／ GAME DATA NOT AUTO-CORRECTED（年齢の正は profile.age。どちらも書き換えません）`,
    });
  }
  return out;
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
