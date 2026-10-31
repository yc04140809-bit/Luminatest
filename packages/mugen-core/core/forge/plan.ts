// NEW, UPDATE, UNCHANGED — OR NOT AT ALL.
//
// The import planner. Given a file and what the game's content already
// holds (content/forge), it says what adopting it would do, and why,
// without doing any of it. Pure: the import screen asks it before
// showing the author anything, and the writer asks it again against the
// files on disk at the moment of writing, so what is written is always
// what the content allows now. Choosing the NPC_ID is a further step on
// top of this (content.ts `planForgeAdoption`).
//
// THE ORDER OF THE CHECKS IS THE ORDER OF WHAT MUST NEVER HAPPEN:
//
//   1. A file that is not JSON, or not a deploy package 1.0 — refused.
//   2. A sample (`sampleOnly: true`) — refused. The bridge's example
//      files are for checking tools, and are never anybody's character.
//   3. A character whose content file cannot be read — refused, because
//      writing over it would destroy the only copy.
//   4. An id FORGE retired (VOID), or one the game uses for something
//      else — refused. An id is one character forever.
//   5. The same id arriving as the other type — refused. Same id,
//      different being, is the one thing an id exists to prevent.
//   6. The exact file already held — nothing to do.
//   7. A different file that is not newer than the one held — refused,
//      rather than letting an older baseline replace a newer one.
//   8. Otherwise: a newer file for somebody held (UPDATE), or somebody
//      new (NEW).
//
// UNRESOLVED IS NOT REFUSED. Relationship ids the game does not hold,
// pictures it has no file for, a village it has never heard of: each is
// a warning, and the character comes in anyway. Nothing is made up to
// fill the gap — no relationship, no place, no picture.

import { payloadHash } from './canonical';
import { diffBaselines } from './diff';
import { forgeDisplayName, forgeKindOf } from './record';
import type {
  ForgeContent,
  ForgeDecision,
  ForgeRosterEntry,
  ForgeDeployPackage,
  ForgeDiff,
  ForgeIssue,
  ForgeKind,
} from './types';
import { issue, isObject, parseDeployJson, validateDeployPackage } from './validate';

/** What the planner needs to know about the game. */
export interface ForgeWorldView {
  /** The adopted characters, as the content holds them. */
  content: ForgeContent;
  /**
   * Ids that are not free besides FORGE's retired ones (which come with
   * the content): ids the game already uses for something else. A FORGE
   * character is never registered under one.
   */
  reservedIds: ReadonlySet<string>;
  /** Places the game knows, id → name, to say whether a wished-for place exists. Never added to. */
  locations: Readonly<Record<string, string>>;
  /** Picture ids the game holds files for. */
  knownAssetIds: ReadonlySet<string>;
  /**
   * Retired ids carried by the FORGE export this file came in, if any —
   * refused even before they reach the content's ledger.
   */
  extraVoidIds?: readonly string[];
}

/** What step 1 shows: enough to recognise the file, read even from a file that fails. */
export interface ForgeSummary {
  characterId: string | null;
  kind: ForgeKind | null;
  characterType: string | null;
  encounterRole: string | null;
  name: string | null;
  speciesName: string | null;
  individualName: string | null;
  displayName: string | null;
  deployedVersion: string | null;
  deployedAt: string | null;
  sampleOnly: boolean;
}

export interface ForgePlan {
  decision: ForgeDecision;
  /** True for NEW and UPDATE: there is something to register. */
  canRegister: boolean;
  characterId: string | null;
  kind: ForgeKind | null;
  summary: ForgeSummary | null;
  payload: ForgeDeployPackage | null;
  payloadHash: string | null;
  errors: ForgeIssue[];
  warnings: ForgeIssue[];
  /** Baseline differences. Against nothing for NEW; null when refused before comparison. */
  diff: ForgeDiff | null;
  /** The ledger entry held today, if any. */
  existing: ForgeRosterEntry | null;
  /** What registering does not touch, in words (変更対象外). */
  gameOwned: string[];
}

/** What adopting a character never touches. Shown on the review step, and true of every import. */
export const FORGE_GAME_OWNED: readonly string[] = [
  'プレイヤーのSAVE（WORLD MEMORY・現在状態・進行・所持品・時刻）',
  '既存の人物のID・名前・現在状態の初期値',
  '本編で追加された関係',
  '戦闘の計算式とバランス値',
  '画像ファイルの実体',
  '一度決めた NPC_ID（変更しません）',
];

