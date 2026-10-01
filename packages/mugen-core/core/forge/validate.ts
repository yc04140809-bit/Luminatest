// IS THIS A DEPLOY FILE THE GAME CAN TAKE?
//
// Parser and validator for CHARACTER FORGE's DEPLOY PACKAGE (the output
// of FORGE's buildDeployPackage()). Pure: text in, findings out, nothing
// touched.
//
// TWO KINDS OF RULE (author decision 2026-10-02, docs/FORGE_IMPORT.md):
//
//   - SOURCE VERIFIED — read from FORGE's own implementation. These are
//     ERRORS: the file is not taken. schemaVersion and characterId
//     present, characterType human / monster, status CANONIZED, the name
//     conditions, encounterRole (human null, monster NORMAL / BOSS, a
//     NORMAL monster's bossEncounter null), visualReviewStatus not
//     REVISION_REQUIRED, no impermissible equipment evidence, assets as
//     metadata only, the deployedVersion form 0.1 / 0.1-r2 … — plus the
//     few objects the import itself reads (identity, profile, deployment).
//   - Known only from the old bridge package v1.0 (its JSON Schema and
//     samples). These are WARNINGS (UNVERIFIED_CONTRACT): said out loud,
//     never a reason to refuse — asset types, skill levels, the full
//     visualReviewStatus list, aptitudeSemantics, the bossEncounter field
//     list, the REL id form, and which fields a human or a monster must
//     have or leave null.
//
// Nothing is ever converted or corrected: an unknown string is kept.
//
// Every message is Japanese, because the person reading it is the
// author with the file in front of them.
//
// WHAT IS NOT DECIDED HERE: whether the game already has this
// character, whether it is a sample, whether its id is reserved. Those
// are about the game, not the file, and belong to the planner.

import type { ForgeDeployPackage, ForgeIssue, ForgeIssueCode } from './types';

export const FORGE_SOURCE = 'MUGEN_CHARACTER_FORGE';
export const FORGE_TARGET = 'MUGEN_ZERO';
/** The version real FORGE packages carry ("1.0", a string). Others are read with a warning. */
export const FORGE_SCHEMA_VERSION = '1.0';

/** Also a file name in content/forge/characters, so it must stay this plain. */
export const CHARACTER_ID_PATTERN = /^(HUM|MON)-[0-9]{6,}$/;
const HUMAN_ID = /^HUM-[0-9]{6,}$/;
const MONSTER_ID = /^MON-[0-9]{6,}$/;
const RELATIONSHIP_ID = /^REL-[0-9]{6,}$/;
const DEPLOYED_VERSION = /^0\.1(?:-r(?:[2-9]|[1-9][0-9]+))?$/;
/** RFC 3339 date-time, as JSON Schema's `format: date-time` means it. */
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

// ---- From the old bridge package v1.0 only: checked as WARNINGS.
const SKILL_LEVELS = ['UNLEARNED', 'EXPOSURE', 'BASIC', 'PRACTICAL', 'SKILLED', 'MASTER'];
const SKILL_KEYS = ['magic', 'sword', 'healing', 'commerce', 'social'];
const NAME_STATUSES = ['UNSET', 'AUTO_CANDIDATE', 'CANON', 'IN_WORLD_ACQUIRED'];
const ASSET_TYPES = [
  'CONCEPT',
  'FULL_BODY',
  'TURNAROUND',
  'EXPRESSION',
  'BATTLE',
  'DOWN',
  'EXPLORATION',
  'EVENT_CG',
  'OTHER',
];
const VISUAL_REVIEW = ['UNREVIEWED', 'APPROVED', 'REVISION_REQUIRED'];

// ---- SOURCE VERIFIED.
const SETTLED_NAME = ['CANON', 'IN_WORLD_ACQUIRED'];

