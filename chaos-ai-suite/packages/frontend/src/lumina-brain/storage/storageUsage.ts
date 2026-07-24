/**
 * ブラウザのストレージ使用量（目安）を取得する。navigator.storage.estimate()は
 * オリジン全体（このアプリ全体）の使用量しか取得できず、Lumina Brainだけの使用量には
 * 絞り込めない点に注意（画面上でもその旨を明示する）。
 * 対応していないブラウザでは supported: false を返し、機能自体は止めない。
 */

const WARNING_RATIO = 0.8;

export interface StorageUsageInfo {
  supported: boolean;
  usageBytes?: number;
  quotaBytes?: number;
  /** 0〜1の割合。取得できない場合はundefined。 */
  ratio?: number;
}

export async function getStorageUsage(): Promise<StorageUsageInfo> {
  if (!navigator.storage?.estimate) return { supported: false };
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage === undefined || quota === undefined || quota === 0) return { supported: false };
    return { supported: true, usageBytes: usage, quotaBytes: quota, ratio: usage / quota };
  } catch {
    return { supported: false };
  }
}

export function isStorageWarning(info: StorageUsageInfo): boolean {
  return info.supported && (info.ratio ?? 0) >= WARNING_RATIO;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
