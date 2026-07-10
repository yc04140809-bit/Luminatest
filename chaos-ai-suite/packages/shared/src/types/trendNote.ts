/**
 * トレンドnote生成AI（Trend Research Note Generator）の型定義。
 * ボタン1つで最新トレンドをWeb検索で調査し、調査日・情報源・注目理由つきの
 * note記事とSNS告知文を生成する。処理は2回のAI呼び出しに固定:
 *   1回目 = リサーチ+テーマ3件提案（Web検索つき） / 2回目 = 選択テーマの記事一式生成。
 * 生成履歴はフロント側（localStorage "chaos-ai-suite:trend-notes"）に保存する。
 */

export const TREND_GENRES = [
  "AI",
  "Claude Code",
  "AI画像生成",
  "AIエージェント",
  "ノーコード開発",
  "副業",
  "SNS運用",
  "note販売",
] as const;

export const TREND_AUDIENCES = [
  "AI初心者",
  "副業初心者",
  "クリエイター",
  "個人事業主",
  "経営者",
  "エンジニア",
] as const;

export const TREND_PERIODS = [
  { id: "h24", label: "過去24時間" },
  { id: "d7", label: "過去7日間" },
  { id: "d30", label: "過去30日間" },
] as const;

export type TrendPeriodId = (typeof TREND_PERIODS)[number]["id"];

export const TREND_FORMATS = [
  "初心者向け解説",
  "トレンド紹介",
  "学習ガイド",
  "比較記事",
  "体験・検証型",
  "有料note導入記事",
] as const;

export const TREND_LENGTHS = [
  { id: "short", label: "約1,500文字", chars: 1500 },
  { id: "medium", label: "約3,000文字", chars: 3000 },
  { id: "long", label: "約5,000文字", chars: 5000 },
] as const;

export type TrendLengthId = (typeof TREND_LENGTHS)[number]["id"];

export const TREND_STYLES = [
  "親しみやすい",
  "専門的",
  "ケイオス師匠風",
  "シンプル",
  "熱量高め",
] as const;

/**
 * 相対評価の3段階。厳密な検索数などの数値が取得できないため、
 * 推測の数値を表示せず「高・中・低」で扱う（指示書の要件）。
 */
export const TREND_LEVELS = [
  { id: "high", label: "高" },
  { id: "mid", label: "中" },
  { id: "low", label: "低" },
] as const;

export type TrendLevelId = (typeof TREND_LEVELS)[number]["id"];

/** Web検索で見つけた情報源1件。 */
export interface TrendSource {
  title: string;
  url: string;
  sourceName: string;
  /** 公開日。不明な場合は「不明」 */
  publishedAt: string;
  /** この調査で取得した日時（ISO、サーバー側で付与） */
  retrievedAt: string;
  summary: string;
  /** ニュース/公式ブログ/技術ブログ/SNS/動画 など */
  platform: string;
  searchKeyword: string;
  /** 情報源の信頼性（相対評価） */
  reliability: TrendLevelId;
}

/** 提案されるトレンドテーマ1件。 */
export interface TrendTheme {
  title: string;
  /** 注目されている理由 */
  reason: string;
  targetReader: string;
  /** 記事の切り口 */
  angle: string;
  /** 推奨検索キーワード */
  searchKeywords: string[];
  /** 新しさ・検索需要・初心者需要・記事化しやすさ・収益化との相性（相対評価） */
  freshness: TrendLevelId;
  demand: TrendLevelId;
  beginnerFit: TrendLevelId;
  writability: TrendLevelId;
  monetizeFit: TrendLevelId;
  /** 総合スコア（0〜100、上記の相対評価をもとにした参考値） */
  totalScore: number;
  /** 注意事項（古い情報のリスク・要確認事項など） */
  cautions: string[];
}

/** リサーチ結果（1回目のAI呼び出しの出力）。 */
export interface TrendResearchResult {
  /** 調査日（YYYY-MM-DD、サーバー側で付与） */
  researchDate: string;
  themes: TrendTheme[];
  sources: TrendSource[];
  /** 調査全体の注意事項 */
  notes: string[];
}

/** ファクトチェックの分類5種。 */
export const FACT_CHECK_STATUSES = [
  { id: "verified", label: "確認済み" },
  { id: "multi", label: "複数情報源あり" },
  { id: "single", label: "単一情報源" },
  { id: "inference", label: "推測を含む" },
  { id: "check", label: "要確認" },
] as const;

export type FactCheckStatusId = (typeof FACT_CHECK_STATUSES)[number]["id"];

export interface FactCheckItem {
  claim: string;
  status: FactCheckStatusId;
}

/** タイトル案の狙い5種。 */
export const TITLE_TAGS = [
  "初心者向け",
  "保存されやすい",
  "クリック重視",
  "信頼重視",
  "有料note向け",
] as const;

export interface TrendTitleIdea {
  title: string;
  /** TITLE_TAGSのいずれか */
  tag: string;
}

/** SNS告知文一式。 */
export interface TrendSnsPosts {
  /** Threads短文 */
  threadsShort: string;
  /** Threadsツリー（1投稿=1要素） */
  threadsThread: string[];
  /** X投稿 */
  x: string[];
  /** Instagram紹介文 */
  instagram: string;
}

/** 記事生成結果（2回目のAI呼び出しの出力）。 */
export interface TrendArticleResult {
  title: string;
  /** note本文（Markdown、冒頭に調査日を含む） */
  body: string;
  hashtags: string[];
  titleIdeas: TrendTitleIdea[];
  sns: TrendSnsPosts;
  /** 記事内の主要な主張の分類 */
  factChecks: FactCheckItem[];
}

/** 生成履歴の状態5種。 */
export const TREND_NOTE_STATUSES = [
  { id: "draft", label: "下書き" },
  { id: "checked", label: "確認済み" },
  { id: "posted", label: "投稿済み" },
  { id: "hold", label: "保留" },
  { id: "rejected", label: "ボツ" },
] as const;

export type TrendNoteStatusId = (typeof TREND_NOTE_STATUSES)[number]["id"];

/** 生成1回分の保存レコード。 */
export interface TrendNoteRecord {
  id: string;
  createdAt: string;
  researchDate: string;
  genre: string;
  audience: string;
  period: TrendPeriodId;
  format: string;
  length: TrendLengthId;
  style: string;
  research?: TrendResearchResult;
  /** 選択したテーマのインデックス */
  selectedThemeIndex?: number;
  article?: TrendArticleResult;
  status: TrendNoteStatusId;
  /** ユーザーが編集した本文（元のarticle.bodyは保持したまま別管理） */
  userEdits?: string;
}
