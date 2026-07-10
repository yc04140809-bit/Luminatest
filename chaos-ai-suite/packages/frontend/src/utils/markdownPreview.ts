/**
 * noteプレビュー用の軽量Markdownレンダラー。
 * noteが実際にサポートする書式（見出し・太字・引用・箇条書き・段落）だけを対象にし、
 * 外部ライブラリなしで完結させる。入力は必ずHTMLエスケープしてから変換する（XSS対策）。
 */

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function renderNotePreviewHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let listItems: string[] = [];
  let quoteLines: string[] = [];
  let paragraph: string[] = [];

  function flushList(): void {
    if (listItems.length === 0) return;
    html.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    listItems = [];
  }

  function flushQuote(): void {
    if (quoteLines.length === 0) return;
    html.push(`<blockquote>${quoteLines.join("<br>")}</blockquote>`);
    quoteLines = [];
  }

  function flushParagraph(): void {
    if (paragraph.length === 0) return;
    html.push(`<p>${paragraph.join("<br>")}</p>`);
    paragraph = [];
  }

  function flushAll(): void {
    flushList();
    flushQuote();
    flushParagraph();
  }

  for (const rawLine of lines) {
    const line = escapeHtml(rawLine.trimEnd());
    const trimmed = line.trim();

    if (trimmed === "") {
      flushAll();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = Math.min(heading[1]!.length + 1, 4); // #→h2, ##→h3, ###→h4（noteの見出し階層に合わせる）
      html.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith("&gt;")) {
      flushList();
      flushParagraph();
      quoteLines.push(inline(trimmed.replace(/^&gt;\s?/, "")));
      continue;
    }

    const listItem = trimmed.match(/^[-*]\s+(.*)$/) ?? trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (listItem) {
      flushQuote();
      flushParagraph();
      listItems.push(inline(listItem[1]!));
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(inline(trimmed));
  }

  flushAll();
  return html.join("\n");
}