/** What buildDeployPackage() puts at the root (SOURCE VERIFIED list). */
export const ROOT_FIELDS = [
  'schemaVersion',
  'source',
  'characterId',
  'characterType',
  'encounterRole',
  'status',
  'identity',
  'profile',
  'lifeAxis',
  'worldViewAxis',
  'relationshipPotential',
  'aptitudes',
  'aptitudeSemantics',
  'currentSkills',
  'equipment',
  'lifeStage',
  'visualDiversity',
  'visualDirection',
  'visualReviewStatus',
  'visualReviewChecklist',
  'worldAssignment',
  'productionChecklist',
  'relationshipRefs',
  'characterHistory',
  'ecology',
  'combat',
  'bossEncounter',
  'seeds',
  'dramaHooks',
  'worldMemory',
  'worldLifeEngine',
  'assets',
  'deployment',
] as const;
/** Root fields whose absence stops the import: the verified conditions, and what the import reads. */
const REQUIRED_ROOT_FIELDS = ['schemaVersion', 'characterId', 'characterType', 'status', 'identity', 'profile', 'deployment'];
/** Allowed at the root without being required. */
const OPTIONAL_ROOT_FIELDS = ['sampleOnly'];

const IDENTITY_FIELDS = [
  'name',
  'speciesName',
  'individualName',
  'nameStatus',
  'speciesNameStatus',
  'individualNameStatus',
  'nameOrigin',
  'speciesNameOrigin',
  'individualNameOrigin',
];
const DEPLOYMENT_FIELDS = ['source', 'target', 'deployedAt', 'deployedVersion'];
/** The old bridge package's bossEncounter list — a WARNING if something is missing. */
export const BOSS_FIELDS = [
  'generated',
  'rank',
  'narrativeFunction',
  'encounterReason',
  'arena',
  'phaseCount',
  'openingBehavior',
  'phaseTransition',
  'coreMechanic',
  'counterplayClue',
  'signatureMove',
  'enrageCondition',
  'minionPattern',
  'defeatOutcome',
  'resolutionPolicy',
  'rewardDirection',
  'entranceDirection',
  'seedCandidates',
  'notes',
];
/** Boss fields the old bridge package wanted filled in. */
const BOSS_ESSENTIAL = ['rank', 'encounterReason', 'coreMechanic', 'counterplayClue', 'defeatOutcome'];
const ASSET_FIELDS = [
  'assetId',
  'assetType',
  'fileName',
  'internalFileName',
  'originalFileName',
  'originalMimeType',
  'mimeType',
  'width',
  'height',
  'originalByteSize',
  'storedByteSize',
  'imageStorageKey',
  'memo',
  'createdAt',
  'approved',
  'primary',
];

export type ParseResult =
  | { ok: true; value: unknown }
  | { ok: false; issue: ForgeIssue };

/** JSON text → a value, or one Japanese error. Never throws. */
export function parseDeployJson(text: string): ParseResult {
  const trimmed = text.replace(/^﻿/, '').trim();
  if (!trimmed) {
    return { ok: false, issue: issue('JSON_PARSE', '', 'JSONが空です。ファイルを選ぶか、内容を貼り付けてください。') };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      issue: issue('JSON_PARSE', '', `JSONとして読めません（壊れているか、途中で切れています）: ${detail}`),
    };
  }
}

export interface Validation {
  /** Present only when there are no errors. */
  payload: ForgeDeployPackage | null;
  errors: ForgeIssue[];
  warnings: ForgeIssue[];
}

/**
 * Checks a parsed value against deploy package 1.0.
 *
 * `sampleOnly` is NOT an error here — a sample is a perfectly shaped
 * file. Refusing to register one is the planner's job, so that the
 * samples can still be used to check that this validator is right.
 */
