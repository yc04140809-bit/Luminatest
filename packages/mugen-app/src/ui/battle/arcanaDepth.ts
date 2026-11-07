// HOW DEEP THE WORLD'S MEMORY RUNS — for the WORLD MEMORY panel.
//
// The Artifact's panel reads it off `battleArcanaOf`, which builds each
// page's summon picture too — and building a picture means importing
// the whole art manifest. The panel only needs two facts, so this reads
// the same pages by the same rule (a summonable page the world has any
// of) without the pictures. `arcanaDepth.test.ts` holds the two equal.

import { isComplete, progressOf, type ArcanaDef, type ArcanaRecord } from '@mugen/core/arcana/arcana';

export interface ArcanaReading {
  /** The average completion of the pages the player has any of, 0–100. */
  depth: number;
  /** Whether any of them is finished — the ARCANA command's lock. */
  anyComplete: boolean;
}

export function arcanaReading(
  defs: readonly ArcanaDef[],
  records: readonly ArcanaRecord[],
): ArcanaReading {
  const pages: { progress: number; complete: boolean }[] = [];
  for (const def of defs) {
    if (!def.summon) continue;
    const record = records.find((r) => r.arcanaId === def.arcanaId);
    if (!record) continue;
    const progress = progressOf(def, record);
    if (progress <= 0) continue;
    pages.push({ progress, complete: isComplete(def, record) });
  }
  if (pages.length === 0) return { depth: 0, anyComplete: false };
  const total = pages.reduce((sum, p) => sum + Math.max(0, Math.min(100, p.progress)), 0);
  return { depth: Math.round(total / pages.length), anyComplete: pages.some((p) => p.complete) };
}
