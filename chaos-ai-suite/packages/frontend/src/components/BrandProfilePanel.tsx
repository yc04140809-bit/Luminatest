import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Eye, Power, PowerOff, RotateCcw, Save } from "lucide-react";
import type { BrandProfile, BrandProfileUpdateInput } from "@chaos-ai-suite/shared";
import { resetBrandProfile, updateBrandProfile } from "../api/officeApi.js";

interface BrandProfilePanelProps {
  brandProfile: BrandProfile;
}

interface FormState {
  name: string;
  brandStatement: string;
  brandTypes: string;
  worldview: string;
  targetAudienceText: string;
  audienceProblemsText: string;
  providedValueText: string;
  beliefsText: string;
  enemiesText: string;
  contentPillarsText: string;
  toneRulesText: string;
  postStructureText: string;
  trustFlowText: string;
  salesFlowText: string;
  softCtaExamplesText: string;
  prohibitedExpressionsText: string;
}

function toFormState(profile: BrandProfile): FormState {
  return {
    name: profile.name,
    brandStatement: profile.brandStatement,
    brandTypes: profile.brandTypes,
    worldview: profile.worldview,
    targetAudienceText: profile.targetAudience.join("\n"),
    audienceProblemsText: profile.audienceProblems.join("\n"),
    providedValueText: profile.providedValue.join("\n"),
    beliefsText: profile.beliefs.join("\n"),
    enemiesText: profile.enemies.join("\n"),
    contentPillarsText: profile.contentPillars.join("\n"),
    toneRulesText: profile.toneRules.join("\n"),
    postStructureText: profile.postStructure.join("\n"),
    trustFlowText: profile.trustFlow.join("\n"),
    salesFlowText: profile.salesFlow.join("\n"),
    softCtaExamplesText: profile.softCtaExamples.join("\n"),
    prohibitedExpressionsText: profile.prohibitedExpressions.join("\n"),
  };
}

function toLines(text: string): string[] {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

function toUpdateInput(form: FormState): BrandProfileUpdateInput {
  return {
    name: form.name.trim() || "ケイオス師匠",
    brandStatement: form.brandStatement,
    brandTypes: form.brandTypes,
    worldview: form.worldview,
    targetAudience: toLines(form.targetAudienceText),
    audienceProblems: toLines(form.audienceProblemsText),
    providedValue: toLines(form.providedValueText),
    beliefs: toLines(form.beliefsText),
    enemies: toLines(form.enemiesText),
    contentPillars: toLines(form.contentPillarsText),
    toneRules: toLines(form.toneRulesText),
    postStructure: toLines(form.postStructureText),
    trustFlow: toLines(form.trustFlowText),
    salesFlow: toLines(form.salesFlowText),
    softCtaExamples: toLines(form.softCtaExamplesText),
    prohibitedExpressions: toLines(form.prohibitedExpressionsText),
  };
}

const inputCls = "w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted";
const labelCls = "mb-1 block text-[11px] font-semibold text-office-muted";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {hint && <p className="mb-1 text-[10px] text-office-muted">{hint}</p>}
      {children}
    </div>
  );
}

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <div className="rounded-lg border border-office-border bg-office-bg">
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-office-text">
        {title}
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="space-y-2.5 border-t border-office-border p-3">{children}</div>}
    </div>
  );
}

/**
 * ケイオス師匠ブランド設定画面。SNS投稿・note記事・商品紹介文などの生成時に自動反映される
 * ブランド情報（読者・トーン・導線など）を確認・編集できる。保存はサーバー側OfficeStoreへ行い、
 * 配色設定と同じ経路（PATCH /api/brand-profile → WebSocket → 全画面へ反映）で共有される。
 */
