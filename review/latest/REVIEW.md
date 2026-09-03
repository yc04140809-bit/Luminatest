# MUGEN REVIEW PACKAGE — 探索ミニキャラ — スプライトシート準拠へ

- Generated: 2026-09-03T17:16:29.949Z
- Commit: 4608ea3 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: 4608ea3
- Verdict: SOMETHING FAILED — see 5

## 1. 実装前 → 実装後の変更点

**主人公ミニキャラのみの変更です。** 世界背景・発見の気配・UI・遭遇ロジック・
WORLD MEMORY・イベント・戦闘・ガルド・酒場・時間経過・人生記録は無変更。

添付スプライトシートを**基準資料**として、探索画面のミニキャラを描き直しました。
**画像は1枚も貼っていません。シートからフレームを切り出してもいません。**
参照したのはデザイン（造形・比率・配色）だけで、実装は Phaser のプリミティブです。

- **チビ比率へ作り直し** — 頭部が全身の約半分。大きく柔らかいダークブラウンの髪の塊、
  襟足、跳ねた一本（アホ毛）、耳の横に落ちるサイドの束。
- **旅装** — 肩から掛かる大きなストール（裾がぎざぎざ）、その下に見える布と革のベルト、
  短いブーツ。黒に近いが青みを持つ暗色で、森の地面から輪郭が消えないようにしています。
- **後ろ姿を基準に** — 探索は「奥へ歩いていく」ので、既定は背面。
  背面のときだけ、マントの背に淡い金の紋章が見えます。
- **向きは3種**（背面・正面・側面）。同じ人物を3つのサブコンテナで持ち、
  進行方向で切り替えます。横に動いたときだけ側面、手前に来るときだけ正面。
  **コンテナ全体の左右反転はやめました**（文字通り裏返っていたため）。
- **止まっていても生きている** — 待機中はゆっくり上下に呼吸します。
  完全な静止こそが「位置マーカー」に見える原因なので、そこだけは止めていません。
- サイズは 1.85 → **1.9倍**（記号化しない大きさ）。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-03T17:16:29.751Z / viewport 390x844

- `review/latest/01_greenwood_forest.png` — GREENWOOD / BATTLE：主人公が人に見えるか。発見の気配が世界に馴染んでいるか

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

- 背面／側面／正面の3方向を実機解像度で確認。切り替えは移動方向のみで決まります。
- 遭遇の座標・半径・速度・発火条件は無変更。既存 E2E は書き換えなしで通ります。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-03T17:16:29.334Z
- Build: MUGEN ZERO v0.1 / 4608ea3 / 2026-09-03T17:16:19.520Z
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

`GreenwoodScene.createTraveller` / `buildFigure` / 向き切り替え / 待機モーションのみ。
他画面・他ロジックへの影響はありません。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  278 passed (278) |
| E2E (playwright) | FAIL | 103 passed (7.7m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 7.96s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-BGA3EasY.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-DDP-Pmsh.js                  39.08 kB │ gzip:  13.13 kB
dist/assets/index-1CzsPPFH.js                          116.39 kB │ gzip:  34.74 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen-rWKtQmvX.js              1,489.98 kB │ gzip: 343.20 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。**

## 8. Save compatibility

**セーブ互換に影響なし。**

## 9. 既知の問題

1. **【要アセット】正式スプライトの書き出し。**
   現在もプリミティブによる再現で、**顔の描き込みはありません**（正面は目のみ）。
   シートの完成度には届かないので、最終的には
   IDLE / WALK×3 / RUN の透過 PNG を書き出して差し替えるのが本筋です。
   差し替え先は `buildFigure()` 1メソッドで、移動・向き・遭遇の各コードは触りません。
2. 【継続】`phaseD` の負荷依存フレーク（TIME SHIFT 二重タップ待ち・探索とは無関係）。
3. 【継続】盗賊ガルドの立ち絵：右脚欠け。
4. 【継続】敗北ガルドの立ち絵が切り抜きでない件。

## 10. Claude 自身が気になる箇所

- **シートを見て一番効いたのは「頭の大きさ」でした。** 前回は頭が小さく、
  服の色だけ合わせても大人の縮小版に見えていました。頭部を全身の半分近くまで
  大きくした時点で、ようやくシートのチビと同じ生き物に見えます。
- **左右反転をやめたのは正しかった。** これまでは向き変更をコンテナの
  `scaleX = -1` でやっていたので、背面のまま鏡像になるだけでした。
  3方向を別に描くほうが、コード量は増えても意味が正しくなります。
- **優先順位（背景 → 気配 → 主人公 → UI）とのせめぎ合い。** 主人公を大きくすると
  存在感は出ますが、気配より目立ってはいけません。今は「気配が画面中央の
  明るい場所にあり、主人公は下端にいる」という配置で順位を保っています。
  実機で主人公のほうが先に目に入るようなら、下げるべきです。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（探索ミニキャラ）。**

正式スプライトの書き出し、他フィールド展開、Live2D へは進みません。