export function validateDeployPackage(value: unknown): Validation {
  const errors: ForgeIssue[] = [];
  const warnings: ForgeIssue[] = [];
  const err = (code: ForgeIssueCode, path: string, message: string) => errors.push(issue(code, path, message));
  const warn = (code: ForgeIssueCode, path: string, message: string) => warnings.push(issue(code, path, message));
  // Known only from the old bridge package: said, never refused on.
  const legacy: Report = (_code, path, message) =>
    warnings.push(issue('UNVERIFIED_CONTRACT', path, `${message}（旧連携資料 v1.0 だけで確認できる条件のため、警告として表示し取り込みは止めません）`));

  if (!isObject(value)) {
    err('SCHEMA', '', 'ファイルの中身がオブジェクト（{ … }）ではありません。');
    return { payload: null, errors, warnings };
  }
  const v = value;

  // ---- The version FORGE wrote. Read as it is; never coerced.
  const version = v.schemaVersion;
  if (!('schemaVersion' in v) || version === null || version === '') {
    err('SCHEMA', 'schemaVersion', 'schemaVersion: 必須項目がありません。');
  } else if (version === FORGE_SCHEMA_VERSION) {
    // The version real FORGE packages carry.
  } else if (typeof version === 'string' && /^1\.\d+$/.test(version)) {
    warn('NEWER_MINOR_VERSION', 'schemaVersion', `schemaVersion ${version} は 1.0 より新しい版です。知らない項目はそのまま保持します。`);
  } else {
    warn('UNKNOWN_SCHEMA_VERSION', 'schemaVersion', `schemaVersion「${String(version)}」はこれまでの FORGE 出力（"1.0"）と違います。値は変えずに保持し、読める範囲で確認します。`);
  }

  for (const key of ROOT_FIELDS) {
    if (key in v || key === 'schemaVersion') continue;
    if (REQUIRED_ROOT_FIELDS.includes(key)) err('SCHEMA', key, `${key}: 必須項目がありません。`);
    else legacy('SCHEMA', key, `${key}: 項目がありません`);
  }
  for (const key of Object.keys(v)) {
    if (!(ROOT_FIELDS as readonly string[]).includes(key) && !OPTIONAL_ROOT_FIELDS.includes(key)) {
      warn('UNKNOWN_FIELD', key, `未知の項目「${key}」があります。取り込みには使わず、そのまま保持します。`);
    }
  }

  if ('source' in v && v.source !== FORGE_SOURCE) legacy('SCHEMA', 'source', `source が ${FORGE_SOURCE} ではありません`);
  if ('sampleOnly' in v && typeof v.sampleOnly !== 'boolean') legacy('SCHEMA', 'sampleOnly', 'sampleOnly が true / false ではありません');
  if ('status' in v && v.status !== 'CANONIZED') err('SCHEMA', 'status', 'status が CANONIZED ではありません。');

  const id = v.characterId;
  if ('characterId' in v && (typeof id !== 'string' || !CHARACTER_ID_PATTERN.test(id))) {
    err('SCHEMA', 'characterId', `characterId「${String(id)}」は HUM-000001 / MON-000001 の形式ではありません。`);
  }

  // ---- What the import itself reads.
  if ('profile' in v && !isObject(v.profile)) err('SCHEMA', 'profile', 'profile がオブジェクトではありません。');

  // ---- Shapes from the old bridge package only.
  expectNullableObject(v, 'lifeAxis', legacy);
  expectNullableObject(v, 'worldViewAxis', legacy);
  if ('relationshipPotential' in v) expectStringArray(v, 'relationshipPotential', legacy);
  if ('aptitudes' in v) {
    if (!isObject(v.aptitudes)) legacy('SCHEMA', 'aptitudes', 'aptitudes がオブジェクトではありません');
    else {
      for (const [key, n] of Object.entries(v.aptitudes)) {
        if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1) {
          legacy('SCHEMA', `aptitudes.${key}`, `aptitudes.${key} が 0.00〜1.00 の数ではありません`);
        }
      }
    }
  }
  if ('aptitudeSemantics' in v && v.aptitudeSemantics !== 'POTENTIAL_NOT_ACQUIRED_SKILL' && v.aptitudeSemantics !== 'SPECIES_COMBAT_POTENTIAL') {
    legacy('SCHEMA', 'aptitudeSemantics', `aptitudeSemantics「${String(v.aptitudeSemantics)}」は旧資料の値（POTENTIAL_NOT_ACQUIRED_SKILL / SPECIES_COMBAT_POTENTIAL）にありません`);
  }
  expectNullableObject(v, 'equipment', legacy);
  expectNullableObject(v, 'lifeStage', legacy);
  expectNullableObject(v, 'visualDiversity', legacy);
  expectNullableObject(v, 'visualDirection', legacy);

  // ---- visualReviewStatus: FORGE does not send REVISION_REQUIRED (verified); the rest of the list is the old package's.
  if (v.visualReviewStatus === 'REVISION_REQUIRED') {
    err('VISUAL_REVISION_REQUIRED', 'visualReviewStatus', '見た目のレビューが「修正が必要（REVISION_REQUIRED）」です。FORGE はこの状態では送出しません。FORGE で直してから送出してください。');
  } else if ('visualReviewStatus' in v && !VISUAL_REVIEW.includes(v.visualReviewStatus as string)) {
    legacy('SCHEMA', 'visualReviewStatus', `visualReviewStatus「${String(v.visualReviewStatus)}」は旧資料の値（UNREVIEWED / APPROVED）にありません`);
  }
  for (const key of ['visualReviewChecklist', 'worldAssignment', 'productionChecklist']) {
    if (key in v && !isObject(v[key])) legacy('SCHEMA', key, `${key} がオブジェクトではありません`);
  }
  if ('relationshipRefs' in v) {
    if (!Array.isArray(v.relationshipRefs)) legacy('SCHEMA', 'relationshipRefs', 'relationshipRefs が配列ではありません');
    else {
      v.relationshipRefs.forEach((ref, i) => {
        if (typeof ref !== 'string' || !RELATIONSHIP_ID.test(ref)) {
          legacy('SCHEMA', `relationshipRefs.${i}`, `relationshipRefs の「${String(ref)}」は旧資料の形式（REL-000001）ではありません`);
        }
      });
    }
  }
  if ('characterHistory' in v) {
    if (!Array.isArray(v.characterHistory)) legacy('SCHEMA', 'characterHistory', 'characterHistory が配列ではありません');
    else {
      v.characterHistory.forEach((entry, i) => {
        const at = `characterHistory.${i}`;
        if (!isObject(entry)) return legacy('SCHEMA', at, `${at} がオブジェクトではありません`);
        if (typeof entry.event !== 'string' || !entry.event) legacy('SCHEMA', `${at}.event`, `${at}.event がありません`);
        if (!isDateTime(entry.at)) legacy('SCHEMA', `${at}.at`, `${at}.at が ISO 日時ではありません`);
        if (typeof entry.origin !== 'string') legacy('SCHEMA', `${at}.origin`, `${at}.origin が文字列ではありません`);
        if (!isObject(entry.details)) legacy('SCHEMA', `${at}.details`, `${at}.details がオブジェクトではありません`);
      });
    }
  }
  expectNullableObject(v, 'ecology', legacy);
  expectNullableObject(v, 'combat', legacy);
  expectNullableObject(v, 'bossEncounter', legacy);
  if ('seeds' in v) expectStringArray(v, 'seeds', legacy);
  if ('dramaHooks' in v) expectStringArray(v, 'dramaHooks', legacy);
  if ('worldMemory' in v) {
    if (!isObject(v.worldMemory)) legacy('SCHEMA', 'worldMemory', 'worldMemory がオブジェクトではありません');
    else {
      if (typeof v.worldMemory.registered !== 'boolean') legacy('SCHEMA', 'worldMemory.registered', 'worldMemory.registered が true / false ではありません');
      if (!Array.isArray(v.worldMemory.events)) legacy('SCHEMA', 'worldMemory.events', 'worldMemory.events が配列ではありません');
      if (typeof v.worldMemory.memo !== 'string') legacy('SCHEMA', 'worldMemory.memo', 'worldMemory.memo が文字列ではありません');
    }
  }
  if ('worldLifeEngine' in v && (!isObject(v.worldLifeEngine) || typeof v.worldLifeEngine.enabled !== 'boolean')) {
    legacy('SCHEMA', 'worldLifeEngine.enabled', 'worldLifeEngine.enabled が true / false ではありません');
  }
  if ('assets' in v) validateAssets(v.assets, err, warn, legacy);
  if ('identity' in v) validateIdentity(v.identity, err, warn, legacy);
  if ('deployment' in v) validateDeployment(v.deployment, err, warn, legacy);

  // ---- The two kinds of character (SOURCE VERIFIED: human / monster only).
  if (v.characterType === 'human') validateHuman(v, err, warn, legacy);
  else if (v.characterType === 'monster') validateMonster(v, err, warn, legacy);
  else if ('characterType' in v) err('SCHEMA', 'characterType', `characterType「${String(v.characterType)}」は human / monster ではありません。`);

  return { payload: errors.length ? null : (v as unknown as ForgeDeployPackage), errors, warnings };
}

