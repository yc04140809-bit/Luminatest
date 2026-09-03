// MUGEN REVIEW PACKAGE — one command, one folder, no manual screenshots.
//
//   npm run review              full: typecheck, unit, e2e, build, capture
//   npm run review -- --fast    skips e2e (the slow part) and says so
//
// Everything a machine can establish, this script establishes and writes
// down. Everything it cannot — why a change was made, what worries the
// author, whether to go on — comes from review/notes.md, written by
// whoever did the work. The two are kept apart on purpose: the report
// must never invent a result, and it must never pretend a judgement was
// a measurement.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_DIR = resolve(APP_DIR, '..');
const REVIEW_DIR = join(REPO_DIR, 'review');
const OUT_DIR = join(REVIEW_DIR, 'latest');
const NOTES = join(REVIEW_DIR, 'notes.md');

const fast = process.argv.includes('--fast');

function run(label, command, args) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const result = spawnSync(command, args, { cwd: APP_DIR, encoding: 'utf-8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  process.stdout.write(output.split('\n').slice(-6).join('\n'));
  return { ok: result.status === 0, output };
}

/** The last line that actually says something, for the summary table. */
function tail(output, pattern) {
  const lines = output.split('\n').map((l) => l.trim()).filter(Boolean);
  const match = [...lines].reverse().find((l) => pattern.test(l));
  return match ?? lines[lines.length - 1] ?? '(no output)';
}

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: REPO_DIR, encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

function readNotes() {
  if (!existsSync(NOTES)) {
    throw new Error(
      `review/notes.md is missing. It carries the parts of a review no machine can\n` +
        `write: what changed and why, what to watch, and whether to go on.`,
    );
  }
  const raw = readFileSync(NOTES, 'utf-8');
  const base = /<!--\s*base:\s*([^\s]+)\s*-->/.exec(raw)?.[1] ?? '';
  const title = /<!--\s*title:\s*(.+?)\s*-->/.exec(raw)?.[1] ?? 'MUGEN ZERO';
  const sections = {};
  const parts = raw.split(/^## NOTES:(\d+)\s*$/m);
  for (let i = 1; i < parts.length; i += 2) sections[parts[i]] = parts[i + 1].trim();
  return { base, title, sections };
}

function note(sections, n) {
  return (
    sections[String(n)] ??
    `_(review/notes.md has no NOTES:${n} section — this part of the review was not written.)_`
  );
}

const notes = readNotes();

// ---- the measurements ----

const results = [];
const typecheck = run('typecheck', 'npx', ['tsc', '--noEmit']);
results.push({
  name: 'Typecheck (tsc --noEmit)',
  ok: typecheck.ok,
  detail: typecheck.ok ? 'no type errors' : tail(typecheck.output, /error/i),
});

const unit = run('unit', 'npx', ['vitest', 'run', '--reporter=dot']);
results.push({
  name: 'Unit (vitest)',
  ok: unit.ok,
  detail: tail(unit.output, /Tests\s+\d/),
});

let e2e = null;
if (fast) {
  results.push({
    name: 'E2E (playwright)',
    ok: null,
    detail: 'NOT RUN — this package was generated with --fast',
  });
} else {
  e2e = run('e2e', 'npx', ['playwright', 'test', '--reporter=line']);
  results.push({
    name: 'E2E (playwright)',
    ok: e2e.ok,
    detail: tail(e2e.output, /passed|failed/),
  });
}

const build = run('build', 'npm', ['run', 'build']);
const bundle = build.output
  .split('\n')
  .filter((l) => /dist\/assets\/.*\.js\s/.test(l))
  .map((l) => l.trim());
results.push({
  name: 'Build (tsc -b && vite build)',
  ok: build.ok,
  detail: build.ok ? tail(build.output, /built in/) : tail(build.output, /error/i),
});

const capture = run('capture', 'npx', [
  'playwright',
  'test',
  '--config',
  'playwright.review.config.ts',
  '--reporter=line',
]);
results.push({
  name: 'Screenshot capture',
  ok: capture.ok,
  detail: capture.ok ? 'captured' : tail(capture.output, /Error|failed/),
});

if (!capture.ok) {
  process.stderr.write('\ncapture failed — no review package written.\n');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(OUT_DIR, 'manifest.json'), 'utf-8'));
const qaReport = readFileSync(join(OUT_DIR, 'qa-report.md'), 'utf-8');
const mobileLine =
  qaReport.split('\n').find((l) => l.includes('NO_HORIZONTAL_SCROLL')) ?? '(not in report)';

const diffStat = notes.base ? git('diff', '--stat', `${notes.base}..HEAD`) : '';
const commits = notes.base ? git('log', '--oneline', `${notes.base}..HEAD`) : '';

// ---- the document ----

const mark = (ok) => (ok === null ? 'NOT RUN' : ok ? 'PASS' : 'FAIL');
const allOk = results.every((r) => r.ok !== false);

const md = [];
md.push(`# MUGEN REVIEW PACKAGE — ${notes.title}`);
md.push('');
md.push(`- Generated: ${new Date().toISOString()}`);
md.push(`- Commit: ${git('rev-parse', '--short', 'HEAD')} on ${git('rev-parse', '--abbrev-ref', 'HEAD')}`);
if (notes.base) md.push(`- Compared against: ${notes.base}`);
md.push(`- Verdict: ${allOk ? 'nothing failed' : 'SOMETHING FAILED — see 5'}`);
md.push('');
md.push('## 1. 実装前 → 実装後の変更点');
md.push('');
md.push(note(notes.sections, 1));
if (commits) {
  md.push('', '### commits', '', '```', commits, '```');
}
if (diffStat) {
  md.push('', '### changed files', '', '```', diffStat, '```');
}

md.push('', '## 2. スクリーンショット（必要な分だけ）', '');
md.push(`撮影: ${manifest.capturedAt} / viewport ${manifest.viewport.width}x${manifest.viewport.height}`);
md.push('');
for (const shot of manifest.shots) {
  md.push(`- \`review/latest/${shot.file}\` — ${shot.screen}：${shot.reason}`);
}
md.push('');
md.push('撮影していない画面（変更なし。テスト結果で報告）:');
for (const s of manifest.notPhotographed) md.push(`- ${s.screen} — ${s.reason}`);

md.push('', '## 3. 新規機能の動作確認結果', '');
md.push(note(notes.sections, 3));
md.push('');
md.push('同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`');
md.push('');
md.push('```');
md.push(qaReport.split('\n').slice(0, 24).join('\n'));
md.push('```');

md.push('', '## 4. 既存機能への影響', '');
md.push(note(notes.sections, 4));

md.push('', '## 5. Unit / E2E / Build 結果', '');
md.push('| 項目 | 結果 | 内容 |');
md.push('| --- | --- | --- |');
for (const r of results) md.push(`| ${r.name} | ${mark(r.ok)} | ${r.detail.replace(/\|/g, '\\|')} |`);
if (bundle.length > 0) {
  md.push('', '```', ...bundle, '```');
}

md.push('', '## 6. Android / mobile 確認結果', '');
md.push(`- 実測（QA REPORT より）: ${mobileLine.trim().replace(/^-\s*/, '')}`);
md.push(`- 撮影 viewport: ${manifest.viewport.width}x${manifest.viewport.height}（Android縦相当）`);
md.push('- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。');

md.push('', '## 7. DB 変更有無', '');
md.push(note(notes.sections, 7));

md.push('', '## 8. Save compatibility', '');
md.push(note(notes.sections, 8));

md.push('', '## 9. 既知の問題', '');
md.push(note(notes.sections, 9));

md.push('', '## 10. Claude 自身が気になる箇所', '');
md.push(note(notes.sections, 10));

md.push('', '## 11. 次フェーズへ進行可能か', '');
md.push(note(notes.sections, 11));
md.push('');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'REVIEW.md'), md.join('\n'), 'utf-8');

process.stdout.write(`\n\nreview package written to review/latest/\n`);
for (const shot of manifest.shots) process.stdout.write(`  ${shot.file}\n`);
process.stdout.write(`  qa-report.md\n  REVIEW.md\n`);
process.exit(allOk ? 0 : 1);
