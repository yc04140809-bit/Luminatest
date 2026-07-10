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

/**
 * AI編集レベル。どの程度文章に手を入れるかをユーザーが選ぶ。
 * layoutは「改行・見出し調整専用モード」（本文の意味・表現を一切変えない）を兼ねる。
 */
export const NOTE_EDIT_LEVELS = [
  {
    id: "layout",
    label: "レイアウトのみ",
    description: "文章は一切変えません。改行・見出し・箇条書き・強調だけ整えます。",
    changeAmount: "本文の変更: なし",
  },
  {
    id: "light",
    label: "軽く整える",
    description: "誤字脱字・句読点・改行・表現の微調整のみ。内容はほぼそのままです。",
    changeAmount: "本文の変更: ごくわずか",
  },
  {
    id: "readable",
    label: "読みやすくする",
    description: "見出し追加・改行最適化・文章分割・重複削除・箇条書き化を行います。",
    changeAmount: "本文の変更: 少なめ（標準）",
  },
  {
    id: "sellable",
    label: "売れる構成へ改善",
    description: "冒頭の引き込み・悩みの明確化・結論整理・CTA改善など構成に踏み込みます。",
    changeAmount: "本文の変更: 多め",
  },
  {
    id: "pro",
    label: "プロ編集者モード",
    description: "ストーリー設計・読者心理・離脱防止・販売導線まで全面的に再構成します。",
    changeAmount: "本文の変更: 大幅（原型が変わることがあります）",
  },
] as const;

export type NoteEditLevelId = (typeof NOTE_EDIT_LEVELS)[number]["id"];

/** 部分やり直し編集で選べる指示のプリセット。 */
export const NOTE_SECTION_INSTRUCTIONS = [
  "もっと短く",
  "もっと分かりやすく",
  "もっと感情を込める",
  "もっと具体的に",
  "もっと初心者向けに",
  "もっと販売向けに",
  "もっと自然な日本語に",
  "言い切りを弱める",
  "煽りすぎを抑える",
] as const;

export type NoteSectionInstruction = (typeof NOTE_SECTION_INSTRUCTIONS)[number];

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

/** note投稿前チェックリストの項目（固定10項目）。 */
export const NOTE_CHECKLIST_ITEMS = [
  "タイトルは内容と合っているか",
  "冒頭で読む理由が伝わっているか",
  "見出しが多すぎないか",
  "長すぎる段落がないか",
  "同じ内容の繰り返しがないか",
  "CTAが自然か",
  "誇大表現がないか",
  "根拠のない断定がないか",
  "有料部分への導線が自然か",
  "スマホで読みやすいか",
] as const;

export type NoteChecklistStatus = "ok" | "caution" | "fix";

export const NOTE_CHECKLIST_STATUS_LABELS: Record<NoteChecklistStatus, string> = {
  ok: "問題なし",
  caution: "注意",
  fix: "改善推奨",
};

export interface NoteChecklistEntry {
  item: string;
  status: NoteChecklistStatus;
  comment: string;
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
  /** 投稿前チェックリスト（固定10項目、診断呼び出しに相乗りして生成） */
  checklist?: NoteChecklistEntry[];
}

/** 宣伝投稿の切り口タイプ。 */
export const NOTE_PROMO_TYPES = [
  "共感型",
  "気づき型",
  "体験談型",
  "ノウハウ型",
  "実は型",
  "失敗談型",
  "続きはnote型",
] as const;

export interface NotePromoPost {
  /** 切り口タイプ（NOTE_PROMO_TYPESのいずれか） */
  type: string;
  text: string;
}

/** サムネイル案。スマホのデザインアプリ（Canva等）でそのまま再現できる言葉で提案する。 */
export interface NoteThumbnailIdea {
  /** サムネイルに載せる短いタイトル（13字前後） */
  title: string;
  /** 添えるキャッチコピー */
  catchCopy: string;
  /** デザイン構成（文字配置・背景イメージ） */
  layout: string;
  /** 配色（色の組み合わせと使いどころ） */
  colorScheme: string;
}

