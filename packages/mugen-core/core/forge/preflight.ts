// PREFLIGHT — CHECKING A FORGE DEPLOY PACKAGE BEFORE ANY APPLY.
//
// An independent pass over one package, run before it can be applied. It
// answers one question in three words: PASS (nothing to say), WARNING
// (it may be previewed and, after the author has looked, applied) or
// ERROR (it must not be applied). Pure: text or a value in, a report out,
// nothing written.
//
// WHAT IT CHECKS, in three layers:
//   1. The contract — validateDeployPackage (bridge v1.1). Its errors are
//      ERRORs; its warnings (unknown extra fields, informational notes)
//      are WARNINGs.
//   2. The package against itself — things FORGE wrote that disagree with
//      each other or stand in for a value: a placeholder 「なし」 mixed in
//      with real candidates, a duplicate candidate, combat.aptitude that is
//      not the root aptitudes, profile.encounterRole that is not the root
//      one, FORGE's own visualDiversity.structureConflicts, empty or
//      「未設定」 fields, an element (属性) that is not a name and a 0–1
//      affinity. These are WARNINGs: the file is still FORGE's to fix.
//   3. The package against what MUGEN ZERO already holds (when given):
//      a sample, a VOID id, a different characterType for an adopted id,
//      a send that is not newer than the one held — ERRORs, as the
//      planner would refuse them; a changed encounterRole or name, or a
//      version number that goes backwards — WARNINGs.
//
// WHAT IT NEVER DOES: correct, convert or fill in anything; compare FORGE's
// words with a table of MUGEN ZERO's own (there is none — body parts in
// Japanese and visual codes in English are not matched to each other
// here); recompute FORGE's lifeStage. Whether a character sheet matches
// the structure is for the author's eyes: this pass cannot see the sheet.

import { parseDeployJson, isObject, validateDeployPackage } from './validate';
import { payloadHash } from './canonical';
import type { ForgeContent, ForgeIssue } from './types';

export type PreflightResult = 'PASS' | 'WARNING' | 'ERROR';

export interface PreflightItem {
  level: 'WARNING' | 'ERROR';
  code: string;
  path: string;
  message: string;
}

export interface PreflightReport {
  result: PreflightResult;
  characterId: string | null;
  deployedVersion: string | null;
  /** HUMAN / MONSTER / BOSS, from characterType and encounterRole; null when unreadable. */
  kind: 'HUMAN' | 'MONSTER' | 'BOSS' | null;
  /** ERRORs first, then WARNINGs, each in the order found. */
  items: PreflightItem[];
  /** False whenever there is an ERROR. */
  canApply: boolean;
}

/** A value FORGE writes when there is nothing to write. */
const PLACEHOLDERS = new Set(['なし', '未設定']);

/** String lists in a package where a placeholder among real entries is worth a word. */
const CANDIDATE_LISTS: readonly (readonly string[])[] = [
  ['combat', 'uniqueSkillCandidates'],
  ['combat', 'weaknesses'],
  ['profile', 'body', 'specialParts'],
  ['visualDiversity', 'signatures'],
  ['visualDiversity', 'skinLifeMarks'],
  ['relationshipPotential'],
  ['seeds'],
  ['bossEncounter', 'seedCandidates'],
];

/** A human's profile fields the author asked to be warned about when empty (EXPORT VALIDATION, 2026-09-29). */
const HUMAN_PROFILE_FIELDS = ['age', 'gender', 'origin', 'currentRegion', 'occupation', 'importance'];
/** A monster's profile fields worth a word when empty or 「未設定」. */
const MONSTER_PROFILE_FIELDS = ['importance', 'classification', 'habitat', 'activityTime', 'ecologicalRole', 'creatureShapeImpression'];

const VERSION = /^0\.1(?:-r([0-9]+))?$/;

function at(value: unknown, path: readonly string[]): unknown {
  let here = value;
  for (const key of path) {
    if (!isObject(here)) return undefined;
    here = here[key];
  }
  return here;
}

