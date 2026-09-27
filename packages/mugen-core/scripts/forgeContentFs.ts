// THE FORGE CONTENT FILES ON DISK — reading them, and writing a change.
//
// Node only. Used by the command line (scripts/forge-import.ts) and by
// the App's dev server (packages/mugen-app/vite.config.ts), which is how
// the Japanese import screen writes when it runs on a developer's PC.
// Every decision is made by the pure core (core/forge/content.ts); this
// file only moves text between disk and memory.
//
// EVERY WRITE RE-READS FIRST. A plan shown on a screen may be minutes
// old; what is written is planned again against the files as they are
// at that moment, and refused if it no longer comes out the same.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROSTER_FILE,
  VOID_FILE,
  applyForgeAdoption,
  applyForgeRollback,
  applyVoidExport,
  contentFromData,
  planForgeAdoption,
  readForgeVoidExport,
  readVoidLedger,
  type ForgeAdoptionInput,
  type ForgeAdoptionPlan,
  type ForgeContentChange,
  type ForgeVoidChange,
} from '../core/forge/content';
import type { ForgeContent } from '../core/forge/types';
import { forgeAdoptionView } from '../content/forge/adoptionView';

/** The repository's own FORGE content folder. */
export const FORGE_CONTENT_DIR = fileURLToPath(new URL('../content/forge/', import.meta.url));

export interface LoadedContent {
  dir: string;
  content: ForgeContent;
  problems: string[];
}

function readJson(path: string, problems: string[]): unknown {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    problems.push(`${path}: JSON として読めません（${e instanceof Error ? e.message : String(e)}）`);
    return null;
  }
}

function jsonFilesIn(dir: string, problems: string[]): Record<string, unknown> {
  if (!existsSync(dir)) return {};
  const out: Record<string, unknown> = {};
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    out[name.slice(0, -'.json'.length)] = readJson(join(dir, name), problems);
  }
  return out;
}

export function loadForgeContent(dir: string = FORGE_CONTENT_DIR): LoadedContent {
  const problems: string[] = [];
  const roster = readJson(join(dir, ROSTER_FILE), problems);
  const ledger = readJson(join(dir, VOID_FILE), problems);
  const baselines = jsonFilesIn(join(dir, 'characters'), problems);
  const previous = jsonFilesIn(join(dir, 'previous'), problems);
  const read = contentFromData(roster, ledger, baselines, previous);
  return { dir, content: read.content, problems: [...problems, ...read.problems] };
}

/** Writes each file through a temporary name, so a crash never leaves half a file. */
export function writeForgeFiles(dir: string, files: Record<string, string | null>): string[] {
  const written: string[] = [];
  for (const [relative, text] of Object.entries(files)) {
    const path = join(dir, relative);
    if (text === null) {
      if (existsSync(path)) rmSync(path);
    } else {
      mkdirSync(dirname(path), { recursive: true });
      const temp = `${path}.tmp-${process.pid}`;
      writeFileSync(temp, text);
      renameSync(temp, path);
    }
    written.push(relative);
  }
  return written;
}

/** An empty content folder (for a sandbox, or a first run). Never overwrites. */
export function ensureForgeContentDir(dir: string): void {
  mkdirSync(join(dir, 'characters'), { recursive: true });
  mkdirSync(join(dir, 'previous'), { recursive: true });
  if (!existsSync(join(dir, ROSTER_FILE))) {
    writeFileSync(join(dir, ROSTER_FILE), `${JSON.stringify({ format: 'mugen-zero.forge-roster', version: 1, characters: [] }, null, 2)}\n`);
  }
  if (!existsSync(join(dir, VOID_FILE))) {
    writeFileSync(join(dir, VOID_FILE), `${JSON.stringify({ format: 'mugen-zero.forge-void', version: 1, ids: [], sources: [] }, null, 2)}\n`);
  }
}

export function planOnDisk(dir: string, text: string, choice: ForgeAdoptionInput): ForgeAdoptionPlan {
  const { content } = loadForgeContent(dir);
  return planForgeAdoption(text, forgeAdoptionView(content), choice);
}

/**
 * Adopts a file into the content on disk. `expectedHash` is the payload
 * hash the author reviewed; if the file on disk has moved on since, or
 * the plan no longer comes out ready, nothing is written.
 */
export function adoptOnDisk(
  dir: string,
  text: string,
  choice: ForgeAdoptionInput,
  expected: { decision: string; payloadHash: string | null },
  at: string = new Date().toISOString(),
): { plan: ForgeAdoptionPlan; change: ForgeContentChange; written: string[] } {
  const { content } = loadForgeContent(dir);
  const plan = planForgeAdoption(text, forgeAdoptionView(content), choice);
  if (plan.decision !== expected.decision || plan.payloadHash !== expected.payloadHash) {
    throw new Error('確認してから内容が変わりました。もう一度読み込んで確認してください。');
  }
  const change = applyForgeAdoption(plan, content, at);
  return { plan, change, written: writeForgeFiles(dir, change.files) };
}

export function rollbackOnDisk(
  dir: string,
  characterId: string,
  at: string = new Date().toISOString(),
): { change: ForgeContentChange; written: string[] } {
  const { content } = loadForgeContent(dir);
  const change = applyForgeRollback(content, characterId, at);
  return { change, written: writeForgeFiles(dir, change.files) };
}

export function importVoidOnDisk(
  dir: string,
  text: string,
  fileName: string | null,
  at: string = new Date().toISOString(),
): { change: ForgeVoidChange; issues: string[]; written: string[] } {
  const { content } = loadForgeContent(dir);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON として読めません: ${e instanceof Error ? e.message : String(e)}`);
  }
  const read = readForgeVoidExport(value);
  if (!read.ids.length) throw new Error(read.issues.map((i) => i.message).join(' / ') || 'VOID ID がありません。');
  const ledger = readVoidLedger(readJson(join(dir, VOID_FILE), []));
  const change = applyVoidExport(content, ledger, read.ids, at, fileName);
  return { change, issues: read.issues.map((i) => i.message), written: writeForgeFiles(dir, change.files) };
}
