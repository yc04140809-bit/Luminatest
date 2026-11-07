# MUGEN ZERO — BGM 対応表

どの画面で、どの曲が流れるか。**混同防止のための正本**です。
曲の割り当てを変えたら、この表も必ず同じコミットで直してください。

- 割り当ての実装：`packages/mugen-core/content/audio/sceneBgm.ts`（画面 → trackId）
- 音源の登録：`packages/mugen-assets/src/music.ts`（trackId → ファイル。`manifest.ts` が再エクスポート）
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
| `TAVERN` | 酒場のテーマ | `tavern.mp3` | `TALK_SPOT` / `FUTURE_SITE` の月光亭。App版はアルデン村の「月灯りの酒場」（`TALK_SPOT` ＋ `MOONLIGHT_TAVERN` として渡す） |
| `GREENWOOD_FOREST` | 森林探索のテーマ | `greenwood-forest.mp3` | `GREENWOOD`, `ENCOUNTER`, 森の `TALK_SPOT` / `FUTURE_SITE` |
| `NORMAL_BATTLE` | 通常戦闘① | `normal-battle.mp3` | `BATTLE`, `BATTLE_RESULT`（初期状態・選んだとき） |
| `BOSS_BATTLE` | 勇敢 | `boss-battle.mp3` | ガルド戦（固定・♪なし）。ガルドに勝った後は ♪ で通常戦闘でも選べる |
| `SEKIRYUGA_BATTLE` | BOSS戦闘（BOSS戦②） | `sekiryuga-battle.mp3`（App のみ） | セキリュウガ戦（固定・♪なし）。勝った後は ♪ で選べる（2026-10-11） |
| `SPECIAL_BATTLE` | 狩りの鼓動 | `special-battle.mp3`（App のみ） | フウミミ（個体）戦など特殊な戦闘（固定・♪なし）。勝った後は ♪ で選べる |
| `NORMAL_BATTLE_2` | 通常戦闘曲② | `normal-battle-2.mp3`（App のみ） | ヒョウレイ・イワホロ・コケマル・フウミミ（通常）との通常戦闘（♪ で選んでいない時）。勝つと ♪ で選べる |
| `RESULT_NORMAL` | Victory's Clear Dawn | `result-victory.mp3`（App のみ） | `BATTLE_RESULT`（通常戦闘の報酬画面）。閉じると元の曲へ |
| `RESULT_BOSS` | （未着） | — | ボス戦の報酬画面用の枠。今はボス戦に報酬画面が無く、曲が届くまでは `RESULT_NORMAL` を借りる |

テーマ曲をフルで流す「聴く」は BGM ではなく別枠（`MUSIC_ASSETS.OPENING_THEME`
＝ `opening.mp3`、1回だけ再生）。Artifact版のタイトル前の画面と、App版のタイトル前の画面
（2026-10-30 タスクC：`ui/themeIntro.tsx`。起動のたびに黒地＋ロゴ＋『また、ここで。』＋SKIP、
ブラウザ版は「タップで開始」から。曲の終わりか SKIP でタイトルへ進み、そこで初めて `TITLE_MAIN`。
再生中はシーンの BGM を求めないので、2曲が重なることはない。ループなし）にあります。

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

## 村 BGM 変更（酒場ハブ化 Phase 1、2026-10-09）

吟遊詩人の MUSIC ARCHIVE で、聞いたことのある曲を「村の BGM」に設定できる（セーブ `villageBgm`）。設定曲が流れるのは家・家から開くページ・地図（EXPLORE）・道具屋・パン屋だけ。TIME_SHIFT・未来の場所・酒場・森・戦闘・ケイオスの場面は表の曲のまま。未設定なら表のとおり。Artifact は設定を持たないので変わらない。詳細は `docs/TAVERN_HUB.md`。

## App 専用の曲・リザルト曲（2026-10-11）

- 新しい曲は **App だけ** に入れています（`mugen-assets/src/appMusic.ts`）。共有の `music.ts` では枠だけ（null）なので、Artifact版には入らず鳴りもしません。
- 曲の差し替えは「ファイルを `files/audio/bgm-app` に置く → `appMusic.ts` で import して枠に入れる」だけです（`files/audio/bgm` は Artifact版と共有で、Artifact のビルド確認がそこの全ファイルを求めるため、App 専用・未使用の曲は `bgm-app` に分けています）。
- リザルト画面：戦闘勝利 → `RESULT_NORMAL` に切り替え → 報酬確認 → 「つぎへ」で森（`GREENWOOD_FOREST`）へ戻る。1曲ずつ切り替わり、二重再生しません（`preRaidUx` で確認）。倍速・AUTO とは関係しません。
- 届いていて、まだ組み込んでいない曲：`royal-castle.mp3`（西洋王城の威儀）。使う場所ができた時に import します（import するまで APK の容量は増えません）。
- 第1章終盤（2026-10-12、App のみ）：`CHURCH_HYMN`（`church-hymn.mp3`・厳かな協会の歌）＝遺跡の最奥でフードの男が封印を解く場面。`CHAPTER1_FINAL_BOSS`（`chapter1-final-boss.mp3`・立ち向かう背中）＝翌朝の地響きから襲撃・草原への誘導・ヴァルシール戦まで。前夜（家）は村の曲のまま。場面ごとの割り当ては `content/story/chapter1Finale.ts` の `FINALE_SCENE_BGM`。復興・旅立ちの曲は手順6で決める。
