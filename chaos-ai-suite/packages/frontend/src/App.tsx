import { useState } from "react";
import { Settings } from "lucide-react";
import type { Agent } from "@chaos-ai-suite/shared";
import { useOfficeSocket } from "./hooks/useOfficeSocket.js";
import { useApplyTheme } from "./hooks/useApplyTheme.js";
import { OfficeBoard } from "./components/OfficeBoard.js";
import { ChatTimeline } from "./components/ChatTimeline.js";
import { CommandCenter } from "./components/CommandCenter.js";
import { ApprovalQueue } from "./components/ApprovalQueue.js";
import { SettingsPanel } from "./components/SettingsPanel.js";

const STATUS_LABEL = {
  connecting: "接続中...",
  open: "オフィス稼働中",
  closed: "接続が切れました（再接続中...）",
} as const;

export default function App() {
  const { office, status } = useOfficeSocket();
  const [mentionTarget, setMentionTarget] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useApplyTheme(office?.theme);

  if (!office) {
    return (
      <div className="flex min-h-full items-center justify-center bg-office-bg">
        <p className="text-office-muted">{STATUS_LABEL[status]}</p>
      </div>
    );
  }

  const agents = Object.values(office.agents).sort(
    (a, b) => a.deskPosition.y - b.deskPosition.y || a.deskPosition.x - b.deskPosition.x,
  );
  const pendingApprovalTasks = office.pendingApprovalTaskIds
    .map((id) => office.tasks[id])
    .filter((task): task is NonNullable<typeof task> => Boolean(task));

  function handleMention(agent: Agent): void {
    setMentionTarget(agent.id);
  }

  return (
    <div className="min-h-full bg-office-bg p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-office-gold">My Chaos AI Suite</h1>
          <p className="text-sm text-office-muted">6人のAI社員があなたのオフィスで待機しています。</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs ${
              status === "open" ? "border-emerald-500/50 text-emerald-400" : "border-office-border text-office-muted"
            }`}
          >
            {STATUS_LABEL[status]}
          </span>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="設定"
            className="rounded-full border border-office-border p-2 text-office-muted transition hover:border-office-gold hover:text-office-gold"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {settingsOpen && (
        <SettingsPanel theme={office.theme} agents={agents} onClose={() => setSettingsOpen(false)} />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <OfficeBoard agents={agents} activeMeetings={office.activeMeetings} onMention={handleMention} />
          <div className="h-[420px]">
            <ChatTimeline messages={office.messages} agents={office.agents} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <CommandCenter agents={agents} prefillTargetId={mentionTarget} />
          <ApprovalQueue tasks={pendingApprovalTasks} agents={office.agents} />
        </div>
      </div>
    </div>
  );
}