type Report = (code: ForgeIssueCode, path: string, message: string) => void;

function validateHuman(v: Record<string, unknown>, err: Report, warn: Report, legacy: Report): void {
  if (typeof v.characterId === 'string' && CHARACTER_ID_PATTERN.test(v.characterId) && !HUMAN_ID.test(v.characterId)) {
    warn('ID_TYPE_MISMATCH', 'characterId', `characterId「${v.characterId}」は人間（HUM-）の番号ではありませんが、characterType は human です。FORGE での確認をおすすめします（ID はそのまま使います）。`);
  }
  // SOURCE VERIFIED.
  if (v.encounterRole !== null) err('SCHEMA', 'encounterRole', '人間の encounterRole は null です。');
  const identity = isObject(v.identity) ? v.identity : {};
  if (typeof identity.name !== 'string' || !identity.name) err('SCHEMA', 'identity.name', '人間の名前（identity.name）がありません。');
  if (!SETTLED_NAME.includes(identity.nameStatus as string)) {
    err('SCHEMA', 'identity.nameStatus', '人間の名前が確定していません（nameStatus は CANON / IN_WORLD_ACQUIRED）。');
  }
  if (isObject(v.equipment)) {
    const check = isObject(v.equipment.validation) ? v.equipment.validation : null;
    if (check?.permitted === false) {
      err(
        'EQUIPMENT_NOT_PERMITTED',
        'equipment.validation.permitted',
        '装備の根拠が不足しています（equipment.validation.permitted が false）。FORGEで装備の根拠を直してから送出してください。',
      );
    }
    if (check?.potentialAptitudeUsed === true) {
      warn(
        'EQUIPMENT_FROM_POTENTIAL',
        'equipment.validation.potentialAptitudeUsed',
        '装備の根拠に潜在適性が使われています。潜在適性は現在の技能ではないため、FORGEでの確認をおすすめします。',
      );
    }
  }
  if (isObject(v.lifeStage)) {
    // FORGE's lifeStage, as FORGE derived it: said back, never recomputed.
    if (v.lifeStage.adultAxisMode === 'FUTURE_TENDENCY') {
      warn('FUTURE_TENDENCY_KEPT', 'lifeStage.adultAxisMode', '結婚・恋愛などの成人軸は「将来の傾向」です。現在の事実にはせず、そのまま保持します。');
    }
    if (v.lifeStage.occupationMode === 'FUTURE_ASPIRATION') {
      warn('FUTURE_ASPIRATION_KEPT', 'lifeStage.occupationMode', '職業は「将来の希望」です。現在の職業としては登録しません。');
    }
  }

  // From the old bridge package only.
  if (v.aptitudeSemantics !== undefined && v.aptitudeSemantics !== 'POTENTIAL_NOT_ACQUIRED_SKILL') {
    legacy('SCHEMA', 'aptitudeSemantics', '人間の aptitudeSemantics が POTENTIAL_NOT_ACQUIRED_SKILL（潜在適性）ではありません');
  }
  for (const key of ['lifeAxis', 'worldViewAxis', 'equipment', 'lifeStage']) {
    if (key in v && !isObject(v[key])) legacy('SCHEMA', key, `人間の ${key} がありません`);
  }
  for (const key of ['ecology', 'combat', 'bossEncounter']) {
    if (key in v && v[key] !== null) legacy('SCHEMA', key, `人間にモンスター用の ${key} があります`);
  }
  if ('speciesName' in identity && identity.speciesName !== null) legacy('SCHEMA', 'identity.speciesName', '人間の identity.speciesName が null ではありません');
  if ('individualName' in identity && identity.individualName !== null) legacy('SCHEMA', 'identity.individualName', '人間の identity.individualName が null ではありません');
  // The only skills a human has now. Potential (aptitudes) never stands in for them.
  if ('currentSkills' in v) {
    if (!isObject(v.currentSkills)) legacy('SCHEMA', 'currentSkills', '人間の現在技能（currentSkills）がありません');
    else {
      for (const key of SKILL_KEYS) {
        if (!SKILL_LEVELS.includes(v.currentSkills[key] as string)) {
          legacy('SCHEMA', `currentSkills.${key}`, `currentSkills.${key}「${String(v.currentSkills[key])}」は旧資料の技能段階（UNLEARNED〜MASTER）にありません`);
        }
      }
    }
  }
}

