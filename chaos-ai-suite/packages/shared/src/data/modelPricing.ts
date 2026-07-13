/**
 * AI利用・成果ダッシュボードの「API概算費用」計算に使う単価表（USD / 100万トークン）。
 * Anthropicの公表価格を参考にした概算値であり、実際の請求額とは異なる場合がある。
 * 未知のモデルIDにはSonnet相当の単価をフォールバックとして使う。
 */
export const MODEL_PRICING_USD_PER_MILLION: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

const DEFAULT_PRICING = { input: 3, output: 15 };

/** 入力・出力トークン数から概算費用（USD）を計算する。実際の請求額の目安であり保証値ではない。 */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING_USD_PER_MILLION[model] ?? DEFAULT_PRICING;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}
