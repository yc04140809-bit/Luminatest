import type { Agent, AgentDraft } from "@chaos-ai-suite/shared";
import { createAgent, updateAgent } from "../api/officeApi.js";
import { clearBgmTrack, loadBgmTrack, saveBgmTrackRaw } from "./bgmStorage.js";

/**
 * バックアップセンターのサービス層（backupService / restoreService / storageScanner / backupValidator 相当）。
 * すべてクライアント側で完結し、AI・外部サービスは一切使わない。
 *
 * 【調査済みの実際の保存構造（2026-07時点）】
 * - localStorage（すべて "chaos-ai-suite:" プレフィックス）:
 *   saved-documents（書類保管庫）/ sns-posts（SNS分析履歴）/ note-draft（note編集の下書き・履歴・宣伝パック）/ bgm-enabled（BGMのON/OFF）
 * - IndexedDB: DB "chaos-ai-suite" の store "bgm" キー "track"（BGM音楽ファイルのBlob）
 * - AI社員設定: サーバー側（既存の GET/POST/PATCH /api/agents で取得・復元できる）
 * - 外部連携のAPIキー: サーバー側の.envのみ。値を読み出すAPIは存在しないため
 *   ブラウザからはバックアップ不可能（＝バックアップファイルに機密が混入する余地がない）
 * - タスク・チャットログ・会議議事録: サーバーの揮発メモリ（書類保管庫に保存した分はlocalStorageでカバー）
 */

export const BACKUP_APP_NAME = "My Chaos AI Suite";
export const BACKUP_VERSION = "1.0";
const APP_KEY_PREFIX = "chaos-ai-suite:";
/** これを超えるバックアップファイルは読み込まない（BGM音源込みでも通常は数十MB以下） */
const MAX_FILE_BYTES = 200 * 1024 * 1024;

export type BackupCategoryId = "agents" | "documents" | "sns" | "note" | "cases" | "media" | "usage" | "other";

export interface BackupCategory {
  id: BackupCategoryId;
  label: string;
  description: string;
  /** このカテゴリに属するlocalStorageキー（otherは動的、agentsはサーバー） */
  keys: string[];
}

export const BACKUP_CATEGORIES: BackupCategory[] = [
  {
    id: "agents",
    label: "AI社員設定",
    description: "6人の性格・システムプロンプト・担当など（復元すると同じIDの社員は上書きされます）",
    keys: [],
  },
  {
    id: "documents",
    label: "書類保管庫",
    description: "「保管する」を選んだ成果物・議事録",
    keys: ["chaos-ai-suite:saved-documents"],
  },
  {
    id: "sns",
    label: "SNS分析履歴",
    description: "SNS分析ラボの採点結果・過去投稿",
    keys: ["chaos-ai-suite:sns-posts"],
  },
  {
    id: "note",
    label: "note編集データ",
    description: "下書き・編集履歴・複製・宣伝パック・トレンドnote生成履歴",
    keys: ["chaos-ai-suite:note-draft", "chaos-ai-suite:trend-notes"],
  },
  {
    id: "cases",
    label: "案件工房データ",
    description: "案件・要件整理・工程・成果物・納品文・利益・振り返り・案件スカウター履歴",
    keys: ["chaos-ai-suite:cases", "chaos-ai-suite:scouts"],
  },
  {
    id: "media",
    label: "BGM・表示設定",
    description: "BGMのON/OFFと読み込んだ音楽ファイル",
    keys: ["chaos-ai-suite:bgm-enabled"],
  },
  {
    id: "usage",
    label: "AI利用・成果ダッシュボードデータ",
    description: "チャットのAI利用ログ・トークン数・概算費用・成果記録",
    keys: ["chaos-ai-suite:usage-log"],
  },
  {
    id: "other",
    label: "その他のアプリデータ",
    description: "上記に分類されないこのアプリの保存データ",
    keys: [],
  },
];

const KNOWN_KEYS = new Set(BACKUP_CATEGORIES.flatMap((category) => category.keys));

interface BackupBgmTrack {
  name: string;
  type: string;
  /** data:URL形式（Blobをそのまま文字列化したもの） */
  dataUrl: string;
}