function validateMonster(v: Record<string, unknown>, err: Report, warn: Report, legacy: Report): void {
  if (typeof v.characterId === 'string' && CHARACTER_ID_PATTERN.test(v.characterId) && !MONSTER_ID.test(v.characterId)) {
    warn('ID_TYPE_MISMATCH', 'characterId', `characterId「${v.characterId}」はモンスター（MON-）の番号ではありませんが、characterType は monster です。FORGE での確認をおすすめします（ID はそのまま使います）。`);
  }
  // SOURCE VERIFIED.
  if (v.encounterRole !== 'NORMAL' && v.encounterRole !== 'BOSS') {
    err('SCHEMA', 'encounterRole', 'モンスターの encounterRole は NORMAL / BOSS です。');
  }
  const identity = isObject(v.identity) ? v.identity : {};
  if (typeof identity.speciesName !== 'string' || !identity.speciesName) {
    err('SCHEMA', 'identity.speciesName', 'モンスターの種族名（identity.speciesName）がありません。');
  }
  if (!SETTLED_NAME.includes(identity.speciesNameStatus as string)) {
    err('SCHEMA', 'identity.speciesNameStatus', '種族名が確定していません（speciesNameStatus は CANON / IN_WORLD_ACQUIRED）。');
  }
  if (v.encounterRole === 'NORMAL' && 'bossEncounter' in v && v.bossEncounter !== null) {
    err('SCHEMA', 'bossEncounter', '通常モンスター（encounterRole NORMAL）の bossEncounter は null です。');
  }

  // From the old bridge package only.
  if (v.aptitudeSemantics !== undefined && v.aptitudeSemantics !== 'SPECIES_COMBAT_POTENTIAL') {
    legacy('SCHEMA', 'aptitudeSemantics', 'モンスターの aptitudeSemantics が SPECIES_COMBAT_POTENTIAL（種族の戦闘潜在値）ではありません');
  }
  for (const key of ['lifeAxis', 'worldViewAxis', 'currentSkills', 'equipment', 'lifeStage']) {
    if (key in v && v[key] !== null) legacy('SCHEMA', key, `モンスターの ${key} が null ではありません`);
  }
  for (const key of ['ecology', 'combat']) {
    if (key in v && !isObject(v[key])) legacy('SCHEMA', key, `モンスターの ${key} がありません`);
  }
  if (v.encounterRole === 'BOSS') validateBoss(v.bossEncounter, legacy);
}

