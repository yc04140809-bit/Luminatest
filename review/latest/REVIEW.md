# MUGEN REVIEW PACKAGE — OPENING EXPERIENCE v0.1 — タイトル／OPテーマ音楽システム（採用前）

- Generated: 2026-09-05T10:09:33.685Z
- Commit: 0956e3e on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: 0956e3e
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**まだ採用していません。**

**最初にいちばん大事なことを書きます。楽曲ファイルはまだ入っていません。**
`MUSIC_ASSETS.OPENING_THEME = null` です。したがって現状、
**実際には音は一切鳴りません**。今回作ったのは「曲が置かれた瞬間に鳴る器」で、
曲そのものではありません。これを「OPテーマを実装した」と書くと嘘になるので、
はっきり分けて書きます。

**曲の入れ方は2手です。**
`src/assets/audio/music/opening-theme.mp3` にファイルを置き、
`src/assets/manifest.ts` の `MUSIC_ASSETS.OPENING_THEME` へ import を書く。
それだけです。**パスの正本はこの1か所**で、他のどのコンポーネントにも
曲のパスは書いていません。

**新しい画面は増やしていません。** 指示どおり既存導線に統合しました。
タイトルの「はじめる」「つづきから」は**すでに** `audioManager.unlock()` を
呼んでいた場所（＝ブラウザが音を許す最初のジェスチャ）なので、
そこへ1行足すだけで済みました。OP専用のタイトル画面もカットインも
足していません。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-05T10:09:33.517Z / viewport 390x844

- `review/latest/01_settings_opening_row.png` — SETTINGS：オープニングテーマの行。既定でON、説明が1行、BGM音量の下に自然に並んでいるか
- `review/latest/02_opening_a_skip_shown.png` — OPENING THEME / SKIP：A：曲が鳴っている間のSKIP。ロゴにも本文にもかぶらず、右上に小さく出ているか
- `review/latest/03_opening_b_after_skip.png` — OPENING THEME / SKIP：B：SKIP直後。ボタンだけが消え、読んでいた画面はそのまま（場面は飛ばない）
- `review/latest/04_admin_a_lock.png` — ADMIN DEV TOOLS：A：管理者ロック。控えめな入口の先にあり、入力はそのまま表示されないか
- `review/latest/05_admin_b_home.png` — ADMIN DEV TOOLS：B：ADMIN HOME。「演出プレビュー」が最初にあり、既存の開発スイッチは下に残っているか
- `review/latest/06_admin_c_preview_list.png` — ADMIN DEV TOOLS：C：演出プレビュー一覧。ARCANA ＞ 召喚事故 ＞ UNKNOWN #001。正式名称は出していないか
- `review/latest/07_admin_d_dragon.png` — ADMIN DEV TOOLS：D：巨大召喚。左向き・敵側・画面の半分以上。DUMMY表示で実戦と誤認しないか
- `review/latest/08_admin_e_breath.png` — ADMIN DEV TOOLS：E：カットイン。顔・口元・ブレス・文字が読めるか。技名の二重表示がないか
- `review/latest/09_admin_f_unknown.png` — ADMIN DEV TOOLS：F：フルシーケンス中の ARCANA #??? / UNKNOWN。実戦と同じカードか
- `review/latest/10_admin_g_talk.png` — ADMIN DEV TOOLS：G：フルシーケンス終盤の会話。実戦と同じ4行か
- `review/latest/11_admin_h_end.png` — ADMIN DEV TOOLS：H：PREVIEW END。もう一度／一覧へ。戦場に何も残っていないか

撮影していない画面（変更なし。テスト結果で報告）:
- BATTLE UI PROTOTYPE — 召喚事故の演出を ui/cinematic へ切り出し、実戦とプレビューが同じ定義を再生するようにしました。画面の見え方・順序・「間」は前ラウンドから1つも変えていません（E2E 29本が無変更で通ります）
- ARCANA / アルカナ図鑑 — 前ラウンドから無変更です
- HOME — 前ラウンドで承認待ちの5項目導線のまま。今回は無変更です
- GREENWOOD / BATTLE — 前ラウンドから無変更。試作は既存画面を置き換えていません
- TAVERN / TALK — シーンアート修正版のまま
- TITLE — v0.1 のまま
- PROLOGUE / KAOS — v0.1 のまま
- EXPLORE — v0.1 のまま
- WORLD MEMORY — v0.1 のまま
- LIFE CHOICE / ENDING — v0.1 のまま
- PLAYTEST SURVEY — v0.1 のまま
- DEV REVIEW HUB — v0.1 のまま

## 3. 新規機能の動作確認結果

- **タイトル画面の見た目は変えていません。** カオスのキービジュアル、ロゴ、
  翼の装飾、ボタン配置、すべて無変更です。
- 新しく画面に出るのは **SKIP チップ1個だけ**で、
  **曲が実際に鳴っている間しか出ません**。曲が無い今は**出ません**
  （「無音をスキップしませんか」と聞く画面は作らない、が方針です）。
- 360 / 390 / 412px で横スクロールなし。SKIPは `position: fixed` で
  レイアウトに幅を足さないため、**文書の幅を1pxも広げません**（E2Eで検証）。
- 設定画面に「オープニングテーマ ON/OFF」を1行追加しました。
  既存のBGM音量・SE音量・振動・演出控えめの並びに合わせています。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-05T10:09:33.433Z
- Build: MUGEN ZERO v0.1 / 0956e3e / 2026-09-05T10:09:02.805Z
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

