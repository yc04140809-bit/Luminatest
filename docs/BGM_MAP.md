# MUGEN ZERO — BGM 対応表

どの画面で、どの曲が流れるか。**混同防止のための正本**です。
曲の割り当てを変えたら、この表も必ず同じコミットで直してください。

- 割り当ての実装：`packages/mugen-core/content/audio/sceneBgm.ts`（画面 → trackId）
- 音源の登録：`packages/mugen-assets/src/manifest.ts`（trackId → ファイル）
- 音源ファイル：`packages/mugen-assets/files/audio/bgm/`

## 用語（固定）

| 用語 | 指すもの | コード上の画面（scene key） |
|---|---|---|
| **TITLE_SCREEN** | MUGEN ZERO のロゴ ＋「はじめる」ボタンの画面 | `TITLE`（App版は `THEME_CHOICE` の間もこの画面を描くので同じ扱い） |
| **OPENING** | タイトルの後の導入シーン（独白） | `PROLOGUE`（ケイオスが話し出す前） |
| **ALDEN_HOME** | アルデン（家）の画面。「探索する」「ステータス」などがある村の拠点 | `HOME` ほか下表 |
| **ALDEN_VILLAGE** | アルデン村（地図・店） | `EXPLORE` ほか下表 |

「ホーム画面」という言葉は使わないでください。タイトル画面と家の画面の
どちらにも読めて、実際に一度取り違えました（下の「経緯」）。

## 全BGM

| trackId | 表示名（ファイル内の曲名） | 実ファイル | 流れる scene key |
|---|---|---|---|
| `TITLE_MAIN` | MUGEN ZERO タイトル画面 | `title-main.mp3` | `TITLE` **のみ** |
| `OPENING` | また、ここで。 (Remastered) | `opening.mp3` | `PROLOGUE`（ケイオスが話す前） |
| `KAOS_EVENT` | ケイオスちゃんのテーマ会話シーン | `kaos-event.mp3` | `PROLOGUE`（ケイオス登場後）, `LIFE_CHOICE`, `CREATURE_LIFE_CHOICE`, `CHOICE_RESULT` |
| `ALDEN_HOME` | **（保留・専用曲なし）** | **なし → 無音** | `HOME`, `STATUS`, `BAG`, `WORLD_MEMORY`, `WORLD_NEWS`, `ARCHIVE`, `ARCANA`, `SETTINGS` |
| `ALDEN_VILLAGE` | アルデン村のテーマ | `alden-village.mp3` | `EXPLORE`, `ITEM_SHOP`, `TIME_SHIFT`, 村の `TALK_SPOT` / `FUTURE_SITE` |
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
| ↓ ALDEN_HOME | 無音（専用曲を保留中。タイトルやオープニングの曲は持ち越さない） |
| ↓ ALDEN_VILLAGE | `ALDEN_VILLAGE`（アルデン村のテーマ） |

## ファイルについての注意

- `alden-home.mp3` は **`title-main.mp3` と中身が同じファイル**（同じ録音）です。
  削除・リネームせずに残していますが、どこからも参照していません。
- ALDEN_HOME 専用曲が届いたら：ファイルを `bgm/` に置き、`manifest.ts` の
  `ALDEN_HOME: null` をそのファイルにするだけです。画面側の変更は要りません。
  Artifact の単一ファイル版に入れるには `REVIEW_AUDIO`
  （`packages/mugen-artifact/scripts/review-encode-assets.mjs`）にも追加します。

## 経緯（2026-09-20 → 09-25）

1. 「MUGEN ZERO タイトル画面」を「タイトル画面曲」として受領 → 直後に「HOME曲です」と訂正。
2. 「HOME」を**家の画面**と解釈して `ALDEN_HOME` として登録（本当はタイトル画面の意味だった）。
3. 実機で「タイトルだけ無音」と報告され、タイトルにも `ALDEN_HOME` を割り当てた。
   → タイトルと家が同じ曲になっていた。
4. 2026-09-25：用語を固定し、この曲を `TITLE_MAIN` としてタイトル専用に分離。
   `ALDEN_HOME` は専用曲が決まるまで保留（無音）。
