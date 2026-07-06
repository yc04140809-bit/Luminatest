import { jsPDF } from "jspdf";

/* 日本語フォント(IPAゴシック・サブセット)を一度だけ読み込んでキャッシュする */
let fontBase64Cache = null;
async function loadJapaneseFontBase64() {
  if (fontBase64Cache) return fontBase64Cache;
  const res = await fetch("/fonts/ipag-subset.ttf");
  if (!res.ok) throw new Error("フォントの読み込みに失敗しました");
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // 大きなバイナリをbase64化(一度に変換すると失敗する環境があるためチャンク処理)
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  fontBase64Cache = btoa(binary);
  return fontBase64Cache;
}

function fmtDate(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}`;
}

/* ============================================================
   研修レポートPDFを生成してダウンロードする
   scores: [{date, scenario, level, score, comment}] 新しい順
   ============================================================ */
export async function generateTrainingReportPDF({ orgName, staffName, scores }) {
  const fontBase64 = await loadJapaneseFontBase64();

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.addFileToVFS("ipag-subset.ttf", fontBase64);
  doc.addFont("ipag-subset.ttf", "IPAGothic", "normal");
  doc.setFont("IPAGothic");

  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 16;
  let y = 20;

  // ---- タイトル ----
  doc.setFontSize(18);
  doc.text("研修実施記録(接遇ガードAI)", marginX, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(`作成日:${fmtDate(new Date())}`, marginX, y);
  y += 10;

  // ---- 基本情報 ----
  const sorted = [...scores].sort((a, b) => new Date(a.date) - new Date(b.date));
  const periodLabel = sorted.length ? `${fmtDate(sorted[0].date)} 〜 ${fmtDate(sorted[sorted.length - 1].date)}` : "記録なし";

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  const infoRows = [
    ["組織", orgName || "-"],
    ["対象者", staffName || "-"],
    ["対象期間", periodLabel],
  ];
  infoRows.forEach(([k, v]) => {
    doc.setFont("IPAGothic", "normal");
    doc.text(`${k}:`, marginX, y);
    doc.text(String(v), marginX + 28, y);
    y += 7;
  });
  y += 3;

  // ---- 統計サマリー ----
  const count = scores.length;
  const avg = count ? Math.round(scores.reduce((a, s) => a + s.score, 0) / count) : 0;
  const best = count ? Math.max(...scores.map((s) => s.score)) : 0;

  doc.setDrawColor(200, 200, 200);
  doc.line(marginX, y, pageW - marginX, y);
  y += 8;

  doc.setFontSize(12);
  doc.text(`受講回数:${count} 回`, marginX, y);
  doc.text(`平均スコア:${avg} 点`, marginX + 65, y);
  doc.text(`ベストスコア:${best} 点`, marginX + 130, y);
  y += 12;

  // ---- スコア推移グラフ(直近10回・シンプルな棒グラフ) ----
  doc.setFontSize(11);
  doc.text("スコア推移(直近10回)", marginX, y);
  y += 4;

  const trend = sorted.slice(-10);
  const chartX = marginX;
  const chartW = pageW - marginX * 2;
  const chartH = 40;
  const chartTop = y + 2;

  doc.setDrawColor(220, 220, 220);
  doc.rect(chartX, chartTop, chartW, chartH);

  if (trend.length) {
    const barGap = 2;
    const barW = Math.min(14, (chartW - barGap * (trend.length + 1)) / trend.length);
    let bx = chartX + barGap;
    trend.forEach((s) => {
      const h = Math.max(2, (s.score / 100) * (chartH - 8));
      const by = chartTop + chartH - h;
      doc.setFillColor(79, 70, 229); // indigo
      doc.rect(bx, by, barW, h, "F");
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      doc.text(String(s.score), bx + barW / 2, by - 1.5, { align: "center" });
      bx += barW + barGap;
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("データがありません", chartX + 4, chartTop + chartH / 2);
  }
  y = chartTop + chartH + 12;

  // ---- 直近の講評 ----
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.text("直近の講評", marginX, y);
  y += 6;

  const recent = sorted.slice(-5).reverse();
  const pageH = doc.internal.pageSize.getHeight();
  if (recent.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("講評データがありません", marginX, y);
    y += 6;
  }
  recent.forEach((s) => {
    if (y > pageH - 25) {
      doc.addPage();
      doc.setFont("IPAGothic", "normal");
      y = 20;
    }
    doc.setFontSize(9.5);
    doc.setTextColor(70, 70, 70);
    doc.text(`${fmtDate(s.date)}  ${s.scenario || ""}(${s.level || ""})  ${s.score}点`, marginX, y);
    y += 5.5;
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    const commentText = s.comment && s.comment.trim() ? s.comment.trim() : "(講評コメントの記録なし)";
    const lines = doc.splitTextToSize(commentText, pageW - marginX * 2 - 4);
    lines.forEach((line) => {
      if (y > pageH - 20) {
        doc.addPage();
        doc.setFont("IPAGothic", "normal");
        y = 20;
      }
      doc.text(line, marginX + 4, y);
      y += 5;
    });
    y += 3;
  });

  // ---- フッター注記 ----
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("本レポートは接遇ガードAIのロールプレイ研修記録から自動生成されたものです。カスタマーハラスメント対策の研修実施記録としてご活用ください。", marginX, pageH - 10, { maxWidth: pageW - marginX * 2 });

  const fileNameSafe = (staffName || "利用者").replace(/[\\/:*?"<>|]/g, "_");
  doc.save(`研修レポート_${fileNameSafe}_${fmtDate(new Date())}.pdf`);
}
