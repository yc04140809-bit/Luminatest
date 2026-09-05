# MUGEN ZERO QA REPORT

- Generated: 2026-09-05T13:51:10.453Z
- Build: MUGEN ZERO v0.1 / d602cdd / 2026-09-05T13:49:59.536Z
- Environment: dev server
- Result: no failed checks — 21 pass, 0 warn, 2 not tested, 1 manual

## CURRENT WORLD
- World time: 4年目 4日目 (day 1099)
- Route: SPARE
- TIME SHIFTs: 1
- WORLD MEMORY facts: 5
- LIFE ARCHIVE: 1 known / 4 in canon
- Future sites: ALDEN_BAKERY:ON MAP, GREENWOOD_WAYSTATION:not yet, ALDEN_WORKYARD:not yet, GREENWOOD_GRAVE:not yet

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
- **PASS** `WORLD_MEMORY_NO_DUPLICATES` — 5 facts recorded, no duplicates
  - how: compared every event id in the world currently loaded
- **PASS** `LIFE_CHOICE_IS_SINGULAR` — one choice: PLAYER_SPARED_GALD
  - how: counted the first-encounter outcomes in WORLD MEMORY
- **PASS** `WORLD_MEMORY_IN_ORDER` — history runs forwards
  - how: walked the event list comparing world dates
- **PASS** `FUTURE_SITE_CAUSALITY` — 1 of 4 sites on the map, 0 found
  - how: compared each site discovery against its required world memory
- **PASS** `LIFE_ARCHIVE_IS_A_PROJECTION` — 1 of 4 chapters known to the player
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
- **PASS** `SAVE_RESTORED` — restored 5 facts and 0 met events from IndexedDB
  - how: this world was read back from IndexedDB when the page loaded
- **NOT TESTED** `SAVE_SURVIVES_RELOAD` — a reload keeps what the player met and what the world remembers
  - how: not checked here — e2e navigation / rumorSeeds specs reload the page and re-read

## MOBILE
- **PASS** `NO_HORIZONTAL_SCROLL` — 844x390: nothing spills sideways
  - how: measured this screen in this browser, right now
- **MANUAL CHECK REQUIRED** `VISUAL_LAYOUT` — whether it looks right, not whether it fits
  - how: a person has to look — see VISUAL REVIEW REQUIRED at the end of this report

## FAILED CHECKS
- none

## WARNINGS
- none

## VISUAL REVIEW REQUIRED
- [ ] BATTLE UI PROTOTYPE — ランドスケープ化。上部情報帯（敵HP＝左／味方HP＝右）／中央戦闘領域／下部コマンドUI の3分割にしました。敵は左、味方（あなた＋ケイオス）は右で、互いを向いています。演出・タイムライン・古代龍のカットインは無変更です
- [ ] GREENWOOD / BATTLE — ランドスケープ化。探索フィールド（Phaser）のワールドは縦のまま中央に置き、場所名を左、操作説明と「森を出る」を右に配置しました。8つの発見スポットは背景画に合わせて手で置いたものなので動かしていません
- [ ] TITLE — ランドスケープ化。キービジュアル・ロゴ・翼の装飾・ボタンはそのままです
- [ ] HOME — ランドスケープ化。左に村（円のなか）、右に世界の記憶・探索する・下段レール、という2段組にしました。項目・文言・遷移は無変更です
- [ ] EXPLORE — ランドスケープ化。カードが横幅いっぱいに伸びないよう、読める幅で中央に置いています
- [ ] SETTINGS — ランドスケープ化。前ラウンドで足した「オープニングテーマ ON/OFF」はそのままです
- unchanged, no screenshot needed: ADMIN DEV TOOLS, OPENING THEME / SKIP, ARCANA / アルカナ図鑑, PROLOGUE / KAOS, TAVERN / TALK, WORLD MEMORY, LIFE CHOICE / ENDING, PLAYTEST SURVEY, DEV REVIEW HUB
