import { useState } from "react";
import { ArrowLeft, History, PenLine, Send, Sparkles } from "lucide-react";
import type { Agent, Message, Task } from "@chaos-ai-suite/shared";
import { ChibiAvatar } from "../ChibiAvatar.js";
import { getDepartment } from "../../utils/officeDepartments.js";
import { OFFICE_STATUS_ICON, OFFICE_STATUS_LABEL, recentTasksFor, type OfficeAgentStatus } from "../../utils/officeAgentStatus.js";
import { officeMemoryStore } from "../../utils/aiOfficeMemory.js";
import { postDirective } from "../../api/officeApi.js";

interface AgentDetailPanelProps {
  agent: Agent;
  tasks: Task[];
  messages: Message[];
  officeStatus: OfficeAgentStatus;
  onClose: () => void;
  onOpenNoteEditor?: () => void;
}

const inputCls = "w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted";
const btnPrimary = "flex w-full min-h-11 items-center justify-center gap-1.5 rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40";
const btnSub = "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-office-border px-3 py-2 text-xs font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold disabled:opacity-40";

type PanelView = "main" | "history" | "output" | "feedback";

export function AgentDetailPanel({ agent, tasks, messages, officeStatus, onClose, onOpenNoteEditor }: AgentDetailPanelProps) {
  const [view, setView] = useState<PanelView>("main");
  const [requestText, setRequestText] = useState("");
  const [feedbackByTask, setFeedbackByTask] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const department = getDepartment(agent.roleKey);
  const recentTasks = recentTasksFor(agent.id, tasks, 10);
  const latestOutput = recentTasks.find((task) => task.output)?.output;
  const agentMessages = messages
    .filter((message) => message.fromAgentId === agent.id || message.toAgentId === agent.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  async function handleSendRequest(): Promise<void> {
    if (!requestText.trim() || sending) return;
    setSending(true);
    setNotice(null);
    try {
      await postDirective(requestText.trim(), agent.id);
      setNotice(`${agent.name}に依頼を送ったよ。処理が終わったら報告するね。`);
      setRequestText("");
    } catch {
      setNotice("依頼の送信に失敗したよ。もう一度試してみてね。");
    } finally {
      setSending(false);
    }
  }

  function handleSendFeedback(taskId: string): void {
    const text = (feedbackByTask[taskId] ?? "").trim();
    if (!text) return;
    officeMemoryStore.addTaskFeedback(taskId, text);
    setNotice("修正の希望を伝えたよ。次の依頼のときに参考にするね。");
    setFeedbackByTask((prev) => ({ ...prev, [taskId]: "" }));
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-office-bg">
      <header className="flex items-center gap-2 border-b border-office-border bg-office-panel px-4 py-3">
        <button type="button" onClick={() => (view === "main" ? onClose() : setView("main"))} className="flex items-center gap-1 rounded-lg border border-office-border px-2.5 py-1.5 text-xs text-office-muted hover:border-office-gold hover:text-office-gold">
          <ArrowLeft size={14} />
          戻る
        </button>
        <h1 className="flex-1 truncate text-center font-display text-sm text-office-gold">{agent.name}</h1>
        <span className="w-14" />
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-3 overflow-y-auto p-4">
        {view === "main" && (
          <>
            <section className="flex items-center gap-3 rounded-xl border border-office-border bg-office-panel p-4">
              <ChibiAvatar agent={agent} active={officeStatus === "working" || officeStatus === "researching"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-office-text">{agent.name}（{agent.title}）</p>
                <p className="text-[11px] text-office-muted">{department.label}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-office-text">
                  <span>{OFFICE_STATUS_ICON[officeStatus]}</span>
                  {OFFICE_STATUS_LABEL[officeStatus]}
                </p>
              </div>
            </section>

            {agent.currentTaskSummary && (
              <section className="rounded-xl border border-office-border bg-office-panel p-4">
                <h2 className="mb-1 text-xs font-semibold text-office-muted">今の仕事</h2>
                <p className="text-sm text-office-text">{agent.currentTaskSummary}</p>
              </section>
            )}

            {notice && (
              <div className="rounded-lg border border-office-gold/50 bg-office-gold/10 px-3 py-2 text-xs text-office-text">{notice}</div>
            )}

            <section className="rounded-xl border border-office-border bg-office-panel p-4">
              <h2 className="mb-2 text-xs font-semibold text-office-muted">仕事を頼む</h2>
              <textarea
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                placeholder={`${agent.name}に頼みたいことを書いてね`}
                rows={3}
                className={inputCls}
              />
              <button type="button" onClick={handleSendRequest} disabled={sending || !requestText.trim()} className={`${btnPrimary} mt-2`}>
                <Send size={14} />
                {sending ? "送信中…" : "依頼する"}
              </button>
              {onOpenNoteEditor && (
                <button type="button" onClick={onOpenNoteEditor} className={`${btnSub} mt-2`}>
                  <PenLine size={14} />
                  note編集を頼む
                </button>
              )}
            </section>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setView("output")} className={btnSub}>
                <Sparkles size={14} />
                成果物を見る
              </button>
              <button type="button" onClick={() => setView("history")} className={btnSub}>
                <History size={14} />
                履歴を見る
              </button>
            </div>
          </>
        )}

        {view === "output" && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-office-muted">成果物</h2>
            {recentTasks.filter((task) => task.output).length === 0 && (
              <p className="text-xs text-office-muted">まだ成果物はないよ。</p>
            )}
            {recentTasks.filter((task) => task.output).map((task) => {
              const pastFeedback = officeMemoryStore.getTaskFeedback(task.id);
              const feedbackText = feedbackByTask[task.id] ?? "";
              return (
                <div key={task.id} className="rounded-xl border border-office-border bg-office-panel p-4">
                  <p className="mb-1 text-xs font-semibold text-office-text">{task.title}</p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-office-muted">{task.output}</p>
                  {pastFeedback.length > 0 && (
                    <div className="mt-2 space-y-1 rounded-lg border border-office-border bg-office-bg p-2">
                      <p className="text-[10px] font-semibold text-office-muted">これまで伝えた修正希望</p>
                      {pastFeedback.map((entry, i) => (
                        <p key={i} className="text-[11px] text-office-text">・{entry}</p>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 space-y-1.5">
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackByTask((prev) => ({ ...prev, [task.id]: e.target.value }))}
                      placeholder="修正してほしい点を書いてね"
                      rows={2}
                      className={inputCls}
                    />
                    <button type="button" onClick={() => handleSendFeedback(task.id)} disabled={!feedbackText.trim()} className={btnSub}>
                      修正を頼む
                    </button>
                  </div>
                </div>
              );
            })}
            {!latestOutput && recentTasks.length === 0 && <p className="text-xs text-office-muted">まだタスクの実績がないよ。</p>}
          </section>
        )}

        {view === "history" && (
          <section className="space-y-3">
            <div>
              <h2 className="mb-2 text-xs font-semibold text-office-muted">最近のタスク</h2>
              {recentTasks.length === 0 && <p className="text-xs text-office-muted">まだタスクの実績がないよ。</p>}
              <div className="space-y-1.5">
                {recentTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-office-border bg-office-panel px-3 py-2 text-xs">
                    <p className="text-office-text">{task.title}</p>
                    <p className="mt-0.5 text-[10px] text-office-muted">{task.status} ・ {new Date(task.updatedAt).toLocaleString("ja-JP")}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-xs font-semibold text-office-muted">活動ログ</h2>
              {agentMessages.length === 0 && <p className="text-xs text-office-muted">まだログがないよ。</p>}
              <div className="space-y-1.5">
                {agentMessages.map((message) => (
                  <div key={message.id} className="rounded-lg border border-office-border bg-office-panel px-3 py-2 text-xs">
                    <p className="whitespace-pre-wrap text-office-text">{message.content}</p>
                    <p className="mt-0.5 text-[10px] text-office-muted">{new Date(message.timestamp).toLocaleString("ja-JP")}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
