#!/usr/bin/env node
/**
 * Capacitorの webDir (www/) を組み立てるだけの単純なコピースクリプト。
 * バンドラは使わない(既存のkoufuku-ai.html/admin.htmlはビルド不要な
 * 素のHTML/CSS/JSのため)。.github/workflows/deploy-mvp-pages.yml の
 * GitHub Pages向けコピー手順と対になっている。
 *
 * Androidアプリ化(Phase19)以降、ホーム画面はGitHub Pagesではなく
 * このwww/(→Capacitor経由でアプリ内アセット)だけを読み込む前提と
 * なるため、koufuku-ai.html を index.html としてコピーする。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const WWW = path.join(ROOT, "www");

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
function copyDir(srcDir, destDir, filter) {
  if (!fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest, filter);
    } else if (!filter || filter(entry.name)) {
      copyFile(src, dest);
    }
  }
}

rimraf(WWW);
fs.mkdirSync(WWW, { recursive: true });

copyFile(path.join(ROOT, "koufuku-ai.html"), path.join(WWW, "index.html"));
copyFile(path.join(ROOT, "admin.html"), path.join(WWW, "admin.html"));
copyDir(path.join(ROOT, "img", "koufuku"), path.join(WWW, "img", "koufuku"));
copyDir(path.join(ROOT, "audio", "koufuku"), path.join(WWW, "audio", "koufuku"));
copyDir(path.join(ROOT, "data", "cms"), path.join(WWW, "data", "cms"));

console.log("www/ built:", WWW);
