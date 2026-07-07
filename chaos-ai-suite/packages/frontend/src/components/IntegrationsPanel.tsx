import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Save, Trash2 } from "lucide-react";
import { clearSecret, getSecretsStatus, setSecret, type SecretStatus } from "../api/officeApi.js";

function groupByCategory(items: SecretStatus[]): Map<string, SecretStatus[]> {
  const groups = new Map<string, SecretStatus[]>();
  for (const item of items) {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
  }
  return groups;
}

interface SecretFieldProps {
  secret: SecretStatus;
  onChanged: (key: string, configured: boolean) => void;
}

/** 1つのAPIキー行。値は入力しても保存後は画面に残さない（マスク入力＋保存後クリア）。 */
function SecretField({ secret, onChanged }: SecretFieldProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await setSecret(secret.key, value.trim());
      setValue("");
      onChanged(secret.key, true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClear(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await clearSecret(secret.key);
      onChanged(secret.key, false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs text-office-text">
        {secret.configured ? (
          <CheckCircle2 size={14} className="text-emerald-400" />
        ) : (
          <Circle size={14} className="text-office-muted" />
        )}
        <span>{secret.label}</span>
        <span className="text-office-muted">({secret.key})</span>
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={secret.configured ? "設定済み（上書きする場合のみ入力）" : "値を入力"}
          className="w-full rounded-lg border border-office-border bg-office-bg px-2 py-1 text-xs text-office-text placeholder:text-office-muted"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !value.trim()}
          title="保存"
          className="shrink-0 rounded-lg bg-office-accent px-2 py-1 text-white disabled:opacity-40"
        >
          <Save size={14} />
        </button>
        {secret.configured && (
          <button
            type="button"
            onClick={handleClear}
            disabled={busy}
            title="クリア"
            className="shrink-0 rounded-lg border border-office-border px-2 py-1 text-office-muted hover:text-red-400 disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

/**
 * 外部連携（Notion / Google Drive / Slack / Googleカレンダー / X / Instagram / Anthropic）の
 * APIキーをGUIから安全に登録する画面。値はサーバーの.envにのみ保存され、フロントには一切戻ってこない。
 */
export function IntegrationsPanel() {
  const [secrets, setSecrets] = useState<SecretStatus[] | null>(null);

  useEffect(() => {
    getSecretsStatus().then(setSecrets).catch(() => setSecrets([]));
  }, []);

  function handleChanged(key: string, configured: boolean): void {
    setSecrets((prev) => prev?.map((item) => (item.key === key ? { ...item, configured } : item)) ?? prev);
  }

  if (!secrets) {
    return <p className="text-sm text-office-muted">読み込み中...</p>;
  }

  const groups = groupByCategory(secrets);

  return (
    <section>
      <p className="mb-3 text-xs text-office-muted">
        AI社員が外部ツールを実行する前に、必ず代表の承認画面が表示されます。ここで保存したキーはサーバーの.envにのみ保存され、値が画面に表示されることはありません。
      </p>
      <div className="space-y-4">
        {Array.from(groups.entries()).map(([group, items]) => (
          <div key={group}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-office-gold">{group}</h4>
            <div className="space-y-3">
              {items.map((secret) => (
                <SecretField key={secret.key} secret={secret} onChanged={handleChanged} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
