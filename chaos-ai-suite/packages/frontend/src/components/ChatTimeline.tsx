import { useEffect, useRef } from "react";
import type { Agent, Message } from "@chaos-ai-suite/shared";
import { MessageBubble } from "./MessageBubble.js";

interface ChatTimelineProps {
  messages: Message[];
  agents: Record<string, Agent>;
}

/** 社内チャット（Slack/Discord風）のログビュー。新着メッセージで自動スクロールする。 */
export function ChatTimeline({ messages, agents }: ChatTimelineProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <section className="flex h-full flex-col rounded-xl border border-office-border bg-office-panel p-4">
      <h2 className="mb-3 font-display text-lg text-office-gold">社内チャットログ</h2>
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
  );
}