```

## 4. 既存機能への影響

新規：`platform/openingTheme.ts`（鳴らすかどうかの判断）、
`ui/opening/useOpeningTheme.ts`（SKIPを出すかどうか）、
`ui/opening/OpeningSkip.tsx`、`dev/openingRehearsal.ts`（DEV専用の代役）。

変更：`assets/manifest.ts`（`MUSIC_ASSETS` 追加）、
`platform/audio.ts`（OP再生・フェード・停止・可視性）、
`platform/settings.ts`（`openingMode`）、`ui/screens/SettingsScreen.tsx`、
`App.tsx`（既存の unlock 地点に1行）、`ui/styles.css`（SKIPチップ）、
`dev/DevAdminScreen.tsx`（項目1つ追加）、`vite.config.singlefile.ts`（音声を
インライン化しない）。

**ゲームプレイ・戦闘・召喚・事故演出・ARCANA・世界・セーブ内容は
1つも変更していません。**

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  528 passed (528) |
| E2E (playwright) | PASS | 238 passed (12.7m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 6.64s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-Cw6NrLlS.js                    1.42 kB │ gzip:   0.78 kB
dist/assets/CinematicPreviewScreen-C4tWrLCL.js           5.00 kB │ gzip:   1.82 kB
dist/assets/DevAdminScreen-BPK5z3Y7.js                  48.99 kB │ gzip:  16.39 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/index-KHEEuCBj.js                          174.50 kB │ gzip:  53.37 kB
dist/assets/GreenwoodScreen-C3lNaSB4.js              1,498.86 kB │ gzip: 346.19 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。**

## 8. Save compatibility

**セーブ互換に影響なし。** `openingMode` は localStorage の設定側であって
IndexedDB の世界データではありません。**この項目が無い古い設定は
「OFF」ではなく「既定（1回だけ再生）」として読みます**（単体テスト済み）。
一度も選んでいない人が、黙ってOPを失うことがないようにするためです。

## 9. 既知の問題

1. 【未完・重要】**楽曲が無いので音は鳴りません。** 上記のとおり器だけです。
   実機での「音の出方」の確認は、曲を入れてからでないとできません。
2. 【制限】**アーティファクト（単一HTML）では、曲を入れても鳴りません。**
   単一HTMLは全アセットをbase64で埋め込む方式で、前ラウンドで21.97MBに
   膨らんで16MB制限に当たった経緯があります。指示の「音源を巨大なbase64として
   埋め込まない」に従い、**音声だけインライン化対象から外しました**
   （`assetsInlineLimit` を関数化）。結果、アーティファクトでは曲だけが
   外部参照のまま＝無音になります。**アーティファクトは見る用、
   音はリポジトリのビルドで確認**、という切り分けです。
3. 【DEV】曲が無いと SKIP ボタンを一度も画面に出せず、
   「押せるか」「360pxではみ出さないか」を検証できません。そこで
   **DEV専用の代役**（`openingRehearsal.ts`／ADMIN の
   「SKIP表示のリハーサル」）を入れました。**音は鳴らしません。
   Audio要素も作りません。**6秒だけ「鳴っていることにする」だけの
   スイッチで、プレイヤーが到達できるビルドからは消えます。
   E2Eの11本はこれを使っています。
4. 【正直に報告】`npm run review` の1回目で `mossRabbit` の
   「the species outlives the individual」が **1本落ちました**（237/238）。
   その後、**同じ238本のフルスイートを丸ごと回し直して 238/238 通り**、
   単体でも 5/5 通っています。**フレークと断定はしません**。落ちた回の
   エラー内容を読む前に再実行してしまい、詳細を失いました（わたしのミスです）。
   既知の `explorationLoop` / `phaseD` と同じ「重い並列実行のときだけ落ちる」
   系統に見えますが、確証はありません。**今回のOP実装は通常時に何も描画せず**
   （曲が無いのでSKIPは出ません）、この経路に触っていません。
5. 【継続・別issue】`explorationLoop` / `phaseD` の負荷依存フレーク、
   盗賊ガルドの右脚欠け。今回も触っていません。

## 10. Claude 自身が気になる箇所

- **出口を1つにしたことが今回の芯です。** 自然終了・SKIP・BGMを0にした・
  画面を離れた、のすべてが `AudioManager.finishOpening()` という
  **1つの private メソッド**を通ります。コールバックは**必ず1回**。
  SKIPを2回押しても、フェード中に曲が終わっても、1回です
  （単体テストで回数を数えています）。二重遷移は構造的に起きません。
- **音量を二重管理していません。** OPは既存の `bgmVolume` をそのまま使い、
  OP専用の音量は作っていません。**再生中にBGMを0にしたら、
  静かになるのではなく停止**します。BGM OFF の人にOPだけ鳴らす、は
  実装していません（`shouldPlayOpening` が最初に見るのが音量です）。
- **autoplay を突破していません。** 再生は既存の最初のタップにだけ乗せ、
  ミュート再生の裏技も再試行ループも入れていません。ブラウザが断ったら
  **無音のまま普通にゲームが始まります**（エラー扱いにしません）。
- **バックグラウンドで鳴り続けません。** `visibilitychange` で pause し、
  **自動で再開しません**。戻った瞬間に急に歌い出す方が不快ですし、
  自動再開は2重再生をいちばん作りやすい経路だからです。
- **フェードは定数です。** `OPENING_FADE_MS = 500`（指示の300〜800msの中）。
  ハンドラの中に数字を直書きしていません。
- **Timeline Engine は作っていません。** 曲が鳴り、SKIPで終わる。
  それだけです。カット割りもキュー表もありません。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前）。**

次に必要なのは**楽曲そのもの**の判断です。こちらでは音源を作らず、
外部から持ってきもしませんでした。ロゴアニメーション・OP専用カットイン・
歌詞表示・複数曲のクロスフェード・ボス曲などへは進みません。
