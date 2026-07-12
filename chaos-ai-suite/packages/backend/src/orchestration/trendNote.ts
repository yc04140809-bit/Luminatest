import {
  FACT_CHECK_STATUSES,
  TREND_LEVELS,
  type Agent,
  type FactCheckItem,
  type TrendArticleResult,
  type TrendLevelId,
  type TrendResearchResult,
  type TrendSource,
  type TrendTheme,
} from "@chaos-ai-suite/shared";
import type { LlmClient } from "./llmClient.js";

/**
 * トレンドnote生成AIの処理。AI呼び出しは2回に固定:
 *   1. researchTrendTopics — Web検索（Anthropicサーバーツール・最大5回検索）を含む1回の呼び出しで
 *      トレンド候補3件＋情報源＋注意事項まで生成
 *   2. generateTrendArticle — 選択された1テーマから記事本文・SNS告知・タイトル10案・
 *      ファクトチェック分類まで1回のツール強制呼び出しで生成（検索なし・調査結果を再利用）
 * 数値の検索需要などは取得できないため「高・中・低」の相対評価で扱い、推測の数値は出さない。
 */

const RESEARCH_MAX_TOKENS = 8000;
const RESEARCH_MAX_SEARCHES = 5;
const ARTICLE_MAX_TOKENS = 16000;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

function level(value: unknown): TrendLevelId {
  return TREND_LEVELS.some((entry) => entry.id === value) ? (value as TrendLevelId) : "mid";
}

function clampScore(value: unknown): number {
  const num = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 50;
  return Math.max(0, Math.min(100, num));
}