function validateBoss(boss: unknown, legacy: Report): void {
  if (!isObject(boss) || boss.generated !== true) {
    legacy('SCHEMA', 'bossEncounter', 'BOSSの遭遇設計（bossEncounter）が生成済みではありません');
    return;
  }
  for (const key of BOSS_FIELDS) {
    if (!(key in boss)) legacy('SCHEMA', `bossEncounter.${key}`, `bossEncounter.${key} がありません`);
  }
  for (const key of BOSS_FIELDS) {
    if (key === 'generated' || !(key in boss)) continue;
    if (key === 'seedCandidates') {
      if (!Array.isArray(boss[key]) || !(boss[key] as unknown[]).every((s) => typeof s === 'string')) {
        legacy('SCHEMA', 'bossEncounter.seedCandidates', 'bossEncounter.seedCandidates が文字列の配列ではありません');
      }
    } else if (typeof boss[key] !== 'string') {
      legacy('SCHEMA', `bossEncounter.${key}`, `bossEncounter.${key} が文字列ではありません`);
    }
  }
  for (const key of BOSS_ESSENTIAL) {
    const text = boss[key];
    if (typeof text === 'string' && (!text.trim() || text === '未設定')) {
      legacy('SCHEMA', `bossEncounter.${key}`, `bossEncounter.${key} が未設定です`);
    }
  }
  for (const key of Object.keys(boss)) {
    if (!BOSS_FIELDS.includes(key)) legacy('UNKNOWN_FIELD', `bossEncounter.${key}`, `未知の項目「bossEncounter.${key}」があります。そのまま保持します`);
  }
}

