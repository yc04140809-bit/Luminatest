// LUMI — what MUGEN ZERO is paid in.
//
// One number, and the only interesting thing about it is that it can
// never go below nought. That is not a display rule: a purse that can
// go negative is a shop that can be talked into giving credit, and
// every guard against it belongs HERE rather than in each screen that
// happens to spend.
//
// Whole numbers only. There are no halves of a LUMI, and a price that
// arrived as 12.5 from somewhere is a bug that must not become a purse
// nobody can reason about.

/** A purse that has never been paid. */
export const INITIAL_LUMI = 0;

/** Whole, and never below nought. */
function clean(value: number): number {
  const whole = Math.floor(value);
  return Number.isFinite(whole) ? Math.max(0, whole) : 0;
}

/** Paid. A negative or fractional amount is worth nothing. */
export function addLumi(current: number, amount: number): number {
  const gain = Math.floor(amount);
  if (!Number.isFinite(gain) || gain <= 0) return clean(current);
  return clean(current) + gain;
}

/** Whether this can be paid for at all. Nought is always affordable. */
export function canAfford(current: number, amount: number): boolean {
  const price = Math.floor(amount);
  if (!Number.isFinite(price)) return false;
  if (price <= 0) return true;
  return clean(current) >= price;
}

/**
 * Spent, or not spent at all.
 *
 * ALL OR NOTHING, and it returns null rather than a smaller number when
 * the purse is short: a caller that took "as much as you can" would
 * have to decide what a half-bought potion is, and there is no such
 * thing. Null is "the sale did not happen", which every shop already
 * knows how to mean.
 */
export function spendLumi(current: number, amount: number): number | null {
  const price = Math.floor(amount);
  if (!Number.isFinite(price) || price < 0) return null;
  if (!canAfford(current, price)) return null;
  return clean(current) - Math.max(0, price);
}

/**
 * A purse out of a save.
 *
 * Absent is nought, which is what a new world holds — so a save from
 * before LUMI existed opens as a player who has not been paid yet
 * rather than as a broken one.
 */
export function readLumi(raw: unknown): number {
  if (typeof raw !== 'number') return INITIAL_LUMI;
  return clean(raw);
}
