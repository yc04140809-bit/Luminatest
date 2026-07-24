import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { formatBytes, getStorageUsage, isStorageWarning, type StorageUsageInfo } from "../../lumina-brain/storage/storageUsage.js";

/**
 * このブラウザでの使用容量（目安）を表示する。navigator.storage.estimate()はアプリ全体（オリジン単位）の
 * 使用量しか取れないため、Lumina Brainだけの内訳ではないことを明示する。
 * 一定割合を超えたら警告を出すが、自動削除は一切行わない（ユーザーの操作を待つ）。
 */
export function StorageUsageBanner() {
  const [info, setInfo] = useState<StorageUsageInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStorageUsage().then((result) => {
      if (!cancelled) setInfo(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info || !info.supported || info.usageBytes === undefined || info.quotaBytes === undefined) {
    return null;
  }

  const warning = isStorageWarning(info);

  return (
    <div
      className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
        warning ? "border-red-500/60 bg-red-500/10 text-red-300" : "border-office-border bg-office-bg text-office-muted"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {warning && <AlertTriangle size={13} className="shrink-0" />}
        <span>
          このブラウザでの使用容量（目安・アプリ全体）: {formatBytes(info.usageBytes)} / {formatBytes(info.quotaBytes)}
          {info.ratio !== undefined && `（${Math.round(info.ratio * 100)}%）`}
        </span>
      </div>
      {warning && (
        <p className="mt-1 text-red-300/90">
          容量が少なくなっています。ゴミ箱の整理や、使わないノートの削除をご検討ください（自動削除は行いません）。
        </p>
      )}
    </div>
  );
}
