/**
 * AI Note Editor（売れるnote編集AI）の型定義。
 * MVPは「AI編集（構成整理・改行・見出し・強調・箇条書き）」「読みやすさ診断」「離脱ポイント分析」
 * 「タイトル案」「CTA提案」「noteプレビュー」「Markdown書き出し」をカバーする。
 * 将来機能（サムネ案・Threads/X/Instagram導線・他プラットフォーム出力）も
 * この /api/note/* 系統に同じパターンで追加していく。
 */

/** 編集モード。プロンプトに注入する編集方針のプリセット。 */
export const NOTE_EDIT_MODES = [
  { id: "sidejob", label: "AI副業向け", policy: "収益化・再現性・具体的な手順を重視。読者が「自分にもできる」と感じる構成にする。" },
  { id: "beginner", label: "初心者向け", policy: "専門用語を避け、例え話を多用。1文を短く、置いていかれる読者を出さない。" },
  { id: "business", label: "ビジネス向け", policy: "結論ファースト。論理構成と数字の根拠を重視し、無駄な感情表現を削る。" },
  { id: "story", label: "ストーリー重視", policy: "時系列と感情の起伏を活かす。場面転換を見出しにし、没入感を優先する。" },
  { id: "experience", label: "体験談重視", policy: "一次体験の解像度を最優先。実際の数字・失敗・気付きを前に出し、一般論を削る。" },
  { id: "education", label: "教育向け", policy: "学習順序を整理し、前提→本論→演習→まとめの流れ。要点の反復を入れる。" },
  { id: "sales", label: "販売向け", policy: "ベネフィット→証拠→不安の解消→CTAの流れ。煽らず信頼を損なわない表現にする。" },
  { id: "seo", label: "SEO重視", policy: "検索意図に合う見出し（疑問形・キーワード含み）。結論を早く出し、網羅性を高める。" },
  { id: "fan", label: "ファン化重視", policy: "人柄と価値観が伝わる表現を残す。完璧さより親近感。次も読みたくなる余韻を作る。" },
] as const;

export type NoteEditModeId = (typeof NOTE_EDIT_MODES)[number]["id"];

/** AI編集の結果。 */
export interface NoteEditResult {
  /** note向けに整形済みのMarkdown本文（見出し・改行・太字・箇条書き適用済み） */
  editedMarkdown: string;
  /** 何をどう編集したかの要約（ユーザーが編集内容を把握・学習できるように） */
  changeSummary: string[];
  /** 太字・引用として強調した箇所の抜粋と理由 */
  highlights: { excerpt: string; kind: "bold" | "quote"; reason: string }[];
}

/** 読みやすさ診断の採点項目。 */
export const NOTE_SCORE_KEYS = [
  "readability",
  "hook",
  "retention",
  "empathy",
  "saveability",
  "clarity",
  "ctaStrength",
] as const;

export type NoteScoreKey = (typeof NOTE_SCORE_KEYS)[number];

export const NOTE_SCORE_LABELS: Record<NoteScoreKey, string> = {
  readability: "読みやすさ",
  hook: "冒頭の引き込み",
  retention: "最後まで読まれる可能性",
  empathy: "共感性",
  saveability: "保存されやすさ",
  clarity: "分かりやすさ",
  ctaStrength: "CTAの強さ",
};

/** 読者が離脱しそうな箇所の指摘。 */
export interface NoteDropoffPoint {
  /** 該当箇所の抜粋（先頭20〜40文字程度） */
  excerpt: string;
  reason: string;
  fix: string;
}

/** タイトル候補。 */
export interface NoteTitleCandidate {
  title: string;
  /** クリックされやすさの根拠（どの心理に効くか） */
  appeal: string;
}

/** 読みやすさ診断＋改善提案の結果。 */
export interface NoteAnalysisResult {
  /** 各項目0〜100点。記事構成をもとにした参考指標であり、実際の成果を保証するものではない。 */
  scores: Record<NoteScoreKey, number>;
  /** 7項目の平均（0〜100） */
  overallScore: number;
  improvements: string[];
  dropoffPoints: NoteDropoffPoint[];
  /** タイトル候補10案 */
  titleCandidates: NoteTitleCandidate[];
  /** 記事内容に合う自然なCTA提案（フォロー・スキ・次の記事など） */
  ctaSuggestions: string[];
}
