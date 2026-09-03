import { useMemo, useState } from "react";
import { ArrowLeft, Building2, Coffee, Sparkles } from "lucide-react";
import type { Agent, OfficeState } from "@chaos-ai-suite/shared";
import { getAgentIcon } from "../../utils/agentIcons.js";
import { getDepartment, DEPARTMENT_ORDER } from "../../utils/officeDepartments.js";
import { deriveOfficeStatus, OFFICE_STATUS_ICON, OFFICE_STATUS_LABEL } from "../../utils/officeAgentStatus.js";
import { buildDailyBriefing, toTokyoDateString } from "../../utils/dailyBriefing.js";
import { useDayPhase } from "../../hooks/useDayPhase.js";
import { NoteEditorStudio } from "../NoteEditorStudio.js";
import { AgentDetailPanel } from "./AgentDetailPanel.js";

interface AIOfficeScreenProps {
  office: OfficeState;
  onClose: () => void;
}

const DAY_PHASE_BG: Record<string, string> = {
  morning: "from-orange-500/10",
  day: "from-office-gold/10",
  evening: "from-orange-600/10",
  night: "from-indigo-900/20",
};

/**
 * AI Office（AI社員が実際に働いているように見えるホーム画面）。
 * 既存のオフィスビュー（OfficeBoard、代表からの直接指示中心）は削除せず並存させ、
 * こちらは「部署ごとに社員がまとまり、状態・仕事・報告を中心に見る」別ページとして追加する。
 * ここに表示するAI社員の状態・タスクは既存のAgent/Taskをそのまま使い、新しいバックエンドは持たない。
 */
