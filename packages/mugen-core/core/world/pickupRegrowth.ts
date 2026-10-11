// WHEN A PICKUP THAT GROWS BACK WAS LAST TAKEN — one world_state row
// (`pickupRegrowth`: { [pickupId]: absoluteDay }), 2026-10-11.
//
// The list of pickups taken (`explorationPickups`) is unchanged and still
// what "found once" means; this row only says, for the few that grow back
// (content/exploration/regrowth.ts), on which day they were last taken, so
// they can be there again some days later. A save without the row reads as
// none taken since — the old list still marks them taken until their first
// regrowth day counts from the day the row is first written. SAVE_VERSION
// stays 3.

export type RegrowthRow = Readonly<Record<string, number>>;

/** Repairs the row from the save: whole-number days only, by pickup id. */
export function readRegrowth(raw: unknown): RegrowthRow {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [id, day] of Object.entries(raw as Record<string, unknown>)) {
    const n = Math.floor(Number(day));
    if (id && Number.isFinite(n) && n >= 0) out[id] = n;
  }
  return out;
}

/**
 * Whether a pickup is there to take today.
 * - never taken: there;
 * - taken, and it does not grow back: gone for good (as always);
 * - taken, it grows back: there again once `days` have passed since it was
 *   last taken. A pickup taken before this row existed (in the old list, no
 *   day here) counts as taken on day 0 — so it is back after `days`.
 */
export function pickupThere(
  pickupId: string,
  taken: readonly string[],
  row: RegrowthRow,
  today: number,
  regrowDays: number | null,
): boolean {
  if (!taken.includes(pickupId)) return true;
  if (regrowDays === null) return false;
  const last = row[pickupId] ?? 0;
  return today - last >= regrowDays;
}
