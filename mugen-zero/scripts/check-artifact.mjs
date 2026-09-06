// ARTIFACT SAFETY CHECK — run after every single-file build.
//
// Publishing refused this artifact three times as "too large" while a
// BIGGER build from the round before published fine on the same day.
// What actually differed was one line: 5,001,963 bytes against the
// accepted build's 4,109,641. So the artifact build now asks esbuild to
// limit its line length, and this script is what keeps that honest.
//
// It checks two things and fails the build if either is wrong:
//
//   1. no line is anywhere near the size that was refused;
//   2. every image in the file is byte for byte the image it came from.
//
// (2) is the one that matters. Breaking long lines means putting
// newlines into minified JavaScript, and where a single token is longer
// than the limit — a megabyte of base64 is one token — esbuild writes a
// line continuation INSIDE the string literal. That is valid JavaScript
// and changes no value, but "changes no value" is a claim, and a claim
// about delivered artwork is worth checking rather than asserting. So
// every data URI in the built file is decoded and matched by hash
// against a real file on disk.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Comfortably under the size that was refused, and under the 2 MB goal. */
const MAX_LINE_BYTES = 2_000_000;

/**
 * Below this, an image that matches no file on disk is a literal inside
 * a library rather than artwork.
 *
 * Phaser carries three of its own: a 24-byte, a 117-byte and a 42-byte
 * PNG it uses for blank and missing textures. They were in the build
 * that published as well. Anything larger than this that cannot be
 * traced back to a file is artwork nobody can account for, and fails.
 */
const LIBRARY_LITERAL_MAX = 4096;

const md5 = (buf) => createHash('md5').update(buf).digest('hex');

/** Every file the build could legitimately have inlined. */
function sourceHashes() {
  const roots = [join(APP_DIR, 'src/assets'), join(APP_DIR, '.review-assets')];
  const byHash = new Map();
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (statSync(full).size > 0) byHash.set(md5(readFileSync(full)), full);
    }
  };
  roots.forEach(walk);
  return byHash;
}

export function checkArtifact(file) {
  const raw = readFileSync(file);
  const text = raw.toString('utf8');

  const lines = text.split('\n');
  let longest = 0;
  for (const line of lines) longest = Math.max(longest, Buffer.byteLength(line));

  // A data URI, allowing the backslash-newline continuations esbuild
  // writes when one string is longer than the line limit.
  const pattern = /data:([a-zA-Z0-9.+/-]+);base64,((?:[A-Za-z0-9+/=]|\\\n)+)/g;
  const known = sourceHashes();
  const images = [];
  const unmatched = [];
  let continued = 0;
  for (const match of text.matchAll(pattern)) {
    const payload = match[2];
    if (payload.includes('\\\n')) continued += 1;
    const bytes = Buffer.from(payload.replaceAll('\\\n', ''), 'base64');
    const hash = md5(bytes);
    const from = known.get(hash);
    images.push({ mime: match[1], base64: payload.length, bytes: bytes.length, from });
    if (!from && bytes.length > LIBRARY_LITERAL_MAX) {
      unmatched.push({ mime: match[1], bytes: bytes.length });
    }
  }
  images.sort((a, b) => b.base64 - a.base64);

  const report = {
    file,
    totalBytes: raw.length,
    lines: lines.length,
    longestLine: longest,
    images: images.length,
    continuedStrings: continued,
    largestImageBase64: images[0]?.base64 ?? 0,
    largestImageBytes: images[0]?.bytes ?? 0,
    decodedImageBytes: images.reduce((n, i) => n + i.bytes, 0),
    fromFiles: images.filter((i) => i.from).length,
    libraryLiterals: images.filter((i) => !i.from).length,
    unmatched,
  };

  const problems = [];
  if (longest > MAX_LINE_BYTES) {
    problems.push(
      `longest line is ${longest} bytes, over the ${MAX_LINE_BYTES} the artifact is held to`,
    );
  }
  if (unmatched.length) {
    problems.push(
      `${unmatched.length} embedded image(s) do not match any file on disk — an image has been ` +
        `altered somewhere between the source and the artifact`,
    );
  }
  return { report, problems };
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(3)} MB`;

const target = process.argv[2] ?? join(APP_DIR, 'dist-singlefile/artifact.html');
const { report, problems } = checkArtifact(target);
console.log(`  artifact           : ${mb(report.totalBytes)} (${report.totalBytes} bytes)`);
console.log(`  longest line       : ${mb(report.longestLine)} (${report.longestLine} bytes)`);
console.log(`  lines              : ${report.lines}`);
console.log(
  `  images inlined     : ${report.images} (${report.fromFiles} from files, all byte-identical ` +
    `to source; ${report.libraryLiterals} tiny library literals)`,
);
console.log(
  `  largest image      : ${mb(report.largestImageBase64)} base64 / ${mb(report.largestImageBytes)} decoded`,
);
console.log(`  images decoded     : ${mb(report.decodedImageBytes)}`);
console.log(`  strings continued  : ${report.continuedStrings} (value-preserving, verified above)`);
if (problems.length) {
  console.error('\nartifact check FAILED:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
