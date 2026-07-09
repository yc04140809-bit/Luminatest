import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { Agent } from "@chaos-ai-suite/shared";
import { postDirective } from "../api/officeApi.js";
import { shortRole } from "../utils/agentRole.js";

interface CommandCenterProps {
  agents: Agent[];
  /** オフィスビューでデスクをクリックした際に、そのAI社員を宛先として反映する（nonceは同じ相手への再クリックでも毎回発火させるため） */
  prefillTarget?: { agentId: string; nonce: number } | null;
}

const ALL_TARGET = "";
const HIGHLIGHT_DURATION_MS = 1400;

/** 代表からの全体指示・個別メンション指示を送るコマンドセンター。 */
export function CommandCenter({ agents, prefillTarget }: CommandCenterProps) {
  const [directive, setDirective] = useState("");
  const [target, setTarget] = useState<string>(ALL_TARGET);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!prefillTarget) return;
    setTarget(prefillTarget.agentId);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    textareaRef.current?.focus();
    setHighlight(true);
    const timer = setTimeout(() => setHighlight(false), HIGHLIGHT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [prefillTarget]);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!directive.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      await postDirective(directive.trim(), target || undefined);
      setDirective("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      ref={sectionRef}
      className={`rounded-xl border bg-office-panel p-4 transition-colors duration-300 ${
        highlight ? "border-office-gold ring-2 ring-office-gold/60" : "border-office-border"
      }`}
    >
      <h2 className="mb-3 font-display text-lg text-office-gold">コマンドセンター</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <select
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          className="w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text"
        >
          <option value={ALL_TARGET}>全員へ（作戦会議からタスク分解）</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}（{shortRole(agent.title)}）宛
            </option>
          ))}
        </select>

        <textarea
          ref={textareaRef}
          value={directive}
          onChange={(event) => setDirective(event.target.value)}
          placeholder="例）新サービスを立ち上げたい / このクレーム対応どう思う？"
          rows={3}
          className="w-full resize-none rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted"
        />

        {error && <p className="text-xs text-red-400">送信に失敗しました: {error}</p>}

        <button
          type="submit"
          disabled={sending || !directive.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-office-accent px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
        >
          <Send size={16} />
          {sending ? "送信中..." : "指示を送る"}
        </button>
      </form>
    </section>
  );
}
