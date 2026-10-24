// WHAT A RE-SEND WOULD CHANGE.
//
// Compares the FORGE baseline the game holds with the one a file
// offers, field by field, so the author sees exactly what an update
// replaces before it replaces anything. Pure.
//
// Two levels deep — `profile.occupation`, `identity.name` — which is
// where the author thinks about a character; deeper than that a change
// is shown as its parent changing. Arrays are compared whole: a list of
// seeds that gained one is "seeds changed", not a line per index.
//
// `deployment` is left out: it is different on every send by design,
// and is shown on its own as which send this is.

import { canonicalJson } from './canonical';
import type { ForgeDeployPackage, ForgeDiff, ForgeDiffEntry } from './types';
import { isObject } from './validate';

const NOT_COMPARED = new Set(['deployment', 'sampleOnly']);

export function diffBaselines(before: ForgeDeployPackage | null, after: ForgeDeployPackage): ForgeDiff {
  const entries: ForgeDiffEntry[] = [];
  const beforeRoot = (before ?? {}) as Record<string, unknown>;
  const afterRoot = after as Record<string, unknown>;
  const keys = union(Object.keys(beforeRoot), Object.keys(afterRoot)).filter((k) => !NOT_COMPARED.has(k));

  for (const key of keys) {
    const a = beforeRoot[key];
    const b = afterRoot[key];
    if (before === null) {
      entries.push({ path: key, change: 'ADDED', after: b });
      continue;
    }
    if (isObject(a) && isObject(b)) {
      for (const sub of union(Object.keys(a), Object.keys(b))) {
        entries.push(compare(`${key}.${sub}`, sub in a, a[sub], sub in b, b[sub]));
      }
      continue;
    }
    entries.push(compare(key, key in beforeRoot, a, key in afterRoot, b));
  }

  const pick = (change: ForgeDiffEntry['change']) =>
    entries.filter((entry) => entry.change === change).map((entry) => entry.path);
  return {
    added: pick('ADDED'),
    changed: pick('CHANGED'),
    removed: pick('REMOVED'),
    preserved: pick('SAME'),
    entries,
  };
}

function compare(path: string, hadIt: boolean, a: unknown, hasIt: boolean, b: unknown): ForgeDiffEntry {
  if (!hadIt) return { path, change: 'ADDED', after: b };
  if (!hasIt) return { path, change: 'REMOVED', before: a };
  return canonicalJson(a) === canonicalJson(b)
    ? { path, change: 'SAME' }
    : { path, change: 'CHANGED', before: a, after: b };
}

function union(a: readonly string[], b: readonly string[]): string[] {
  return [...new Set([...a, ...b])];
}
