import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Send, ShieldAlert } from "lucide-react";
import type { Agent } from "@chaos-ai-suite/shared";
import { postDirective } from "../api/officeApi.js";
import { shortRole } from "../utils/agentRole.js";
import { redactFindings, scanForSensitiveInfo, type SecurityFinding, type SecurityGateLevel } from "../utils/securityGate.js";

interface CommandCenterProps {
  agents: Agent[];
  /** オフィスビューでデスクをクリックした際に、そのAI社員を宛先として反映する（nonceは同じ相手への再クリックでも毎回発火させるため） */
  prefillTarget?: { agentId: string; nonce: number } | null;
}

const ALL_TARGET = "";
const HIGHLIGHT_DURATION_MS = 1400;

interface GateState {
  level: Exclude<SecurityGateLevel, "none">;
  findings: SecurityFinding[];
  /** 検査時点の送信予定テキスト（送信直前のスナップショット。伏字処理済みの表示のみ画面に出す） */
  text: string;
}

/** 代表からの全体指示・個別メンション指示を送るコマンドセンター。 */
export function CommandCenter({ agents, prefillTarget }: CommandCenterProps) {
  const [directive, setDirective] = useState("");
  const [target, setTarget] = useState<string>(ALL_TARGET);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(false);
  const [gate, setGate] = useState<GateState | null>(null);
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

  /** 送信前セキュリティゲート: AIへ送信する直前に、端末内のルールベース検査だけを行う（外部送信・ログ保存なし）。 */
  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = directive.trim();
    if (!trimmed || sending) return;

    const scan = scanForSensitiveInfo(trimmed);
    if (scan.level !== "none") {
      setGate({ level: scan.level, findings: scan.findings, text: trimmed });
      return;
    }
    await sendDirective(trimmed);
  }

  async function sendDirective(text: string): Promise<void> {
    setSending(true);
    setError(null);
    try {
      await postDirective(text, target || undefined);
      setDirective("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  function handleGateBack(): void {
    setGate(null);
    textareaRef.current?.focus();
  }

  function handleGateRedact(): void {
    if (!gate) return;
    setDirective(redactFindings(gate.text, gate.findings));
    setGate(null);
    textareaRef.current?.focus();
  }

  function handleGateProceed(): void {
    if (!gate || gate.level !== "caution") return;
    const text = gate.text;
    setGate(null);
    void sendDirective(text);
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

      {/* 送信前セキュリティゲート: 機密情報らしき文字列を検出したときの警告モーダル */}
      {gate && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-4">
          <div className={`w-full max-w-sm rounded-xl border bg-office-panel p-4 ${gate.level === "danger" ? "border-red-500/50" : "border-office-gold/50"}`}>
            <h4 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${gate.level === "danger" ? "text-red-400" : "text-office-gold"}`}>
              {gate.level === "danger" ? <ShieldAlert size={16} /> : <AlertTriangle size={16} />}
              {gate.level === "danger" ? "危険な情報が含まれている可能性があります" : "確認が必要な情報が含まれている可能性があります"}
            </h4>
            <p className="mb-3 text-xs leading-relaxed text-office-text">
              {gate.level === "danger"
                ? "APIキーやパスワードなどが含まれている可能性があるため、送信を一時停止しました。内容を修正してから再度お試しください。"
                : "メールアドレスや電話番号などの個人情報が含まれている可能性があります。内容を確認のうえ、操作を選んでください。"}
            </p>
            <div className="mb-3 max-h-48 space-y-1.5 overflow-y-auto">
              {gate.findings.slice(0, 8).map((finding, index) => (
                <div key={index} className="rounded-lg border border-office-border bg-office-bg p-2">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${finding.level === "danger" ? "bg-red-500/15 text-red-400" : "bg-office-gold/15 text-office-gold"}`}>
                      {finding.level === "danger" ? "危険" : "注意"}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-office-text">{finding.kind}</p>
                  </div>
                  <p className="text-[10px] text-office-muted">{finding.lineNumber}行目付近・該当箇所: {finding.maskedPreview}</p>
                </div>
              ))}
              {gate.findings.length > 8 && (
                <p className="text-[10px] text-office-muted">ほか{gate.findings.length - 8}件</p>
              )}
            </div>
            <p className="mb-3 text-[10px] text-office-muted">個人名・住所などはこの検査だけでは判定できません。念のため内容をご自身でも確認してください。</p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={handleGateBack} className="w-full rounded-lg border border-office-border px-3 py-2.5 text-sm font-semibold text-office-text">
                入力画面へ戻る
              </button>
              <button type="button" onClick={handleGateRedact} className="w-full rounded-lg border border-office-border px-3 py-2.5 text-sm font-semibold text-office-text">
                該当部分を削除する
              </button>
              {gate.level === "caution" && (
                <button type="button" onClick={handleGateProceed} className="w-full rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white">
                  理解したうえで送信する
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