/** 1回目: Web検索つきリサーチ。テーマ3件・情報源・注意事項をまとめて返す。 */
export async function researchTrendTopics(params: {
  agent: Agent;
  genre: string;
  audience: string;
  periodLabel: string;
  llm: LlmClient;
}): Promise<TrendResearchResult> {
  const { agent, llm } = params;
  if (!llm.callToolWithWebSearch) {
    throw new Error("このサーバーはWeb検索つき呼び出しに対応していません。");
  }

  const now = new Date();
  const researchDate = now.toISOString().slice(0, 10);

  const userPrompt = `あなたは最新トレンドを調査してnote記事のテーマを提案するリサーチAIです。
本日の日付は ${researchDate} です。

# 調査条件
- ジャンル: ${params.genre}
- 想定読者: ${params.audience}
- 調査期間: ${params.periodLabel}の話題を優先する

# 手順
1. web_searchツールで最新情報を調査する（最大${RESEARCH_MAX_SEARCHES}回。検索語を変えて複数の角度から調べる）
2. 検索結果から「今学ぶ価値がある」記事テーマ候補を3件に絞る
3. 必ず最後に submit_trend_research ツールで結果を提出する

# 絶対ルール
- 検索結果（情報源）に書かれていない内容を事実として書かない
- 各情報源の公開日が確認できない場合は publishedAt を「不明」とする
- 「流行している」と断定するには複数の情報源が必要。単一情報源なら注意事項に書く
- 検索数などの厳密な数値は取得できないため、評価は high / mid / low の相対評価にする。推測の数値を作らない
- 調査期間より明らかに古い情報をトレンドとして扱わない（参考として使う場合はその旨を書く）
- テーマは3件。それぞれ切り口を変える（同じ話題の言い換え3つにしない）
- totalScoreは相対評価をもとにした参考値（0〜100）であり、成果を保証しない`;

  const result = await llm.callToolWithWebSearch<Record<string, unknown>>({
    systemPrompt: agent.systemPrompt,
    userPrompt,
    model: agent.model.model,
    temperature: agent.model.temperature,
    maxTokens: RESEARCH_MAX_TOKENS,
    maxSearches: RESEARCH_MAX_SEARCHES,
    toolName: "submit_trend_research",
    toolDescription: "トレンド調査の結果（テーマ候補3件・情報源・注意事項）を記録する",
    toolSchema: {
      properties: {
        themes: {
          type: "array",
          description: "記事テーマ候補3件",
          minItems: 3,
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "テーマ名" },
              reason: { type: "string", description: "注目されている理由（情報源に基づく）" },
              targetReader: { type: "string", description: "想定読者" },
              angle: { type: "string", description: "記事の切り口" },
              searchKeywords: { type: "array", items: { type: "string" }, description: "推奨検索キーワード" },
              freshness: { type: "string", enum: ["high", "mid", "low"], description: "新しさ" },
              demand: { type: "string", enum: ["high", "mid", "low"], description: "検索需要（相対評価）" },
              beginnerFit: { type: "string", enum: ["high", "mid", "low"], description: "初心者需要" },
              writability: { type: "string", enum: ["high", "mid", "low"], description: "記事化しやすさ" },
              monetizeFit: { type: "string", enum: ["high", "mid", "low"], description: "収益化との相性" },
              totalScore: { type: "number", description: "総合スコア0〜100（参考値）" },
              cautions: { type: "array", items: { type: "string" }, description: "注意事項" },
            },
            required: [
              "title", "reason", "targetReader", "angle", "searchKeywords",
              "freshness", "demand", "beginnerFit", "writability", "monetizeFit", "totalScore", "cautions",
            ],
          },
        },
        sources: {
          type: "array",
          description: "調査で使った情報源（検索結果から）",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              url: { type: "string" },
              sourceName: { type: "string", description: "サイト名・媒体名" },
              publishedAt: { type: "string", description: "公開日。不明なら「不明」" },
              summary: { type: "string", description: "この情報源の要点（1〜2文）" },
              platform: { type: "string", description: "ニュース/公式ブログ/技術ブログ/SNS/動画 など" },
              searchKeyword: { type: "string", description: "この情報源を見つけた検索語" },
              reliability: { type: "string", enum: ["high", "mid", "low"], description: "信頼性（公式>大手メディア>個人）" },
            },
            required: ["title", "url", "sourceName", "publishedAt", "summary", "platform", "searchKeyword", "reliability"],
          },
        },
        notes: { type: "array", items: { type: "string" }, description: "調査全体の注意事項" },
      },
      required: ["themes", "sources", "notes"],
    },
  });

  const retrievedAt = now.toISOString();
  const themes: TrendTheme[] = (Array.isArray(result.themes) ? result.themes : []).map((entry) => {
    const raw = entry as Record<string, unknown>;
    return {
      title: str(raw.title, "（無題のテーマ）"),
      reason: str(raw.reason, "不明"),
      targetReader: str(raw.targetReader, params.audience),
      angle: str(raw.angle, ""),
      searchKeywords: arr(raw.searchKeywords),
      freshness: level(raw.freshness),
      demand: level(raw.demand),
      beginnerFit: level(raw.beginnerFit),
      writability: level(raw.writability),
      monetizeFit: level(raw.monetizeFit),
      totalScore: clampScore(raw.totalScore),
      cautions: arr(raw.cautions),
    };
  });

  const sources: TrendSource[] = (Array.isArray(result.sources) ? result.sources : []).map((entry) => {
    const raw = entry as Record<string, unknown>;
    return {
      title: str(raw.title, "（無題）"),
      url: str(raw.url, ""),
      sourceName: str(raw.sourceName, "不明"),
      publishedAt: str(raw.publishedAt, "不明"),
      retrievedAt,
      summary: str(raw.summary, ""),
      platform: str(raw.platform, "不明"),
      searchKeyword: str(raw.searchKeyword, ""),
      reliability: level(raw.reliability),
    };
  });

  if (themes.length === 0) {
    throw new Error("トレンドテーマを生成できませんでした。もう一度お試しください。");
  }
  if (sources.length < 2) {
    throw new Error(
      "信頼できる情報が不足しているため、記事生成を停止しました。検索期間またはキーワードを変更してください。",
    );
  }

  return { researchDate, themes, sources, notes: arr(result.notes) };
}

