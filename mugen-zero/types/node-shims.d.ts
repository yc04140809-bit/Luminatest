// The build config runs in node, but the project does not ship the full
// node type package — it is a browser game, and one build script is not
// a reason to install a second type universe. So this declares exactly
// the surface vite.config.ts uses, and nothing else.

declare module 'node:child_process' {
  export function execSync(
    command: string,
    options: { encoding: 'utf-8' },
  ): string;
}

declare module 'node:path' {
  export function basename(path: string, suffix?: string): string;
}
