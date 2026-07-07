import { useEffect, useRef, useState } from "react";
import { AGENT_STATUS_ICON, AGENT_STATUS_LABEL, type Agent } from "@chaos-ai-suite/shared";
import { getAgentIcon } from "../utils/agentIcons.js";
import { ChibiAvatar } from "./ChibiAvatar.js";

interface AgentDeskProps {
  agent: Agent;
  onMention?: (agent: Agent) => void;
}

const ACTIVE_STATUSES: Agent["status"][] = ["thinking", "writing", "meeting", "reviewing"];
const SPARKLE_DURATION_MS = 1100;

/** オフィスビュー上の1デスク。ちびキャラ・ステータスアイコン・現在のタスクの吹き出しを表示する。 */
export function AgentDesk({ agent, onMention }: AgentDeskProps) {
  const RoleIcon = getAgentIcon(agent.roleKey);
  const isActive = ACTIVE_STATUSES.includes(agent.status);
  const isMeeting = agent.status === "meeting";

  const prevStatusRef = useRef(agent.status);
  const [showSparkle, setShowSparkle] = useState(false);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const wasActive = ACTIVE_STATUSES.includes(prev);
    if (wasActive && agent.status === "standby") {
      setShowSparkle(true);
      const timer = setTimeout(() => setShowSparkle(false), SPARKLE_DURATION_MS);
      prevStatusRef.current = agent.status;
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = agent.status;
  }, [agent.status]);

  return (
    <button
      type="button"
      onClick={() => onMention?.(agent)}
      className="group flex w-40 flex-col items-center gap-2 rounded-xl border border-office-border bg-office-panel/80 p-3 text-center transition hover:border-office-gold hover:shadow-neon"
      title={`${agent.name}に個別メンション指示を出す`}
    >
      <div className="relative">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${isActive ? "animate-pulse" : ""}`}
          style={{ borderColor: agent.accentColor, backgroundColor: `${agent.accentColor}22` }}
        >
          <ChibiAvatar agent={agent} active={isActive} meeting={isMeeting} />
        </div>

        {showSparkle && (
          <span className="chibi-sparkle pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-lg">
            ✨
          </span>
        )}

        <span
          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-office-border bg-office-bg text-sm"
          title={AGENT_STATUS_LABEL[agent.status]}
        >
          {AGENT_STATUS_ICON[agent.status]}
        </span>
      </div>

      <div>
        <p className="flex items-center justify-center gap-1 font-display text-sm" style={{ color: agent.accentColor }}>
          <RoleIcon size={12} />
          {agent.name}
        </p>
        <p className="text-[11px] text-office-muted">{agent.title}</p>
      </div>

      {agent.currentTaskSummary && (
        <div className="rounded-lg border border-office-border bg-office-bg px-2 py-1 text-[11px] text-office-text">
          {AGENT_STATUS_LABEL[agent.status]}: {agent.currentTaskSummary}
        </div>
      )}
    </button>
  );
}
