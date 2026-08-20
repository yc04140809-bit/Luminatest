#!/usr/bin/env node
/**
 * Capacitorの webDir (www/) を組み立てるだけの単純なコピースクリプト。
 * バンドラは使わない(既存のkoufuku-ai.htmlはビルド不要な素のHTML/CSS/JS
 * のため)。.github/workflows/deploy-mvp-pages.yml のGitHub Pages向け
 * コピー手順と対になっている。
 *
 * Androidアプリ化(Phase19)以降、ホーム画面はGitHub Pagesではなく
 * このwww/(→Capacitor経由でアプリ内アセット)だけを読み込む前提と
 * なるため、koufuku-ai.html を index.html としてコピーする。
 * Phase20で管理者モードはkoufuku-ai.html内(IndexedDB版CMS)へ統合
 * されたため、admin.htmlはもうコピーしない(ファイル自体も廃止済み)。
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
// Phase62: Media Library用の独立モジュール(<script src="mediaLibrary.js">
// でindex.htmlから直接参照されるため、他のアセットと同じ階層に置く)。
copyFile(path.join(ROOT, "mediaLibrary.js"), path.join(WWW, "mediaLibrary.js"));
copyDir(path.join(ROOT, "img", "koufuku"), path.join(WWW, "img", "koufuku"));
copyDir(path.join(ROOT, "audio", "koufuku"), path.join(WWW, "audio", "koufuku"));
copyDir(path.join(ROOT, "data", "cms"), path.join(WWW, "data", "cms"));

console.log("www/ built:", WWW);
