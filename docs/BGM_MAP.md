# MUGEN ZERO — BGM 対応表

どの画面で、どの曲が流れるか。**混同防止のための正本**です。
曲の割り当てを変えたら、この表も必ず同じコミットで直してください。

- 割り当ての実装：`packages/mugen-core/content/audio/sceneBgm.ts`（画面 → trackId）
- 音源の登録：`packages/mugen-assets/src/manifest.ts`（trackId → ファイル）
- 音源ファイル：`packages/mugen-assets/files/audio/bgm/`

## 用語（固定）

| 用語 | 指すもの | コード上の画面（scene key） |
|---|---|---|
| **TITLE_SCREEN**（タイトル画面） | MUGEN ZERO のロゴ ＋「はじめる」ボタンの画面。**「タイトル画面」はこの画面だけを指す** | `TITLE`（App版は `THEME_CHOICE` の間もこの画面を描くので同じ扱い） |
| **OPENING** | タイトルの後の導入シーン（独白） | `PROLOGUE`（ケイオスが話し出す前） |
| **ALDEN_HOME** | アルデン（家）の画面。「探索する」「ステータス」などがある村の拠点 | `HOME` |
| **ALDEN_VILLAGE** | アルデン村（地図・店） | `EXPLORE`, `ITEM_SHOP` |

- OPENING や ALDEN_HOME を「タイトル画面」と呼ばないこと。
- 「ホーム画面」という言葉は使わないこと（タイトル画面と家の画面のどちらにも読めて、実際に取り違えた。下の「経緯」）。
- ALDEN_HOME は**画面の名前**で、曲のIDではない。家専用の曲は作らない（正式決定）。

## 全BGM

| trackId | 表示名（ファイル内の曲名） | 実ファイル | 流れる scene key |
|---|---|---|---|
| `TITLE_MAIN` | MUGEN ZERO タイトル画面 | `title-main.mp3` | `TITLE` **のみ** |
| `OPENING` | また、ここで。 (Remastered) | `opening.mp3` | `PROLOGUE`（ケイオスが話す前） |
| `KAOS_EVENT` | ケイオスちゃんのテーマ会話シーン | `kaos-event.mp3` | `PROLOGUE`（ケイオス登場後）, `LIFE_CHOICE`, `CREATURE_LIFE_CHOICE`, `CHOICE_RESULT` |
| `ALDEN_VILLAGE` | アルデン村のテーマ | `alden-village.mp3` | **ALDEN_HOME**（`HOME`）、家から開くページ（`STATUS`, `BAG`, `WORLD_MEMORY`, `WORLD_NEWS`, `ARCHIVE`, `ARCANA`, `SETTINGS`）、**ALDEN_VILLAGE**（`EXPLORE`, `ITEM_SHOP`）、`TIME_SHIFT`、村の `TALK_SPOT` / `FUTURE_SITE` |
| `TAVERN` | 酒場のテーマ | `tavern.mp3` | `TALK_SPOT` / `FUTURE_SITE` の月光亭（App版にはまだ無い） |
| `GREENWOOD_FOREST` | 森林探索のテーマ | `greenwood-forest.mp3` | `GREENWOOD`, `ENCOUNTER`, 森の `TALK_SPOT` / `FUTURE_SITE` |
| `NORMAL_BATTLE` | 通常戦闘① | `normal-battle.mp3` | `BATTLE`, `BATTLE_RESULT`（初期状態・選んだとき） |
| `BOSS_BATTLE` | 勇敢 | `boss-battle.mp3` | ガルド戦（固定・♪なし）。ガルドに勝った後は ♪ で通常戦闘でも選べる |

テーマ曲をフルで流す「聴く」は BGM ではなく別枠（`MUSIC_ASSETS.OPENING_THEME`
＝ `opening.mp3`、1回だけ再生）。Artifact版のタイトル前の画面だけにあります。

無音の画面：`THEME_CHOICE`（Artifact版のタイトル前の画面）、`ENDING`、開発用の画面。

## 遷移で流れる曲

| 画面 | 流れる曲 |
|---|---|
| TITLE_SCREEN | `TITLE_MAIN`（MUGEN ZERO タイトル画面） |
| ↓ OPENING | `OPENING`（また、ここで。） |
| ↓ ALDEN_HOME | `ALDEN_VILLAGE`（アルデン村のテーマ） |
| ↔ STATUS | 同じ曲が**そのまま続く** |
| ↔ ALDEN_VILLAGE | 同じ曲が**そのまま続く** |

## 同じ曲は続けて鳴らす

家・村・ステータスなどは**同じ trackId（`ALDEN_VILLAGE`）**にしてあります。
次の画面が今鳴っているのと同じ trackId を求めた場合、再生側（`playBgm`）は
何もしません。止めない、頭に戻さない、フェードもしない。

例：村 → 家 → ステータス → 家 → 村。この間ずっと同じ曲が途切れずに続きます
（App版・Artifact版ともにテストで確認済み。同じ再生要素のまま、再生位置が戻らないこと）。

別の曲を割り当てる画面を増やすときは、同じ曲のつもりなら**同じ trackId** にしてください。
同じファイルを別の trackId で登録すると、画面が変わるたびに頭から再生し直します。

## ファイルについての注意

- `alden-home.mp3` は **`title-main.mp3` と中身が同じファイル**（同じ録音）です。
  削除・リネームせずに残していますが、どこからも参照していません。

## 経緯（2026-09-20 → 09-25）

1. 「MUGEN ZERO タイトル画面」を「タイトル画面曲」として受領 → 直後に「HOME曲です」と訂正。
2. 「HOME」を**家の画面**と解釈して `ALDEN_HOME` として登録（本当はタイトル画面の意味だった）。
3. 実機で「タイトルだけ無音」と報告され、タイトルにも `ALDEN_HOME` を割り当てた。
   → タイトルと家が同じ曲になっていた。
4. 2026-09-25：用語を固定し、この曲を `TITLE_MAIN` としてタイトル専用に分離。
5. 2026-09-25（正式決定）：家の専用曲は作らない。ALDEN_HOME はアルデン村のテーマ
   （`ALDEN_VILLAGE`）をそのまま使い、村・家・ステータスの間で曲を途切れさせない。
