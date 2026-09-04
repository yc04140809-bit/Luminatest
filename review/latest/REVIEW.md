# MUGEN REVIEW PACKAGE — 新戦闘画面 v1.2 — 主人公サイズと DOWN 差分（採用前）

- Generated: 2026-09-04T04:16:40.339Z
- Commit: 99de424 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: 99de424
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**まだ採用していません。** 既存の戦闘画面は1行も消していません。
v1.1 の方向性は作り直さず、**3点だけ**直しました。

- **主人公を縮小**（戦場高さの 25.5% → **22%**、約86%）。「巨大な主人公」ではなく
  「手前にいる主人公」に見えるようになりました。位置は右手前のまま、
  縮んで余裕ができたぶん **right 30% → 28%** だけ右へ。ケイオスちゃんとは重なりません。
- **DOWN 差分を実装**。HPが0になると、短く倒れ込む動き（340ms）のあと
  **添付の DOWN PNG** に切り替わります。**画像は無加工・バイト単位で同一**です。
- **DOWN は 4択のあいだも消えません。** モスラビットが草の上に伏せたまま、
  主人公とケイオスちゃんもその場に立ったまま、KILL / SPARE / HELP / CAPTURE が出ます。
  MUGEN CHOICE が出ない場合も、DOWN を見てから「森へ戻る」が出ます。
- **「死体」ではなく「戦闘不能」として扱っています。** 内部の状態名は
  `NORMAL` / `DOWNED` で、`dead` という語はどこにも使っていません。
  死ぬかどうかは、このあとプレイヤーが決めることだからです。
- **敵データ側で差し替え可能**：種族定義に `battleVisuals.normal` / `.down` を持たせ、
  戦闘画面はそこを読むだけです。次の敵は2エントリ足すだけで、画面は無変更。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-04T04:16:40.155Z / viewport 390x844

- `review/latest/01_battle_prototype.png` — BATTLE UI PROTOTYPE：世界が主役に見えるか。敵と味方の大きさ・接地・HP・メッセージ・攻撃/スキル
- `review/latest/02_battle_prototype_skill.png` — BATTLE UI PROTOTYPE：「スキル」を開いた状態。まだ何も無いことを隠していないか
- `review/latest/03_battle_prototype_mugen_choice.png` — BATTLE UI PROTOTYPE：戦うことと人生を決めることの分離。4ボタンが窮屈でないか

撮影していない画面（変更なし。テスト結果で報告）:
- GREENWOOD / BATTLE — 前ラウンドから無変更。試作は既存画面を置き換えていません
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

- 360 / 390 / 412px で、通常時・スキル展開・苔かくれ・リーフタックル・
  通常終了・MUGEN CHOICE を確認。縦横スクロールなし、ボタンは全て44px以上。
- **DEV ADMIN に「試作をこの場で見る」を追加**しました。森を歩かずに1タップで
  試作だけ見られます。**世界には何も書き込みません**（自動テストで検証）。
- 全E2E中に自作テストが2件落ちました。**どちらもテスト側の欠陥**で、
  弱めずに直しています：(1) 敵の返し技が確率で変わるのにメッセージ末尾を
  決め打ちしていた → 敵の行動を固定して検証、(2) 負荷時に森のシーン起動が
  間に合わないことがあった → 待ちと巡回回数を増やした。修正後 **127/127**。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-04T04:16:39.738Z
- Build: MUGEN ZERO v0.1 / 99de424 / 2026-09-04T04:16:06.858Z
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

新規：`BattleUIPrototype.tsx`、`battleUiFlag.ts`、`.bp-*` のCSS、E2E。
変更：`App.tsx`（フラグ分岐）、`DevAdminScreen.tsx`（切替UI）、`styles.css`（追記のみ）。
**ガルド・会話画面・イベントUI・探索画面・スプライト・WORLD MEMORY・
時間進行・既存戦闘画面・既存戦闘ロジックは1文字も変えていません。**

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  337 passed (337) |
| E2E (playwright) | PASS | 130 passed (10.9m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 6.14s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-Dtky7sv4.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-bhl5Qj2i.js                  42.68 kB │ gzip:  14.31 kB
dist/assets/index-BSQboSs1.js                          140.77 kB │ gzip:  42.77 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen-BaX4_CL8.js              1,498.86 kB │ gzip: 346.19 kB
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

1. 【新規】**旧戦闘画面には DOWN 差分を入れていません。** 旧UIは「壊さない・
   触らない」対象なので、撃破後も従来どおりの絵のままです。試作を採用する
   段階で不要になる想定ですが、今この時点では差があります。
2. 【新規】**Lv 表示は入れていません。** 参考画像には Lv.3 / Lv.5 がありますが、
   レベルという仕組みがまだ存在しません。数字を捏造するより、無いことを
   報告するほうを選びました。
3. 【新規】**主人公の剣を構えた戦闘ポーズ素材がありません。** 参考画像の
   主人公は抜刀していますが、現存するのは探索用の待機素材だけです。
   最も自然な「左向き待機」をそのまま使っています（新規生成禁止のため）。
4. 【新規】**スキルは中身がありません。** 開くと既存の「身構える」1つと、
   空きであることを明示する1行だけです。存在しないシステムは作っていません。
5. 【新規】**MUGEN CHOICE の発生確率は無変更**です（初回10%〜・8連続で確定）。試作では
   （正式実装では確率抽選）。両方を実機で見るためです。
6. 【解決】撃破後の差分絵：今回入りました。
7. 【継続・別issue】`phaseD` の負荷依存フレーク、盗賊ガルドの右脚欠け。
   指示どおり今回は手を付けていません。

## 10. Claude 自身が気になる箇所

- **「余白を削るな、意味を持たせろ」という指摘が正解でした。** v1.0 の
  中央の空きは、上に詰めれば消えます。でもそれをやると戦場が浅くなります。
  3体を**別々の距離**に置いた瞬間、同じ空きが「向こうにいる」に変わりました。
  空間そのものは1pxも減っていません。
- **サイズを px ではなく戦場の高さの割合にしたのが効きました。** 端末が
  変わってもキャラクター同士の関係が崩れません。構図は数字ではなく関係です。
- **MUGEN CHOICE の地を暗くしたのは、戦闘UIと同じ色だと同種に見えるからです。**
  アイボリーの上に4つ並べると、必殺技の一覧に見えてしまいます。
  地が変わることで「別の問いが始まった」と分かります。
- **主人公を小さくしただけで、遠近が読めるようになりました。** 同じ座標・
  同じ素材で、14% 縮めただけです。手前にいるものは大きい、が成立するのは
  「大きすぎない」ときだけでした。
- **DOWN を4択のあいだ残すのが、この画面の主題そのものです。** 倒れた相手を
  画面から消してメニューを出すと、それはリザルト画面になります。
  草の上に伏せたモスラビットを見ながら選ぶから、4択が問いになります。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前の試作）。**

正式採用・既存戦闘画面の置換・ガルド戦への適用へは進みません。