export interface BackupFile {
  appName: string;
  backupVersion: string;
  createdAt: string;
  categories: BackupCategoryId[];
  storage: {
    localStorage: Record<string, string>;
    indexedDB: {
      "chaos-ai-suite"?: { bgm?: { track: BackupBgmTrack | null } };
    };
  };
  server?: { agents?: Agent[] };
}

/** このアプリのlocalStorageキーだけを列挙する（別サイト・別アプリのデータは含めない）。 */
function scanAppLocalStorageKeys(): string[] {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(APP_KEY_PREFIX)) keys.push(key);
  }
  return keys;
}

/** カテゴリIDに対応するlocalStorageキー一覧を、実際の保存状態から解決する。 */
function keysForCategory(id: BackupCategoryId): string[] {
  if (id === "other") return scanAppLocalStorageKeys().filter((key) => !KNOWN_KEYS.has(key));
  return BACKUP_CATEGORIES.find((category) => category.id === id)?.keys ?? [];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("ファイルの読み込みに失敗しました"));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/** 選択したカテゴリのデータを収集してバックアップオブジェクトを作る。 */
export async function collectBackup(selected: Set<BackupCategoryId>, agents: Agent[]): Promise<BackupFile> {
  const local: Record<string, string> = {};
  for (const id of selected) {
    if (id === "agents") continue;
    for (const key of keysForCategory(id)) {
      const value = localStorage.getItem(key);
      if (value !== null) local[key] = value;
    }
  }

  const backup: BackupFile = {
    appName: BACKUP_APP_NAME,
    backupVersion: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    categories: [...selected],
    storage: { localStorage: local, indexedDB: {} },
  };

  if (selected.has("media")) {
    const track = await loadBgmTrack().catch(() => undefined);
    backup.storage.indexedDB["chaos-ai-suite"] = {
      bgm: {
        track: track ? { name: track.name, type: track.type, dataUrl: await blobToDataUrl(track.blob) } : null,
      },
    };
  }

  if (selected.has("agents")) {
    backup.server = { agents };
  }

  return backup;
}

export function backupFileName(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `my-chaos-ai-suite-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
}

export interface BackupInfo {
  createdAt: string;
  backupVersion: string;
  categories: BackupCategoryId[];
  localStorageCount: number;
  indexedDbCount: number;
  fileSizeText: string;
}

export type ValidationResult = { ok: true; data: BackupFile; info: BackupInfo } | { ok: false; error: string };

/** バックアップファイルの検証。失敗時はユーザー向けの日本語メッセージを返す。 */
export function validateBackup(rawText: string, fileSizeBytes: number): ValidationResult {
  if (fileSizeBytes > MAX_FILE_BYTES) {
    return { ok: false, error: "ファイルが大きすぎます（200MB以内のバックアップファイルを選択してください）。" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      error: "バックアップファイルを読み込めませんでした。My Chaos AI Suiteから出力したJSONファイルを選択してください。",
    };
  }

  const data = parsed as Partial<BackupFile>;
  if (data?.appName !== BACKUP_APP_NAME) {
    return {
      ok: false,
      error: "このファイルはMy Chaos AI Suiteのバックアップではないようです。アプリから出力したファイルを選択してください。",
    };
  }
  if (typeof data.backupVersion !== "string") {
    return { ok: false, error: "バックアップの形式情報（backupVersion）が見つかりません。ファイルが壊れている可能性があります。" };
  }
  if (typeof data.storage !== "object" || data.storage === null || typeof data.storage.localStorage !== "object") {
    return { ok: false, error: "バックアップのデータ構造が正しくありません。別のバックアップファイルをお試しください。" };
  }
  for (const [key, value] of Object.entries(data.storage.localStorage ?? {})) {
    if (!key.startsWith(APP_KEY_PREFIX) || typeof value !== "string") {
      return { ok: false, error: "このアプリのデータ以外が含まれているため、安全のため復元を中止しました。" };
    }
  }

  const sizeKb = fileSizeBytes / 1024;
  const info: BackupInfo = {
    createdAt: data.createdAt ?? "不明",
    backupVersion: data.backupVersion,
    categories: Array.isArray(data.categories) ? (data.categories as BackupCategoryId[]) : [],
    localStorageCount: Object.keys(data.storage.localStorage ?? {}).length,
    indexedDbCount: Object.keys(data.storage.indexedDB ?? {}).length,
    fileSizeText: sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeKb))} KB`,
  };
  return { ok: true, data: data as BackupFile, info };
}