function revision(version: unknown): number | null {
  if (typeof version !== 'string') return null;
  const m = VERSION.exec(version);
  return m ? (m[1] ? Number(m[1]) : 1) : null;
}

/**
 * Checks one package. `content`, when given, is what MUGEN ZERO already
 * holds (content/forge); without it only the package itself is checked.
 */
export function preflightForgePackage(input: string | unknown, content?: ForgeContent): PreflightReport {
  const items: PreflightItem[] = [];
  const error = (code: string, path: string, message: string) => items.push({ level: 'ERROR', code, path, message });
  const warning = (code: string, path: string, message: string) => items.push({ level: 'WARNING', code, path, message });
  const fromIssue = (level: 'WARNING' | 'ERROR') => (i: ForgeIssue) => items.push({ level, code: i.code, path: i.path, message: i.message });

  let value: unknown = input;
  if (typeof input === 'string') {
    const parsed = parseDeployJson(input);
    if (!parsed.ok) {
      fromIssue('ERROR')(parsed.issue);
      return report(items, null);
    }
    value = parsed.value;
  }

  // ---- 1. The contract.
  const contract = validateDeployPackage(value);
  contract.errors.forEach(fromIssue('ERROR'));
  contract.warnings.forEach(fromIssue('WARNING'));
  if (!isObject(value)) return report(items, null);
  const v = value;

  // ---- 2. The package against itself.
  for (const path of CANDIDATE_LISTS) {
    const list = at(v, path);
    if (!Array.isArray(list)) continue;
    const where = path.join('.');
    const strings = list.filter((x): x is string => typeof x === 'string');
    const placeholders = strings.filter((x) => PLACEHOLDERS.has(x.trim()));
    if (placeholders.length && placeholders.length < strings.length) {
      warning('PLACEHOLDER_IN_LIST', where, `${where} に「${placeholders[0]}」が候補の 1 つとして入っています（${strings.join('・')}）。「候補なし」の意味か未設定の表現かを FORGE で確認してください。ZERO では直しません。`);
    }
    const seen = new Set<string>();
    const twice = strings.filter((x) => (seen.has(x) ? true : (seen.add(x), false)));
    if (twice.length) warning('DUPLICATE_IN_LIST', where, `${where} に同じ値が重複しています（${[...new Set(twice)].join('・')}）。`);
  }

  if (v.characterType === 'monster') {
    const profile = isObject(v.profile) ? v.profile : {};
    for (const key of MONSTER_PROFILE_FIELDS) {
      const text = profile[key];
      if (text === undefined) warning('FIELD_MISSING', `profile.${key}`, `profile.${key} がありません。`);
      else if (typeof text !== 'string') warning('FIELD_TYPE', `profile.${key}`, `profile.${key} が文字列ではありません。`);
      else if (!text.trim() || PLACEHOLDERS.has(text.trim())) warning('FIELD_UNSET', `profile.${key}`, `profile.${key} が${text.trim() ? `「${text.trim()}」` : '空'}です（未入力）。`);
    }
    if (profile.encounterRole !== undefined && profile.encounterRole !== v.encounterRole) {
      warning('ENCOUNTER_ROLE_DISAGREES', 'profile.encounterRole', `profile.encounterRole（${String(profile.encounterRole)}）と encounterRole（${String(v.encounterRole)}）が食い違っています。ZERO は encounterRole を使います。`);
    }
    // 身体（profile.body）
    const body = profile.body;
    if (body === undefined) warning('FIELD_MISSING', 'profile.body', 'profile.body（身体構造）がありません。');
    else if (!isObject(body)) warning('FIELD_TYPE', 'profile.body', 'profile.body がオブジェクトではありません。');
    else {
      for (const [key, part] of Object.entries(body)) {
        if (key === 'specialParts') {
          if (!Array.isArray(part) || !part.every((p) => typeof p === 'string')) warning('FIELD_TYPE', 'profile.body.specialParts', 'profile.body.specialParts が文字列の配列ではありません。');
        } else if (typeof part !== 'string') warning('FIELD_TYPE', `profile.body.${key}`, `profile.body.${key} が文字列ではありません。`);
        else if (!part.trim() || part.trim() === '未設定') warning('FIELD_UNSET', `profile.body.${key}`, `profile.body.${key} が未入力です。`);
      }
    }
    // 属性（profile.element）
    const element = profile.element;
    if (element === undefined) warning('FIELD_MISSING', 'profile.element', 'profile.element（属性）がありません。');
    else if (!isObject(element)) warning('FIELD_TYPE', 'profile.element', 'profile.element がオブジェクトではありません。');
    else {
      for (const key of ['primary', 'secondary']) {
        if (typeof element[key] !== 'string') warning('FIELD_TYPE', `profile.element.${key}`, `profile.element.${key} が文字列ではありません。`);
      }
      const affinity = element.affinity;
      if (typeof affinity !== 'number' || !Number.isFinite(affinity) || affinity < 0 || affinity > 1) {
        warning('FIELD_TYPE', 'profile.element.affinity', 'profile.element.affinity が 0.00〜1.00 の数ではありません。');
      }
    }
    // 戦闘（combat）
    const combat = v.combat;
    if (isObject(combat)) {
      const aptitude = combat.aptitude;
      if (!isObject(aptitude)) warning('FIELD_TYPE', 'combat.aptitude', 'combat.aptitude がオブジェクトではありません。');
      else if (isObject(v.aptitudes)) {
        const keys = new Set([...Object.keys(aptitude), ...Object.keys(v.aptitudes)]);
        const differ = [...keys].filter((k) => aptitude[k] !== (v.aptitudes as Record<string, unknown>)[k]);
        if (differ.length) warning('COMBAT_APTITUDE_DISAGREES', 'combat.aptitude', `combat.aptitude と aptitudes が食い違っています（${differ.join('・')}）。どちらも FORGE の値のまま保持します。`);
      }
      if (typeof combat.normalAttackCandidate !== 'string' || !combat.normalAttackCandidate.trim()) {
        warning('FIELD_UNSET', 'combat.normalAttackCandidate', 'combat.normalAttackCandidate（通常攻撃の候補）が未入力です。');
      }
      for (const key of ['uniqueSkillCandidates', 'weaknesses']) {
        const list = combat[key];
        if (!Array.isArray(list) || !list.every((x) => typeof x === 'string')) warning('FIELD_TYPE', `combat.${key}`, `combat.${key} が文字列の配列ではありません。`);
      }
    }
    // 見た目（visualDiversity）
    const visual = v.visualDiversity;
    if (visual === null || visual === undefined) warning('FIELD_MISSING', 'visualDiversity', 'visualDiversity がありません。');
    else if (isObject(visual)) {
      const conflicts = visual.structureConflicts;
      if (Array.isArray(conflicts) && conflicts.length) {
        warning('STRUCTURE_CONFLICTS', 'visualDiversity.structureConflicts', `FORGE 自身が構造の食い違いを記録しています（${conflicts.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join('・')}）。`);
      }
    }
  }

  if (v.characterType === 'human') {
    const profile = isObject(v.profile) ? v.profile : {};
    const empty = HUMAN_PROFILE_FIELDS.filter((key) => typeof profile[key] === 'string' && !(profile[key] as string).trim());
    if (empty.length) warning('FIELD_UNSET', 'profile', `profile の ${empty.join('・')} が空です（未入力）。ZERO では埋めません。`);
  }

  const visual = v.visualDiversity;
  if (isObject(visual) && isObject(visual.similarity) && visual.similarity.warning === true) {
    warning('SIMILARITY_WARNING', 'visualDiversity.similarity', 'FORGE の類似チェックが警告を出しています（既存キャラクターと見た目が似ている可能性）。');
  }
  if (isObject(v.visualDirection) && v.visualDirection.overallImpression === 'UNSET') {
    warning('FIELD_UNSET', 'visualDirection.overallImpression', 'visualDirection.overallImpression が UNSET（未設定）です。');
  }

  // ---- 3. Against what MUGEN ZERO holds.
  const id = typeof v.characterId === 'string' ? v.characterId : null;
  if (v.sampleOnly === true) error('SAMPLE_ONLY', 'sampleOnly', 'サンプルデータ（sampleOnly: true）です。MUGEN ZERO には登録できません。');
  if (content && id) {
    if (content.voidIds.includes(id)) error('RESERVED_ID', 'characterId', `${id} は FORGE で VOID（破棄）になった ID です。`);
    const entry = content.roster.characters.find((e) => e.characterId === id) ?? null;
    const held = entry ? content.baselines[id] ?? null : null;
    if (entry) {
      if (entry.characterType !== v.characterType) {
        error('ID_TYPE_CONFLICT', 'characterType', `${id} は ${entry.characterType} として登録済みです。同じ ID を別の種類にはできません。`);
      }
      const offered = Date.parse(String(at(v, ['deployment', 'deployedAt'])));
      const heldAt = Date.parse(entry.deployedAt);
      const sameContent = (() => {
        try {
          return payloadHash(v) === entry.payloadHash;
        } catch {
          return false;
        }
      })();
      if (!sameContent && Number.isFinite(offered) && !(offered > heldAt)) {
        error('DEPLOYMENT_CONFLICT', 'deployment.deployedAt', `登録済み（${entry.deployedVersion}・${entry.deployedAt}）より新しい送出ではありません。上書きしません。`);
      }
      const was = revision(entry.deployedVersion);
      const now = revision(at(v, ['deployment', 'deployedVersion']));
      if (!sameContent && was !== null && now !== null && now <= was) {
        warning('VERSION_NOT_NEWER', 'deployment.deployedVersion', `送出版 ${String(at(v, ['deployment', 'deployedVersion']))} が登録済みの ${entry.deployedVersion} より新しくありません（判断は送出日時で行います）。`);
      }
      if (entry.encounterRole !== v.encounterRole) {
        warning('ENCOUNTER_ROLE_CHANGED', 'encounterRole', `遭遇の役割が登録済みの ${entry.encounterRole ?? 'なし'} から ${String(v.encounterRole ?? 'なし')} に変わります。`);
      }
      if (held && isObject(v.identity)) {
        for (const key of ['name', 'speciesName']) {
          const before = (held.identity as Record<string, unknown>)[key];
          if (before !== v.identity[key]) warning('NAME_CHANGED', `identity.${key}`, `identity.${key} が登録済みの「${String(before)}」から「${String(v.identity[key])}」に変わります。`);
        }
      }
    }
  }

  const kind = v.characterType === 'human' ? 'HUMAN' : v.characterType === 'monster' ? (v.encounterRole === 'BOSS' ? 'BOSS' : 'MONSTER') : null;
  return report(items, {
    characterId: id,
    deployedVersion: typeof at(v, ['deployment', 'deployedVersion']) === 'string' ? (at(v, ['deployment', 'deployedVersion']) as string) : null,
    kind,
  });
}

function report(
  items: PreflightItem[],
  facts: Pick<PreflightReport, 'characterId' | 'deployedVersion' | 'kind'> | null,
): PreflightReport {
  const ordered = [...items.filter((i) => i.level === 'ERROR'), ...items.filter((i) => i.level === 'WARNING')];
  const result: PreflightResult = ordered.some((i) => i.level === 'ERROR') ? 'ERROR' : ordered.length ? 'WARNING' : 'PASS';
  return {
    result,
    characterId: facts?.characterId ?? null,
    deployedVersion: facts?.deployedVersion ?? null,
    kind: facts?.kind ?? null,
    items: ordered,
    canApply: result !== 'ERROR',
  };
}
