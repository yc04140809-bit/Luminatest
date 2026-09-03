# MUGEN REVIEW PACKAGE — 探索の主人公 — 公式スプライトの切り出し実装

- Generated: 2026-09-03T19:59:32.944Z
- Commit: bd09370 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: bd09370
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**主人公の表示だけの変更です。** 世界背景・発見の気配・UI・遭遇ロジック・
WORLD MEMORY・イベント・戦闘・ガルド・酒場・時間経過・人生記録は無変更。

前回までの「プリミティブで似せて描いた簡易主人公」は**完全に削除**しました。
いま画面に立っているのは、添付スプライトシートから**実際に切り出した画像**です。

- **画像アセット化** — シートの IDLE 1行 × 4方向 と WALK 3行 × 4方向、
  合計 **16枚の透過 PNG** を書き出し、`src/assets/characters/hero/` に置きました。
  背景・ラベル・仕様欄・隣のコマは1ピクセルも入っていません。
- **シートを1枚絵として貼ってはいません。** 表示されるのは常に1コマだけです。
- **切り出しは再実行できます** — `tools/cut-hero-sprites.py` と、元シート
  `art-source/hero-exploration-sheet.png` をリポジトリに入れてあります。
- **基準点は「両足の接地点」**。画像中央ではありません。タップした地点に
  彼の**足が**着きます。接地影は薄い楕円のみ（黒影・白ぼかし・発光はなし）。
- **向きは4方向**（後ろ／正面／左／右）。移動量の大きい軸で決まります。
- **歩行は3コマ**を 150ms ずつ。停止中は待機コマ＋ごく浅い呼吸（足は動きません）。
- **サイズは画面幅の 11%**（体の幅で測って、360/390/412 のいずれでも同じ割合）。
- **コンポーネント化** — `ExplorationCharacter`（`src/game/exploration/PlayerSprite.ts`）に
  `characterId` / `direction` / `state` を渡す形。シーンは座標だけを持ちます。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-03T19:59:32.791Z / viewport 390x844

- `review/latest/01_greenwood_forest.png` — GREENWOOD / BATTLE：主人公が添付スプライトの本人に見えるか。発見の気配が世界に馴染んでいるか
- `review/latest/02_greenwood_walking_side.png` — GREENWOOD / BATTLE：横に歩いたときに向きが変わるか。足元がタップ地点に来ているか

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

- 360 / 390 / 412px で、待機（後ろ姿）・上へ歩く・左へ歩く・右下へ歩くを確認。
- 遭遇の座標・半径・速度・発火条件は無変更。既存 E2E は書き換えなしで通ります。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-03T19:59:32.374Z
- Build: MUGEN ZERO v0.1 / bd09370 / 2026-09-03T19:59:18.478Z
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

`GreenwoodScene` の主人公生成・向き切り替え・歩行モーションのみ。
新規に `PlayerSprite.ts` / `facing.ts` / `explorationSprites.ts` と画像16枚。
他画面・他ロジックへの影響はありません。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  282 passed (282) |
| E2E (playwright) | PASS | 104 passed (7.3m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 6.42s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-DfCU_XDg.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-0AfGUA12.js                  39.10 kB │ gzip:  13.14 kB
dist/assets/index-CR-ZummB.js                          116.39 kB │ gzip:  34.74 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen-C5pmL6FJ.js              1,490.61 kB │ gzip: 343.24 kB
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

1. 【新規】**待機コマだけシートの描画サイズが約9%大きい**ため、アセット側で
   0.917倍に縮めて揃えています。元シートを描き直す場合はこの係数も見直しが必要です。
2. 【新規】表情差分・アクション（発見／取得／考える／ダメージ／座り／しゃがみ／
   ジャンプ／着地）は**まだ使っていません**。今回は探索の移動に必要な分だけです。
3. 【継続】`phaseD` の負荷依存フレーク（TIME SHIFT 二重タップ待ち・探索とは無関係）。
4. 【継続】盗賊ガルドの立ち絵：右脚欠け。
5. 【継続】敗北ガルドの立ち絵が切り抜きでない件。

## 10. Claude 自身が気になる箇所

- **「似せて描く」と「本人を出す」は別物でした。** 前回はシートを見ながら
  形と色を写しましたが、実機で見ると別のキャラクターでした。今回は同じ絵が
  そのまま歩いています。作業の大半はコードではなく、**背景を正しく落とすこと**です。
- **背景除去は2つの判定の組み合わせでないと成立しませんでした。**
  平坦さだけで塗り分けると髪と外套の暗部に漏れ、色距離だけで判定すると
  シートの逆光ブルーム（人物の周りの明るいにじみ）まで拾ってしまいます。
  「背景より暗いものだけ拾う」を足して、発光を持ち込まずに済みました。
- **足元を基準にしたのが一番効きました。** 画像中央を基準にすると、
  タップ地点に「腹」が来て浮いて見えます。接地点を基準にした瞬間、
  地面に立っている人になりました。
- **優先順位（世界 → 気配 → 主人公 → UI）は保っています。** 画面幅11%は
  「人だとわかるが、森より前に出ない」ぎりぎりの大きさです。実機で
  主人公のほうが先に目に入るようなら下げてください。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（探索の主人公スプライト）。**

表情差分・アクション・ケイオスの探索表示・他フィールド展開へは進みません。
