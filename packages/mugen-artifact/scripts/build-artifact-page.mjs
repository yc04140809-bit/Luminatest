// Repackages the single-file build for an Artifact page.
//
// Artifacts wrap the file in their own <!doctype>/<head>/<body>, so this
// strips the document shell and emits just the page content: title,
// styles, mount point, and the inlined bundle. The PWA bits (manifest,
// service worker, icons) are dropped — they need real files at fixed
// paths, and the game plays without them.
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = process.argv[2] ?? 'dist-singlefile/index.html';
const OUT = process.argv[3] ?? 'dist-singlefile/artifact.html';

const src = readFileSync(SRC, 'utf8');
const pick = (re, what) => {
  const m = src.match(re);
  if (!m) throw new Error(`Could not find ${what} in ${SRC}`);
  return m;
};

const title = pick(/<title>([\s\S]*?)<\/title>/, 'title')[1].trim();
const style = pick(/<style[^>]*>([\s\S]*?)<\/style>/, 'inlined CSS')[1];
const script = pick(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/, 'inlined bundle')[1];

// The app's own reset expects the full-height document it had before.
const page = `<title>${title}</title>
<style>
html, body { height: 100%; margin: 0; }
${style}
</style>
<div id="root"></div>
<script type="module">
${script}
</script>
`;

writeFileSync(OUT, page, 'utf8');
console.log(`${OUT}: ${(Buffer.byteLength(page) / 1024 / 1024).toFixed(2)} MB`);