/** 情報源一覧をプロンプト用テキストに変換する。 */
function sourcesToText(sources: TrendSource[]): string {
  return sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title}\n  媒体: ${source.sourceName}（${source.platform}） / 公開日: ${source.publishedAt} / 信頼性: ${source.reliability}\n  URL: ${source.url}\n  要点: ${source.summary}`,
    )
    .join("\n");
}

/** 2回目: 選択テーマから記事一式を生成（検索なし・1回のツール強制呼び出し）。 */
export async function generateTrendArticle(params: {
  agent: Agent;
  theme: TrendTheme;
  sources: TrendSource[];
  researchDate: string;
  genre: string;
  audience: string;
  format: string;
  lengthChars: number;
  style: string;
  llm: LlmClient;
}): Promise<TrendArticleResult> {
  const { agent, theme, llm } = params;

  const userPrompt = `以下の調査結果をもとに、noteへそのまま投稿できる記事一式を作ってください。

# 記事テーマ
${theme.title}
- 注目されている理由: ${theme.reason}
- 切り口: ${theme.angle}
- 想定読者: ${params.audience}
- 記事形式: ${params.format}
- 目標文字数: 約${params.lengthChars}文字
- 文体: ${params.style}
- テーマの注意事項: ${theme.cautions.join(" / ") || "（なし）"}

# 調査日
${params.researchDate}

# 情報源（この内容だけを事実として使う）
${sourcesToText(params.sources)}

# 記事の構成（bodyに含める・Markdown見出しを使う）
冒頭に「※ この記事は${params.researchDate}時点の調査に基づいています。」を入れる
→ 導入 → なぜ今学ぶべきか → 初心者向け説明 → 調べるべきポイント → 実践方法 → 注意点 → まとめ → 次回予告
※ 記事形式・文字数に応じて見出しの粒度は調整してよいが、調査日表記と注意点・まとめは必ず入れる

# 絶対ルール
- 情報源にない事実を追加しない。推測は「〜の可能性があります」と表現する
- 公開日が不明な情報を使う場合は本文中でその旨に触れる
- 「流行している」と断定するのは複数の情報源があるものだけ
- サービスの料金・仕様・法律については断定せず「公式サイトで最新情報を確認してください」と添える
- 他人の記事の文章をコピーしない。引用は必要最小限にし、独自の説明・整理・意見・学習手順を中心にする
- スマホで読みやすいよう、段落は2〜3行ごとに改行する
- factChecksには記事内の主要な主張を5〜10件挙げ、それぞれを verified（自分で確認できる一般知識）/ multi（複数情報源あり）/ single（単一情報源）/ inference（推測を含む）/ check（要確認）に分類する。甘く分類しない
- SNS告知は本文の繰り返しではなく「読みたくなる入口」を作る。誇大表現禁止

# タイトル生成ルール（重要）
「AI活用術」「効率的なタスク管理」「副業の始め方」のような抽象的で一般的なタイトルは禁止。
読者が見た瞬間に「これ、自分のことだ」「あるある」「続きが気になる」「そんな方法でいいの？」と感じる、
具体的で自分ごと化しやすいタイトルにすること。

次の要素を記事内容に応じて組み合わせる:
- 誰向けの記事か / 読者が抱えている具体的な悩み / 日常で起きている場面
- 本人が認めたくない本音 / 失敗・迷い・挫折 / 記事を読むことで得られる変化
- 少し意外な解決方法 / 読者が普段使う日常語

悪い例: 「効率的なタスク管理術」「AI副業の始め方」「Claude Codeの使い方」
良い例: 「夏休みの宿題を最終日に泣きながらやった大人が、未だに抜けない『ギリギリ癖』を治す方法」
良い例: 「AIで稼ぎたいのに、調べるだけで1日が終わる人が最初の100円を作る方法」
良い例: 「コードが分からない40歳が、Claude Codeに全部任せたら本当にアプリは作れるのか？」

進め方: まず記事テーマ・本文の内容から、上記ルールに沿ったタイトル案を内部で最低5案作成する。
各案を「自分ごと化しやすいか／具体的な場面が浮かぶか／続きを読みたくなるか／記事内容と一致しているか／
他の記事と差別化できているか／煽りすぎていないか／SNSで紹介しやすいか／検索される言葉を自然に含んでいるか」
の基準で比較し、最も評価の高い1案をtitleとして採用する。残り4案をtitleIdeasとして出力する（tagは
初心者向け / 保存されやすい / クリック重視 / 信頼重視 / 有料note向け から近いものを1つずつ添える）。

