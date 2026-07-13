import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Megaphone, X } from "lucide-react";
import {
  EIGHT_LAYER_FIELDS,
  MARKETING_COPY_MODES,
  MARKETING_COPY_TYPES,
  type EightLayerKey,
  type EightLayerValues,
  type MarketingCopyModeId,
  type MarketingCopyResult,
  type MarketingCopyTypeId,
} from "@chaos-ai-suite/shared";
import { generateMarketingCopy } from "../api/officeApi.js";

/**
 * 刺さるマーケティング生成・改善システムのフェーズ1。
 * 文章タイプ・生成モード・基本入力・8層入力から、1回のAI呼び出しで完成文章を生成する。
 * 刺さり診断（採点）・添削改善モード・保存履歴・テンプレートはフェーズ2以降で追加予定。
 */

function Section({
  title, open, onToggle, children, badge,
}: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode; badge?: string;
}) {
  return (
    <div className="rounded-lg border border-office-border bg-office-panel">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-3 text-left">
        {open ? <ChevronDown size={14} className="shrink-0 text-office-muted" /> : <ChevronRight size={14} className="shrink-0 text-office-muted" />}
        <span className="flex-1 text-sm font-semibold text-office-text">{title}</span>
        {badge && <span className="shrink-0 rounded-full bg-office-gold/15 px-2 py-0.5 text-[10px] font-semibold text-office-gold">{badge}</span>}
      </button>
      {open && <div className="border-t border-office-border px-3 py-3">{children}</div>}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted";
const labelCls = "mb-1 block text-[11px] font-semibold text-office-muted";
const btnPrimary = "w-full rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40";
const btnSub = "rounded-lg border border-office-border px-3 py-2 text-xs font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold disabled:opacity-40";

const EMPTY_EIGHT_LAYERS: EightLayerValues = {};

export function MarketingCopyStudio() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["basic"]));

  const [copyType, setCopyType] = useState<MarketingCopyTypeId>("threads");
  const [mode, setMode] = useState<MarketingCopyModeId>("chaos_style");
  const [theme, setTheme] = useState("");
  const [audience, setAudience] = useState("");
  const [audienceProblem, setAudienceProblem] = useState("");
  const [offer, setOffer] = useState("");
  const [eightLayers, setEightLayers] = useState<EightLayerValues>(EMPTY_EIGHT_LAYERS);
  const [experience, setExperience] = useState("");
  const [charLength, setCharLength] = useState("");
  const [tone, setTone] = useState("");
  const [salesIntensity, setSalesIntensity] = useState("");
  const [snsPlatform, setSnsPlatform] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [noteUrl, setNoteUrl] = useState("");
  const [coconalaUrl, setCoconalaUrl] = useState("");
  const [pastPost, setPastPost] = useState("");
  const [keywords, setKeywords] = useState("");
  const [avoidPhrases, setAvoidPhrases] = useState("");
  const [useBrandProfile, setUseBrandProfile] = useState(true);

  const [result, setResult] = useState<MarketingCopyResult | null>(null);
  const [editedLayers, setEditedLayers] = useState<Record<EightLayerKey, string> | null>(null);

  useEffect(() => {
    if (result) setEditedLayers(result.eightLayers);
  }, [result]);

  function toggleSection(id: string): void {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("コピーできませんでした。テキストを長押しして手動でコピーしてください。");
    }
  }

  async function handleGenerate(): Promise<void> {
    if (busy) return;
    if (!theme.trim() || !audience.trim() || !audienceProblem.trim() || !offer.trim()) {
      setError("テーマ・読者・読者の悩み・紹介したい商品または行動は必須です。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const generated = await generateMarketingCopy({
        copyType,
        mode,
        theme: theme.trim(),
        audience: audience.trim(),
        audienceProblem: audienceProblem.trim(),
        offer: offer.trim(),
        eightLayers,
        experience: experience.trim() || undefined,
        charLength: charLength.trim() || undefined,
        tone: tone.trim() || undefined,
        salesIntensity: salesIntensity.trim() || undefined,
        snsPlatform: snsPlatform.trim() || undefined,
        productUrl: productUrl.trim() || undefined,
        noteUrl: noteUrl.trim() || undefined,
        coconalaUrl: coconalaUrl.trim() || undefined,
        pastPost: pastPost.trim() || undefined,
        keywords: keywords.trim() || undefined,
        avoidPhrases: avoidPhrases.trim() || undefined,
        useBrandProfile,
      });
      setResult(generated);
      setOpenSections(new Set(["result"]));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="rounded-xl border border-office-border bg-office-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-office-gold">
          <Megaphone size={18} />
          刺さるマーケティング生成
        </h2>
        <p className="mb-3 text-xs text-office-muted">
          Threads投稿・note記事・ココナラ出品文・商品説明・プロフィールなどを、読者の本音に届く文章に変換します。
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-2 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold"
        >
          スタジオを開く
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
          <div className="flex items-center justify-between border-b border-office-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-xl text-office-gold">
              <Megaphone size={20} />
              刺さるマーケティング生成
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 rounded-full border border-office-border px-3 py-1.5 text-sm text-office-muted transition hover:border-office-gold hover:text-office-gold"
            >
              <X size={16} /> 戻る
            </button>
          </div>

          <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {error && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
            {copied && <p className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">✓ コピーしました</p>}

            <Section title="基本設定" open={openSections.has("basic")} onToggle={() => toggleSection("basic")}>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>文章タイプ</label>
                  <select value={copyType} onChange={(event) => setCopyType(event.target.value as MarketingCopyTypeId)} className={inputCls}>
                    {MARKETING_COPY_TYPES.map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>生成モード</label>
                  <select value={mode} onChange={(event) => setMode(event.target.value as MarketingCopyModeId)} className={inputCls}>
                    {MARKETING_COPY_MODES.map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-office-muted">
                    {MARKETING_COPY_MODES.find((entry) => entry.id === mode)?.description}
                  </p>
                </div>
                <div>
                  <label className={labelCls}>テーマ（必須）</label>
                  <input value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="例：Claude Code初心者向け安全改良テンプレ" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>読者（必須）</label>
                  <input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="例：既存アプリを壊すのが怖くて改善できない初心者" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>読者の悩み（必須）</label>
                  <textarea value={audienceProblem} onChange={(event) => setAudienceProblem(event.target.value)} rows={2} placeholder="例：Claude Codeを開いても指示が出せない" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>紹介したい商品または行動（必須）</label>
                  <textarea value={offer} onChange={(event) => setOffer(event.target.value)} rows={2} placeholder="例：既存アプリを壊さない安全改良テンプレ集" className={inputCls} />
                </div>
              </div>
            </Section>

            <Section title="8層マーケティング入力（任意・空欄はAIが補完）" open={openSections.has("layers")} onToggle={() => toggleSection("layers")}>
              <div className="space-y-3">
                {EIGHT_LAYER_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className={labelCls}>{field.label}</label>
                    <textarea
                      value={eightLayers[field.key] ?? ""}
                      onChange={(event) => setEightLayers((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      rows={2}
                      placeholder={field.placeholder}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </Section>

            <Section title="詳細設定（任意）" open={openSections.has("detail")} onToggle={() => toggleSection("detail")}>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>ケイオス師匠自身の体験</label>
                  <textarea value={experience} onChange={(event) => setExperience(event.target.value)} rows={2} placeholder="実際の体験のみ入力してください（AIは体験を捏造しません）" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>文字数の目安</label>
                    <input value={charLength} onChange={(event) => setCharLength(event.target.value)} placeholder="例：400字程度" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>トーン</label>
                    <input value={tone} onChange={(event) => setTone(event.target.value)} placeholder="例：やさしめ" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>販売色の強さ</label>
                    <input value={salesIntensity} onChange={(event) => setSalesIntensity(event.target.value)} placeholder="例：弱め" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>使用SNS/媒体</label>
                    <input value={snsPlatform} onChange={(event) => setSnsPlatform(event.target.value)} placeholder="例：Threads" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>商品URL</label>
                  <input value={productUrl} onChange={(event) => setProductUrl(event.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>noteURL</label>
                  <input value={noteUrl} onChange={(event) => setNoteUrl(event.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>ココナラURL</label>
                  <input value={coconalaUrl} onChange={(event) => setCoconalaUrl(event.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>過去投稿の参考</label>
                  <textarea value={pastPost} onChange={(event) => setPastPost(event.target.value)} rows={2} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>含めたいキーワード</label>
                  <input value={keywords} onChange={(event) => setKeywords(event.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>避けたい表現</label>
                  <input value={avoidPhrases} onChange={(event) => setAvoidPhrases(event.target.value)} className={inputCls} />
                </div>
              </div>
            </Section>

            <label className="flex items-center gap-2 rounded-lg border border-office-border bg-office-panel px-3 py-2.5 text-xs text-office-text">
              <input type="checkbox" checked={useBrandProfile} onChange={(event) => setUseBrandProfile(event.target.checked)} className="h-4 w-4" />
              ケイオス師匠ブランド設定を反映する
            </label>

            <button type="button" onClick={() => void handleGenerate()} disabled={busy} className={btnPrimary}>
              {busy ? "生成中..." : "文章を生成する"}
            </button>

            {result && (
              <Section title="生成結果" open={openSections.has("result")} onToggle={() => toggleSection("result")}>
                <div className="space-y-3">
                  <div className="rounded-lg border border-office-border bg-office-bg px-3 py-2.5 text-xs text-office-muted">
                    <p><span className="font-semibold text-office-text">対象読者:</span> {result.targetReader}</p>
                    <p className="mt-1"><span className="font-semibold text-office-text">狙い:</span> {result.writingGoal}</p>
                  </div>

                  {result.hookPoints.length > 0 && (
                    <div>
                      <p className={labelCls}>刺さるポイント</p>
                      <ul className="list-inside list-disc space-y-1 text-xs text-office-text">
                        {result.hookPoints.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <p className={labelCls}>完成文章</p>
                      <button type="button" onClick={() => void copyText(result.finalCopy)} className={`${btnSub} flex items-center gap-1`}>
                        <Copy size={12} /> コピー
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap rounded-lg border border-office-gold/40 bg-office-gold/5 px-3 py-3 text-sm leading-relaxed text-office-text">
                      {result.finalCopy}
                    </p>
                  </div>

                  {result.cta && (
                    <div>
                      <p className={labelCls}>CTA</p>
                      <p className="whitespace-pre-wrap rounded-lg border border-office-border bg-office-bg px-3 py-2.5 text-sm text-office-text">{result.cta}</p>
                    </div>
                  )}

                  {editedLayers && (
                    <div>
                      <p className={labelCls}>8層分析（編集できます。コピー用文章には含まれません）</p>
                      <div className="space-y-2">
                        {EIGHT_LAYER_FIELDS.map((field) => (
                          <div key={field.key}>
                            <label className="mb-0.5 block text-[10px] text-office-muted">{field.label}</label>
                            <textarea
                              value={editedLayers[field.key]}
                              onChange={(event) =>
                                setEditedLayers((prev) => (prev ? { ...prev, [field.key]: event.target.value } : prev))
                              }
                              rows={2}
                              className={inputCls}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
