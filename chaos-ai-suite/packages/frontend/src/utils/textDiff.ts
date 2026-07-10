/**
 * 編集前後の比較用の文単位差分（すべてクライアント処理・AI不使用）。
 * Markdown記号と空白を無視して文単位で比較するため、改行や見出し付けなどの
 * 「レイアウトだけの変更」は差分に出ず、本文の追加・削除・言い換えだけが可視化される。
 */

export interface DiffSegment {
  type: "same" | "added" | "removed";
  text: string;
}

/** 文単位に分割する（。！？と改行で区切る）。 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？!?])|\n/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** 比較用の正規化: Markdown記号・空白・句読点前後の揺れを除去。 */
function normalize(sentence: string): string {
  return sentence
    .replace(/^#{1,3}\s+/, "")
    .replace(/^>\s?/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, "");
}

/** LCS（最長共通部分列）ベースの差分。文数は高々数百のためO(n*m)で十分。 */
export function diffSentences(before: string, after: string): DiffSegment[] {
  const beforeSentences = splitSentences(before);
  const afterSentences = splitSentences(after);
  const beforeKeys = beforeSentences.map(normalize);
  const afterKeys = afterSentences.map(normalize);

  const rows = beforeKeys.length;
  const cols = afterKeys.length;
  const lcs: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0));
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      lcs[i]![j] =
        beforeKeys[i] === afterKeys[j]
          ? lcs[i + 1]![j + 1]! + 1
          : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    if (beforeKeys[i] === afterKeys[j]) {
      segments.push({ type: "same", text: afterSentences[j]! });
      i += 1;
      j += 1;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      segments.push({ type: "removed", text: beforeSentences[i]! });
      i += 1;
    } else {
      segments.push({ type: "added", text: afterSentences[j]! });
      j += 1;
    }
  }
  while (i < rows) {
    segments.push({ type: "removed", text: beforeSentences[i]! });
    i += 1;
  }
  while (j < cols) {
    segments.push({ type: "added", text: afterSentences[j]! });
    j += 1;
  }
  return segments;
}
