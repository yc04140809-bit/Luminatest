/**
 * 承認画面に表示するテキストの中に、見た目では気づけない不可視文字・双方向制御文字が
 * 含まれていないかを検出する。実行内容（外部連携の入力・AI会議の完成案など）の表示偽装
 * （見えている内容と実際に送信・保存される内容の食い違い）を防ぐための最小限のチェック。
 *
 * 対象外（意図的な最小スコープ）:
 * - 類似文字（ホモグリフ、例: キリル文字のаとラテン文字のa）の検出は行わない
 * - タブ・改行・復帰（\t \n \r）は通常の入力で使われるため対象外
 */

export interface SuspiciousUnicodeMatch {
  /** 例: "U+200B" */
  codePoint: string;
  /** テキスト中の出現位置（文字インデックス） */
  index: number;
}

export interface SuspiciousUnicodeResult {
  found: boolean;
  matches: SuspiciousUnicodeMatch[];
}

/** ゼロ幅文字・双方向制御文字の範囲。 */
const SUSPICIOUS_RANGES: [number, number][] = [
  [0x200b, 0x200f], // ゼロ幅スペース・ZWNJ・ZWJ・LRM・RLM
  [0x202a, 0x202e], // 双方向テキスト埋め込み・上書き制御
  [0x2060, 0x2064], // word joiner・不可視の演算子
  [0x2066, 0x2069], // 双方向テキストisolate制御
  [0xfeff, 0xfeff], // BOM（ゼロ幅no-break space）
];

function isSuspiciousCodePoint(codePoint: number): boolean {
  return SUSPICIOUS_RANGES.some(([lo, hi]) => codePoint >= lo && codePoint <= hi);
}

/** 上限を超える巨大テキストでの走査コストを抑えるための安全な上限。 */
const MAX_SCAN_LENGTH = 200_000;

export function detectSuspiciousUnicode(text: string): SuspiciousUnicodeResult {
  const matches: SuspiciousUnicodeMatch[] = [];
  const target = text.length > MAX_SCAN_LENGTH ? text.slice(0, MAX_SCAN_LENGTH) : text;

  for (let i = 0; i < target.length; i += 1) {
    const codePoint = target.codePointAt(i);
    if (codePoint !== undefined && isSuspiciousCodePoint(codePoint)) {
      matches.push({ codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`, index: i });
    }
  }

  return { found: matches.length > 0, matches };
}