/** 宣伝パック。記事完成後にSNS導線をまとめて生成する。 */
export interface NotePromoPack {
  /** Threads投稿10本 */
  threads: NotePromoPost[];
  /** X投稿5本 */
  x: NotePromoPost[];
  /** Instagramキャプション3本 */
  instagram: NotePromoPost[];
  /** 短い告知文3本 */
  shortAnnouncements: string[];
  /** 記事紹介文 */
  articleIntro: string;
  /** プロフィール誘導文 */
  profileLead: string;
  /** 販売note用CTA */
  paidCta: string;
  /** 無料note用CTA */
  freeCta: string;
  /** サムネイル案3案（旧バージョンで保存したパックには無いことがある） */
  thumbnails?: NoteThumbnailIdea[];
}

/**
 * 参考構成テンプレート（一般的な構成パターン。特定の記事・他人の文章のコピーではない）。
 * クライアント側で骨組み挿入に使うほか、AI編集時に構成の指針としてプロンプトへ渡す。
 */
export const NOTE_STRUCTURE_TEMPLATES = [
  { id: "taiken", label: "体験談", outline: ["書き出し: 結果を先に見せる", "挑戦した理由・当時の状況", "実際にやったこと（時系列）", "うまくいったこと・数字", "失敗・想定外だったこと", "得た学び", "読者へのアドバイス"] },
  { id: "sidejob", label: "AI副業", outline: ["結論: 何で・どんな成果が出たか", "始めた理由", "具体的な手順（ステップ）", "必要な道具・費用", "つまずきポイントと回避策", "収益化までの現実的な期間", "最初の一歩の提案"] },
  { id: "knowhow", label: "ノウハウ", outline: ["この記事で出来るようになること", "前提・準備", "手順（見出しを分けて順番に）", "よくある失敗と対処", "応用・時短のコツ", "まとめとチェックリスト"] },
  { id: "review", label: "ツールレビュー", outline: ["結論: おすすめ度と一言評価", "ツールの概要（初心者向けに）", "良かった点（具体例つき）", "イマイチな点・注意点", "他ツールとの違い", "おすすめする人・しない人", "導入手順"] },
  { id: "failure", label: "失敗談", outline: ["何をやらかしたか（結論）", "当時の状況と判断", "失敗の経過", "原因の分析", "同じ失敗を避ける方法", "失敗から得たもの"] },
  { id: "compare", label: "比較記事", outline: ["結論: どちらがどんな人向けか", "比較対象の概要", "比較表（価格・機能・使いやすさ等）", "項目ごとの詳細比較", "使い分けの提案", "まとめ"] },
  { id: "beginner", label: "初心者向け解説", outline: ["これは何か（例え話で）", "なぜ今知っておくべきか", "基本の仕組み（専門用語なし）", "よくある誤解", "最初にやってみること", "つまずいた時の調べ方"] },
  { id: "paid", label: "有料note販売", outline: ["読者の悩みの言語化", "この記事で得られるもの（具体的に）", "著者の実績・根拠", "無料部分: 価値の一部を先に見せる", "（ここから有料）", "本編: 手順・データ・テンプレート", "購入者特典", "まとめとCTA"] },
  { id: "free2paid", label: "無料→有料導線", outline: ["無料で全部使える内容を1つ提供", "実際の結果・実例", "「ここから先はさらに深い内容」の予告", "有料noteで得られるものの明示", "読者の背中を押す一言（煽らない）"] },
  { id: "story", label: "ストーリー型", outline: ["場面から始める（情景描写）", "課題・葛藤の提示", "転機となった出来事", "変化の過程", "現在の状態", "読者への問いかけ・余韻"] },
] as const;

export type NoteStructureTemplateId = (typeof NOTE_STRUCTURE_TEMPLATES)[number]["id"];
