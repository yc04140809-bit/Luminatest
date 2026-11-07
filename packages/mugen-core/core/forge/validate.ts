// IS THIS A DEPLOY FILE THE GAME CAN TAKE?
//
// Parser and validator for CHARACTER FORGE's DEPLOY PACKAGE (the output
// of FORGE's buildDeployPackage()). Pure: text in, findings out, nothing
// touched.
//
// THE CONTRACT is the bridge package v1.1 (2026-10-05): FORGE's own
// implementation, confirmed from its source (FORGE commit 36b7091), its
// JSON Schema (schemas/forge-deploy-package.schema.json) and its checker
// (tools/validate-deploy.mjs). Author decision 2026-10-05: a breach of
// that contract is an ERROR — the file is not taken. Every real FORGE
// package so far (RIZEL, EDDA, NUMAWATARI, SEKIRYUGA) meets it.
//
// WHAT THIS DOES NOT DO:
//   - It never recomputes, corrects or converts anything. FORGE's
//     lifeStage is checked for shape and FORGE's own values, never
//     worked out again from age or ageGroup.
//   - Free strings stay free: profile.importance and the personality,
//     values and desires lists must be strings, never members of a list.
//   - An unknown extra field is never an error: it is kept, and said.
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
/** The one DEPLOY PACKAGE version the contract supports — a string, as FORGE writes it. */
export const FORGE_SCHEMA_VERSION = '1.0';

/** Also a file name in content/forge/characters, so it must stay this plain. */
export const CHARACTER_ID_PATTERN = /^(HUM|MON)-[0-9]{6,}$/;
const HUMAN_ID = /^HUM-[0-9]{6,}$/;
const MONSTER_ID = /^MON-[0-9]{6,}$/;
const RELATIONSHIP_ID = /^REL-[0-9]{6,}$/;
const DEPLOYED_VERSION = /^0\.1(?:-r(?:[2-9]|[1-9][0-9]+))?$/;
/** RFC 3339 date-time, as JSON Schema's `format: date-time` means it. */
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

// ---- FORGE's fixed values (bridge v1.1). Free-string fields have none.
const SKILL_LEVELS = ['UNLEARNED', 'EXPOSURE', 'BASIC', 'PRACTICAL', 'SKILLED', 'MASTER'];
const SKILL_KEYS = ['magic', 'sword', 'healing', 'commerce', 'social'];
const NAME_STATUSES = ['UNSET', 'AUTO_CANDIDATE', 'CANON', 'IN_WORLD_ACQUIRED'];
const SETTLED_NAME = ['CANON', 'IN_WORLD_ACQUIRED'];
const ASSET_TYPES = ['CONCEPT', 'FULL_BODY', 'TURNAROUND', 'EXPRESSION', 'BATTLE', 'DOWN', 'EXPLORATION', 'EVENT_CG', 'OTHER'];
const VISUAL_REVIEW = ['UNREVIEWED', 'APPROVED', 'REVISION_REQUIRED'];
/** visualDiversity.ageGroup and lifeStage.visualAge: FORGE's seven, and UNSET for old records. */
export const VISUAL_AGES = ['child', 'teen', 'young_adult', 'adult', 'middle_aged', 'older_adult', 'elderly', 'UNSET'];
const LIFE_STAGES = ['CHILD', 'TEEN', 'ADULT', 'ADULT_OR_UNSET'];
const LIFE_STAGE_SOURCES = ['VISUAL_AGE', 'AGE', 'UNSET'];
const ADULT_AXIS_MODES = ['FUTURE_TENDENCY', 'CURRENT_TENDENCY'];
const OCCUPATION_MODES = ['UNSET', 'FUTURE_ASPIRATION', 'CURRENT_OR_AGE_APPROPRIATE'];
const LIFE_STAGE_FIELDS = ['stage', 'source', 'visualAge', 'adultAxisMode', 'occupationMode', 'futureFields', 'note'];
const INTENSITIES = ['SUBTLE', 'STANDARD', 'STRONG'];
const OVERALL_IMPRESSIONS = [
  'NATURAL', 'CUTE', 'COOL', 'BEAUTIFUL', 'PLAIN', 'FRIENDLY', 'EERIE', 'GROTESQUE',
  'INTIMIDATING', 'MYSTICAL', 'STRANGE', 'COMICAL', 'TRAGIC', 'INORGANIC', 'UNSET',
];