function validateIdentity(identity: unknown, err: Report, warn: Report, legacy: Report): void {
  if (!isObject(identity)) {
    err('SCHEMA', 'identity', 'identity がオブジェクトではありません。');
    return;
  }
  for (const key of IDENTITY_FIELDS) {
    if (!(key in identity)) legacy('SCHEMA', `identity.${key}`, `identity.${key} がありません`);
  }
  if ('name' in identity && identity.name !== null && typeof identity.name !== 'string') legacy('SCHEMA', 'identity.name', 'identity.name が文字列ではありません');
  for (const key of ['speciesName', 'individualName', 'nameOrigin', 'speciesNameOrigin', 'individualNameOrigin']) {
    if (key in identity && identity[key] !== null && typeof identity[key] !== 'string') {
      legacy('SCHEMA', `identity.${key}`, `identity.${key} が文字列でも null でもありません`);
    }
  }
  for (const key of ['nameStatus', 'speciesNameStatus', 'individualNameStatus']) {
    const status = identity[key];
    if (key in identity && status !== null && !NAME_STATUSES.includes(status as string)) {
      legacy('SCHEMA', `identity.${key}`, `identity.${key}「${String(status)}」は旧資料の命名状態にありません`);
    }
  }
  for (const key of Object.keys(identity)) {
    if (!IDENTITY_FIELDS.includes(key)) {
      warn('UNKNOWN_FIELD', `identity.${key}`, `未知の項目「identity.${key}」があります。そのまま保持します。`);
    }
  }
}

