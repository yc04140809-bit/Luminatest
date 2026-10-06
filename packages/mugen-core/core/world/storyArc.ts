// THE FIRST BOSS ROUTE — how far this world has got along it, and nothing more.
//
//   ガルド四択・TIME SHIFT の後 → 噂 → 酒場マスターの話 → 古代遺跡 → 封印地点
//   → セキリュウガ戦 → 戦闘後
//
// ONE ROW, ONE WORD (`sekiryugaArc`): the furthest stage reached. It only
// ever moves forward — `advanceStage` refuses to go back — so a rumour
// heard again after the tavern has talked cannot undo the tavern.
//
// NO SCHEMA CHANGE. The rule in `saveSchema.ts`: "A missing field is not a
// migration." A save from before this route has no row, which reads as
// NONE — exactly what a world that has heard nothing should say.
// SAVE_VERSION does not move and no migration step was written.
//
// NOT WORLD MEMORY. Nothing here is written as an event and nothing in the
// world's history is changed or summarised by it: Gald's life, the four
// answers and what the vision showed are all where they were. This row is
// the route's progress, the same kind of fact as a place's visits.
//
// NOT FORGE. セキリュウガ (MON-000007) is referred to by id elsewhere and
// never copied: this file knows only the stage names.

/**
 * The stages, in order.
 *
 *   NONE     nothing heard yet (or the route is not open: see `arcOpen`)
 *   RUMOR    one rumour heard — the tavern's master will talk next time
 *   TOLD     the master has told it; the ruins are open from the map
 *   BEATEN   セキリュウガ has been brought to a stop (never killed)
 *   SETTLED  what came after it has been seen to the end
 */
export const SEKIRYUGA_STAGES = ['NONE', 'RUMOR', 'TOLD', 'BEATEN', 'SETTLED'] as const;
export type SekiryugaStage = (typeof SEKIRYUGA_STAGES)[number];

const rank = (stage: SekiryugaStage): number => SEKIRYUGA_STAGES.indexOf(stage);

/** Whether `stage` is at least `least`. */
export function stageReached(stage: SekiryugaStage, least: SekiryugaStage): boolean {
  return rank(stage) >= rank(least);
}

/** The stage after moving to `to`: forward only, never back. */
export function advanceStage(from: SekiryugaStage, to: SekiryugaStage): SekiryugaStage {
  return rank(to) > rank(from) ? to : from;
}

/** The stage out of a save, repaired. Never fails. */
export function readSekiryugaStage(raw: unknown): { value: SekiryugaStage; health: 'ok' | 'repaired' } {
  if (raw === undefined) return { value: 'NONE', health: 'ok' };
  if (typeof raw === 'string' && (SEKIRYUGA_STAGES as readonly string[]).includes(raw)) {
    return { value: raw as SekiryugaStage, health: 'ok' };
  }
  // A word this build does not know is not progress it can honour.
  return { value: 'NONE', health: 'repaired' };
}

/**
 * WHETHER THE ROUTE HAS BEGUN AT ALL: after Gald.
 *
 * The four answers decided AND the one look ahead finished — which is the
 * moment every one of the four answers comes back to the village. Any of
 * the four opens it; none is preferred and none is required.
 *
 * `oldShift` is a save from the build where the shift really spent three
 * years: it was never shown the look (see App's `visionOwed`) and has
 * nothing owed, so it is past Gald too.
 */
export function arcOpen(facts: { galdDecided: boolean; visionSeen: boolean; oldShift: boolean }): boolean {
  return facts.galdDecided && (facts.visionSeen || facts.oldShift);
}