/** What buildDeployPackage() puts at the root — every one required. */
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
/** A boss's encounter design, field by field (bridge v1.1). */
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
/** Boss fields that must actually say something. */
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

  if (!isObject(value)) {
    err('SCHEMA', '', 'ファイルの中身がオブジェクト（{ … }）ではありません。');
    return { payload: null, errors, warnings };
  }
  const v = value;

  // ---- The contract version: "1.0" only. Never coerced.
  if ('schemaVersion' in v && v.schemaVersion !== FORGE_SCHEMA_VERSION) {
    err('UNSUPPORTED_SCHEMA_VERSION', 'schemaVersion', `schemaVersion「${String(v.schemaVersion)}」には対応していません（対応版: "1.0"）。データは変更しません。`);
  }

  for (const key of ROOT_FIELDS) if (!(key in v)) err('SCHEMA', key, `${key}: 必須項目がありません。`);
  // An unknown extra field is kept and said — never a reason to refuse.
  for (const key of Object.keys(v)) {
    if (!(ROOT_FIELDS as readonly string[]).includes(key) && !OPTIONAL_ROOT_FIELDS.includes(key)) {
      warn('UNKNOWN_FIELD', key, `未知の項目「${key}」があります。取り込みには使わず、そのまま保持します。`);
    }
  }

  if ('source' in v && v.source !== FORGE_SOURCE) err('SCHEMA', 'source', `source が ${FORGE_SOURCE} ではありません。`);
  if ('sampleOnly' in v && typeof v.sampleOnly !== 'boolean') err('SCHEMA', 'sampleOnly', 'sampleOnly が true / false ではありません。');
  if ('status' in v && v.status !== 'CANONIZED') err('SCHEMA', 'status', 'status が CANONIZED ではありません。');

  const id = v.characterId;
  if ('characterId' in v && (typeof id !== 'string' || !CHARACTER_ID_PATTERN.test(id))) {
    err('SCHEMA', 'characterId', `characterId「${String(id)}」は HUM-000001 / MON-000001 の形式ではありません。`);
  }

  if ('profile' in v) {
    if (!isObject(v.profile)) err('SCHEMA', 'profile', 'profile がオブジェクトではありません。');
    // A free string (FORGE has no list for it); empty is fine. Only the type is the contract.
    else if (typeof v.profile.importance !== 'string') err('SCHEMA', 'profile.importance', 'profile.importance が文字列ではありません（自由入力の文字列。空でもよい）。');
  }
  expectNullableObject(v, 'lifeAxis', err);
  expectNullableObject(v, 'worldViewAxis', err);
  if ('relationshipPotential' in v) expectStringArray(v, 'relationshipPotential', err);
  if ('aptitudes' in v) {
    if (!isObject(v.aptitudes)) err('SCHEMA', 'aptitudes', 'aptitudes がオブジェクトではありません。');
    else {
      for (const [key, n] of Object.entries(v.aptitudes)) {
        if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1) {
          err('SCHEMA', `aptitudes.${key}`, `aptitudes.${key} が 0.00〜1.00 の数ではありません。`);
        }
      }
    }
  }
  if ('aptitudeSemantics' in v && v.aptitudeSemantics !== 'POTENTIAL_NOT_ACQUIRED_SKILL' && v.aptitudeSemantics !== 'SPECIES_COMBAT_POTENTIAL') {
    err('SCHEMA', 'aptitudeSemantics', `aptitudeSemantics「${String(v.aptitudeSemantics)}」は POTENTIAL_NOT_ACQUIRED_SKILL / SPECIES_COMBAT_POTENTIAL ではありません。`);
  }
  expectNullableObject(v, 'equipment', err);
  expectNullableObject(v, 'lifeStage', err);
  expectNullableObject(v, 'visualDiversity', err);
  if ('visualDirection' in v) validateVisualDirection(v.visualDirection, err);

  if (v.visualReviewStatus === 'REVISION_REQUIRED') {
    err('VISUAL_REVISION_REQUIRED', 'visualReviewStatus', '見た目のレビューが「修正が必要（REVISION_REQUIRED）」です。FORGE はこの状態では送出しません。FORGE で直してから送出してください。');
  } else if ('visualReviewStatus' in v && !VISUAL_REVIEW.includes(v.visualReviewStatus as string)) {
    err('SCHEMA', 'visualReviewStatus', `visualReviewStatus「${String(v.visualReviewStatus)}」は UNREVIEWED / APPROVED ではありません。`);
  }
  for (const key of ['visualReviewChecklist', 'worldAssignment', 'productionChecklist']) {
    if (key in v && !isObject(v[key])) err('SCHEMA', key, `${key} がオブジェクトではありません。`);
  }
  if ('relationshipRefs' in v) {
    if (!Array.isArray(v.relationshipRefs)) err('SCHEMA', 'relationshipRefs', 'relationshipRefs が配列ではありません。');
    else {
      v.relationshipRefs.forEach((ref, i) => {
        if (typeof ref !== 'string' || !RELATIONSHIP_ID.test(ref)) {
          err('SCHEMA', `relationshipRefs.${i}`, `relationshipRefs の「${String(ref)}」は REL-000001 の形式ではありません。`);
        }
      });
    }
  }
  if ('characterHistory' in v) {
    if (!Array.isArray(v.characterHistory)) err('SCHEMA', 'characterHistory', 'characterHistory が配列ではありません。');
    else {
      v.characterHistory.forEach((entry, i) => {
        const at = `characterHistory.${i}`;
        if (!isObject(entry)) return err('SCHEMA', at, `${at} がオブジェクトではありません。`);
        if (typeof entry.event !== 'string' || !entry.event) err('SCHEMA', `${at}.event`, `${at}.event がありません。`);
        if (!isDateTime(entry.at)) err('SCHEMA', `${at}.at`, `${at}.at が ISO 日時ではありません。`);
        if (typeof entry.origin !== 'string') err('SCHEMA', `${at}.origin`, `${at}.origin が文字列ではありません。`);
        if (!isObject(entry.details)) err('SCHEMA', `${at}.details`, `${at}.details がオブジェクトではありません。`);
      });
    }
  }
  expectNullableObject(v, 'ecology', err);
  expectNullableObject(v, 'combat', err);
  expectNullableObject(v, 'bossEncounter', err);
  if ('seeds' in v) expectStringArray(v, 'seeds', err);
  if ('dramaHooks' in v) expectStringArray(v, 'dramaHooks', err);
  if ('worldMemory' in v) {
    if (!isObject(v.worldMemory)) err('SCHEMA', 'worldMemory', 'worldMemory がオブジェクトではありません。');
    else {
      if (typeof v.worldMemory.registered !== 'boolean') err('SCHEMA', 'worldMemory.registered', 'worldMemory.registered が true / false ではありません。');
      if (!Array.isArray(v.worldMemory.events)) err('SCHEMA', 'worldMemory.events', 'worldMemory.events が配列ではありません。');
      if (typeof v.worldMemory.memo !== 'string') err('SCHEMA', 'worldMemory.memo', 'worldMemory.memo が文字列ではありません。');
    }
  }
  if ('worldLifeEngine' in v && (!isObject(v.worldLifeEngine) || typeof v.worldLifeEngine.enabled !== 'boolean')) {
    err('SCHEMA', 'worldLifeEngine.enabled', 'worldLifeEngine.enabled が true / false ではありません。');
  }
  if ('assets' in v) validateAssets(v.assets, err, warn);
  if ('identity' in v) validateIdentity(v.identity, err, warn);
  if ('deployment' in v) validateDeployment(v.deployment, err, warn);

  // ---- The two kinds of character: human / monster only. A boss is a monster.
  if (v.characterType === 'human') validateHuman(v, err, warn);
  else if (v.characterType === 'monster') validateMonster(v, err, warn);
  else if ('characterType' in v) err('SCHEMA', 'characterType', `characterType「${String(v.characterType)}」は human / monster ではありません。`);

  return { payload: errors.length ? null : (v as unknown as ForgeDeployPackage), errors, warnings };
}

