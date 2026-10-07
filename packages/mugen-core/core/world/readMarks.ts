// WHAT THE PLAYER HAS ACTUALLY LOOKED AT — the one store behind every NEW.
//
// One row (`readMarks`): a list of ids, each `<kind>:<id>` —
//   rumor:<id>   a rumour opened and read in 噂話
//   dest:<id>    a destination touched (a door on the map, 「遺跡の奥へ進む」)
//   skill:<id>   a skill used, or looked at in the fight's skill list
//   equip:<id>   a piece of equipment looked at in 装備
//   memory:<id>  a WORLD MEMORY entry looked at
//   note:<id>    a one-time notice seen (「AUTO戦闘が使用可能になりました。」)
//   talk:<id>    a one-time talk heard to its end
//
// A thing is NEW while it exists for this world and its id is not here.
// Opening a menu writes nothing: an id is added only when the thing itself
// was looked at, used or read (whoever shows it decides which, and says
// so). That rule lives with the screens; this file only keeps the list.
//
// NO SCHEMA CHANGE. A save from before has no row, which reads as nothing
// read. SAVE_VERSION does not move and no migration was written. NOT WORLD
// MEMORY: nothing here is an event in the world.

/** A list no save could honestly grow past; the oldest go first beyond it. */
export const READ_MARKS_CAP = 4000;

const MARK = /^[a-z]+:[^\s]{1,120}$/;

export function isMarkId(id: unknown): id is string {
  return typeof id === 'string' && MARK.test(id);
}

/** The marks out of a save, repaired. Never fails. */
export function readReadMarks(raw: unknown): { value: string[]; health: 'ok' | 'repaired' } {
  if (raw === undefined) return { value: [], health: 'ok' };
  if (!Array.isArray(raw)) return { value: [], health: 'repaired' };
  const out: string[] = [];
  const seen = new Set<string>();
  let changed = false;
  for (const id of raw) {
    if (!isMarkId(id) || seen.has(id)) {
      changed = true;
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  const kept = out.length > READ_MARKS_CAP ? out.slice(-READ_MARKS_CAP) : out;
  return { value: kept, health: changed || kept.length !== out.length ? 'repaired' : 'ok' };
}

/** The list with `ids` added, in order, none twice. */
export function withMarks(marks: readonly string[], ids: readonly string[]): string[] {
  const have = new Set(marks);
  const added = ids.filter((id) => isMarkId(id) && !have.has(id) && (have.add(id), true));
  const next = [...marks, ...added];
  return next.length > READ_MARKS_CAP ? next.slice(-READ_MARKS_CAP) : next;
}
