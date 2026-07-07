import type { Agent, Message } from "@chaos-ai-suite/shared";
import { getMessageIcon } from "../utils/messageIcons.js";

interface MessageBubbleProps {
  message: Message;
  agents: Record<string, Agent>;
}

function resolveName(id: string, agents: Record<string, Agent>): string {
  if (id === "user") return "代表";
  if (id === "system") return "システム";
  return agents[id]?.name ?? id;
}

const TYPE_STYLE: Record<Message["type"], string> = {
  chat: "border-office-border",
  task_handoff: "border-cyan-500/50",
  status_update: "border-office-border",
  approval_request: "border-amber-500/60 bg-amber-500/5",
  directive: "border-office-gold/60 bg-office-gold/5",
  system_log: "border-red-500/50 bg-red-500/5",
};

export function MessageBubble({ message, agents }: MessageBubbleProps) {
  const Icon = getMessageIcon(message.type);
  const fromName = resolveName(message.fromAgentId, agents);
  const toName = message.toAgentId ? resolveName(message.toAgentId, agents) : undefined;
  const accentColor = agents[message.fromAgentId]?.accentColor ?? "#d4af37";
  const time = new Date(message.timestamp).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`rounded-lg border ${TYPE_STYLE[message.type]} bg-office-panel px-3 py-2`}>
      <div className="flex items-center gap-2 text-xs text-office-muted">
        <Icon size={14} />
        <span className="font-semibold" style={{ color: accentColor }}>
          {fromName}
        </span>
        {toName && <span>→ {toName}</span>}
        <span className="ml-auto">{time}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-office-text">{message.content}</p>
    </div>
  );
}
