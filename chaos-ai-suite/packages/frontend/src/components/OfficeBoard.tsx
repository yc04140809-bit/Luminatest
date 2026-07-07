import type { ActiveMeeting, Agent } from "@chaos-ai-suite/shared";
import { AgentDesk } from "./AgentDesk.js";

interface OfficeBoardProps {
  agents: Agent[];
  activeMeetings: ActiveMeeting[];
  onMention?: (agent: Agent) => void;
}

/** deskPosition(x,y)に基づき、6人のAI社員をオフィスのデスクに配置するゲームライクなビュー。 */
export function OfficeBoard({ agents, activeMeetings, onMention }: OfficeBoardProps) {
  const maxX = Math.max(0, ...agents.map((agent) => agent.deskPosition.x));
  const maxY = Math.max(0, ...agents.map((agent) => agent.deskPosition.y));

  return (
    <section className="rounded-xl border border-office-border bg-office-panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-office-gold">オフィス</h2>
        <span className="text-xs text-office-muted">デスクをクリックすると個別メンション指示を送れます</span>
      </div>

      {activeMeetings.length > 0 && (
        <div className="mb-4 rounded-lg border border-office-gold/50 bg-office-gold/10 px-3 py-2 text-xs text-office-gold">
          💬 作戦会議中: {activeMeetings.map((meeting) => meeting.topic).join(" / ")}
        </div>
      )}

      <div
        className="grid justify-items-center gap-6"
        style={{
          gridTemplateColumns: `repeat(${maxX + 1}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${maxY + 1}, minmax(0, 1fr))`,
        }}
      >
        {agents.map((agent) => (
          <div
            key={agent.id}
            style={{ gridColumnStart: agent.deskPosition.x + 1, gridRowStart: agent.deskPosition.y + 1 }}
          >
            <AgentDesk agent={agent} onMention={onMention} />
          </div>
        ))}
      </div>
    </section>
  );
}
