import { AGENT_STATUS_ICON, AGENT_STATUS_LABEL, type Agent } from "@chaos-ai-suite/shared";

interface AgentCardProps {
  agent: Agent;
}

/**
 * Step1時点の簡易デスクカード。Step3で2Dオフィスビュー内の
 * アバター＋吹き出し表示に置き換える前提の暫定コンポーネント。
 */
export function AgentCard({ agent }: AgentCardProps) {
  return (
    <div
      className="rounded-lg border border-office-border bg-office-panel p-4 shadow-neon transition-shadow hover:shadow-neon"
      style={{ borderColor: agent.accentColor }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg" style={{ color: agent.accentColor }}>
          {agent.name}
        </h3>
        <span title={AGENT_STATUS_LABEL[agent.status]} className="text-xl">
          {AGENT_STATUS_ICON[agent.status]}
        </span>
      </div>
      <p className="text-sm text-office-muted">{agent.title}</p>
      <p className="mt-2 text-sm">{agent.description}</p>
      {agent.currentTaskSummary && (
        <p className="mt-2 text-xs text-office-muted">
          {AGENT_STATUS_LABEL[agent.status]}: {agent.currentTaskSummary}
        </p>
      )}
    </div>
  );
}