function validateDeployment(deployment: unknown, err: Report, warn: Report, legacy: Report): void {
  if (!isObject(deployment)) {
    err('SCHEMA', 'deployment', 'deployment（送出情報）がオブジェクトではありません。');
    return;
  }
  // SOURCE VERIFIED: 0.1, 0.1-r2, 0.1-r3 … — and the import orders sends by these two.
  if (!isDateTime(deployment.deployedAt)) err('SCHEMA', 'deployment.deployedAt', 'deployment.deployedAt が ISO 日時ではありません。');
  if (typeof deployment.deployedVersion !== 'string' || !DEPLOYED_VERSION.test(deployment.deployedVersion)) {
    err('SCHEMA', 'deployment.deployedVersion', `deployment.deployedVersion「${String(deployment.deployedVersion)}」は 0.1 / 0.1-r2 … の形式ではありません。`);
  }
  if (deployment.source !== FORGE_SOURCE) legacy('SCHEMA', 'deployment.source', `deployment.source が ${FORGE_SOURCE} ではありません`);
  if (deployment.target !== FORGE_TARGET) legacy('SCHEMA', 'deployment.target', `deployment.target が ${FORGE_TARGET} ではありません`);
  for (const key of Object.keys(deployment)) {
    if (!DEPLOYMENT_FIELDS.includes(key)) {
      warn('UNKNOWN_FIELD', `deployment.${key}`, `未知の項目「deployment.${key}」があります。そのまま保持します。`);
    }
  }
}

function validateAssets(assets: unknown, err: Report, warn: Report, legacy: Report): void {
  if (!Array.isArray(assets)) {
    legacy('SCHEMA', 'assets', 'assets が配列ではありません');
    return;
  }
  assets.forEach((asset, i) => {
    const at = `assets.${i}`;
    if (!isObject(asset)) return legacy('SCHEMA', at, `${at} がオブジェクトではありません`);
    if (typeof asset.assetId !== 'string' || !asset.assetId) legacy('SCHEMA', `${at}.assetId`, `${at}.assetId がありません`);
    if ('assetType' in asset && !ASSET_TYPES.includes(asset.assetType as string)) {
      legacy('SCHEMA', `${at}.assetType`, `${at}.assetType「${String(asset.assetType)}」は旧資料の種類一覧にありません`);
    }
    for (const key of ['width', 'height', 'originalByteSize', 'storedByteSize']) {
      if (key in asset && (typeof asset[key] !== 'number' || (asset[key] as number) < 0)) {
        legacy('SCHEMA', `${at}.${key}`, `${at}.${key} が 0 以上の数ではありません`);
      }
    }
    for (const key of ['approved', 'primary']) {
      if (key in asset && typeof asset[key] !== 'boolean') legacy('SCHEMA', `${at}.${key}`, `${at}.${key} が true / false ではありません`);
    }
    for (const key of ['fileName', 'internalFileName', 'originalFileName', 'originalMimeType', 'mimeType', 'imageStorageKey', 'memo', 'createdAt']) {
      if (key in asset && typeof asset[key] !== 'string') legacy('SCHEMA', `${at}.${key}`, `${at}.${key} が文字列ではありません`);
    }
    // SOURCE VERIFIED: assets are metadata only — never the picture itself.
    for (const [key, field] of Object.entries(asset)) {
      if (typeof field === 'string' && field.startsWith('data:')) {
        err('SCHEMA', `${at}.${key}`, `${at}.${key} に画像データ（data URL）が含まれています。DEPLOY JSON はメタ情報のみです。`);
      }
    }
    for (const key of Object.keys(asset)) {
      if (!ASSET_FIELDS.includes(key)) warn('UNKNOWN_FIELD', `${at}.${key}`, `未知の項目「${at}.${key}」があります。そのまま保持します。`);
    }
  });
}

function expectNullableObject(v: Record<string, unknown>, key: string, err: Report): void {
  if (key in v && v[key] !== null && !isObject(v[key])) err('SCHEMA', key, `${key} がオブジェクトでも null でもありません`);
}

function expectStringArray(v: Record<string, unknown>, key: string, err: Report): void {
  if (!Array.isArray(v[key])) err('SCHEMA', key, `${key} が配列ではありません`);
  else if (!(v[key] as unknown[]).every((s) => typeof s === 'string')) err('SCHEMA', key, `${key} に文字列でない要素があります`);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && DATE_TIME.test(value) && !Number.isNaN(Date.parse(value));
}

export function issue(code: ForgeIssueCode, path: string, message: string): ForgeIssue {
  return { code, path, message };
}
