import { useEffect, useRef, useState } from "react";
import { Download, Maximize2, Minimize2, X } from "lucide-react";
import type { Agent, MeetingPhase, StrategyMeeting } from "@chaos-ai-suite/shared";
import { downloadText } from "../utils/downloadText.js";
import { meetingFileName, meetingToText } from "../utils/meetingText.js";

interface MeetingRoomProps {
  meeting: StrategyMeeting;
  agents: Record<string, Agent>;
  onClose: () => void;
}

const PHASE_ORDER: MeetingPhase[] = ["opening", "discussion", "documentation", "proposal", "concluded"];

const PHASE_LABEL: Record<MeetingPhase, string> = {
  opening: "① 開会・目的定義",
  discussion: "② ディスカッション",
  documentation: "③ 議事録・タスク化",
  proposal: "④ 最終提案",
  concluded: "完了",
};

function resolveName(id: string, agents: Record<string, Agent>): string {
  return agents[id]?.name ?? id;
}

function resolveColor(id: string, agents: Record<string, Agent>): string {
  return agents[id]?.accentColor ?? "#d4af37";
}

/** 会議の現在フェーズが、表示中のステップより先に進んでいるか（=完了済みか）を判定する。 */
function isPhaseDone(step: MeetingPhase, currentPhase: MeetingPhase): boolean {
  return PHASE_ORDER.indexOf(currentPhase) > PHASE_ORDER.indexOf(step);
}

/**
 * 戦略経営会議の「会議室」ビュー。フェーズ進行バー、劇本風の発言トランスクリプト、
 * 完了後は議事録・タスク一覧・最終提案をまとめて表示するフルスクリーンモーダル。
 */
export function MeetingRoom({ meeting, agents, onClose }: MeetingRoomProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [large, setLarge] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [meeting.statements.length]);

  const visiblePhases = PHASE_ORDER.filter((phase) => phase !== "concluded");
  const textSize = large ? "text-lg leading-relaxed" : "text-sm";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-office-gold/50 bg-office-panel shadow-neon">
        <div className="flex items-center justify-between border-b border-office-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg text-office-gold">戦略経営会議</h2>
            <p className="text-sm text-office-text">{meeting.topic}</p>
          </div>
          <div className="flex items-center gap-2">
            {meeting.status === "concluded" && (
              <button
                type="button"
                onClick={() => downloadText(meetingFileName(meeting), meetingToText(meeting))}
                title="この端末にダウンロード"
                className="rounded-full border border-office-border p-2 text-office-muted transition hover:border-office-gold hover:text-office-gold"
              >
                <Download size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setLarge((v) => !v)}
              title={large ? "通常の文字サイズに戻す" : "文字を拡大表示する"}
              className="rounded-full border border-office-border p-2 text-office-muted transition hover:border-office-gold hover:text-office-gold"
            >
              {large ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-office-border p-2 text-office-muted transition hover:border-office-gold hover:text-office-gold"
              title="閉じる（会議は裏で進行し続けます）"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-office-border px-5 py-3 text-[11px]">
          {visiblePhases.map((phase, index) => {
            const active = meeting.phase === phase;
            const done = isPhaseDone(phase, meeting.phase) || meeting.status === "concluded";
            return (
              <div key={phase} className="flex items-center gap-1">
                <span
                  className={`rounded-full px-2 py-1 ${
                    active
                      ? "bg-office-gold/20 font-semibold text-office-gold"
                      : done
                        ? "text-emerald-400"
                        : "text-office-muted"
                  }`}
                >
                  {PHASE_LABEL[phase]}
                </span>
                {index < visiblePhases.length - 1 && <span className="text-office-muted">→</span>}
              </div>
            );
          })}
          {meeting.status === "failed" && (
            <span className="ml-auto rounded-full bg-red-500/20 px-2 py-1 font-semibold text-red-400">失敗</span>
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {meeting.statements.length === 0 && (
            <p className="text-sm text-office-muted">まもなく会議が始まります...</p>
          )}
          {meeting.statements.map((statement) => (
            <div key={statement.id} className="rounded-lg border border-office-border bg-office-bg px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span className="font-semibold" style={{ color: resolveColor(statement.agentId, agents) }}>
                  {resolveName(statement.agentId, agents)}
                </span>
                <span className="text-office-muted">{PHASE_LABEL[statement.phase]}</span>
              </div>
              <p className={`whitespace-pre-wrap text-office-text ${textSize}`}>{statement.content}</p>
            </div>
          ))}

          {meeting.status === "failed" && meeting.errorMessage && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              会議中にエラーが発生しました: {meeting.errorMessage}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {meeting.status === "concluded" && (
          <div className="border-t border-office-border px-5 py-4 space-y-3">
            {meeting.minutes && (
              <div>
                <h3 className="mb-1 text-xs font-semibold text-office-gold">📝 議事録</h3>
                <p className={`whitespace-pre-wrap text-office-text ${textSize}`}>{meeting.minutes}</p>
              </div>
            )}
            {meeting.actionItems && meeting.actionItems.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-semibold text-office-gold">✅ タスク案</h3>
                <ul className={`list-inside list-disc text-office-text ${textSize}`}>
                  {meeting.actionItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {meeting.proposal && (
              <div className="rounded-lg border border-office-gold/50 bg-office-gold/10 px-3 py-2">
                <h3 className="mb-1 text-xs font-semibold text-office-gold">📣 最終提案</h3>
                <p className={`whitespace-pre-wrap text-office-text ${textSize}`}>{meeting.proposal}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
