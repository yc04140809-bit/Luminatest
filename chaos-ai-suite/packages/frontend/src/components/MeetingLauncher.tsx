import { useState } from "react";
import { Users } from "lucide-react";
import { startMeeting } from "../api/officeApi.js";

interface MeetingLauncherProps {
  /** 既に進行中の会議がある場合、新規開始ボタンを無効化する。 */
  meetingRunning: boolean;
}

/** 経営の課題・アイデアを投げて、6人のAI社員による戦略経営会議を開始するランチャー。 */
export function MeetingLauncher({ meetingRunning }: MeetingLauncherProps) {
  const [topic, setTopic] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!topic.trim() || sending || meetingRunning) return;

    setSending(true);
    setError(null);
    try {
      await startMeeting(topic.trim());
      setTopic("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-xl border border-office-border bg-office-panel p-4">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-office-gold">
        <Users size={18} />
        戦略経営会議
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="例）新サービスを立ち上げたい / 来期の経営課題について意見が欲しい"
          rows={2}
          disabled={meetingRunning}
          className="w-full resize-none rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted disabled:opacity-50"
        />

        {meetingRunning && (
          <p className="text-xs text-office-gold">会議が進行中です。終了するまでお待ちください。</p>
        )}
        {error && <p className="text-xs text-red-400">開始に失敗しました: {error}</p>}

        <button
          type="submit"
          disabled={sending || meetingRunning || !topic.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-office-gold px-3 py-2 text-sm font-semibold text-office-bg transition disabled:opacity-40"
        >
          {sending ? "開始中..." : "会議を開始"}
        </button>
      </form>
    </section>
  );
}
