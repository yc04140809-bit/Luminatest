import { useState } from "react";
import { Download, X, ChevronDown, ChevronRight, Archive } from "lucide-react";
import type { StrategyMeeting } from "@chaos-ai-suite/shared";
import { downloadText } from "../utils/downloadText.js";
import { meetingFileName, meetingToText } from "../utils/meetingText.js";

interface ArchivePanelProps {
  meetings: StrategyMeeting[];
  onClose: () => void;
}

/** 過去の戦略経営会議の議事録・タスク案・最終提案を一覧・閲覧・ダウンロードできる書類保管庫。 */
export function ArchivePanel({ meetings, onClose }: ArchivePanelProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const archived = [...meetings]
    .filter((meeting) => meeting.status !== "running")
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-office-gold/50 bg-office-panel shadow-neon">
        <div className="flex items-center justify-between border-b border-office-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg text-office-gold">
            <Archive size={18} />
            書類保管庫
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-office-border p-2 text-office-muted transition hover:border-office-gold hover:text-office-gold"
            title="閉じる"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {archived.length === 0 && (
            <p className="text-sm text-office-muted">まだ完了した会議はありません。会議が終わると、ここに議事録が保管されます。</p>
          )}

          {archived.map((meeting) => {
            const open = openId === meeting.id;
            return (
              <div key={meeting.id} className="rounded-lg border border-office-border bg-office-bg">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : meeting.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                >
                  {open ? <ChevronDown size={14} className="shrink-0 text-office-muted" /> : <ChevronRight size={14} className="shrink-0 text-office-muted" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-office-text">{meeting.topic}</p>
                    <p className="text-xs text-office-muted">
                      {new Date(meeting.startedAt).toLocaleString("ja-JP")}
                      {meeting.status === "failed" && <span className="ml-2 text-red-400">失敗</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      downloadText(meetingFileName(meeting), meetingToText(meeting));
                    }}
                    title="この端末にダウンロード"
                    className="shrink-0 rounded-full border border-office-border p-1.5 text-office-muted transition hover:border-office-gold hover:text-office-gold"
                  >
                    <Download size={14} />
                  </button>
                </button>

                {open && (
                  <div className="space-y-3 border-t border-office-border px-3 py-3">
                    {meeting.minutes && (
                      <div>
                        <h3 className="mb-1 text-xs font-semibold text-office-gold">📝 議事録</h3>
                        <p className="whitespace-pre-wrap text-sm text-office-text">{meeting.minutes}</p>
                      </div>
                    )}
                    {meeting.actionItems && meeting.actionItems.length > 0 && (
                      <div>
                        <h3 className="mb-1 text-xs font-semibold text-office-gold">✅ タスク案</h3>
                        <ul className="list-inside list-disc text-sm text-office-text">
                          {meeting.actionItems.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {meeting.proposal && (
                      <div className="rounded-lg border border-office-gold/50 bg-office-gold/10 px-3 py-2">
                        <h3 className="mb-1 text-xs font-semibold text-office-gold">📣 最終提案</h3>
                        <p className="whitespace-pre-wrap text-sm text-office-text">{meeting.proposal}</p>
                      </div>
                    )}
                    {meeting.status === "failed" && meeting.errorMessage && (
                      <p className="text-sm text-red-400">エラー: {meeting.errorMessage}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
