#!/usr/bin/env node
// リリース用ビルドに、デバッグ用の道具（戦闘演出プレビューとタイトルの DEBUG
// ボタン）が入っていないことを確かめる。
//
// 実際に `vite build`（リリースと同じ設定）で一時フォルダへ作り、出来上がった
// JS を検索する。入口の判定はビルド時に消える作りなので、ここで見つかったら
// その作りが壊れているということ。見つかれば失敗で終わる。
//
//   npm run check:release -w @mugen/app
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('..', import.meta.url));
// Strings that exist only in the debug tools' own files.
const MARKERS = ['debug-battle-preview', 'debug-panel', 'debug-replay', 'DEBUG 戦闘演出プレビュー'];

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
  if (found.length > 0) {
    console.error('リリース用ビルドにデバッグ用の道具が入っています:\n  ' + found.join('\n  '));
    process.exitCode = 1;
  } else {
    console.log(`OK: リリース用ビルド（${scripts.length} 個の JS）にデバッグ用の道具は入っていません。`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
