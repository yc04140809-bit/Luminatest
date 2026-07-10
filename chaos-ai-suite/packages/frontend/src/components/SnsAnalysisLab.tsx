import { useEffect, useState } from "react";
import { BarChart3, ChevronDown, ChevronRight, Copy, Trash2, X } from "lucide-react";
import {
  SNS_METRIC_LABELS,
  SNS_SCORE_KEYS,
  SNS_SCORE_LABELS,
  type SnsAnalysisResult,
  type SnsMetrics,
} from "@chaos-ai-suite/shared";
import { analyzeSnsPost } from "../api/officeApi.js";
import { listSnsPosts, removeSnsPost, saveSnsPost, type SnsPostRecord } from "../utils/snsPosts.js";

const PLATFORMS = ["Threads", "X", "Instagram", "note", "その他"] as const;
const METRIC_KEYS = Object.keys(SNS_METRIC_LABELS) as (keyof SnsMetrics)[];

function scoreColor(score: number): string {
  if (score >= 8) return "#34d399";
  if (score >= 5) return "#d4af37";
  return "#f87171";
}

function totalColor(total: number): string {
  if (total >= 80) return "text-emerald-400";
  if (total >= 50) return "text-office-gold";
  return "text-red-400";
}

/** 10項目の採点をバー付きで表示する共通ブロック。 */
function ScoreBars({ result }: { result: SnsAnalysisResult }) {
  return (
    <div className="space-y-1.5">
      {SNS_SCORE_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-2 text-xs">
          <span className="w-40 shrink-0 text-office-muted">{SNS_SCORE_LABELS[key]}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-office-bg">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${result.scores[key] * 10}%`, backgroundColor: scoreColor(result.scores[key]) }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-semibold text-office-text">{result.scores[key]}</span>
        </div>
      ))}
    </div>
  );
}

