import { useRef, useState } from "react";
import { AlertTriangle, Database, Download, FileJson, ShieldCheck, Upload } from "lucide-react";
import type { Agent } from "@chaos-ai-suite/shared";
import {
  BACKUP_CATEGORIES,
  backupFileName,
  collectBackup,
  restoreBackup,
  validateBackup,
  type BackupCategoryId,
  type BackupFile,
  type BackupInfo,
} from "../utils/backup.js";

interface BackupCenterProps {
  agents: Agent[];
}

const ALL_IDS: BackupCategoryId[] = BACKUP_CATEGORIES.map((category) => category.id);

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * バックアップセンター。端末内（localStorage/IndexedDB）のデータとAI社員設定を
 * JSONファイルとして保存・復元する。処理はすべてクライアント側で完結し、AIは使わない。
 */
export function BackupCenter({ agents }: BackupCenterProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [backupSelectOpen, setBackupSelectOpen] = useState(false);
  const [backupSelected, setBackupSelected] = useState<Set<BackupCategoryId>>(new Set(ALL_IDS));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreData, setRestoreData] = useState<BackupFile | null>(null);
  const [restoreInfo, setRestoreInfo] = useState<BackupInfo | null>(null);
  const [restoreSelected, setRestoreSelected] = useState<Set<BackupCategoryId>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoreDone, setRestoreDone] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  function toggle(set: Set<BackupCategoryId>, id: BackupCategoryId): Set<BackupCategoryId> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  async function runBackup(selected: Set<BackupCategoryId>): Promise<void> {
    if (busy) return;
    if (selected.size === 0) {
      setMessage({ kind: "error", text: "バックアップするデータを1つ以上選択してください。" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const backup = await collectBackup(selected, agents);
      downloadJson(backupFileName(), backup);
      setMessage({ kind: "success", text: "バックアップファイルを保存しました。端末のダウンロード一覧を確認してください。" });
    } catch (error) {
      setMessage({ kind: "error", text: `バックアップに失敗しました: ${(error as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  function handleFilePicked(file: File | undefined): void {
    if (!file) return; // ファイル選択キャンセル時は何もしない
    setMessage(null);
    setRestoreData(null);
    setRestoreInfo(null);
    setRestoreDone(false);
    setWarnings([]);
    const reader = new FileReader();
    reader.onerror = () => {
      setMessage({ kind: "error", text: "ファイルを読み込めませんでした。もう一度選択してください。" });
    };
    reader.onload = () => {
      const result = validateBackup(String(reader.result ?? ""), file.size);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setRestoreData(result.data);
      setRestoreInfo(result.info);
      const present = result.info.categories.length > 0 ? result.info.categories : ALL_IDS;
      setRestoreSelected(new Set(present));
    };
    reader.readAsText(file);
  }

  async function executeRestore(): Promise<void> {
    if (!restoreData || busy) return;
    setBusy(true);
    setConfirmOpen(false);
    setMessage(null);
    try {
      const result = await restoreBackup(restoreData, restoreSelected, agents);
      setWarnings(result.warnings);
      setRestoreDone(true);
      setMessage({
        kind: "success",
        text: "データの復元が完了しました。変更を反映するため、アプリを再読み込みします。",
      });
    } catch (error) {
      setMessage({ kind: "error", text: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const categoriesInFile = restoreInfo?.categories ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-office-text">
          <Database size={15} className="text-office-gold" /> バックアップセンター
        </h3>
        <p className="text-xs text-office-muted">
          AI社員設定、記事、分析履歴、書類など、端末内のデータを保存・復元できます。
        </p>
      </div>

      {message && (
        <p
          className={`rounded-lg border px-3 py-2.5 text-xs ${
            message.kind === "success"
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/50 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* バックアップ */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => void runBackup(new Set(ALL_IDS))}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-office-accent px-3 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Download size={16} /> {busy ? "処理中..." : "すべてバックアップ"}
        </button>
        <button
          type="button"
          onClick={() => setBackupSelectOpen((value) => !value)}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-3 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold disabled:opacity-40"
        >
          <FileJson size={16} /> データを選んでバックアップ
        </button>

        {backupSelectOpen && (
          <div className="space-y-2 rounded-lg border border-office-border bg-office-bg p-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBackupSelected(new Set(ALL_IDS))}
                className="flex-1 rounded-full border border-office-border px-2 py-1 text-[11px] text-office-muted hover:text-office-text"
              >
                全選択
              </button>
              <button
                type="button"
                onClick={() => setBackupSelected(new Set())}
                className="flex-1 rounded-full border border-office-border px-2 py-1 text-[11px] text-office-muted hover:text-office-text"
              >
                全解除
              </button>
            </div>
            {BACKUP_CATEGORIES.map((category) => (
              <label key={category.id} className="flex items-start gap-2 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={backupSelected.has(category.id)}
                  onChange={() => setBackupSelected((prev) => toggle(prev, category.id))}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#d4af37]"
                />
                <span>
                  <span className="font-semibold text-office-text">{category.label}</span>
                  <span className="block text-office-muted">{category.description}</span>
                </span>
              </label>
            ))}
            <button
              type="button"
              onClick={() => void runBackup(backupSelected)}
              disabled={busy || backupSelected.size === 0}
              className="w-full rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              選択した{backupSelected.size}件をバックアップ
            </button>
          </div>
        )}
      </div>

      {/* 復元 */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            handleFilePicked(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-3 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold disabled:opacity-40"
        >
          <Upload size={16} /> バックアップから復元
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-3 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold disabled:opacity-40"
        >
          <FileJson size={16} /> データを選んで復元
        </button>

        {restoreInfo && restoreData && !restoreDone && (
          <div className="space-y-3 rounded-lg border border-office-border bg-office-bg p-3">
            <div className="text-xs text-office-muted">
              <p className="mb-1 font-semibold text-office-text">バックアップファイルの内容</p>
              <p>作成日時: {restoreInfo.createdAt === "不明" ? "不明" : new Date(restoreInfo.createdAt).toLocaleString("ja-JP")}</p>
              <p>バージョン: {restoreInfo.backupVersion}</p>
              <p>localStorageの項目数: {restoreInfo.localStorageCount} / IndexedDBのデータベース数: {restoreInfo.indexedDbCount}</p>
              <p>ファイルサイズ: {restoreInfo.fileSizeText}</p>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-office-text">復元するデータを選択</p>
              {BACKUP_CATEGORIES.filter((category) => categoriesInFile.includes(category.id)).map((category) => (
                <label key={category.id} className="flex items-start gap-2 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={restoreSelected.has(category.id)}
                    onChange={() => setRestoreSelected((prev) => toggle(prev, category.id))}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#d4af37]"
                  />
                  <span>
                    <span className="font-semibold text-office-text">{category.label}</span>
                    <span className="block text-office-muted">{category.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={busy || restoreSelected.size === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              <AlertTriangle size={15} /> 選択した{restoreSelected.size}件を復元する
            </button>
          </div>
        )}

        {restoreDone && (
          <div className="space-y-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3">
            {warnings.length > 0 && (
              <div className="text-xs text-amber-400">
                {warnings.map((warning, index) => (
                  <p key={index}>⚠ {warning}</p>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white"
            >
              アプリを再読み込みする
            </button>
          </div>
        )}
      </div>

      {/* セキュリティ注記 */}
      <p className="flex items-start gap-2 rounded-lg border border-office-border bg-office-bg px-3 py-2.5 text-[11px] text-office-muted">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
        <span>
          外部連携のAPIキーはサーバー側にのみ保存されており、ブラウザから読み出せないため、バックアップファイルには含まれません。
          タスク・チャットログ・会議の議事録はサーバー側の一時データのため対象外です（書類保管庫に保存したものは含まれます）。
        </span>
      </p>

      {/* 復元の確認ダイアログ */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm rounded-xl border border-red-500/50 bg-office-panel p-5">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-400">
              <AlertTriangle size={16} /> 復元の確認
            </h4>
            <p className="mb-4 text-xs leading-relaxed text-office-text">
              現在のデータが上書きされる可能性があります。復元前に現在のデータをバックアップすることをおすすめします。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-lg border border-office-border px-3 py-2.5 text-sm font-semibold text-office-text"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void executeRestore()}
                disabled={busy}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "復元中..." : "復元する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
