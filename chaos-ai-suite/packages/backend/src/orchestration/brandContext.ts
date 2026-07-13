import type { BrandProfile } from "@chaos-ai-suite/shared";

/**
 * ケイオス師匠ブランド設定を、生成用途別に必要な項目だけへ絞り込んでプロンプト用テキストにする。
 * 長文項目をそのまま毎回送るとAPIコストが増えるため、用途ごとに使う項目を限定している。
 * 呼び出し側は brandProfile.enabled と、生成画面のチェック（反映する/しない）の両方がtrueのときだけ
 * この関数を呼び、結果をuserPromptへ追加すること。
 */

function bullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

/** SNS投稿生成時に必要な情報: ブランド軸・読者・読者の悩み・文章トーン・投稿構造・避ける表現・販売導線。 */
export function brandContextForSns(profile: BrandProfile): string {
  return `# ケイオス師匠ブランド設定（この投稿に反映すること）
【ブランド軸】
${profile.brandStatement}

【主な読者】
${bullets(profile.targetAudience)}

【読者の悩み】
${bullets(profile.audienceProblems)}

【文章トーン】
${bullets(profile.toneRules)}

【投稿生成の基本構造（無理にすべて詰め込まず自然に）】
${profile.postStructure.map((step, index) => `${index + 1}. ${step}`).join("\n")}

【避けるべき強い表現（絶対に使わない）】
${bullets(profile.prohibitedExpressions)}

【必要な場合のみ使う弱い導線の例】
${bullets(profile.softCtaExamples)}

毎回商品を案内しないこと。投稿テーマと関係がある場合のみ、上記のような弱い導線を自然に添えること。`;
}

/** note記事生成時に必要な情報: ブランド軸・読者・実体験の方針・記事構造・文章トーン・販売導線・避ける表現。 */
export function brandContextForNote(profile: BrandProfile): string {
  return `# ケイオス師匠ブランド設定（この記事に反映すること）
【ブランド軸】
${profile.brandStatement}

【主な読者】
${bullets(profile.targetAudience)}

【提供する価値】
${bullets(profile.providedValue)}

【文章トーン】
${bullets(profile.toneRules)}

【避けるべき強い表現（絶対に使わない）】
${bullets(profile.prohibitedExpressions)}

【必要な場合のみ使う弱い導線の例】
${bullets(profile.softCtaExamples)}

記事には可能な範囲でケイオス師匠自身の失敗・試行錯誤の実体験を含め、上から教える口調にしないこと。毎回商品へ誘導する必要はない。`;
}

/** 商品紹介文生成時に必要な情報: 読者の悩み・提供価値・商品への導線・誇張禁止・対象読者。 */
export function brandContextForProduct(profile: BrandProfile): string {
  return `# ケイオス師匠ブランド設定（この文章に反映すること）
【主な読者（対象読者）】
${bullets(profile.targetAudience)}

【読者の悩み】
${bullets(profile.audienceProblems)}

【提供する価値】
${bullets(profile.providedValue)}

【文章トーン】
${bullets(profile.toneRules)}

【避けるべき強い表現・誇張（絶対に使わない）】
${bullets(profile.prohibitedExpressions)}

商品機能の説明より先に読者の悩みを示すこと。実績がない場合は誇張せず、制作背景や用途を正直に説明すること。`;
}

/**
 * 刺さるマーケティング生成専用: この機能自体がケイオス師匠のブランドを体現する文章を作るための機能のため、
 * 他の3関数より広い範囲（信じること・避けること・世界観・買われる心理の流れも含む）を渡す。
 */
export function brandContextForMarketingCopy(profile: BrandProfile): string {
  return `# ケイオス師匠ブランド設定（この文章に反映すること）
【ブランド軸】
${profile.brandStatement}

【ブランドタイプ】
${profile.brandTypes}

【世界観】
${profile.worldview}

【主な読者】
${bullets(profile.targetAudience)}

【読者の悩み】
${bullets(profile.audienceProblems)}

【提供する価値】
${bullets(profile.providedValue)}

【信じること】
${bullets(profile.beliefs)}

【避けること（スタンス）】
${bullets(profile.enemies)}

【文章トーン】
${bullets(profile.toneRules)}

【投稿生成の基本構造（無理にすべて詰め込まず自然に）】
${profile.postStructure.map((step, index) => `${index + 1}. ${step}`).join("\n")}

【買われる心理の流れ（参考にする。機械的になぞらない）】
${profile.trustFlow.map((step, index) => `${index + 1}. ${step}`).join("\n")}

【売り込まずに売れる導線（テーマと関係がある場合のみ）】
${profile.salesFlow.map((step, index) => `${index + 1}. ${step}`).join("\n")}

【必要な場合のみ使う弱い導線の例】
${bullets(profile.softCtaExamples)}

【避けるべき強い表現（絶対に使わない）】
${bullets(profile.prohibitedExpressions)}

毎回商品を案内しないこと。テーマと関係がある場合のみ、上記のような弱い導線を自然に添えること。`;
}