export function AIOfficeScreen({ office, onClose }: AIOfficeScreenProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [noteEditorSignal, setNoteEditorSignal] = useState(0);
  const [noteReport, setNoteReport] = useState<string | null>(null);
  const [noteReportAgentName, setNoteReportAgentName] = useState("ネムリ");
  const dayPhase = useDayPhase();

  const agents = useMemo(() => Object.values(office.agents), [office.agents]);
  const tasks = useMemo(() => Object.values(office.tasks), [office.tasks]);
  const briefing = useMemo(() => buildDailyBriefing(tasks, office.agents), [tasks, office.agents]);

  const completedToday = tasks.filter((t) => (t.status === "completed" || t.status === "approved") && toTokyoDateString(t.updatedAt) === briefing.date).length;
  const inProgress = briefing.inProgressTasks.length;

  const grouped = new Map<string, { label: string; agents: Agent[] }>();
  for (const agent of agents) {
    const dept = getDepartment(agent.roleKey);
    if (!grouped.has(dept.id)) grouped.set(dept.id, { label: dept.label, agents: [] });
    grouped.get(dept.id)!.agents.push(agent);
  }
  const orderedDepartments = DEPARTMENT_ORDER.map((id) => ({ id, ...grouped.get(id) })).filter(
    (d): d is { id: string; label: string; agents: Agent[] } => Boolean(d.label),
  );

  function handleNoteEditorOpen(): void {
    // NoteEditorStudioのモーダルはz-[70]、AgentDetailPanelはz-[80]のため、
    // 開いたままだとNote Editorが背面に隠れてしまう。呼び出し時に詳細パネルを閉じる。
    // 報告メッセージに出す名前は、後で選択が外れても正しく表示できるようこの時点で保持しておく。
    setNoteReportAgentName(selectedAgent?.name ?? "ネムリ");
    setSelectedAgentId(null);
    setNoteEditorSignal((n) => n + 1);
  }

  function handleNoteEditorSaved(summary: string): void {
    setNoteReport(`師匠、noteの編集が終わったよ。「${summary}...」という感じに仕上げたよ。確認する？`);
  }

  const selectedAgent = selectedAgentId ? office.agents[selectedAgentId] : undefined;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
      <header className="flex items-center justify-between border-b border-office-border bg-office-panel px-4 py-3">
        <button type="button" onClick={onClose} className="flex items-center gap-1 rounded-lg border border-office-border px-2.5 py-1.5 text-xs text-office-muted hover:border-office-gold hover:text-office-gold">
          <ArrowLeft size={14} />
          既存ホームへ戻る
        </button>
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-office-gold" />
          <h1 className="font-display text-base text-office-gold">My Chaos AI Office</h1>
        </div>
        <span className="text-[10px] text-office-muted">{dayPhase}</span>
      </header>

      <div className={`mx-auto w-full max-w-2xl flex-1 space-y-3 overflow-y-auto bg-gradient-to-b ${DAY_PHASE_BG[dayPhase]} to-transparent p-4`}>
        {noteReport && (
          <div className="rounded-lg border border-office-gold/50 bg-office-gold/10 px-3 py-2 text-xs text-office-text">
            <p className="flex items-center gap-1.5 font-semibold text-office-gold"><Sparkles size={13} />{noteReportAgentName}からの報告</p>
            <p className="mt-1">{noteReport}</p>
            <button type="button" onClick={() => setNoteReport(null)} className="-mx-2 mt-1 inline-flex min-h-11 items-center rounded-lg px-2 text-[11px] text-office-muted underline">閉じる</button>
          </div>
        )}

        {/* 今日のブリーフィング */}
        <section className="rounded-xl border border-office-border bg-office-panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm text-office-gold">今日のブリーフィング</h2>
            <span className="text-[11px] text-office-muted">今日 {completedToday}件完了 / {inProgress}件進行中</span>
          </div>
          {!briefingOpen ? (
            <button type="button" onClick={() => setBriefingOpen(true)} className="w-full rounded-lg bg-office-gold px-3 py-2 text-sm font-semibold text-office-bg">
              朝のブリーフィングを見る
            </button>
          ) : (
            <div className="space-y-2 text-xs text-office-text">
              <p className="whitespace-pre-wrap leading-relaxed">{briefing.greetingText}</p>
              {briefing.priorityTasks.length > 0 && (
                <div className="space-y-1">
                  {briefing.priorityTasks.map((task) =>
                    task.assignedAgentId ? (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setSelectedAgentId(task.assignedAgentId ?? null)}
                        className="block w-full rounded-lg border border-office-border bg-office-bg px-2.5 py-1.5 text-left text-[11px] hover:border-office-gold/60"
                      >
                        {task.title}
                      </button>
                    ) : (
                      <p key={task.id} className="block w-full rounded-lg border border-office-border bg-office-bg px-2.5 py-1.5 text-left text-[11px] text-office-muted">
                        {task.title}（担当未定）
                      </p>
                    ),
                  )}
                </div>
              )}
              {briefing.recommendedActions.length > 0 && (
                <div className="space-y-1 rounded-lg border border-office-border bg-office-bg p-2.5">
                  <p className="text-[11px] font-semibold text-office-muted">おすすめのアクション</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-office-text">
                    {briefing.recommendedActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 部署ごとのAI社員 */}
        {orderedDepartments.map((dept) => (
          <section key={dept.id} className="rounded-xl border border-office-border bg-office-panel p-4">
            <h2 className="mb-2 font-display text-xs text-office-muted">{dept.label}</h2>
            <div className="flex flex-wrap gap-2">
              {dept.agents.map((agent) => {
                const officeStatus = deriveOfficeStatus(agent, tasks);
                const Icon = getAgentIcon(agent.roleKey);
                const isActive = officeStatus === "working" || officeStatus === "researching" || officeStatus === "meeting";
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgentId(agent.id)}
                    className="flex min-w-[7.5rem] flex-1 items-center gap-2 rounded-lg border border-office-border bg-office-bg p-2.5 text-left transition hover:border-office-gold/50"
                  >
                    <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${isActive ? "chibi-breathe" : ""}`} style={{ borderColor: agent.accentColor, backgroundColor: `${agent.accentColor}33` }}>
                      <Icon size={16} color={agent.accentColor} />
                      {officeStatus === "meeting" && <span className="avatar-ring-pulse pointer-events-none absolute inset-0 rounded-full border-2" style={{ borderColor: agent.accentColor }} />}
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-black/40 bg-office-bg text-[9px]">
                        {OFFICE_STATUS_ICON[officeStatus]}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-office-text">{agent.name}</p>
                      <p className="truncate text-[10px] text-office-muted">{OFFICE_STATUS_LABEL[officeStatus]}</p>
                    </div>
                  </button>
                );
              })}
              {dept.agents.length === 0 && (
                <p className="flex items-center gap-1 text-[11px] text-office-muted"><Coffee size={12} />（担当なし）</p>
              )}
            </div>
          </section>
        ))}
      </div>

      {selectedAgent && (
        <AgentDetailPanel
          agent={selectedAgent}
          tasks={tasks}
          messages={office.messages}
          officeStatus={deriveOfficeStatus(selectedAgent, tasks)}
          onClose={() => setSelectedAgentId(null)}
          onOpenNoteEditor={selectedAgent.roleKey === "documentation" ? handleNoteEditorOpen : undefined}
        />
      )}

      {/* AI Note Editorとの接続（既存コンポーネントをそのまま再利用。サイドバーカードは隠し、noteEditorSignalでモーダルだけ開く） */}
      <NoteEditorStudio openSignal={noteEditorSignal} onEditSaved={handleNoteEditorSaved} hideEntryCard />
    </div>
  );
}
