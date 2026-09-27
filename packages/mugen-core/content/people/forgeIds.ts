// CHARACTER FORGE'S IDS, AS THE GAME KNOWS THEM.
//
// FORGE gives every character a permanent id (`HUM-000001`,
// `MON-000001`). The game takes those as they come and never renumbers
// them (core/forge). Two lists live here, both written by hand and both
// empty today:
//
// VOID — ids FORGE has retired. A retired id is never anybody again, so
// the importer refuses to register a character under one. The game has
// no copy of FORGE's ledger; when the author retires an id, it is added
// here.
//
// CORRESPONDENCE — which formal NPC_ID (content/people/registry.ts) a
// FORGE character is, once the author decides it: `{ 'HUM-000006':
// 'LINA' }`. Decided 2026-09-27 (docs/WORLD_LIFE_LINK_DESIGN.md §11):
// the two id schemes stay as they are and meet only in this table.
// Nothing fills it automatically, and an import never writes to it.

/** FORGE ids that are retired and may never be registered. */
export const FORGE_VOID_IDS: readonly string[] = [];

/** FORGE id → formal NPC_ID, where the author has joined the two. */
export const FORGE_NPC_CORRESPONDENCE: Readonly<Record<string, string>> = {};
