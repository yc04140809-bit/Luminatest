// What a battlefield needs to know about the book.
//
// The battle screen must not read the world, and must not know how
// construction is worked out — otherwise every new ARCANA would be a
// change to the battle. So the caller flattens the book into this, and
// the screen only ever asks "what can I call, and what does it do".

import { isComplete, progressOf, type ArcanaDef, type ArcanaRecord } from '../../core/arcana/arcana';
import type { SummonAbilityDef } from '../../core/summon/summon';

export interface BattleArcana {
  arcanaId: string;
  /** #001, for the card. */
  number: number;
  name: string;
  progress: number;
  complete: boolean;
  ability: SummonAbilityDef;
  /** Kaos's lines for this one, so no line is hard-coded in the screen. */
  incompleteLine: string;
  failureLine: string;
  completeLine: string;
  visual: ArcanaDef['visual'];
}

/**
 * The pages that can be called at all, in book order.
 *
 * A page at 0% is left out entirely: there is nothing there to rebuild,
 * and a battle should not offer it. A page with no summon written yet
 * is left out for the same reason.
 */
export function battleArcanaOf(
  defs: readonly ArcanaDef[],
  records: readonly ArcanaRecord[],
): BattleArcana[] {
  const out: BattleArcana[] = [];
  for (const def of defs) {
    if (!def.summon) continue;
    const record = records.find((r) => r.arcanaId === def.arcanaId);
    if (!record) continue;
    const progress = progressOf(def, record);
    if (progress <= 0) continue;
    out.push({
      arcanaId: def.arcanaId,
      number: def.number,
      name: def.name,
      progress,
      complete: isComplete(def, record),
      ability: def.summon.ability,
      incompleteLine: def.summon.incompleteLine,
      failureLine: def.summon.failureLine,
      completeLine: def.summon.completeLine,
      visual: def.visual,
    });
  }
  return out;
}