type Report = (code: ForgeIssueCode, path: string, message: string) => void;

function validateHuman(v: Record<string, unknown>, err: Report, warn: Report): void {
  if (typeof v.characterId === 'string' && CHARACTER_ID_PATTERN.test(v.characterId) && !HUMAN_ID.test(v.characterId)) {
    err('ID_TYPE_MISMATCH', 'characterId', `characterId「${v.characterId}」は人間（HUM-）の番号ではありません。characterType は human です。`);
  }
  if (v.encounterRole !== null) err('SCHEMA', 'encounterRole', '人間の encounterRole は null です。');
  if (v.aptitudeSemantics !== 'POTENTIAL_NOT_ACQUIRED_SKILL') {
    err('SCHEMA', 'aptitudeSemantics', '人間の aptitudeSemantics は POTENTIAL_NOT_ACQUIRED_SKILL（潜在適性）です。');
  }
  for (const key of ['lifeAxis', 'worldViewAxis', 'equipment', 'lifeStage']) {
    if (!isObject(v[key])) err('SCHEMA', key, `人間には ${key} が必要です。`);
  }
  for (const key of ['ecology', 'combat', 'bossEncounter']) {
    if (v[key] !== null) err('SCHEMA', key, `人間にモンスター専用の ${key} があります（null であるべきです）。`);
  }
  const identity = isObject(v.identity) ? v.identity : {};
  if (typeof identity.name !== 'string' || !identity.name) err('SCHEMA', 'identity.name', '人間の名前（identity.name）がありません。');
  if (!SETTLED_NAME.includes(identity.nameStatus as string)) {
    err('SCHEMA', 'identity.nameStatus', '人間の名前が確定していません（nameStatus は CANON / IN_WORLD_ACQUIRED）。');
  }
  if (identity.speciesName !== null) err('SCHEMA', 'identity.speciesName', '人間の identity.speciesName は null です。');
  if (identity.individualName !== null) err('SCHEMA', 'identity.individualName', '人間の identity.individualName は null です。');

  // The only skills a human has now. Potential (aptitudes) never stands in for them.
  if (!isObject(v.currentSkills)) err('SCHEMA', 'currentSkills', '人間の現在技能（currentSkills）がありません。');
  else {
    for (const key of SKILL_KEYS) {
      if (!SKILL_LEVELS.includes(v.currentSkills[key] as string)) {
        err('SCHEMA', `currentSkills.${key}`, `currentSkills.${key} が不正な技能段階です（UNLEARNED〜MASTER）。`);
      }
    }
  }

  // profile.core: present, its fields typed. The lists are open: any strings.
  const profile = isObject(v.profile) ? v.profile : {};
  if (!isObject(profile.core)) err('SCHEMA', 'profile.core', '人間の profile.core がありません。');
  else {
    for (const key of ['personality', 'values', 'desires']) {
      const list = profile.core[key];
      if (!Array.isArray(list) || !list.every((item) => typeof item === 'string')) {
        err('SCHEMA', `profile.core.${key}`, `profile.core.${key} が文字列の配列ではありません（中身はどんな文字列でもよい）。`);
      }
    }
    for (const key of ['weakness', 'tendency']) {
      if (typeof profile.core[key] !== 'string') err('SCHEMA', `profile.core.${key}`, `profile.core.${key} が文字列ではありません。`);
    }
  }

  // visualDiversity.ageGroup: one of FORGE's values. Kept as it is.
  if (isObject(v.visualDiversity) || v.visualDiversity === null) {
    const group = isObject(v.visualDiversity) ? v.visualDiversity.ageGroup : undefined;
    if (!VISUAL_AGES.includes(group as string)) {
      err('SCHEMA', 'visualDiversity.ageGroup', `visualDiversity.ageGroup「${String(group)}」は FORGE の値（child / teen / young_adult / adult / middle_aged / older_adult / elderly / UNSET）ではありません。`);
    }
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
  if (isObject(v.lifeStage)) validateLifeStage(v.lifeStage, err, warn);
}

/**
 * FORGE's lifeStage, checked as FORGE wrote it: the seven fields, FORGE's
 * own values, and the one rule FORGE's checker holds every package to
 * (a CHILD / TEEN's adult axis is a future tendency, an adult's a current
 * one). Nothing here works a stage out from age or ageGroup, and nothing
 * is corrected — a breach refuses the file and FORGE fixes it.
 */
function validateLifeStage(stage: Record<string, unknown>, err: Report, warn: Report): void {
  for (const key of LIFE_STAGE_FIELDS) if (!(key in stage)) err('SCHEMA', `lifeStage.${key}`, `lifeStage.${key}: 必須項目がありません。`);
  const oneOf = (key: string, allowed: string[]) => {
    if (key in stage && !allowed.includes(stage[key] as string)) {
      err('SCHEMA', `lifeStage.${key}`, `lifeStage.${key}「${String(stage[key])}」は FORGE の値（${allowed.join(' / ')}）ではありません。`);
    }
  };
  oneOf('stage', LIFE_STAGES);
  oneOf('source', LIFE_STAGE_SOURCES);
  oneOf('visualAge', VISUAL_AGES);
  oneOf('adultAxisMode', ADULT_AXIS_MODES);
  oneOf('occupationMode', OCCUPATION_MODES);
  if ('futureFields' in stage && (!Array.isArray(stage.futureFields) || !stage.futureFields.every((f) => typeof f === 'string'))) {
    err('SCHEMA', 'lifeStage.futureFields', 'lifeStage.futureFields が文字列の配列ではありません。');
  }
  if ('note' in stage && typeof stage.note !== 'string') err('SCHEMA', 'lifeStage.note', 'lifeStage.note が文字列ではありません。');
  if (LIFE_STAGES.includes(stage.stage as string) && ADULT_AXIS_MODES.includes(stage.adultAxisMode as string)) {
    const minor = stage.stage === 'CHILD' || stage.stage === 'TEEN';
    const expected = minor ? 'FUTURE_TENDENCY' : 'CURRENT_TENDENCY';
    if (stage.adultAxisMode !== expected) {
      err('SCHEMA', 'lifeStage.adultAxisMode', `lifeStage が ${String(stage.stage)} なのに adultAxisMode が ${String(stage.adultAxisMode)} です（FORGE の契約では ${expected}）。直さずに取り込みを止めます。`);
    }
  }
  // Said back, never acted on.
  if (stage.adultAxisMode === 'FUTURE_TENDENCY') {
    warn('FUTURE_TENDENCY_KEPT', 'lifeStage.adultAxisMode', '結婚・恋愛などの成人軸は「将来の傾向」です。現在の事実にはせず、そのまま保持します。');
  }
  if (stage.occupationMode === 'FUTURE_ASPIRATION') {
    warn('FUTURE_ASPIRATION_KEPT', 'lifeStage.occupationMode', '職業は「将来の希望」です。現在の職業としては登録しません。');
  }
}

function validateVisualDirection(direction: unknown, err: Report): void {
  if (!isObject(direction)) {
    err('SCHEMA', 'visualDirection', 'visualDirection がオブジェクトではありません。');
    return;
  }
  if (!INTENSITIES.includes(direction.intensity as string)) {
    err('SCHEMA', 'visualDirection.intensity', `visualDirection.intensity「${String(direction.intensity)}」は SUBTLE / STANDARD / STRONG ではありません。`);
  }
  if (!OVERALL_IMPRESSIONS.includes(direction.overallImpression as string)) {
    err('SCHEMA', 'visualDirection.overallImpression', `visualDirection.overallImpression「${String(direction.overallImpression)}」は FORGE の値ではありません。`);
  }
  if (typeof direction.customInstruction !== 'string') err('SCHEMA', 'visualDirection.customInstruction', 'visualDirection.customInstruction が文字列ではありません。');
}

function validateMonster(v: Record<string, unknown>, err: Report, _warn: Report): void {
  if (typeof v.characterId === 'string' && CHARACTER_ID_PATTERN.test(v.characterId) && !MONSTER_ID.test(v.characterId)) {
    err('ID_TYPE_MISMATCH', 'characterId', `characterId「${v.characterId}」はモンスター（MON-）の番号ではありません。characterType は monster です。`);
  }
  if (v.encounterRole !== 'NORMAL' && v.encounterRole !== 'BOSS') {
    err('SCHEMA', 'encounterRole', 'モンスターの encounterRole は NORMAL / BOSS です。');
  }
  if (v.aptitudeSemantics !== 'SPECIES_COMBAT_POTENTIAL') {
    err('SCHEMA', 'aptitudeSemantics', 'モンスターの aptitudeSemantics は SPECIES_COMBAT_POTENTIAL（種族の戦闘潜在値）です。');
  }
  for (const key of ['lifeAxis', 'worldViewAxis', 'currentSkills', 'equipment', 'lifeStage']) {
    if (v[key] !== null) err('SCHEMA', key, `モンスターの ${key} は null です。`);
  }
  for (const key of ['ecology', 'combat']) {
    if (!isObject(v[key])) err('SCHEMA', key, `モンスターには ${key} が必要です。`);
  }
  const identity = isObject(v.identity) ? v.identity : {};
  if (typeof identity.speciesName !== 'string' || !identity.speciesName) {
    err('SCHEMA', 'identity.speciesName', 'モンスターの種族名（identity.speciesName）がありません。');
  }
  if (!SETTLED_NAME.includes(identity.speciesNameStatus as string)) {
    err('SCHEMA', 'identity.speciesNameStatus', '種族名が確定していません（speciesNameStatus は CANON / IN_WORLD_ACQUIRED）。');
  }
  if (v.encounterRole === 'BOSS') validateBoss(v.bossEncounter, err, _warn);
  else if (v.bossEncounter !== null) {
    err('SCHEMA', 'bossEncounter', '通常モンスター（encounterRole NORMAL）の bossEncounter は null です。');
  }
}

function validateBoss(boss: unknown, err: Report, warn: Report): void {
  if (!isObject(boss) || boss.generated !== true) {
    err('SCHEMA', 'bossEncounter', 'BOSSの遭遇設計（bossEncounter）が生成済みではありません。');
    return;
  }
  for (const key of BOSS_FIELDS) {
    if (!(key in boss)) err('SCHEMA', `bossEncounter.${key}`, `bossEncounter.${key}: 必須項目がありません。`);
  }
  for (const key of BOSS_FIELDS) {
    if (key === 'generated' || !(key in boss)) continue;
    if (key === 'seedCandidates') {
      if (!Array.isArray(boss[key]) || !(boss[key] as unknown[]).every((s) => typeof s === 'string')) {
        err('SCHEMA', 'bossEncounter.seedCandidates', 'bossEncounter.seedCandidates が文字列の配列ではありません。');
      }
    } else if (typeof boss[key] !== 'string') {
      err('SCHEMA', `bossEncounter.${key}`, `bossEncounter.${key} が文字列ではありません。`);
    }
  }
  for (const key of BOSS_ESSENTIAL) {
    const text = boss[key];
    if (typeof text === 'string' && (!text.trim() || text === '未設定')) {
      err('SCHEMA', `bossEncounter.${key}`, `bossEncounter.${key} が未設定です。`);
    }
  }
  for (const key of Object.keys(boss)) {
    if (!BOSS_FIELDS.includes(key)) {
      warn('UNKNOWN_FIELD', `bossEncounter.${key}`, `未知の項目「bossEncounter.${key}」があります。そのまま保持します。`);
    }
  }
}

function validateIdentity(identity: unknown, err: Report, warn: Report): void {
  if (!isObject(identity)) {
    err('SCHEMA', 'identity', 'identity がオブジェクトではありません。');
    return;
  }
  for (const key of IDENTITY_FIELDS) {
    if (!(key in identity)) err('SCHEMA', `identity.${key}`, `identity.${key}: 必須項目がありません。`);
  }
  if (typeof identity.name !== 'string') err('SCHEMA', 'identity.name', 'identity.name が文字列ではありません。');
  for (const key of ['speciesName', 'individualName', 'nameOrigin', 'speciesNameOrigin', 'individualNameOrigin']) {
    if (key in identity && identity[key] !== null && typeof identity[key] !== 'string') {
      err('SCHEMA', `identity.${key}`, `identity.${key} が文字列でも null でもありません。`);
    }
  }
  for (const key of ['nameStatus', 'speciesNameStatus', 'individualNameStatus']) {
    const status = identity[key];
    if (key in identity && status !== null && !NAME_STATUSES.includes(status as string)) {
      err('SCHEMA', `identity.${key}`, `identity.${key}「${String(status)}」は不正な命名状態です。`);
    }
  }
  for (const key of Object.keys(identity)) {
    if (!IDENTITY_FIELDS.includes(key)) {
      warn('UNKNOWN_FIELD', `identity.${key}`, `未知の項目「identity.${key}」があります。そのまま保持します。`);
    }
  }
}

function validateDeployment(deployment: unknown, err: Report, warn: Report): void {
  if (!isObject(deployment)) {
    err('SCHEMA', 'deployment', 'deployment（送出情報）がオブジェクトではありません。');
    return;
  }
  if (deployment.source !== FORGE_SOURCE) err('SCHEMA', 'deployment.source', `deployment.source が ${FORGE_SOURCE} ではありません。`);
  if (deployment.target !== FORGE_TARGET) err('SCHEMA', 'deployment.target', `deployment.target が ${FORGE_TARGET} ではありません。`);
  if (!isDateTime(deployment.deployedAt)) err('SCHEMA', 'deployment.deployedAt', 'deployment.deployedAt が ISO 日時ではありません。');
  if (typeof deployment.deployedVersion !== 'string' || !DEPLOYED_VERSION.test(deployment.deployedVersion)) {
    err('SCHEMA', 'deployment.deployedVersion', `deployment.deployedVersion「${String(deployment.deployedVersion)}」は 0.1 / 0.1-r2 … の形式ではありません。`);
  }
  for (const key of Object.keys(deployment)) {
    if (!DEPLOYMENT_FIELDS.includes(key)) {
      warn('UNKNOWN_FIELD', `deployment.${key}`, `未知の項目「deployment.${key}」があります。そのまま保持します。`);
    }
  }
}

function validateAssets(assets: unknown, err: Report, warn: Report): void {
  if (!Array.isArray(assets)) {
    err('SCHEMA', 'assets', 'assets が配列ではありません。');
    return;
  }
  assets.forEach((asset, i) => {
    const at = `assets.${i}`;
    if (!isObject(asset)) return err('SCHEMA', at, `${at} がオブジェクトではありません。`);
    if (typeof asset.assetId !== 'string' || !asset.assetId) err('SCHEMA', `${at}.assetId`, `${at}.assetId がありません。`);
    if (!ASSET_TYPES.includes(asset.assetType as string)) err('SCHEMA', `${at}.assetType`, `${at}.assetType「${String(asset.assetType)}」は不正です。`);
    for (const key of ['width', 'height', 'originalByteSize', 'storedByteSize']) {
      if (key in asset && (typeof asset[key] !== 'number' || (asset[key] as number) < 0)) {
        err('SCHEMA', `${at}.${key}`, `${at}.${key} が 0 以上の数ではありません。`);
      }
    }
    for (const key of ['approved', 'primary']) {
      if (key in asset && typeof asset[key] !== 'boolean') err('SCHEMA', `${at}.${key}`, `${at}.${key} が true / false ではありません。`);
    }
    for (const key of ['fileName', 'internalFileName', 'originalFileName', 'originalMimeType', 'mimeType', 'imageStorageKey', 'memo', 'createdAt']) {
      if (key in asset && typeof asset[key] !== 'string') err('SCHEMA', `${at}.${key}`, `${at}.${key} が文字列ではありません。`);
    }
    // Assets are metadata only — never the picture itself.
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
  if (key in v && v[key] !== null && !isObject(v[key])) err('SCHEMA', key, `${key} がオブジェクトでも null でもありません。`);
}

function expectStringArray(v: Record<string, unknown>, key: string, err: Report): void {
  if (!Array.isArray(v[key])) err('SCHEMA', key, `${key} が配列ではありません。`);
  else if (!(v[key] as unknown[]).every((s) => typeof s === 'string')) err('SCHEMA', key, `${key} に文字列でない要素があります。`);
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
