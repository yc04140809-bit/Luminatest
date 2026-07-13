/**
 * 送信前セキュリティゲート（MVP）。
 * AIへ送信する直前に、入力文字列にAPIキー等の機密情報が含まれていないかを
 * 端末内のルールベース検査だけで確認する。通信・ログ出力は一切行わない。
 * AI呼び出しは使わない（判定に外部送信も不要）。
 */

export type SecurityGateLevel = "none" | "caution" | "danger";

export interface SecurityFinding {
  /** 検出された情報の種類（画面表示用ラベル） */
  kind: string;
  level: "danger" | "caution";
  /** 何行目付近で見つかったか（1始まり） */
  lineNumber: number;
  /** 該当部分を伏字にしたプレビュー（全文は保持・表示しない） */
  maskedPreview: string;
  /** 削除操作用の位置情報 */
  start: number;
  end: number;
}

export interface SecurityGateResult {
  level: SecurityGateLevel;
  findings: SecurityFinding[];
}

interface Rule {
  kind: string;
  level: "danger" | "caution";
  pattern: RegExp;
}

const RULES: Rule[] = [
  // 危険: APIキー・トークン・秘密鍵
  { kind: "OpenAI APIキーらしい文字列", level: "danger", pattern: /\bsk-(proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { kind: "Anthropic APIキーらしい文字列", level: "danger", pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { kind: "Google APIキーらしい文字列", level: "danger", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: "GitHubトークンらしい文字列", level: "danger", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { kind: "AWSアクセスキーらしい文字列", level: "danger", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "Bearerトークン", level: "danger", pattern: /\bBearer\s+[A-Za-z0-9\-_.~+/]{20,}=*/gi },
  { kind: "秘密鍵（BEGIN表記）", level: "danger", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  {
    kind: "パスワード・シークレット等の設定値",
    level: "danger",
    pattern: /\b(api[_-]?key|apikey|secret(?:[_-]?key)?|password|passwd|pwd|access[_-]?token|auth[_-]?token|token)\s*[:=]\s*['"]?[A-Za-z0-9\-_./+=]{6,}['"]?/gi,
  },
  // 注意: 連絡先・番号
  { kind: "メールアドレス", level: "caution", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { kind: "電話番号らしい文字列", level: "caution", pattern: /\b0\d{1,4}-\d{1,4}-\d{3,4}\b|\b0\d{9,10}\b/g },
  { kind: "クレジットカード番号らしい文字列", level: "caution", pattern: /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{1,4}\b/g },
  { kind: "郵便番号・住所らしい文字列", level: "caution", pattern: /\b\d{3}-\d{4}\b/g },
];

/** .envファイルのようなKEY=VALUE行が3行以上連続しているかを検出する（個別ルールとは別枠）。 */
function findEnvBlock(text: string): SecurityFinding[] {
  const lines = text.split("\n");
  const envLinePattern = /^[A-Z][A-Z0-9_]{2,}\s*=\s*.+$/;
  let runStart = -1;
  const findings: SecurityFinding[] = [];
  let offset = 0;
  const lineOffsets = lines.map((line) => {
    const start = offset;
    offset += line.length + 1;
    return start;
  });

  for (let i = 0; i < lines.length; i += 1) {
    const isEnvLine = envLinePattern.test(lines[i]!.trim());
    if (isEnvLine && runStart === -1) runStart = i;
    if ((!isEnvLine || i === lines.length - 1) && runStart !== -1) {
      const runEnd = isEnvLine ? i : i - 1;
      if (runEnd - runStart + 1 >= 3) {
        const start = lineOffsets[runStart]!;
        const line = lines[runStart]!;
        findings.push({
          kind: ".envファイルの内容らしい設定値の並び",
          level: "danger",
          lineNumber: runStart + 1,
          maskedPreview: maskMatch(line),
          start,
          end: start + line.length,
        });
      }
      runStart = -1;
    }
  }
  return findings;
}

/** 一致文字列を伏字にする。先頭・末尾の数文字のみ残し、全文は保持・表示しない。 */
function maskMatch(match: string): string {
  const trimmed = match.trim();
  if (trimmed.length <= 4) return "●".repeat(trimmed.length);
  const visible = 2;
  const maskedLength = Math.min(trimmed.length - visible * 2, 10);
  return trimmed.slice(0, visible) + "●".repeat(maskedLength) + trimmed.slice(-visible);
}

function lineNumberAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === "\n") line += 1;
  }
  return line;
}

/** 入力文字列をルールベースで検査する。外部送信・ログ出力は一切行わない。 */
export function scanForSensitiveInfo(text: string): SecurityGateResult {
  const findings: SecurityFinding[] = [];

  for (const rule of RULES) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      findings.push({
        kind: rule.kind,
        level: rule.level,
        lineNumber: lineNumberAt(text, match.index),
        maskedPreview: maskMatch(match[0]),
        start: match.index,
        end: match.index + match[0].length,
      });
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
  }

  findings.push(...findEnvBlock(text));

  // 位置順に並べ、表示件数が膨らみすぎないよう上限を設ける
  findings.sort((a, b) => a.start - b.start);
  const limited = findings.slice(0, 20);

  const level: SecurityGateLevel = limited.some((f) => f.level === "danger")
    ? "danger"
    : limited.some((f) => f.level === "caution")
      ? "caution"
      : "none";

  return { level, findings: limited };
}

/** 検出箇所を伏字プレースホルダーへ置き換えたテキストを返す（「削除する」操作用）。 */
export function redactFindings(text: string, findings: SecurityFinding[]): string {
  const sorted = [...findings].sort((a, b) => a.start - b.start);
  let result = "";
  let cursor = 0;
  for (const finding of sorted) {
    if (finding.start < cursor) continue; // 重複範囲はスキップ
    result += text.slice(cursor, finding.start) + "〔削除済み〕";
    cursor = finding.end;
  }
  result += text.slice(cursor);
  return result;
}
