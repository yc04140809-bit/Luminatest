# MUGEN REVIEW PACKAGE — 探索ゲームプレイループ — 到着・発見・次の気配

- Generated: 2026-09-03T22:55:37.147Z
- Commit: f7fc091 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: f7fc091
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**見た目は変えていません。** 背景・明るさ・彩度・主人公・ケイオスちゃん・
金色リング・上部タイトル・下部UI・アイボリー系UIはすべて無変更です。
今回足したのは「歩いた先で何かが起きて、また次の気配が現れる」という**動き**だけ。

- **到着してから起きる**。リングはタップ対象ではありません。タップは常に
  「そこへ行け」の意味で、結果が決まるのは**足がそこに着いたとき**です。
- **到着演出は約450ms**。リングが一度きゅっと縮み、金の輪をひとつ放って消えます。
  主人公が小さく跳ね、**190ms遅れて**ケイオスちゃんも跳ねます（後ろから来たので）。
- **結果は EVENT / ITEM / BATTLE の3種**。仮の重みは 50 / 25 / 25 で、
  `EXPLORATION_ENCOUNTER_WEIGHTS` 1か所にまとまっています。
  直前と同じ種類が出たら**1回だけ引き直し**ます（連続の角を落とすだけの仕組みです）。
- **ITEM と EVENT は森の上で読みます。** 画面を切り替えません。二人が絵の中に
  立ったまま、その場所で起きたこととして読めます。**白いveilは被せていません。**
- **BATTLE だけ画面を出ます。** ごく短い揺れと暗転のあと戦闘へ。勝つと、
  **さっき立っていた場所に戻ります**（入口ではありません）。
- **次のリングは別の場所に出ます。** 直前の座標は必ず避け、主人公から
  130単位以上離れた候補を選びます。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-03T22:55:36.996Z / viewport 390x844

- `review/latest/01_greenwood_forest.png` — GREENWOOD / BATTLE：主人公とケイオスちゃんが二人の人物に見えるか。発見の気配が世界に馴染んでいるか
- `review/latest/02_greenwood_walking_side.png` — GREENWOOD / BATTLE：横に歩いたときに向きが変わるか。足元がタップ地点に来ているか。ケイオスちゃんが道をなぞって付いてくるか
- `review/latest/03_greenwood_found_item.png` — GREENWOOD / BATTLE：アイテム発見カード。森の上で読めるか、文字が画面外に出ていないか
- `review/latest/04_greenwood_forest_event.png` — GREENWOOD / BATTLE：森の小さな出来事。世界を映したまま会話できているか（白いveilを被せていないか）

撮影していない画面（変更なし。テスト結果で報告）:
- HOME — v0.2 で承認済み
- TAVERN / TALK — シーンアート修正版のまま
- TITLE — v0.1 のまま
- PROLOGUE / KAOS — v0.1 のまま
- EXPLORE — v0.1 のまま
- WORLD MEMORY — v0.1 のまま
- LIFE CHOICE / ENDING — v0.1 のまま
- PLAYTEST SURVEY — v0.1 のまま
- DEV REVIEW HUB — v0.1 のまま

## 3. 新規機能の動作確認結果

- EVENT / ITEM / BATTLE の3ルートすべてを実機幅で確認。
- 360 / 390 / 412px で発見カードが画面内に収まること、
  「手に入れた」が44px以上のタップ領域であること、横スクロールが出ないことを自動テスト化。
- 連打・移動中タップでも結果が二重に出ないことを自動テスト化（記録件数=1で検証）。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-03T22:55:36.588Z
- Build: MUGEN ZERO v0.1 / f7fc091 / 2026-09-03T22:55:05.701Z
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

```

## 4. 既存機能への影響

`GreenwoodScene`（到着・演出・再配置）、`GreenwoodScreen`（結果の表示）、
`BattleScreen`（敵を差し替え可能に。既定はガルドのまま）、`gameFlow`（森↔戦闘の遷移）、
`App`（配線）。新規は発見ロジック・足跡セッション・森の小イベント・拾い物・
DEV用の強制発生。**既存の主人公・ケイオス・背景・リングの描画コードは触っていません。**

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  312 passed (312) |
| E2E (playwright) | PASS | 111 passed (8.1m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 5.92s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-BEpdy03y.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-C7wGaKoJ.js                  39.90 kB │ gzip:  13.43 kB
dist/assets/index-DoH3aQea.js                          120.81 kB │ gzip:  36.43 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen-Q338Xtce.js              1,500.22 kB │ gzip: 346.36 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。** 拾ったものは WORLD MEMORY ではなく localStorage に置いています。
森でどんぐりを拾ったことを世界が記憶する必要はなく、HOMEの
「記憶 / 出会い / 再会 / 問い」の数が動いてはいけないからです。

## 8. Save compatibility

**セーブ互換に影響なし。**

## 9. 既知の問題

1. 【新規】**はぐれ狼に立ち絵がありません**（絵文字のプレースホルダー）。
   ガルドの顔を借りるよりは正直だと判断しました。要アセット。
2. 【新規】**森のイベントは4本だけ**（うち1本だけ繰り返し）。使い切ると
   EVENTを引いてもITEMになります。破綻はしませんが、本数は足りていません。
3. 【新規】拾ったものに**用途がありません**。装備も消費もできません。
   インベントリを新設しない指示に従い、記録だけしています。
4. 【継続】`phaseD` の負荷依存フレーク（TIME SHIFT 二重タップ待ち）。
5. 【継続】盗賊ガルドの立ち絵：右脚欠け／敗北ガルドが切り抜きでない件。

## 10. Claude 自身が気になる箇所

- **「タップした瞬間に画面が変わる」のをやめたのが今回の全部でした。**
  以前はリングに触れた瞬間に遷移していたので、リングは**ボタン**でした。
  到着してから結果を決めるようにしただけで、同じ絵が
  「あそこに何かある」に変わります。因果が逆になるだけで体験が変わりました。
- **ITEMとEVENTで画面を切らなかったのは正解でした。** 最初は既存の会話画面
  （森の背景つき）へ飛ばす実装も考えましたが、同じ森をもう一度読み込んで
  同じ絵を出すだけで、テンポだけが落ちます。世界の上に載せると
  「その場所で起きたこと」になりました。
- **距離のとり方が唯一の難所です。** 次のリングを近くに出すと歩く意味がなくなり、
  遠くに出すと移動が作業になります。今は「130単位以上・直前と別座標」で、
  実機だと2〜4タップぶんです。第三者テストで「遠い」と言われたら下げてください。
- **BATTLEの戻り先を入口にしなかったのは意図的です。** 勝ったのに歩き直しに
  なるのは罰です。足跡セッションを持ったのはそのためだけです。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（探索ループ Phase 1 + Phase 2）。**

インベントリ、装備、天候、昼夜、敵の追加、他フィールドへは進みません。
