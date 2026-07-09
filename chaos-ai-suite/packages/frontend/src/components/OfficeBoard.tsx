import type { ActiveMeeting, Agent, StrategyMeeting } from "@chaos-ai-suite/shared";
import { AgentDesk } from "./AgentDesk.js";
import { useTimeOfDay } from "../hooks/useTimeOfDay.js";
import { getDeskAnchor } from "../utils/deskAnchors.js";
import { shortRole } from "../utils/agentRole.js";

interface OfficeBoardProps {
  agents: Agent[];
  activeMeetings: ActiveMeeting[];
  /** 進行中の戦略経営会議。発言中のAI社員の頭上に吹き出しを表示するために使う。 */
  runningMeeting?: StrategyMeeting;
  onMention?: (agent: Agent) => void;
}

const BACKGROUND_BY_TIME = {
  day: "/office/office-day.png",
  night: "/office/office-night.png",
} as const;

/** オフィス写真（昼/夜を時間帯で自動切り替え）の上に、実際のデスク位置へAI社員を重ねるビュー。 */
export function OfficeBoard({ agents, activeMeetings, runningMeeting, onMention }: OfficeBoardProps) {
  const timeOfDay = useTimeOfDay();

  const speakerId = runningMeeting?.currentSpeakerId;
  const speechText = speakerId
    ? [...(runningMeeting?.statements ?? [])].reverse().find((statement) => statement.agentId === speakerId)?.content
    : undefined;

  return (
    <section className="rounded-xl border border-office-border bg-office-panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-office-gold">
          オフィス <span className="text-xs font-normal text-office-muted">{timeOfDay === "day" ? "☀️ 昼" : "🌙 夜"}</span>
        </h2>
        <span className="text-xs text-office-muted">デスクをクリックすると個別メンション指示を送れます</span>
      </div>

      {activeMeetings.length > 0 && (
        <div className="mb-4 rounded-lg border border-office-gold/50 bg-office-gold/10 px-3 py-2 text-xs text-office-gold">
          💬 作戦会議中: {activeMeetings.map((meeting) => meeting.topic).join(" / ")}
        </div>
      )}

      <div
        className="relative w-full overflow-hidden rounded-lg bg-cover bg-center transition-[background-image] duration-1000"
        style={{ aspectRatio: "3 / 2", backgroundImage: `url(${BACKGROUND_BY_TIME[timeOfDay]})` }}
      >
        {agents.map((agent) => {
          const anchor = getDeskAnchor(agent.id);
          return (
            <div
              key={agent.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${anchor.xPct}%`, top: `${anchor.yPct}%` }}
            >
              <AgentDesk agent={agent} onMention={onMention} speechText={agent.id === speakerId ? speechText : undefined} />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {agents.map((agent) => (
          <span key={agent.id} className="flex items-center gap-1 text-xs text-office-muted">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: agent.accentColor }} />
            <span className="font-semibold text-office-text">{agent.name}</span>
            {shortRole(agent.title)}
          </span>
        ))}
      </div>
    </section>
  );
}
