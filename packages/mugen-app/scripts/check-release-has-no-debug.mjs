#!/usr/bin/env node
// リリース用ビルドに、デバッグ用の道具（戦闘演出プレビューとタイトルの DEBUG
// ボタン）が入っていないことを確かめる。
//
// 実際に `vite build`（リリースと同じ設定）で一時フォルダへ作り、出来上がった
// JS を検索する。入口の判定はビルド時に消える作りなので、ここで見つかったら
// その作りが壊れているということ。見つかれば失敗で終わる。
//
// 画像も調べる。src/dev/ だけが使う画像（カットイン見本のレヴィ・アリアなど）が
// リリースの assets に出ていたら失敗。JS が消えても画像だけ出力される、という
// ことが一度あった（vite.config.ts の withoutDebugTools で直した）。
//
//   npm run check:release -w @mugen/app
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('..', import.meta.url));
// Strings that exist only in the debug tools' own files.
const MARKERS = ['debug-battle-preview', 'debug-panel', 'debug-replay', 'DEBUG 戦闘演出プレビュー'];

/** Every source file under a folder. */
function sources(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}
/** The picture files a source imports from @mugen/assets/files/. */
const picturesIn = (path) =>
  [...readFileSync(path, 'utf8').matchAll(/@mugen\/assets\/files\/[^'"]*\/([^/'"]+)\.(png|webp|jpg)/g)].map(
    (m) => m[1],
  );
const SRC = join(APP, 'src');
const DEV = join(SRC, 'dev');
const usedByGame = new Set(sources(SRC).filter((f) => !f.startsWith(DEV)).flatMap(picturesIn));
const onlyForDebug = [...new Set(sources(DEV).flatMap(picturesIn))].filter((name) => !usedByGame.has(name));

const out = mkdtempSync(join(tmpdir(), 'mugen-release-'));
try {
  execFileSync('npx', ['vite', 'build', '--outDir', out, '--emptyOutDir'], {
    cwd: APP,
    stdio: ['ignore', 'ignore', 'inherit'],
    // A release build: nothing may switch the debug tools on.
    env: { ...process.env, VITE_MUGEN_DEBUG_TOOLS: '' },
  });
  const assets = join(out, 'assets');
  const scripts = readdirSync(assets).filter((f) => f.endsWith('.js'));
  const found = [];
  for (const file of scripts) {
    const text = readFileSync(join(assets, file), 'utf8');
    for (const marker of MARKERS) if (text.includes(marker)) found.push(`${file}: ${marker}`);
    if (/^BattlePreview[-.]/.test(file)) found.push(`${file}: the preview's own chunk`);
  }
  for (const file of readdirSync(assets)) {
    const name = onlyForDebug.find((n) => file.startsWith(`${n}-`) || file.startsWith(`${n}.`));
    if (name) found.push(`${file}: デバッグ用の道具だけが使う画像`);
  }
  if (found.length > 0) {
    console.error('リリース用ビルドにデバッグ用の道具が入っています:\n  ' + found.join('\n  '));
    process.exitCode = 1;
  } else {
    console.log(
      `OK: リリース用ビルド（${scripts.length} 個の JS）にデバッグ用の道具は入っていません` +
        `（デバッグ専用の画像 ${onlyForDebug.length} 枚: ${onlyForDebug.join(', ') || 'なし'} も入っていません）。`,
    );
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
