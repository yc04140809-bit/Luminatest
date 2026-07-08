import { useEffect, useRef, useState } from "react";
import { AGENT_STATUS_ICON, AGENT_STATUS_LABEL, type Agent } from "@chaos-ai-suite/shared";
import { getAgentIcon } from "../utils/agentIcons.js";
import { ChibiAvatar } from "./ChibiAvatar.js";
import { SpeechBubble } from "./SpeechBubble.js";

interface AgentDeskProps {
  agent: Agent;
  onMention?: (agent: Agent) => void;
  /** 戦略経営会議で現在この社員が発言中の場合、その発言内容（吹き出しにタイピング表示する） */
  speechText?: string;
}

const ACTIVE_STATUSES: Agent["status"][] = ["thinking", "writing", "meeting", "reviewing"];
const SPARKLE_DURATION_MS = 1100;

/**
 * オフィス背景写真に重ねる1AI社員分のフローティングバッジ。
 * 位置決めは呼び出し側（OfficeBoard）がDESK_ANCHORSに基づき絶対配置で行う。
 */
export function AgentDesk({ agent, onMention, speechText }: AgentDeskProps) {
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
      className="group flex flex-col items-center gap-1 transition hover:scale-105"
      title={`${agent.name}に個別メンション指示を出す`}
    >
      <div className="relative">
        {speechText && <SpeechBubble text={speechText} accentColor={agent.accentColor} />}
        <div
          className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 shadow-lg ${isActive ? "animate-pulse" : ""}`}
          style={{ borderColor: agent.accentColor, backgroundColor: `${agent.accentColor}33` }}
        >
          {agent.avatarUrl ? (
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              className="chibi-breathe h-full w-full object-cover"
              style={{ objectPosition: "50% 22%" }}
            />
          ) : (
            <ChibiAvatar agent={agent} active={isActive} />
          )}
          {isMeeting && (
            <span
              className="avatar-ring-pulse pointer-events-none absolute inset-0 rounded-full border-2"
              style={{ borderColor: agent.accentColor }}
            />
          )}
        </div>

        {showSparkle && (
          <span className="chibi-sparkle pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-lg">
            ✨
          </span>
        )}

        <span
          className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-black/40 bg-office-bg text-xs shadow"
          title={AGENT_STATUS_LABEL[agent.status]}
        >
          {AGENT_STATUS_ICON[agent.status]}
        </span>
      </div>

      <div className="flex items-center gap-1 whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white shadow backdrop-blur-sm">
        <RoleIcon size={10} color={agent.accentColor} />
        {agent.name}
      </div>

      {agent.currentTaskSummary && (
        <div className="max-w-[8rem] truncate rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white/90 shadow backdrop-blur-sm">
          {agent.currentTaskSummary}
        </div>
      )}
    </button>
  );
}