export function planForgeImport(input: string | unknown, world: ForgeWorldView): ForgePlan {
  let value: unknown = input;
  if (typeof input === 'string') {
    const parsed = parseDeployJson(input);
    if (!parsed.ok) return refused('BLOCKED_VALIDATION', null, null, [parsed.issue], []);
    value = parsed.value;
  }
  const summary = summarize(value);
  const validation = validateDeployPackage(value);
  const errors = [...validation.errors];
  const warnings = [...validation.warnings];

  if (summary?.sampleOnly) {
    errors.unshift(
      issue('SAMPLE_ONLY', 'sampleOnly', 'サンプルデータ（sampleOnly: true）です。確認用の見本のため、MUGEN ZEROには登録できません。'),
    );
    return refused('BLOCKED_SAMPLE_DATA', summary, value, errors, warnings);
  }
  if (!validation.payload) return refused('BLOCKED_VALIDATION', summary, value, errors, warnings);

  const payload = validation.payload;
  const id = payload.characterId;
  const hash = payloadHash(payload);
  const existing = world.content.roster.characters.find((entry) => entry.characterId === id) ?? null;
  const held = existing ? (world.content.baselines[id] ?? null) : null;
  const history = existing?.history ?? [];

  if (world.content.damaged.includes(id) || (existing && !held)) {
    errors.push(
      issue('SAVE_DAMAGED', 'characterId', `${id} の登録済みデータ（content/forge）を読めませんでした。上書きすると元のデータが失われるため、取り込みを止めています。`),
    );
    return refused('BLOCKED_SAVE_DAMAGED', summary, value, errors, warnings, hash);
  }
  if (world.content.voidIds.includes(id) || (world.extraVoidIds ?? []).includes(id)) {
    errors.push(
      issue('RESERVED_ID', 'characterId', `${id} は FORGE で VOID（破棄）になったIDです。一度発行されたIDは別のキャラクターに再利用できません。`),
    );
    return refused('BLOCKED_RESERVED_ID', summary, value, errors, warnings, hash);
  }
  if (world.reservedIds.has(id)) {
    errors.push(
      issue('RESERVED_ID', 'characterId', `${id} は本編で予約済み、または使用できないIDです。別のキャラクターとして登録することはできません。`),
    );
    return refused('BLOCKED_RESERVED_ID', summary, value, errors, warnings, hash);
  }
  if (existing && existing.characterType !== payload.characterType) {
    errors.push(
      issue(
        'ID_TYPE_CONFLICT',
        'characterType',
        `${id} は「${existing.characterType === 'human' ? '人間' : 'モンスター'}」として登録済みです。同じIDを別の種類のキャラクターにすることはできません。`,
      ),
    );
    return refused('BLOCKED_ID_TYPE_CONFLICT', summary, value, errors, warnings, hash, existing);
  }

  warnings.push(...referenceWarnings(payload, world));

  if (existing && existing.payloadHash === hash) {
    return {
      ...base(summary, payload, hash, existing, warnings, errors),
      decision: 'UNCHANGED',
      canRegister: false,
      diff: diffBaselines(held, payload),
    };
  }

  if (existing) {
    const heldAt = Date.parse(existing.deployedAt);
    const offered = Date.parse(payload.deployment.deployedAt);
    if (!(offered > heldAt)) {
      errors.push(
        issue(
          'DEPLOYMENT_CONFLICT',
          'deployment.deployedAt',
          offered < heldAt
            ? `登録済みのデータ（${existing.deployedVersion}、${existing.deployedAt}）より古い送出です。新しい設定を古い設定で上書きしないため、取り込みません。`
            : `登録済みのデータと送出日時が同じなのに内容が異なります。どちらが正しいかFORGEで確認してください。`,
        ),
      );
      return refused('BLOCKED_DEPLOYMENT_CONFLICT', summary, value, errors, warnings, hash, existing);
    }
    if (existing.encounterRole !== payload.encounterRole) {
      warnings.push(
        issue(
          'ENCOUNTER_ROLE_CHANGED',
          'encounterRole',
          `遭遇の役割が ${existing.encounterRole ?? 'なし'} → ${payload.encounterRole ?? 'なし'} に変わります（種類は monster のままです）。`,
        ),
      );
    }
    if (history.some((entry) => entry.payloadHash === hash)) {
      warnings.push(
        issue('PAYLOAD_SEEN_BEFORE', '', '以前に一度取り込んだことのある送出データです（ロールバック後の再取込など）。'),
      );
    }
    return {
      ...base(summary, payload, hash, existing, warnings, errors),
      decision: 'UPDATE',
      canRegister: true,
      diff: diffBaselines(held, payload),
    };
  }

  return {
    ...base(summary, payload, hash, null, warnings, errors),
    decision: 'NEW',
    canRegister: true,
    diff: diffBaselines(null, payload),
  };
}

