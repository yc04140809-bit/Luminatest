import { useTypewriter } from "../hooks/useTypewriter.js";

interface SpeechBubbleProps {
  text: string;
  accentColor: string;
}

/** 発言中のAI社員の頭上に表示する、タイピング風に文字が流れる吹き出し。 */
export function SpeechBubble({ text, accentColor }: SpeechBubbleProps) {
  const { displayed, done } = useTypewriter(text);

  return (
    <div className="absolute -top-3 left-1/2 z-10 w-48 -translate-x-1/2 -translate-y-full">
      <div
        className="rounded-xl border bg-office-panel/95 px-3 py-2 text-[11px] leading-snug text-office-text shadow-neon backdrop-blur-sm"
        style={{ borderColor: accentColor }}
      >
        {displayed}
        {!done && <span className="animate-pulse">▌</span>}
      </div>
      <div
        className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r bg-office-panel/95"
        style={{ borderColor: accentColor }}
      />
    </div>
  );
}
