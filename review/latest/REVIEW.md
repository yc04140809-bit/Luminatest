# MUGEN REVIEW PACKAGE — 探索の同行者 — ケイオスちゃん追加

- Generated: 2026-09-03T21:38:47.798Z
- Commit: ce7c9f6 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: ce7c9f6
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**探索画面に同行者を1人足しただけの変更です。**
主人公の見た目・移動・サイズ・品質、探索背景、発見ポイント、UI、
WORLD MEMORY・イベント・戦闘・ガルド・酒場・時間経過・人生記録は**すべて無変更**。

- **添付PNGをそのまま使用**。`kaos-exploration-sheet.png` は
  受け取ったファイルと**バイト単位で同一**です。加工・再生成・
  縦横比の変更・背景の描き足しは一切していません。
- 1枚に4方向が入っているので、**表示するのは常にそのうち1枠だけ**です
  （Phaser のフレーム矩形で指定。シート全体は画面に出ません）。
- **後方追従**。主人公が実際に歩いた道（足跡）を覚えて、その 52 単位
  後ろの地点を目指します。まっすぐ主人公を追うとカーブを内側に
  ショートカットして**横に並んでしまう**ので、道をなぞらせています。
- **絶対に重なりません**。道が示す位置でも主人公から 34 単位以内には
  入らない、という下限を別に持っています（主人公が引き返した場合など）。
- **前後関係**：画面の上にいるほうが後ろに描かれます。二人が近づいても
  「一人にシールが貼ってある」ようには見えません。
- **サイズは主人公より少し小さい**（高さ 58 対 64、約91%）。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-03T21:38:47.646Z / viewport 390x844

- `review/latest/01_greenwood_forest.png` — GREENWOOD / BATTLE：主人公とケイオスちゃんが二人の人物に見えるか。発見の気配が世界に馴染んでいるか
- `review/latest/02_greenwood_walking_side.png` — GREENWOOD / BATTLE：横に歩いたときに向きが変わるか。足元がタップ地点に来ているか。ケイオスちゃんが道をなぞって付いてくるか

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

- 360 / 390 / 412px で、開始・上へ歩く・停止・左へ歩く・右下へ歩く・停止を確認。
- **動きを減らす設定OFF**でも撮影し、歩行コマとケイオスちゃんの追従を確認しました
  （通常のテストは reduced-motion なので、そこには写りません）。
- 主人公単独時（＝ケイオスちゃんが動かない開始直後）と同行時の両方で正常。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-03T21:38:47.232Z
- Build: MUGEN ZERO v0.1 / ce7c9f6 / 2026-09-03T21:38:32.409Z
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

`GreenwoodScene` に同行者の生成と1メソッド（`updateCompanion`）を追加。
`PlayerSprite` は「1ファイル内の矩形」と「フレームごとの接地点」に対応。
新規 `follow.ts`（足跡）とそのテスト。主人公の拡大率・接地点の計算式は無変更です。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  289 passed (289) |
| E2E (playwright) | PASS | 104 passed (7.2m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 6.77s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-BQCJvvHa.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-CPljdttU.js                  39.15 kB │ gzip:  13.17 kB
dist/assets/index-D_AfVFey.js                          116.39 kB │ gzip:  34.74 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen-aUAptTw9.js              1,494.09 kB │ gzip: 344.32 kB
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

1. 【新規】**ビルドが約1.6MB重くなりました**（シート画像1枚ぶん）。
   単体ビルドは表示サイズの30倍以上の解像度を持っています。
   軽くしたい場合は縮小版の書き出しが必要ですが、
   「加工しない」指示を優先して**原寸のまま**入れてあります。
2. 【新規】ケイオスちゃんは**立ち絵1枚を滑らかに動かしています**（歩行コマなし）。
   シートに歩行差分がないためで、コマを捏造するよりよいと判断しました。
3. 【新規】**添付3枚のうち、使用したのは4面シート1枚だけです。**
   単体の正面／背面PNG（合計約2.6MB）は同じ2方向を大きく描いたもので、
   表示サイズでは差が出ないため入れていません。必要なら1行で差し替えられます。
4. 【継続】`phaseD` の負荷依存フレーク（TIME SHIFT 二重タップ待ち・探索とは無関係）。
5. 【継続】盗賊ガルドの立ち絵：右脚欠け／敗北ガルドが切り抜きでない件。

## 10. Claude 自身が気になる箇所

- **「追いかける」ではなく「同じ道を歩く」にしたのが決定的でした。**
  主人公へ直進させると、曲がるたびに内側を突っ切って横に並び、
  「付いてくる人」ではなく「くっついている物」に見えます。
  足跡をなぞらせた瞬間に、二人で歩いている画になりました。
- **距離は思ったより必要でした。** 最初は 34 単位で試しましたが、
  彼女の頭が彼のマントに重なって一体に見えました。
  この画角では**キャラクター1人ぶんの高さ**がないと二人に見えません。
- **将来の演出（驚く・立ち止まる・発見物を見る・転ぶ・NPCを見る）は、
  今の構造のまま状態を足すだけで入ります。** 表示側は
  `characterId` / `direction` / `state` しか知らず、
  「いつどう反応するか」は同行者側の判断としてシーンに置いてあります。
  今回は指示どおり**自然な同行だけ**に絞り、反応は入れていません。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（探索の同行者）。**

反応演出・戦闘同行・他フィールド展開へは進みません。
