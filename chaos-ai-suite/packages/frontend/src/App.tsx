import { useEffect, useRef, useState } from "react";
import { Archive, Music, Settings, VolumeX } from "lucide-react";
import type { Agent, Task } from "@chaos-ai-suite/shared";
import { useOfficeSocket } from "./hooks/useOfficeSocket.js";
import { useApplyTheme } from "./hooks/useApplyTheme.js";
import { useBgm } from "./hooks/useBgm.js";
import { OfficeBoard } from "./components/OfficeBoard.js";
import { ChatTimeline } from "./components/ChatTimeline.js";
import { CommandCenter } from "./components/CommandCenter.js";
import { ApprovalQueue } from "./components/ApprovalQueue.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { ToolApprovalModal } from "./components/ToolApprovalModal.js";
import { MeetingLauncher } from "./components/MeetingLauncher.js";
import { MeetingRoom } from "./components/MeetingRoom.js";
import { BanterLauncher } from "./components/BanterLauncher.js";
import { ArchivePanel } from "./components/ArchivePanel.js";
import { postBriefing } from "./api/officeApi.js";
import { todayInTokyo } from "./utils/dateUtil.js";

const STATUS_LABEL = {
  connecting: "接続中...",
  open: "オフィス稼働中",
  closed: "接続が切れました（再接続中...）",
} as const;

export default function App() {
  const { office, status } = useOfficeSocket();
  const [mentionTarget, setMentionTarget] = useState<{ agentId: string; nonce: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toolApprovalTask, setToolApprovalTask] = useState<Task | null>(null);
  const seenToolCallIds = useRef<Set<string>>(new Set());
  const [meetingRoomOpen, setMeetingRoomOpen] = useState(false);
  const seenMeetingIds = useRef<Set<string>>(new Set());
  const [archiveOpen, setArchiveOpen] = useState(false);
  const briefingRequested = useRef(false);
  const bgm = useBgm();
  useApplyTheme(office?.theme);

  useEffect(() => {
    if (!office || briefingRequested.current) return;
    if (office.lastBriefingDate === todayInTokyo()) return;
    briefingRequested.current = true;
    postBriefing().catch(() => {
      // 本日実施済み（他タブ等）や一時的な失敗はここでは無視する。手動実行の導線は今後の課題。
    });
  }, [office]);

  useEffect(() => {
    if (!office) return;
    const pendingToolCalls = Object.values(office.tasks).filter(
      (task) => task.pendingToolCall && task.status === "awaiting_approval",
    );
    const unseen = pendingToolCalls.find((task) => !seenToolCallIds.current.has(task.id));
    if (unseen) setToolApprovalTask(unseen);
    for (const task of pendingToolCalls) seenToolCallIds.current.add(task.id);
  }, [office]);

  useEffect(() => {
    if (!office) return;
    const runningMeetings = Object.values(office.strategyMeetings).filter((meeting) => meeting.status === "running");
    const unseen = runningMeetings.find((meeting) => !seenMeetingIds.current.has(meeting.id));
    if (unseen) setMeetingRoomOpen(true);
    for (const meeting of runningMeetings) seenMeetingIds.current.add(meeting.id);
  }, [office]);

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

  const strategyMeetings = Object.values(office.strategyMeetings).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
  const runningMeeting = strategyMeetings.find((meeting) => meeting.status === "running");
  const latestMeeting = strategyMeetings[0];

  function handleMention(agent: Agent): void {
    setMentionTarget({ agentId: agent.id, nonce: Date.now() });
  }

  return (
    <div className="min-h-full bg-office-bg p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-office-gold">My Chaos AI Suite</h1>
          <p className="text-sm text-office-muted">{agents.length}人のAI社員があなたのオフィスで待機しています。</p>
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
            onClick={bgm.toggle}
            title={bgm.enabled ? "BGMを止める" : "BGMを流す"}
            className={`rounded-full border p-2 transition hover:border-office-gold hover:text-office-gold ${
              bgm.enabled ? "border-office-gold text-office-gold" : "border-office-border text-office-muted"
            }`}
          >
            {bgm.enabled ? <Music size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            title="書類保管庫"
            className="rounded-full border border-office-border p-2 text-office-muted transition hover:border-office-gold hover:text-office-gold"
          >
            <Archive size={16} />
          </button>
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

      {archiveOpen && (
        <ArchivePanel meetings={Object.values(office.strategyMeetings)} onClose={() => setArchiveOpen(false)} />
      )}

      {toolApprovalTask && (
        <ToolApprovalModal
          task={toolApprovalTask}
          agent={toolApprovalTask.assignedAgentId ? office.agents[toolApprovalTask.assignedAgentId] : undefined}
          onClose={() => setToolApprovalTask(null)}
        />
      )}

      {meetingRoomOpen && latestMeeting && (
        <MeetingRoom meeting={latestMeeting} agents={office.agents} onClose={() => setMeetingRoomOpen(false)} />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <OfficeBoard
            agents={agents}
            activeMeetings={office.activeMeetings}
            runningMeeting={runningMeeting}
            onMention={handleMention}
          />
          <div className="h-[420px]">
            <ChatTimeline messages={office.messages} agents={office.agents} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <MeetingLauncher meetingRunning={Boolean(runningMeeting)} />
          <BanterLauncher />
          <CommandCenter agents={agents} prefillTarget={mentionTarget} />
          <ApprovalQueue tasks={pendingApprovalTasks} agents={office.agents} />
        </div>
      </div>
    </div>
  );
}
