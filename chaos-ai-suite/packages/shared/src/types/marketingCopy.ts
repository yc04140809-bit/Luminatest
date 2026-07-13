/**
 * 刺さるマーケティング生成・改善システムの型定義。
 * フェーズ1: 文章タイプ選択・生成モード選択・基本入力・8層入力・AI生成・コピー。
 * フェーズ2: 生成履歴の保存・刺さり診断（採点）・8層編集からの再生成。
 * テンプレート機能・投稿結果分析はフェーズ3以降で追加する。
 */

/** 生成できる文章タイプ。プロンプトへの長さ・形式ガイダンスを併記する。 */
export const MARKETING_COPY_TYPES = [
  { id: "threads", label: "Threads投稿", guidance: "300〜500文字目安。2〜3行ごとに改行し、スマホで読みやすくする。" },
  { id: "x", label: "X投稿", guidance: "140字前後を目安に、1〜2文で完結させる。" },
  { id: "instagram", label: "Instagramキャプション", guidance: "改行を活かし、最初の1〜2行で惹きつける。" },
  { id: "note_title", label: "note記事タイトル", guidance: "具体的で自分ごと化できるタイトルを3〜5案。" },
  { id: "note_intro", label: "note記事導入文", guidance: "読者の場面描写から始め、読み進める理由で締める。" },
  { id: "note_body", label: "note記事本文", guidance: "見出しを使い、スマホで読みやすい段落の長さにする。" },
  { id: "note_cta", label: "note記事CTA", guidance: "押し売りせず、自然に次の行動へ促す2〜3文。" },
  { id: "coconala_title", label: "ココナラ出品タイトル", guidance: "誰向け・何ができるかが一目で分かる短いタイトル。" },
  { id: "coconala_body", label: "ココナラ出品説明文", guidance: "対象者・悩み・内容・注意事項・CTAの順で構成する。" },
  { id: "product_desc", label: "商品説明文", guidance: "得られる変化を中心に、誇張のない具体的な内容説明。" },
  { id: "sales_page", label: "セールスページ", guidance: "対象者・悩み・未来・不安解消・内容・CTAを長文で構成。" },
  { id: "lp", label: "ランディングページ", guidance: "見出し単位で要点を区切り、スクロールしやすくする。" },
  { id: "profile", label: "プロフィール", guidance: "短い自己紹介＋実践者としての立ち位置＋導線を簡潔に。" },
  { id: "pinned_post", label: "固定投稿", guidance: "初見の読者向けに、悩み・実践内容・導線をまとめる。" },
  { id: "self_intro", label: "自己紹介", guidance: "経歴を誇張せず、現在地と挑戦していることを中心に。" },
  { id: "app_intro", label: "アプリ紹介", guidance: "できること・対象者・使い方の手軽さを短く伝える。" },
  { id: "service_intro", label: "サービス紹介", guidance: "サービス内容・対象者・受けられる変化を簡潔に。" },
  { id: "free_consult", label: "無料相談への誘導文", guidance: "気軽さと安心感を伝え、ハードルを下げる。" },
  { id: "comment_reply", label: "コメント返信", guidance: "1〜3文。相手の言葉を受け止めてから答える。" },
  { id: "dm_reply", label: "DM返信", guidance: "丁寧だが堅すぎない、会話のような文体。" },
  { id: "email", label: "メール文章", guidance: "件名＋本文。要件を簡潔にしつつ、人柄も少し伝える。" },
  { id: "catch_copy", label: "キャッチコピー", guidance: "短く、読者の内側の言葉に近い表現を3〜5案。" },
  { id: "concept", label: "商品コンセプト", guidance: "誰の・どんな悩みを・どう解決するかを1〜2文で。" },
  { id: "post_idea", label: "投稿ネタ", guidance: "テーマに沿った投稿ネタ案を箇条書きで複数案。" },
  { id: "hook", label: "フック（冒頭一文）", guidance: "読者が「自分のことだ」と思う最初の一文を複数案。" },
  { id: "cta", label: "CTA", guidance: "押し売りしない一文〜二文のCTAを複数案。" },
  { id: "sales_flow", label: "販売導線の文章", guidance: "SNS→固定投稿→プロフィール→商品への流れを短く説明。" },
  { id: "comparison_table", label: "比較表（テキスト）", guidance: "項目と内容を簡潔な箇条書き・表形式のテキストで。" },
  { id: "faq", label: "FAQ", guidance: "よくある質問と回答を3〜6組、簡潔に。" },
  { id: "anxiety_answer", label: "よくある不安への回答", guidance: "読者の不安を否定せず、現実的な言葉で解消する。" },
] as const;

export type MarketingCopyTypeId = (typeof MARKETING_COPY_TYPES)[number]["id"];

/** 生成モード。F（添削・改善）はフェーズ2で追加予定。 */
export const MARKETING_COPY_MODES = [
  { id: "gentle", label: "やさしく共感", description: "読者の気持ちを丁寧に代弁し、安心感を重視する。" },
  { id: "deep", label: "深く刺す", description: "具体的な場面・感情・本音まで踏み込む（人格否定はしない）。" },
  { id: "soft_sell", label: "売り込まずに売る", description: "体験・共感・気づきを中心にし、最後に自然な導線を置く。" },
  { id: "hard_sell", label: "販売重視", description: "対象者・悩み・得られる未来・不安解消・内容・CTAを明確にする。" },
  { id: "chaos_style", label: "ケイオス師匠らしさ重視", description: "失敗・挑戦・初心者目線・介護職・スマホ運用のリアルを反映する。" },
] as const;

