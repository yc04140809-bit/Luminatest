import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import type { Agent, Message } from "@chaos-ai-suite/shared";
import { MessageBubble } from "./MessageBubble.js";

interface ChatTimelineProps {
  messages: Message[];
  agents: Record<string, Agent>;
}

/** 社内チャット（Slack/Discord風）のログビュー。新着メッセージで自動スクロールする。 */
export function ChatTimeline({ messages, agents }: ChatTimelineProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const expandedBottomRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    expandedBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <>
      <section className="flex h-full flex-col rounded-xl border border-office-border bg-office-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-office-gold">社内チャットログ</h2>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            title="拡大表示"
            className="rounded-full border border-office-border p-1.5 text-office-muted transition hover:border-office-gold hover:text-office-gold"
          >
            <Maximize2 size={14} />
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <p className="text-sm text-office-muted">まだログはありません。コマンドセンターから指示を出してみましょう。</p>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} agents={agents} />
          ))}
          <div ref={bottomRef} />
        </div>
      </section>

      {expanded && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
          <div className="flex items-center justify-between border-b border-office-border px-5 py-4">
            <h2 className="font-display text-xl text-office-gold">社内チャットログ（拡大表示）</h2>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1.5 rounded-full border border-office-border px-3 py-1.5 text-sm text-office-muted transition hover:border-office-gold hover:text-office-gold"
            >
              <X size={16} /> 戻る
            </button>
          </div>
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} agents={agents} large />
            ))}
            <div ref={expandedBottomRef} />
          </div>
        </div>
      )}
    </>
  );
}
