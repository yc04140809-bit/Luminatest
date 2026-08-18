import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Copy, Download, RefreshCw } from "lucide-react";
import {
  AUTOMATION_CLASSIFICATION_LABELS,
  CLIENT_PROJECT_STATUS_LABELS,
  INTERVIEW_BASE_QUESTIONS,
  MVP_APPROVAL_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  type AutomationClassification,
  type ClientProject,
  type MvpApprovalStatus,
  type MvpProposal,
  type RiskLevel,
} from "@chaos-ai-suite/shared";
import {
  approveMvp,
  completeInterview,
  generateAutomationClassification,
  generateImplementationSpecApi,
  generateMvpProposalsApi,
  generateProjectAnalysis,
  getClientProject,
  submitInterviewAnswer,
} from "../../api/officeApi.js";
import { downloadText } from "../../utils/downloadText.js";
import { scanForSensitiveInfo } from "../../utils/securityGate.js";
import { validateClientProject } from "../../utils/clientProjectValidation.js";

interface ClientProjectRoomProps {
  projectId: string;
  onBack: () => void;
  onUpdated: (project: ClientProject) => void;
}

const inputCls = "w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted";
const labelCls = "mb-1 block text-[11px] font-semibold text-office-muted";
const btnPrimary = "w-full rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40";
const btnSub = "rounded-lg border border-office-border px-3 py-2 text-xs font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold disabled:opacity-40";

const RISK_BADGE_CLASS: Record<RiskLevel, string> = {
  LOW: "border-office-border text-office-muted",
  MEDIUM: "border-office-gold/60 text-office-gold",
  HIGH: "border-orange-500/60 text-orange-400",
  CRITICAL: "border-red-500/60 text-red-400",
};

const CLASSIFICATION_BADGE_CLASS: Record<AutomationClassification, string> = {
  AUTOMATE: "border-emerald-500/60 text-emerald-400",
  ASSIST: "border-office-gold/60 text-office-gold",
  HUMAN_REQUIRED: "border-orange-500/60 text-orange-400",
  DO_NOT_AUTOMATE: "border-red-500/60 text-red-400",
};

const STEPS = ["案件概要", "ヒアリング", "分析", "自動化判定", "MVP", "実装指示書"] as const;

function stepIndex(project: ClientProject): number {
  if (project.implementationSpecs.length > 0) return 5;
  if (project.mvpProposals.length > 0) return 4;
  if (project.automationCandidates.length > 0) return 3;
  if (project.analysis) return 3;
  if (project.interviewComplete) return 2;
  return 1;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-office-border bg-office-panel p-4">
      <h2 className="mb-3 font-display text-sm text-office-gold">{title}</h2>
      {children}
    </section>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-24 shrink-0 text-office-muted">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-office-bg">
        <div className="h-full bg-office-gold" style={{ width: `${value}%` }} />
      </div>
      <span className="w-7 shrink-0 text-right text-office-text">{value}</span>
    </div>
  );
}

/**
 * Client Delivery Modeの案件詳細画面。
 * 案件概要→ヒアリング→分析→自動化判定→MVP提案→実装指示書のStepperで進行状況を示す。
 * MVP承認前は実装指示書生成へ進めない（この画面のどこにもAIが自動承認・自動実行する導線はない）。
 */