export interface RestoreResult {
  restoredCategories: BackupCategoryId[];
  warnings: string[];
}

/**
 * 安全な復元。手順:
 * 現在データのスナップショットをメモリ上に確保 → localStorage復元 → IndexedDB復元 → AI社員復元。
 * localStorage/IndexedDBの途中で失敗した場合は、確保したスナップショットへ巻き戻す。
 * AI社員（サーバー側）は1件ずつ結果を確認し、失敗分はwarningsで報告する。
 */
export async function restoreBackup(
  data: BackupFile,
  selected: Set<BackupCategoryId>,
  currentAgents: Agent[],
): Promise<RestoreResult> {
  const warnings: string[] = [];
  const restoredCategories: BackupCategoryId[] = [];

  // 1) 対象キーの現在値をメモリにスナップショット
  const targetKeys = new Set<string>();
  for (const id of selected) {
    if (id === "agents") continue;
    if (id === "other") {
      for (const key of Object.keys(data.storage.localStorage)) {
        if (!KNOWN_KEYS.has(key)) targetKeys.add(key);
      }
    } else {
      for (const key of keysForCategory(id)) targetKeys.add(key);
    }
  }
  const localSnapshot = new Map<string, string | null>();
  for (const key of targetKeys) localSnapshot.set(key, localStorage.getItem(key));
  const bgmSnapshot = selected.has("media") ? await loadBgmTrack().catch(() => undefined) : undefined;

  try {
    // 2) localStorage復元（バックアップに存在するキーのみ上書き。存在しないキーは現状維持）
    for (const key of targetKeys) {
      const value = data.storage.localStorage[key];
      if (value !== undefined) localStorage.setItem(key, value);
    }
    if (targetKeys.size > 0) restoredCategories.push(...[...selected].filter((id) => id !== "agents" && id !== "media"));

    // 3) IndexedDB復元（BGM音源）
    if (selected.has("media")) {
      const trackData = data.storage.indexedDB["chaos-ai-suite"]?.bgm?.track;
      if (trackData) {
        const blob = await dataUrlToBlob(trackData.dataUrl);
        await saveBgmTrackRaw({ name: trackData.name, type: trackData.type, blob });
      } else if (trackData === null) {
        await clearBgmTrack().catch(() => undefined);
      }
      restoredCategories.push("media");
    }
  } catch (error) {
    // 4) 失敗したらスナップショットへ巻き戻す
    for (const [key, value] of localSnapshot) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
    if (bgmSnapshot) await saveBgmTrackRaw(bgmSnapshot).catch(() => undefined);
    throw new Error(
      `復元中にエラーが発生したため、元のデータに戻しました。空き容量を確認して再度お試しください。（詳細: ${(error as Error).message}）`,
    );
  }

  // 5) AI社員設定の復元（サーバー側・既存APIでのupsert。1件ずつ結果を確認）
  if (selected.has("agents")) {
    const backupAgents = data.server?.agents ?? [];
    if (backupAgents.length === 0) {
      warnings.push("バックアップにAI社員設定が含まれていなかったため、AI社員は変更していません。");
    } else {
      const currentIds = new Set(currentAgents.map((agent) => agent.id));
      let succeeded = 0;
      for (const agent of backupAgents) {
        const draft: AgentDraft = {
          name: agent.name,
          title: agent.title,
          roleKey: agent.roleKey,
          description: agent.description,
          responsibilities: agent.responsibilities,
          triggers: agent.triggers,
          systemPrompt: agent.systemPrompt,
          accentColor: agent.accentColor,
          avatarUrl: agent.avatarUrl,
          deskPosition: agent.deskPosition,
          model: agent.model,
          enabled: agent.enabled,
          isEditable: agent.isEditable,
        };
        try {
          if (currentIds.has(agent.id)) await updateAgent(agent.id, draft);
          else await createAgent(draft);
          succeeded += 1;
        } catch (error) {
          warnings.push(`AI社員「${agent.name}」の復元に失敗しました: ${(error as Error).message}`);
        }
      }
      if (succeeded > 0) restoredCategories.push("agents");
    }
  }

  return { restoredCategories: [...new Set(restoredCategories)], warnings };
}
