/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * '1' in a debug build (`npm run build:debug`, `.env.debug`): the debug
   * tools — the battle preview and the title's way into it — are built in.
   * Unset in a release build (`npm run build`), which contains neither.
   */
  readonly VITE_MUGEN_DEBUG_TOOLS?: string;
}

/** Which build this is: its day (Japan's date) and commit — `2026-11-04 (bc8e913)` — or 'dev' (vite.config.ts). */
declare const __MUGEN_BUILD__: string;
