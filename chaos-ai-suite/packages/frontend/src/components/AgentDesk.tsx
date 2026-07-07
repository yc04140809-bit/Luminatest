import { AGENT_STATUS_ICON, AGENT_STATUS_LABEL, type Agent } from "@chaos-ai-suite/shared";
import { getAgentIcon } from "../utils/agentIcons.js";

interface AgentDeskProps {
  agent: Agent;
  onMention?: (agent: Agent) => void;
}

const ACTIVE_STATUSES: Agent["status"][] = ["thinking", "writing", "meeting", "reviewing"];

/** オフィスビュー上の1デスク。アバター・ステータスアイコン・現在のタスクの吹き出しを表示する。 */
export function AgentDesk({ agent, onMention }: AgentDeskProps) {
  const Icon = getAgentIcon(agent.roleKey);
  const isActive = ACTIVE_STATUSES.includes(agent.status);

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
          <Icon size={28} color={agent.accentColor} />
        </div>
        <span
          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-office-border bg-office-bg text-sm"
          title={AGENT_STATUS_LABEL[agent.status]}
        >
          {AGENT_STATUS_ICON[agent.status]}
        </span>
      </div>

      <div>
        <p className="font-display text-sm" style={{ color: agent.accentColor }}>
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
