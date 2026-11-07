import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IncomingMessage } from 'node:http';
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { mugenAliases } from '../shared-aliases.mjs';
import { webpPictures } from './scripts/webpPictures';
import { leanerMusic } from './scripts/leanerMusic';

const DEV_DIR = fileURLToPath(new URL('./src/dev/', import.meta.url));
const DEBUG_STUB = '\0mugen-debug-tools-stub';

/**
 * A RELEASE BUILD NEVER SEES src/dev/ AT ALL.
 *
 * The debug tools are only ever reached behind a compile-time check, so
 * their code is dropped from a release bundle anyway — but not their
 * pictures: Vite emits every image a module imports as soon as it loads
 * that module, before dead code is removed, so the preview's cut-in
 * samples (Levi, Aria) were shipped as files nothing could show. Here
 * every import of src/dev/ in a release build is answered with an empty
 * module instead, so nothing under it is ever loaded, and nothing it
 * imports is ever emitted. `npm run check:release` checks both.
 */
function withoutDebugTools(): Plugin {
  return {
    name: 'mugen-without-debug-tools',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || source === DEBUG_STUB) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved && resolved.id.startsWith(DEV_DIR) ? DEBUG_STUB : null;
    },
    load(id) {
      // Any name asked of it is a property of `{}`: only reached in code
      // that a release build never runs.
      return id === DEBUG_STUB ? { code: 'export default {};', syntheticNamedExports: true } : null;
    },
  };
}

const FORGE_FS = fileURLToPath(new URL('../mugen-core/scripts/forgeContentFs.ts', import.meta.url));

/**
 * CHARACTER FORGE ADOPTION, WRITTEN FROM THE DEV SERVER ONLY.
 *
 * An adopted character is content: files under
 * packages/mugen-core/content/forge/ that go through git and ship in the
 * build. The import screen (src/dev/ForgeImport.tsx) can only write them
 * where there is a repository to write into — here, on the developer's
 * PC. A build (release or debug APK) has no such endpoint; the screen
 * there checks files and shows what is built in, and writes nothing.
 *
 * `sandbox=<name>` writes to a throwaway folder in the OS temp directory
 * instead of the repository, which is what the e2e tests use.
 */
function forgeAuthoring(): Plugin {
  const body = (req: IncomingMessage) =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      let text = '';
      req.on('data', (chunk) => (text += chunk));
      req.on('end', () => {
        try {
          resolve(text ? JSON.parse(text) : {});
        } catch (e) {
          reject(e);
        }
      });
    });
  const dirFor = (fs: { FORGE_CONTENT_DIR: string; ensureForgeContentDir(dir: string): void }, sandbox: unknown) => {
    if (sandbox === undefined || sandbox === null || sandbox === '') return fs.FORGE_CONTENT_DIR;
    if (typeof sandbox !== 'string' || !/^[a-z0-9-]{1,40}$/.test(sandbox)) throw new Error('sandbox の名前が不正です');
    const dir = join(tmpdir(), 'mugen-forge-sandbox', sandbox);
    fs.ensureForgeContentDir(dir);
    return dir;
  };
  return {
    name: 'mugen-forge-authoring',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__mugen/forge', async (req, res) => {
        const send = (status: number, value: unknown) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(value));
        };
        try {
          const fs = (await server.ssrLoadModule(FORGE_FS)) as typeof import('../mugen-core/scripts/forgeContentFs');
          const url = new URL(req.url ?? '/', 'http://localhost');
          if (req.method === 'GET' && url.pathname === '/content') {
            const dir = dirFor(fs, url.searchParams.get('sandbox'));
            const loaded = fs.loadForgeContent(dir);
            return send(200, { ...loaded, sandbox: dir !== fs.FORGE_CONTENT_DIR });
          }
          if (req.method !== 'POST') return send(405, { error: 'POST のみです' });
          const input = await body(req);
          const dir = dirFor(fs, input.sandbox);
          if (url.pathname === '/adopt') {
            const done = fs.adoptOnDisk(
              dir,
              String(input.text ?? ''),
              {
                npcId: (input.npcId as string) ?? null,
                region: (input.region as string) ?? null,
                lifeActor: typeof input.lifeActor === 'boolean' ? input.lifeActor : null,
              },
              { decision: String(input.decision ?? ''), payloadHash: (input.payloadHash as string) ?? null },
              undefined,
              Array.isArray(input.voidIds) ? (input.voidIds as string[]) : [],
            );
            return send(200, { result: done.change.result, entry: done.change.entry, written: done.written });
          }
          if (url.pathname === '/void') {
            const done = fs.importVoidOnDisk(dir, String(input.text ?? ''), (input.fileName as string) ?? null);
            return send(200, { added: done.change.added, total: done.change.ledger.ids.length, issues: done.issues });
          }
          if (url.pathname === '/life-actor') {
            const done = fs.setLifeActorOnDisk(dir, String(input.characterId ?? ''), input.lifeActor === true);
            return send(200, { entry: done.change.entry, written: done.written });
          }
          if (url.pathname === '/rollback') {
            const done = fs.rollbackOnDisk(dir, String(input.characterId ?? ''));
            return send(200, { entry: done.change.entry, written: done.written });
          }
          return send(404, { error: '不明な操作です' });
        } catch (e) {
          return send(409, { error: e instanceof Error ? e.message : String(e) });
        }
      });
    },
  };
}

/**
 * WHICH BUILD THIS IS (作者採用 2026-11-04): the day it was built (Japan's date) and the commit, shown small at the
 * foot of 設定 (and with an error) — so a report from a phone says which build it came from. The dev server: 'dev'.
 */
export function buildStamp(now: Date = new Date()): string {
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
  let commit = '';
  try {
    commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    /* no repository here: the date alone */
  }
  return commit ? `${day} (${commit})` : day;
}

/**
 * THE APP'S BUILD, which is the Artifact's build minus every
 * concession to a 16 MiB page.
 *
 * Nothing is inlined, nothing is downscaled, and the music is the
 * music as delivered in its length (written again at 128kbps — scripts/leanerMusic.ts, B5). The pictures keep their size in pixels but are
 * written as WebP (scripts/webpPictures.ts — 作者 2026-11-04, A1): the
 * PNGs as delivered stay in mugen-assets, and the dev server shows them. `base: './'` because a Capacitor WebView serves
 * from a local origin and an absolute path would not be found there.
 */
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const debugTools = command === 'serve' || env.VITE_MUGEN_DEBUG_TOOLS === '1';
  return {
    base: './',
    define: { __MUGEN_BUILD__: JSON.stringify(command === 'build' ? buildStamp() : 'dev') },
    plugins: [
      ...(debugTools ? [react(), forgeAuthoring()] : [react(), withoutDebugTools()]),
      webpPictures({ cacheDir: fileURLToPath(new URL('./node_modules/.cache/mugen-webp/', import.meta.url)) }),
      leanerMusic({ cacheDir: fileURLToPath(new URL('./node_modules/.cache/mugen-mp3/', import.meta.url)) }),
    ],
    resolve: { alias: mugenAliases() },
    build: { outDir: 'dist' },
    server: {
      watch: {
        /**
         * `cap sync` COPIES THE WHOLE BUILD IN HERE, and this directory
         * is inside the Vite root. Without this the watcher sees ~85MB
         * of new files and reloads every connected browser — which,
         * when it happened in the Artifact, silently reloaded pages in
         * the middle of an e2e run and produced failures that had
         * nothing to do with the tests. Learned once; written down here
         * so it is not learned twice.
         */
        ignored: ['**/android/**'],
      },
    },
  };
});
