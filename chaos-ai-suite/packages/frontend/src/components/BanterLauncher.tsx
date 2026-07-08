import { useState } from "react";
import { Coffee } from "lucide-react";
import { postBanter } from "../api/officeApi.js";

/** オフィス雑談タイム：ランダムに選ばれた2名のAI社員に、業務外の軽い雑談を数ターン交わさせるボタン。 */
export function BanterLauncher() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(): Promise<void> {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      await postBanter();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-xl border border-office-border bg-office-panel p-4">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-office-gold">
        <Coffee size={18} />
        オフィス雑談タイム
      </h2>
      <p className="mb-3 text-xs text-office-muted">
        ランダムに選ばれた2名のAI社員に、業務と関係ない雑談を少しだけしてもらいます。
      </p>
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={sending}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-2 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold disabled:opacity-40"
      >
        {sending ? "様子を見ています..." : "雑談を覗く"}
      </button>
    </section>
  );
}