タイトルの絶対ルール:
- 記事に書かれていない内容を約束しない。過剰な煽り・誇張・不安の煽りすぎを避ける
- 読者を見下す表現を使わない。タイトルだけ長くなりすぎない
- 専門用語より日常語を優先し、読者が実際に経験しそうな場面を使う
- ケイオス師匠の記事では、実体験・失敗談・初心者目線・親しみやすさを優先する`;

  const result = await llm.callTool<Record<string, unknown>>({
    systemPrompt: agent.systemPrompt,
    userPrompt,
    model: agent.model.model,
    temperature: agent.model.temperature,
    maxTokens: ARTICLE_MAX_TOKENS,
    toolName: "submit_trend_article",
    toolDescription: "トレンドnote記事一式（本文・ハッシュタグ・タイトル案・SNS告知・ファクトチェック）を記録する",
    toolSchema: {
      properties: {
        title: { type: "string", description: "記事タイトル（内部で比較した最も評価の高い推奨案。具体的で自分ごと化しやすいもの）" },
        body: { type: "string", description: "note本文（Markdown・冒頭に調査日表記）" },
        hashtags: { type: "array", items: { type: "string" }, description: "ハッシュタグ5〜8個（#つき）" },
        titleIdeas: {
          type: "array",
          description: "titleに次いで評価が高かった別タイトル候補4案",
          minItems: 4,
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              tag: { type: "string", description: "初心者向け/保存されやすい/クリック重視/信頼重視/有料note向け" },
            },
            required: ["title", "tag"],
          },
        },
        sns: {
          type: "object",
          description: "SNS告知文一式",
          properties: {
            threadsShort: { type: "string", description: "Threads短文（150字前後）" },
            threadsThread: { type: "array", items: { type: "string" }, description: "Threadsツリー3〜5投稿" },
            x: { type: "array", items: { type: "string" }, description: "X投稿3本（各140字以内）" },
            instagram: { type: "string", description: "Instagram紹介文（改行を活かす）" },
          },
          required: ["threadsShort", "threadsThread", "x", "instagram"],
        },
        factChecks: {
          type: "array",
          description: "記事内の主要な主張の分類（5〜10件）",
          minItems: 3,
          items: {
            type: "object",
            properties: {
              claim: { type: "string", description: "主張の要約" },
              status: { type: "string", enum: ["verified", "multi", "single", "inference", "check"] },
            },
            required: ["claim", "status"],
          },
        },
      },
      required: ["title", "body", "hashtags", "titleIdeas", "sns", "factChecks"],
    },
  });

  const body = str(result.body, "");
  if (!body.trim()) {
    throw new Error("記事本文を生成できませんでした。もう一度お試しください。");
  }

  const sns = (result.sns ?? {}) as Record<string, unknown>;
  const factChecks: FactCheckItem[] = (Array.isArray(result.factChecks) ? result.factChecks : []).map((entry) => {
    const raw = entry as Record<string, unknown>;
    return {
      claim: str(raw.claim, ""),
      // 分類が不明な主張は安全側の「要確認」に倒す
      status: FACT_CHECK_STATUSES.some((status) => status.id === raw.status)
        ? (raw.status as FactCheckItem["status"])
        : "check",
    };
  });

  return {
    title: str(result.title, theme.title),
    body,
    hashtags: arr(result.hashtags),
    titleIdeas: (Array.isArray(result.titleIdeas) ? result.titleIdeas : []).map((entry) => {
      const raw = entry as Record<string, unknown>;
      return { title: str(raw.title, ""), tag: str(raw.tag, "") };
    }),
    sns: {
      threadsShort: str(sns.threadsShort, ""),
      threadsThread: arr(sns.threadsThread),
      x: arr(sns.x),
      instagram: str(sns.instagram, ""),
    },
    factChecks,
  };
}
