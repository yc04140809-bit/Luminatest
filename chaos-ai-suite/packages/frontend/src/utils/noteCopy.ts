/**
 * note貼り付け用のテキスト変換（すべてクライアント処理・AI不使用）。
 * noteのエディタはMarkdownテキストの貼り付けを書式に変換しないため、
 * 「note用」は記号を日本語記事として自然な形へ置き換えて貼り付け後の手直しを最小化する。
 */

/** 連続する空行を1つにまとめ、先頭末尾の空行を落とす。 */
function normalizeBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * note用コピー: 見出しは「■/▼」、箇条書きは「・」、引用は「｜」、太字は【】で保持。
 * 貼り付け後、noteエディタ上で該当行を選んで見出し/太字に設定し直すだけで済む形にする。
 */
export function toNotePasteText(markdown: string): string {
  const lines = markdown.split("\n").map((rawLine) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    const h2 = trimmed.match(/^##\s+(.*)$/);
    if (h2) return `■ ${stripInline(h2[1]!)}`;
    const h3 = trimmed.match(/^###\s+(.*)$/);
    if (h3) return `▼ ${stripInline(h3[1]!)}`;
    const h1 = trimmed.match(/^#\s+(.*)$/);
    if (h1) return `■ ${stripInline(h1[1]!)}`;

    if (trimmed.startsWith(">")) return `｜${convertBold(trimmed.replace(/^>\s?/, ""))}`;

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) return `・${convertBold(bullet[1]!)}`;

    return convertBold(line);
  });
  return normalizeBlankLines(lines.join("\n"));
}

/** **太字** → 【太字】（太字候補が分かる形で保持） */
function convertBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "【$1】");
}

/** インライン記号をすべて落とす。 */
function stripInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1");
}

/** プレーンテキスト: Markdown記号を全て除去した素の文章。 */
export function toPlainText(markdown: string): string {
  const lines = markdown.split("\n").map((rawLine) => {
    const trimmed = rawLine.trim();
    return stripInline(
      trimmed
        .replace(/^#{1,3}\s+/, "")
        .replace(/^>\s?/, "")
        .replace(/^[-*]\s+/, ""),
    );
  });
  return normalizeBlankLines(lines.join("\n"));
}