/** What the file says about itself, read as far as it can be — for step 1, valid or not. */
export function summarize(value: unknown): ForgeSummary | null {
  if (!isObject(value)) return null;
  const str = (x: unknown) => (typeof x === 'string' ? x : null);
  const identity = isObject(value.identity) ? value.identity : {};
  const deployment = isObject(value.deployment) ? value.deployment : {};
  const characterType = str(value.characterType);
  const encounterRole = str(value.encounterRole);
  const kind =
    characterType === 'human' || characterType === 'monster'
      ? forgeKindOf({ characterType, encounterRole: encounterRole as 'NORMAL' | 'BOSS' | null })
      : null;
  const name = str(identity.name);
  const speciesName = str(identity.speciesName);
  const individualName = str(identity.individualName);
  const id = str(value.characterId);
  return {
    characterId: id,
    kind,
    characterType,
    encounterRole,
    name,
    speciesName,
    individualName,
    displayName:
      characterType === 'monster' ? (individualName ?? speciesName ?? name) : (name ?? null),
    deployedVersion: str(deployment.deployedVersion),
    deployedAt: str(deployment.deployedAt),
    sampleOnly: value.sampleOnly === true,
  };
}

function referenceWarnings(payload: ForgeDeployPackage, world: ForgeWorldView): ForgeIssue[] {
  const out: ForgeIssue[] = [];
  // Read only what is there: a field FORGE did not send is not a reason to fail.
  const refs = Array.isArray(payload.relationshipRefs) ? payload.relationshipRefs.filter((r): r is string => typeof r === 'string') : [];
  const assets = Array.isArray(payload.assets) ? payload.assets.filter((a) => isObject(a)) : [];
  for (const ref of refs) {
    out.push(
      issue(
        'UNRESOLVED_REFERENCE',
        'relationshipRefs',
        `関係ID ${ref} は本編にまだありません。関係は作らずに保留し、キャラクター本体は取り込みます。`,
      ),
    );
  }
  for (const asset of assets) {
    if (!world.knownAssetIds.has(asset.assetId)) {
      out.push(
        issue(
          'MISSING_ASSET',
          'assets',
          `画像 ${asset.assetId}（${asset.internalFileName ?? 'ファイル名なし'}）の実ファイルは本編に未登録です。メタ情報だけを保持します。`,
        ),
      );
    }
  }
  if (assets.length > 0 && !assets.some((asset) => asset.primary === true)) {
    out.push(issue('NO_PRIMARY_ASSET', 'assets', 'primary: true の画像がありません。代表画像は未設定として扱います。'));
  }
  if ('visualReviewStatus' in payload && payload.visualReviewStatus !== 'APPROVED') {
    out.push(
      issue('VISUAL_NOT_APPROVED', 'visualReviewStatus', `見た目のレビューが未承認です（${payload.visualReviewStatus}）。`),
    );
  }

  // Where the author would like them. Said back, never acted on.
  const names = new Map(Object.entries(world.locations).map(([id, name]) => [name, id]));
  const assignment: Record<string, unknown> = isObject(payload.worldAssignment) ? payload.worldAssignment : {};
  for (const key of ['settlement', 'region'] as const) {
    const wanted = typeof assignment[key] === 'string' ? (assignment[key] as string).trim() : '';
    if (!wanted) continue;
    const label = key === 'settlement' ? '集落' : '地域';
    const found = names.get(wanted);
    out.push(
      found
        ? issue(
            'WORLD_ASSIGNMENT_NAME_MATCH',
            `worldAssignment.${key}`,
            `希望配置の${label}「${wanted}」は本編の場所（${found}）と名前が一致します。配置は自動では行わず、希望として保持します。`,
          )
        : issue(
            'WORLD_ASSIGNMENT_UNRESOLVED',
            `worldAssignment.${key}`,
            `希望配置の${label}「${wanted}」は本編の場所にありません。未配置として取り込み、新しい場所は作りません。`,
          ),
    );
  }
  return out;
}

function base(
  summary: ForgeSummary | null,
  payload: ForgeDeployPackage,
  hash: string,
  existing: ForgeRosterEntry | null,
  warnings: ForgeIssue[],
  errors: ForgeIssue[],
): Omit<ForgePlan, 'decision' | 'canRegister' | 'diff'> {
  return {
    characterId: payload.characterId,
    kind: forgeKindOf(payload),
    summary: summary ? { ...summary, displayName: forgeDisplayName(payload) } : null,
    payload,
    payloadHash: hash,
    errors,
    warnings,
    existing,
    gameOwned: [...FORGE_GAME_OWNED],
  };
}

function refused(
  decision: ForgeDecision,
  summary: ForgeSummary | null,
  value: unknown,
  errors: ForgeIssue[],
  warnings: ForgeIssue[],
  hash: string | null = null,
  existing: ForgeRosterEntry | null = null,
): ForgePlan {
  return {
    decision,
    canRegister: false,
    characterId: summary?.characterId ?? null,
    kind: summary?.kind ?? null,
    summary,
    payload: null,
    payloadHash: hash ?? (isObject(value) ? payloadHash(value) : null),
    errors,
    warnings,
    diff: null,
    existing,
    gameOwned: [...FORGE_GAME_OWNED],
  };
}
