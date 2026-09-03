# MUGEN ZERO QA REPORT

- Generated: 2026-09-03T15:56:49.367Z
- Build: MUGEN ZERO v0.1 / ff4abd9 / 2026-09-03T15:56:40.181Z
- Environment: dev server
- Result: no failed checks — 20 pass, 0 warn, 3 not tested, 1 manual

## CURRENT WORLD
- World time: 1年目 1日目 (day 1)
- Route: NONE
- TIME SHIFTs: 0
- WORLD MEMORY facts: 0
- LIFE ARCHIVE: 0 known / 0 in canon
- Future sites: ALDEN_BAKERY:not yet, GREENWOOD_WAYSTATION:not yet, ALDEN_WORKYARD:not yet, GREENWOOD_GRAVE:not yet

## CONTENT
- NOW events: 18
- NEXT events: 3
- LIFE events (experience layer): 0
- Locations: MOONLIGHT_TAVERN (11), ALDEN_VILLAGE (10)
- Narrative seeds: 3
- Rumours (events gated on a world fact): 8
- Events met in this world: 0

## EXPERIENCE
- Met: nothing yet
- Most recent first: nothing yet

## NARRATIVE SEEDS
- [SEED] `TAVERN_MASTER_OLD_GREATSWORD` 酒場の壁の両手剣 — from TAVERN_MASTER_OLD_GREATSWORD, unanswered in this build
- [SEED] `ALDEN_UNSIGNED_LETTER` 差出人のない手紙 — from ALDEN_UNSIGNED_LETTER, unanswered in this build
- [SEED] `GREENWOOD_DEEP_PATH` 地図にない道 — from GREENWOOD_DEEPER_PATH_RUMOR, unanswered in this build

## CONTENT CHECKS
- **PASS** `EVENT_IDS_UNIQUE` — 21 events, every id unique
  - how: compared every eventId in the shipped registry
- **PASS** `EVENT_REQUIREMENTS_RESOLVABLE` — every SEEN / NOT_SEEN requirement points at an event that exists
  - how: resolved every requirement against the registry
- **PASS** `EVENT_DNA_PRESENT` — every event declares what it is for (emotionTarget + expectedEffect)
  - how: read the dna of every event
- **PASS** `REPEATABLE_EVENTS_REST` — repeatable events either rest, or sit at the bottom of their place
  - how: compared each cooldown-free repeatable against its neighbours
- **PASS** `SEED_SOURCES_EXIST` — 3 seeds, each shown by an event that exists
  - how: resolved every seed source against the event registry
- **PASS** `SEED_PLANTERS_REGISTERED` — every event that plants a question has that question on the board
  - how: matched every dna.seed against the seed registry
- **PASS** `RUMOR_ROUTE_COVERAGE` — all four routes are talked about by somebody
  - how: looked for an event requiring each route memory

## WORLD MEMORY CHECKS
- **PASS** `WORLD_MEMORY_NO_DUPLICATES` — 0 facts recorded, no duplicates
  - how: compared every event id in the world currently loaded
- **PASS** `LIFE_CHOICE_IS_SINGULAR` — no choice made yet
  - how: counted the first-encounter outcomes in WORLD MEMORY
- **PASS** `WORLD_MEMORY_IN_ORDER` — history runs forwards
  - how: walked the event list comparing world dates
- **PASS** `FUTURE_SITE_CAUSALITY` — 0 of 4 sites on the map, 0 found
  - how: compared each site discovery against its required world memory
- **PASS** `LIFE_ARCHIVE_IS_A_PROJECTION` — 0 of 0 chapters known to the player
  - how: compared the player projection against the canon archive

## EXPERIENCE CHECKS
- **PASS** `EXPERIENCE_LOG_RESOLVES` — 0 events met, all still in the registry
  - how: resolved the saved experience log against the registry
- **PASS** `DIRECTOR_NEVER_EMPTIES_A_ROOM` — wherever something could happen, the director offers something
  - how: ran the director against every location in the current world
- **PASS** `DIRECTOR_IS_DETERMINISTIC` — the same world plays the same sequence
  - how: directed every location twice and compared

## GALD ROUTES
- **PASS** `ROUTE_WIRING_SPARE` — PLAYER_SPARED_GALD → GALD_LEAVES_BANDITS → GALD_ARRIVES_IN_ALDEN → GALD_BECOMES_BAKER → ALDEN_BAKERY
  - how: walked the life-event chain from the choice and looked for a site at the end
- **PASS** `ROUTE_WIRING_HELP` — PLAYER_HELPED_GALD → GALD_WALKS_THE_ROAD → GALD_BECOMES_HEALER → GREENWOOD_WAYSTATION
  - how: walked the life-event chain from the choice and looked for a site at the end
- **PASS** `ROUTE_WIRING_CAPTURE` — PLAYER_CAPTURED_GALD → GALD_STANDS_TRIAL → GALD_COMPLETES_SENTENCE → GALD_WORKS_FOR_ALDEN → ALDEN_WORKYARD
  - how: walked the life-event chain from the choice and looked for a site at the end
- **PASS** `ROUTE_WIRING_KILL` — PLAYER_KILLED_GALD → GALD_IS_BURIED → GALD_GRAVE_TENDED → GREENWOOD_GRAVE
  - how: walked the life-event chain from the choice and looked for a site at the end
- **NOT TESTED** `ROUTE_PLAYTHROUGH_ALL` — battle -> choice -> TIME SHIFT -> discovery, played end to end for all four routes
  - how: not checked here — e2e/fourFutures.spec.ts plays all four in a browser

## SAVE
- **NOT TESTED** `SAVE_RESTORED` — nothing saved yet in this world, so there was nothing to restore
  - how: this world was read back from IndexedDB when the page loaded
- **NOT TESTED** `SAVE_SURVIVES_RELOAD` — a reload keeps what the player met and what the world remembers
  - how: not checked here — e2e navigation / rumorSeeds specs reload the page and re-read

## MOBILE
- **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
  - how: measured this screen in this browser, right now
- **MANUAL CHECK REQUIRED** `VISUAL_LAYOUT` — whether it looks right, not whether it fits
  - how: a person has to look — see VISUAL REVIEW REQUIRED at the end of this report

## FAILED CHECKS
- none

## WARNINGS
- none

## VISUAL REVIEW REQUIRED
- [ ] GREENWOOD / BATTLE — 探索画面のみ。主人公ミニキャラ・世界に溶けた発見の気配・場所の導入・静かな退出。戦闘画面は無変更
- unchanged, no screenshot needed: HOME, TAVERN / TALK, TITLE, PROLOGUE / KAOS, EXPLORE, WORLD MEMORY, LIFE CHOICE / ENDING, PLAYTEST SURVEY, DEV REVIEW HUB