export function BrandProfilePanel({ brandProfile }: BrandProfilePanelProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(brandProfile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [preview, setPreview] = useState(false);

  // 保存・初期化(reset)はサーバー経由でWebSocketに反映されるため、
  // 更新のたびにフォームをサーバー側の最新値へ同期する（resetボタンの表示反映に必要）。
  useEffect(() => {
    setForm(toFormState(brandProfile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandProfile.updatedAt]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      await updateBrandProfile(toUpdateInput(form));
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEnabled(): Promise<void> {
    setError(null);
    try {
      await updateBrandProfile({ enabled: !brandProfile.enabled });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleReset(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      await resetBrandProfile();
      setConfirmReset(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const pinnedPostPreview = [
    `${form.name}です。${form.brandTypes.split("\n")[0] ?? ""}`,
    toLines(form.targetAudienceText).length > 0 ? `こんな方に向けて発信しています：\n${toLines(form.targetAudienceText).map((line) => `・${line}`).join("\n")}` : "",
    toLines(form.providedValueText).length > 0 ? `届けたいこと：\n${toLines(form.providedValueText).map((line) => `・${line}`).join("\n")}` : "",
    toLines(form.contentPillarsText).length > 0 ? `発信テーマ：${toLines(form.contentPillarsText).slice(0, 5).join(" / ")}` : "",
    toLines(form.salesFlowText).length > 0 ? toLines(form.softCtaExamplesText)[0] ?? "詳しくは固定投稿・プロフィールをご覧ください。" : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const profileTextPreview = [form.brandStatement, toLines(form.contentPillarsText).slice(0, 3).join(" / ")].filter(Boolean).join("\n");

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-office-text">ケイオス師匠ブランド</h3>
          <p className="text-[11px] text-office-muted">SNS投稿・note記事・商品紹介文の生成時に自動で反映されます。</p>
        </div>
        <button
          type="button"
          onClick={() => void handleToggleEnabled()}
          className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            brandProfile.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-office-border/60 text-office-muted"
          }`}
        >
          {brandProfile.enabled ? <Power size={12} /> : <PowerOff size={12} />}
          {brandProfile.enabled ? "有効" : "無効"}
        </button>
      </div>

      {!brandProfile.enabled && (
        <p className="rounded-lg border border-office-border bg-office-bg px-3 py-2 text-[11px] text-office-muted">
          現在ブランド設定は無効です。各生成画面のチェックがONでも、ブランド設定は反映されません。
        </p>
      )}

      <Field label="ブランド名">
        <input value={form.name} onChange={(event) => set("name", event.target.value)} className={inputCls} />
      </Field>

      <Section title="ブランド軸・タイプ・世界観" defaultOpen>
        <Field label="ブランド軸" hint="どんな人に、何を、どう届けるかを1〜2文で">
          <textarea value={form.brandStatement} onChange={(event) => set("brandStatement", event.target.value)} rows={3} className={inputCls} />
        </Field>
        <Field label="ブランドタイプ・立ち位置">
          <textarea value={form.brandTypes} onChange={(event) => set("brandTypes", event.target.value)} rows={3} className={inputCls} />
        </Field>
        <Field label="世界観">
          <textarea value={form.worldview} onChange={(event) => set("worldview", event.target.value)} rows={4} className={inputCls} />
        </Field>
      </Section>

      <Section title="読者と価値（1行1項目）">
        <Field label="主な読者">
          <textarea value={form.targetAudienceText} onChange={(event) => set("targetAudienceText", event.target.value)} rows={5} className={inputCls} />
        </Field>
        <Field label="読者の悩み">
          <textarea value={form.audienceProblemsText} onChange={(event) => set("audienceProblemsText", event.target.value)} rows={5} className={inputCls} />
        </Field>
        <Field label="提供する価値">
          <textarea value={form.providedValueText} onChange={(event) => set("providedValueText", event.target.value)} rows={5} className={inputCls} />
        </Field>
      </Section>

      <Section title="信じること・避けること（1行1項目）">
        <Field label="信じること">
          <textarea value={form.beliefsText} onChange={(event) => set("beliefsText", event.target.value)} rows={4} className={inputCls} />
        </Field>
        <Field label="避けること">
          <textarea value={form.enemiesText} onChange={(event) => set("enemiesText", event.target.value)} rows={4} className={inputCls} />
        </Field>
      </Section>

      <Section title="発信テーマ・文章トーン（1行1項目）">
        <Field label="発信テーマ">
          <textarea value={form.contentPillarsText} onChange={(event) => set("contentPillarsText", event.target.value)} rows={5} className={inputCls} />
        </Field>
        <Field label="文章トーン">
          <textarea value={form.toneRulesText} onChange={(event) => set("toneRulesText", event.target.value)} rows={5} className={inputCls} />
        </Field>
      </Section>

      <Section title="投稿構造・心理の流れ（1行1項目）">
        <Field label="投稿生成の基本構造" hint="順番通りに1行ずつ">
          <textarea value={form.postStructureText} onChange={(event) => set("postStructureText", event.target.value)} rows={6} className={inputCls} />
        </Field>
        <Field label="買われる心理の流れ" hint="順番通りに1行ずつ">
          <textarea value={form.trustFlowText} onChange={(event) => set("trustFlowText", event.target.value)} rows={6} className={inputCls} />
        </Field>
      </Section>

      <Section title="販売導線・禁止表現（1行1項目）">
        <Field label="販売導線" hint="順番通りに1行ずつ">
          <textarea value={form.salesFlowText} onChange={(event) => set("salesFlowText", event.target.value)} rows={7} className={inputCls} />
        </Field>
        <Field label="弱い誘導の例文">
          <textarea value={form.softCtaExamplesText} onChange={(event) => set("softCtaExamplesText", event.target.value)} rows={4} className={inputCls} />
        </Field>
        <Field label="避けるべき強い表現">
          <textarea value={form.prohibitedExpressionsText} onChange={(event) => set("prohibitedExpressionsText", event.target.value)} rows={5} className={inputCls} />
        </Field>
      </Section>

      {error && <p className="text-xs text-red-400">保存に失敗しました: {error}</p>}
      {saved && !error && <p className="text-xs text-emerald-400">保存しました。</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Save size={14} /> {saving ? "保存中..." : "保存する"}
        </button>
        <button
          type="button"
          onClick={() => setPreview((prev) => !prev)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-office-border px-3 py-2.5 text-xs font-semibold text-office-text"
        >
          <Eye size={14} /> プレビュー
        </button>
      </div>

      {preview && (
        <div className="space-y-2 rounded-lg border border-office-border bg-office-bg p-3 text-[11px] text-office-text">
          <p className="font-semibold text-office-gold">固定投稿プレビュー（自動組み立て・AI不使用）</p>
          <p className="whitespace-pre-wrap">{pinnedPostPreview || "（入力内容が少ないため生成できません）"}</p>
          <p className="mt-2 font-semibold text-office-gold">プロフィール文プレビュー（自動組み立て・AI不使用）</p>
          <p className="whitespace-pre-wrap">{profileTextPreview || "（入力内容が少ないため生成できません）"}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setConfirmReset(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-office-border px-3 py-2 text-xs text-office-muted transition hover:border-red-400 hover:text-red-400"
      >
        <RotateCcw size={12} /> 初期設定（ケイオス師匠ブランド）に戻す
      </button>

      {confirmReset && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm rounded-xl border border-red-500/50 bg-office-panel p-5">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-400">
              <AlertTriangle size={16} /> 確認
            </h4>
            <p className="mb-4 text-xs leading-relaxed text-office-text">
              現在編集中の内容を破棄し、ブランド設定を初期値（ケイオス師匠ブランド）に戻します。よろしいですか？
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmReset(false)} className="flex-1 rounded-lg border border-office-border px-3 py-2.5 text-sm font-semibold text-office-text">
                キャンセル
              </button>
              <button type="button" onClick={() => void handleReset()} className="flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white">
                戻す
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