/** 分析結果（総合点・強み・改善点・リライト案・総評）の表示ブロック。 */
function AnalysisView({ result }: { result: SnsAnalysisResult }) {
  const [copied, setCopied] = useState(false);

  async function copyRewrite(): Promise<void> {
    try {
      await navigator.clipboard.writeText(result.rewrite);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // クリップボード非対応環境では手動コピーしてもらう
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className={`font-display text-4xl ${totalColor(result.totalScore)}`}>{result.totalScore}</span>
        <span className="text-sm text-office-muted">/ 100点</span>
      </div>

      {result.summary && <p className="text-sm text-office-text">{result.summary}</p>}

      <ScoreBars result={result} />

      {result.strengths.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold text-emerald-400">💪 強み（伸びた/伸びる理由）</h4>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-office-text">
            {result.strengths.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {result.improvements.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold text-amber-400">🔧 改善点</h4>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-office-text">
            {result.improvements.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {result.rewrite && (
        <div className="rounded-lg border border-office-gold/50 bg-office-gold/10 p-3">
          <div className="mb-1 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-office-gold">✨ リライト案（このまま投稿OK）</h4>
            <button
              type="button"
              onClick={copyRewrite}
              className="flex items-center gap-1 rounded-full border border-office-border px-2 py-0.5 text-[11px] text-office-muted transition hover:border-office-gold hover:text-office-gold"
            >
              <Copy size={11} /> {copied ? "コピーしました" : "コピー"}
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-office-text">{result.rewrite}</p>
        </div>
      )}
    </div>
  );
}

/**
 * SNS分析ラボ（MVP）。投稿本文＋実績データを入力し、ミライが10項目採点・改善点・リライト案を返す。
 * 分析結果はこの端末に自動保存され、「過去の投稿」タブで一覧・比較・削除できる。
 * 将来のAI社員（トレンド分析・投稿生成など）はこのラボにタブを追加していく想定。
 */
export function SnsAnalysisLab() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"analyze" | "history">("analyze");

  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState<string>(PLATFORMS[0]);
  const [metricsInput, setMetricsInput] = useState<Record<keyof SnsMetrics, string>>({
    views: "",
    likes: "",
    replies: "",
    saves: "",
    clicks: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SnsAnalysisResult | null>(null);

  const [posts, setPosts] = useState<SnsPostRecord[]>([]);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) setPosts(listSnsPosts());
  }, [open, result]);

  function parsedMetrics(): SnsMetrics {
    const metrics: SnsMetrics = {};
    for (const key of METRIC_KEYS) {
      const raw = metricsInput[key].trim();
      if (raw === "") continue;
      const num = Number(raw);
      if (Number.isFinite(num) && num >= 0) metrics[key] = num;
    }
    return metrics;
  }

  async function handleAnalyze(): Promise<void> {
    if (!content.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const metrics = parsedMetrics();
      const analysis = await analyzeSnsPost({ content: content.trim(), platform, metrics });
      saveSnsPost({ content: content.trim(), platform, metrics, analysis });
      setResult(analysis);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toggleCompare(id: string): void {
    setCompareIds((ids) => {
      if (ids.includes(id)) return ids.filter((existing) => existing !== id);
      if (ids.length >= 2) return [ids[1]!, id];
      return [...ids, id];
    });
  }

  function handleRemove(id: string): void {
    removeSnsPost(id);
    setPosts(listSnsPosts());
    setCompareIds((ids) => ids.filter((existing) => existing !== id));
  }

  const comparePosts = compareIds
    .map((id) => posts.find((post) => post.id === id))
    .filter((post): post is SnsPostRecord => Boolean(post));

  return (
    <>
      <section className="rounded-xl border border-office-border bg-office-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-office-gold">
          <BarChart3 size={18} />
          SNS分析ラボ
        </h2>
        <p className="mb-3 text-xs text-office-muted">
          投稿と実績データをミライ（AIマーケティング責任者）が10項目で採点し、改善点とリライト案を出します。
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-2 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold"
        >
          ラボを開く
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
          <div className="flex items-center justify-between border-b border-office-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-xl text-office-gold">
              <BarChart3 size={20} />
              SNS分析ラボ
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 rounded-full border border-office-border px-3 py-1.5 text-sm text-office-muted transition hover:border-office-gold hover:text-office-gold"
            >
              <X size={16} /> 戻る
            </button>
          </div>

          <div className="flex gap-2 border-b border-office-border px-5 py-3">
            {[
              { id: "analyze" as const, label: "新規分析" },
              { id: "history" as const, label: `過去の投稿（${posts.length}）` },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  tab === item.id
                    ? "bg-office-gold/20 text-office-gold"
                    : "border border-office-border text-office-muted hover:text-office-text"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-5 py-4">
            {tab === "analyze" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-office-muted">プラットフォーム</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setPlatform(name)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          platform === name
                            ? "bg-office-gold/20 text-office-gold"
                            : "border border-office-border text-office-muted hover:text-office-text"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-office-muted">投稿本文</label>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="分析したい投稿の本文を貼り付けてください（投稿前の下書きでもOK）"
                    rows={6}
                    className="w-full resize-none rounded-lg border border-office-border bg-office-panel px-3 py-2 text-sm text-office-text placeholder:text-office-muted"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-office-muted">
                    投稿後の実績データ（未入力なら投稿前の事前診断として採点します）
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {METRIC_KEYS.map((key) => (
                      <div key={key}>
                        <span className="text-[11px] text-office-muted">{SNS_METRIC_LABELS[key]}</span>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={metricsInput[key]}
                          onChange={(event) => setMetricsInput((prev) => ({ ...prev, [key]: event.target.value }))}
                          placeholder="-"
                          className="w-full rounded-lg border border-office-border bg-office-panel px-2 py-1.5 text-sm text-office-text"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm text-red-400">分析に失敗しました: {error}</p>}

                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading || !content.trim()}
                  className="w-full rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40"
                >
                  {loading ? "ミライが分析中...（10〜30秒ほどかかります）" : "ミライに分析してもらう"}
                </button>

                {result && (
                  <div className="rounded-xl border border-office-border bg-office-panel p-4">
                    <p className="mb-3 text-xs text-emerald-400">✓ 分析完了。この結果は端末に自動保存されました（「過去の投稿」タブで見返せます）。</p>
                    <AnalysisView result={result} />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {posts.length === 0 && (
                  <p className="text-sm text-office-muted">まだ分析した投稿はありません。「新規分析」から始めてください。</p>
                )}

                {posts.length >= 2 && (
                  <p className="text-xs text-office-muted">☑️ を2件選ぶと、下に比較表が出ます。</p>
                )}

                {posts.map((post) => {
                  const expanded = openPostId === post.id;
                  return (
                    <div key={post.id} className="rounded-lg border border-office-border bg-office-panel">
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={compareIds.includes(post.id)}
                          onChange={() => toggleCompare(post.id)}
                          className="h-4 w-4 shrink-0 accent-[#d4af37]"
                          title="比較対象に選ぶ"
                        />
                        <button
                          type="button"
                          onClick={() => setOpenPostId(expanded ? null : post.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          {expanded ? (
                            <ChevronDown size={14} className="shrink-0 text-office-muted" />
                          ) : (
                            <ChevronRight size={14} className="shrink-0 text-office-muted" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-office-text">{post.content}</p>
                            <p className="text-[11px] text-office-muted">
                              {post.platform} ・ {new Date(post.createdAt).toLocaleString("ja-JP")}
                              {post.metrics.views !== undefined && ` ・ 閲覧${post.metrics.views}`}
                            </p>
                          </div>
                          <span className={`shrink-0 font-display text-lg ${totalColor(post.analysis.totalScore)}`}>
                            {post.analysis.totalScore}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(post.id)}
                          title="削除"
                          className="shrink-0 rounded-full border border-office-border p-1.5 text-office-muted transition hover:border-red-400 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {expanded && (
                        <div className="border-t border-office-border px-3 py-3">
                          <p className="mb-3 whitespace-pre-wrap rounded bg-office-bg p-2 text-xs text-office-muted">{post.content}</p>
                          <AnalysisView result={post.analysis} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {comparePosts.length === 2 && (
                  <div className="rounded-xl border border-office-gold/50 bg-office-panel p-4">
                    <h3 className="mb-3 text-sm font-semibold text-office-gold">📊 2件の比較</h3>
                    <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-office-muted">
                      {comparePosts.map((post, index) => (
                        <div key={post.id}>
                          <p className="font-semibold text-office-text">投稿{index + 1}</p>
                          <p className="truncate">{post.content}</p>
                          <p>{new Date(post.createdAt).toLocaleDateString("ja-JP")}</p>
                        </div>
                      ))}
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-office-border font-semibold text-office-text">
                          <td className="py-1.5">総合スコア</td>
                          {comparePosts.map((post) => (
                            <td key={post.id} className={`py-1.5 text-center font-display text-base ${totalColor(post.analysis.totalScore)}`}>
                              {post.analysis.totalScore}
                            </td>
                          ))}
                        </tr>
                        {SNS_SCORE_KEYS.map((key) => {
                          const [first, second] = comparePosts;
                          const diff = (first?.analysis.scores[key] ?? 0) - (second?.analysis.scores[key] ?? 0);
                          return (
                            <tr key={key} className="border-b border-office-border/50">
                              <td className="py-1 text-office-muted">{SNS_SCORE_LABELS[key]}</td>
                              {comparePosts.map((post) => {
                                const mine = post.analysis.scores[key];
                                const winner = (post === first && diff > 0) || (post === second && diff < 0);
                                return (
                                  <td key={post.id} className={`py-1 text-center ${winner ? "font-bold text-emerald-400" : "text-office-text"}`}>
                                    {mine}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                        {METRIC_KEYS.map((key) => {
                          const hasAny = comparePosts.some((post) => post.metrics[key] !== undefined);
                          if (!hasAny) return null;
                          return (
                            <tr key={key} className="border-b border-office-border/50">
                              <td className="py-1 text-office-muted">{SNS_METRIC_LABELS[key]}</td>
                              {comparePosts.map((post) => (
                                <td key={post.id} className="py-1 text-center text-office-text">
                                  {post.metrics[key] ?? "-"}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