export function ClientProjectRoom({ projectId, onBack, onUpdated }: ClientProjectRoomProps) {
  const [project, setProject] = useState<ClientProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [piiWarning, setPiiWarning] = useState<string | null>(null);
  const [selectedMvpId, setSelectedMvpId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [copiedVersion, setCopiedVersion] = useState<number | null>(null);
  const [specVersionShown, setSpecVersionShown] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getClientProject(projectId)
      .then((p) => {
        if (cancelled) return;
        setProject(p);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("案件の読み込みに失敗しました。");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function apply(updated: ClientProject): void {
    setProject(updated);
    onUpdated(updated);
  }

  async function runAction(key: string, action: () => Promise<ClientProject>): Promise<void> {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      apply(await action());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function handleAnswerChange(value: string): void {
    setAnswerText(value);
    if (!value.trim()) {
      setPiiWarning(null);
      return;
    }
    const scan = scanForSensitiveInfo(value);
    setPiiWarning(scan.level !== "none" ? "回答に個人情報・機密情報らしき文字列が含まれている可能性があります。内容をご確認ください。" : null);
  }

  function handleSubmitAnswer(): void {
    if (!project || !answerText.trim()) return;
    const question = project.nextQuestion ?? INTERVIEW_BASE_QUESTIONS[0]!;
    void runAction("answer", async () => {
      const updated = await submitInterviewAnswer(project.id, question, answerText.trim());
      setAnswerText("");
      setPiiWarning(null);
      return updated;
    });
  }

  function handleMvpDecision(status: MvpApprovalStatus): void {
    if (!project) return;
    if (status === "approved" && !selectedMvpId) {
      setError("承認するMVP案を選択してください。");
      return;
    }
    void runAction(status, () => approveMvp(project.id, { mvpProposalId: selectedMvpId ?? undefined, status, note: decisionNote.trim() || undefined }));
  }

  function handleCopySpec(content: string, version: number): void {
    void navigator.clipboard.writeText(content).then(() => {
      setCopiedVersion(version);
      setTimeout(() => setCopiedVersion((v) => (v === version ? null : v)), 1500);
    });
  }

  function handleDownloadSpec(content: string, version: number, name: string): void {
    downloadText(`${name}_spec_v${version}.md`, content);
  }

  if (loading || !project) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-office-bg text-xs text-office-muted">
        {error ?? "読み込み中..."}
      </div>
    );
  }

  const warnings = validateClientProject(project);
  const currentQuestion = project.nextQuestion ?? INTERVIEW_BASE_QUESTIONS[project.interviews.length] ?? INTERVIEW_BASE_QUESTIONS[0]!;
  const current = stepIndex(project);
  const latestSpec = project.implementationSpecs[project.implementationSpecs.length - 1];
  const shownSpec = specVersionShown
    ? project.implementationSpecs.find((s) => s.version === specVersionShown)
    : latestSpec;
  const recommendedMvp = project.mvpProposals.find((p) => p.isRecommended);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
      <header className="flex items-center justify-between border-b border-office-border bg-office-panel px-4 py-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1 rounded-lg border border-office-border px-2.5 py-1.5 text-xs text-office-muted hover:border-office-gold hover:text-office-gold">
          <ArrowLeft size={14} />
          一覧へ戻る
        </button>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${RISK_BADGE_CLASS[project.riskLevel]}`}>
          {RISK_LEVEL_LABELS[project.riskLevel]}
        </span>
      </header>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-1 overflow-x-auto border-b border-office-border bg-office-bg px-3 py-2 text-[10px]">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`whitespace-nowrap rounded-full px-2 py-1 font-semibold ${index <= current ? "bg-office-gold/15 text-office-gold" : "text-office-muted"}`}>
              {label}
            </span>
            {index < STEPS.length - 1 && <span className="text-office-muted">→</span>}
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-3 overflow-y-auto p-4">
        {error && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
        {warnings.length > 0 && (
          <div className="rounded-lg border border-orange-500/50 bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
            {warnings.map((w, i) => (
              <p key={i} className="flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{w}</p>
            ))}
          </div>
        )}

        {/* 案件概要 */}
        <Section title="案件概要">
          <p className="text-sm font-semibold text-office-text">{project.name}</p>
          <p className="mt-1 text-xs text-office-muted">{project.clientName || "（クライアント名未設定）"} / {project.industry || "業種未設定"}</p>
          {project.memo && <p className="mt-2 whitespace-pre-wrap text-xs text-office-text">{project.memo}</p>}
          <p className="mt-2 text-[11px] text-office-muted">現在の状態: {CLIENT_PROJECT_STATUS_LABELS[project.status]}</p>
        </Section>

        {/* ヒアリング */}
        {!project.interviewComplete && (
          <Section title="AI Interviewer（ヒアリング）">
            <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
              {project.interviews.length === 0 && <p className="text-xs text-office-muted">まだ回答がありません。下の質問からお答えください。</p>}
              {project.interviews.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-office-border bg-office-bg p-2 text-xs">
                  <p className="font-semibold text-office-muted">Q. {entry.question}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-office-text">{entry.answer}</p>
                </div>
              ))}
            </div>
            <p className="mb-1.5 text-sm font-semibold text-office-gold">Q. {currentQuestion}</p>
            <textarea
              value={answerText}
              onChange={(e) => handleAnswerChange(e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="回答を入力してください"
            />
            {piiWarning && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-orange-400"><AlertTriangle size={11} />{piiWarning}</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={handleSubmitAnswer} disabled={busy !== null || !answerText.trim()} className={btnPrimary}>
                {busy === "answer" ? "送信中..." : "回答を送信"}
              </button>
              <button type="button" onClick={() => void runAction("complete", () => completeInterview(project.id))} disabled={busy !== null || project.interviews.length === 0} className={btnSub}>
                ヒアリング完了
              </button>
            </div>
          </Section>
        )}

        {/* 分析 */}
        {project.interviewComplete && (
          <Section title="Requirement Analyst（分析）">
            {!project.analysis ? (
              <button type="button" onClick={() => void runAction("analysis", () => generateProjectAnalysis(project.id))} disabled={busy !== null} className={btnPrimary}>
                {busy === "analysis" ? "分析中..." : "分析を生成"}
              </button>
            ) : (
              <div className="space-y-2 text-xs text-office-text">
                <p><span className="font-semibold text-office-muted">概要:</span> {project.analysis.projectSummary}</p>
                <p><span className="font-semibold text-office-muted">課題:</span> {project.analysis.mainProblem}</p>
                <p><span className="font-semibold text-office-muted">対象ユーザー:</span> {project.analysis.targetUser}</p>
                <div>
                  <p className="font-semibold text-office-muted">検討した解決策の選択肢</p>
                  <ul className="list-inside list-disc">{project.analysis.possibleSolutions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
                <p><span className="font-semibold text-office-muted">推奨解決策:</span> {project.analysis.recommendedSolution}</p>
                <div>
                  <p className="font-semibold text-office-muted">Must Have</p>
                  <ul className="list-inside list-disc">{project.analysis.mustHave.map((r, i) => <li key={i}>{r.title}</li>)}</ul>
                </div>
                <p><span className="font-semibold text-office-muted">成功条件:</span> {project.analysis.successCriteria}</p>
              </div>
            )}
          </Section>
        )}

        {/* 自動化判定 */}
        {project.analysis && (
          <Section title="Automation Judge（自動化判定）">
            {project.automationCandidates.length === 0 ? (
              <button type="button" onClick={() => void runAction("automation", () => generateAutomationClassification(project.id))} disabled={busy !== null} className={btnPrimary}>
                {busy === "automation" ? "判定中..." : "自動化判定を生成"}
              </button>
            ) : (
              <div className="space-y-2">
                {project.automationCandidates.map((c) => (
                  <div key={c.id} className="rounded-lg border border-office-border bg-office-bg p-2 text-xs">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-semibold text-office-text">{c.name}</span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CLASSIFICATION_BADGE_CLASS[c.classification]}`}>
                        {AUTOMATION_CLASSIFICATION_LABELS[c.classification]}
                      </span>
                    </div>
                    <p className="text-office-muted">{c.reason}</p>
                    <p className="mt-1 text-office-muted">自動化スコア: {c.automationScore} / 実装難易度: {c.implementationDifficulty}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* MVP提案・承認 */}
        {project.analysis && (
          <Section title="MVP Planner（提案・承認）">
            {project.mvpProposals.length === 0 ? (
              <button type="button" onClick={() => void runAction("mvp", () => generateMvpProposalsApi(project.id))} disabled={busy !== null} className={btnPrimary}>
                {busy === "mvp" ? "企画中..." : "MVP候補を生成"}
              </button>
            ) : (
              <div className="space-y-3">
                {project.mvpProposals.map((mvp: MvpProposal) => (
                  <button
                    key={mvp.id}
                    type="button"
                    onClick={() => setSelectedMvpId(mvp.id)}
                    disabled={Boolean(project.mvpApproval)}
                    className={`w-full rounded-lg border p-3 text-left text-xs transition disabled:opacity-70 ${
                      selectedMvpId === mvp.id ? "border-office-gold bg-office-gold/10" : "border-office-border bg-office-bg"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-full bg-office-panel px-2 py-0.5 font-semibold text-office-text">案{mvp.label}</span>
                      <span className="font-semibold text-office-text">{mvp.title}</span>
                      {mvp.isRecommended && <span className="rounded-full border border-office-gold/60 px-2 py-0.5 text-[10px] font-semibold text-office-gold">RECOMMENDED</span>}
                      {project.mvpApproval?.mvpProposalId === mvp.id && <Check size={13} className="text-emerald-400" />}
                    </div>
                    <p className="text-office-muted">{mvp.description}</p>
                    <p className="mt-1 text-office-muted">含む機能: {mvp.includedFeatures.join("、") || "（なし）"}</p>
                    <p className="text-office-muted">含まない機能: {mvp.excludedFeatures.join("、") || "（なし）"}</p>
                    <p className="mt-1 text-office-muted">コスト目安: {mvp.estimatedCostRange} / 期間目安: {mvp.estimatedDuration} / リスク: {mvp.riskLevel}</p>
                    <div className="mt-2 space-y-1">
                      <ScoreRow label="Business Impact" value={mvp.businessImpact} />
                      <ScoreRow label="User Value" value={mvp.userValue} />
                      <ScoreRow label="Time to Value" value={mvp.timeToValue} />
                    </div>
                  </button>
                ))}

                {recommendedMvp && !project.mvpApproval && (
                  <p className="text-[11px] text-office-muted">
                    AIのおすすめは案{recommendedMvp.label}ですが、最終決定は代表が行います。案を選んでから判断してください。
                  </p>
                )}

                {!project.mvpApproval ? (
                  <div className="space-y-2 border-t border-office-border pt-3">
                    <textarea
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                      rows={2}
                      className={`${inputCls} resize-none`}
                      placeholder="修正・再提案の希望や、判断理由があれば入力してください（任意）"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => handleMvpDecision("approved")} disabled={busy !== null} className={`${btnPrimary} col-span-2`}>
                        {busy === "approved" ? "処理中..." : "承認"}
                      </button>
                      <button type="button" onClick={() => handleMvpDecision("modify_requested")} disabled={busy !== null} className={btnSub}>修正</button>
                      <button type="button" onClick={() => handleMvpDecision("re_proposal_requested")} disabled={busy !== null} className={btnSub}>再提案</button>
                      <button type="button" onClick={() => handleMvpDecision("on_hold")} disabled={busy !== null} className={`${btnSub} col-span-2`}>保留</button>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg border border-office-border bg-office-bg px-3 py-2 text-xs text-office-muted">
                    判断: {MVP_APPROVAL_STATUS_LABELS[project.mvpApproval.status]}（{project.mvpApproval.approvedBy}）
                    {project.mvpApproval.note && ` — ${project.mvpApproval.note}`}
                  </p>
                )}
              </div>
            )}
          </Section>
        )}

        {/* 実装指示書 */}
        {project.mvpApproval?.status === "approved" && (
          <Section title="Claude Code Implementation Spec">
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void runAction("spec", () => generateImplementationSpecApi(project.id))}
                disabled={busy !== null}
                className={btnPrimary}
              >
                {busy === "spec" ? "生成中..." : latestSpec ? (
                  <span className="flex items-center justify-center gap-1"><RefreshCw size={13} />再生成（新バージョン）</span>
                ) : "実装指示書を生成"}
              </button>
            </div>

            {project.implementationSpecs.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {project.implementationSpecs.map((spec) => (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => setSpecVersionShown(spec.version)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      (specVersionShown ?? latestSpec?.version) === spec.version ? "border-office-gold text-office-gold" : "border-office-border text-office-muted"
                    }`}
                  >
                    v{spec.version}
                  </button>
                ))}
              </div>
            )}

            {shownSpec && (
              <div>
                <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-office-border bg-office-bg p-3 text-[11px] leading-relaxed text-office-text">
                  {shownSpec.content}
                </pre>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => handleCopySpec(shownSpec.content, shownSpec.version)} className={btnSub}>
                    <span className="flex items-center justify-center gap-1"><Copy size={12} />{copiedVersion === shownSpec.version ? "コピーしました" : "コピー"}</span>
                  </button>
                  <button type="button" onClick={() => handleDownloadSpec(shownSpec.content, shownSpec.version, project.name)} className={btnSub}>
                    <span className="flex items-center justify-center gap-1"><Download size={12} />Markdownダウンロード</span>
                  </button>
                </div>
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