export type MarketingCopyModeId = (typeof MARKETING_COPY_MODES)[number]["id"];

/** 刺さるマーケティング8層。ユーザー入力があれば尊重し、なければAIが自然に補完する。 */
export const EIGHT_LAYER_FIELDS = [
  { key: "surfaceProblem", label: "表面の悩み", placeholder: "例：売れない、フォロワーが増えない" },
  { key: "realScene", label: "現実の場面", placeholder: "例：投稿後に何度も閲覧数を確認する" },
  { key: "emotion", label: "感情", placeholder: "例：焦り、恥ずかしさ、悔しさ" },
  { key: "hiddenTruth", label: "認めたくない本音", placeholder: "例：自分には才能がないのかもしれない" },
  { key: "futureIfIgnored", label: "放置した先の未来", placeholder: "例：別のAIツールを買い続ける" },
  { key: "trueDesire", label: "本当の願望", placeholder: "例：今日中に1つ完成させたい" },
  { key: "blockers", label: "動けない理由", placeholder: "例：難しそう、また失敗しそう" },
  { key: "firstStep", label: "最初の小さな一歩", placeholder: "例：テンプレを1つコピーする" },
] as const;

export type EightLayerKey = (typeof EIGHT_LAYER_FIELDS)[number]["key"];

export type EightLayerValues = Partial<Record<EightLayerKey, string>>;

/** 生成リクエスト。必須4項目＋8層＋その他の任意項目。 */
export interface MarketingCopyRequest {
  copyType: MarketingCopyTypeId;
  mode: MarketingCopyModeId;
  theme: string;
  audience: string;
  audienceProblem: string;
  offer: string;
  eightLayers?: EightLayerValues;
  experience?: string;
  charLength?: string;
  tone?: string;
  salesIntensity?: string;
  snsPlatform?: string;
  productUrl?: string;
  noteUrl?: string;
  coconalaUrl?: string;
  pastPost?: string;
  keywords?: string;
  avoidPhrases?: string;
  useBrandProfile?: boolean;
}

/** 生成結果。出力順は 対象読者→狙い→刺さるポイント→完成文章→CTA→8層分析。 */
export interface MarketingCopyResult {
  targetReader: string;
  writingGoal: string;
  hookPoints: string[];
  finalCopy: string;
  cta: string;
  eightLayers: Record<EightLayerKey, string>;
}

/** 再生成（改善ボタン）のプリセット指示。自由入力との併用も可能。 */
export const MARKETING_COPY_REVISION_PRESETS = [
  "もっと深く刺す",
  "やさしくする",
  "売り込みを弱くする",
  "販売力を強くする",
  "短くする",
  "長くする",
] as const;

/** 再生成リクエスト。直前の完成文章・編集済み8層・指示を渡し、同じ結果形式で受け取る。 */
export interface MarketingCopyRevisionRequest {
  copyType: MarketingCopyTypeId;
  mode: MarketingCopyModeId;
  theme: string;
  audience: string;
  audienceProblem: string;
  offer: string;
  previousCopy: string;
  eightLayers: Record<EightLayerKey, string>;
  instruction: string;
  useBrandProfile?: boolean;
}

/** 刺さり診断の採点項目。各0〜10点、合計100点満点。 */
export const MARKETING_SCORE_FIELDS = [
  { key: "audienceClarity", label: "誰向けか明確か" },
  { key: "sceneVividness", label: "日常の場面が見えるか" },
  { key: "emotionalResonance", label: "感情が伝わるか" },
  { key: "hiddenTruthDepth", label: "認めたくない本音まで届いているか" },
  { key: "noBlame", label: "読者を責めていないか" },
  { key: "trueDesireClarity", label: "本当の願望が見えるか" },
  { key: "blockerResolution", label: "行動できない理由を解消しているか" },
  { key: "firstStepConcrete", label: "最初の一歩が具体的か" },
  { key: "chaosStyle", label: "ケイオス師匠らしさがあるか" },
  { key: "uniqueness", label: "他の人でも書ける文章になっていないか" },
] as const;

export type MarketingScoreKey = (typeof MARKETING_SCORE_FIELDS)[number]["key"];

/** 刺さり診断リクエスト。診断対象の文章と、診断の手がかりになる文脈を渡す。 */
export interface MarketingCopyDiagnoseRequest {
  copyType: MarketingCopyTypeId;
  audience: string;
  audienceProblem: string;
  finalCopy: string;
}

/** 刺さり診断結果。点数だけで終わらせず、良い点・原因・優先順位・改善版まで返す。 */
export interface MarketingCopyDiagnosis {
  scores: Record<MarketingScoreKey, number>;
  totalScore: number;
  goodPoints: string[];
  problems: string[];
  priorityFixes: string[];
  beforeAfter: { before: string; after: string };
  improvedCopy: string;
  extraTip: string;
}

/** 生成履歴1件分。localStorageへ保存する（サーバーには保存しない）。 */
export interface MarketingCopyHistoryEntry {
  id: string;
  createdAt: string;
  request: MarketingCopyRequest;
  result: MarketingCopyResult;
  diagnosis?: MarketingCopyDiagnosis;
}
