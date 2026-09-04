# MUGEN REVIEW PACKAGE — 新戦闘画面 v1.1 — 敵カードから戦場へ（採用前）

- Generated: 2026-09-04T01:44:43.540Z
- Commit: dd1214f on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: dd1214f
- Verdict: SOMETHING FAILED — see 5

## 1. 実装前 → 実装後の変更点

**まだ採用していません。** 既存の戦闘画面は1行も消していません。

**v1.1 で変えたのは「何が主役か」です。** v1.0 は敵カードでした
（大きな生き物が真ん中にいて、その下にUIが積んである）。
v1.1 は戦場です。森が画面の4分の3を持ち、3体が**それぞれ違う距離**に立ち、
UIは帯ではなく隅と細い列に退きました。

- **奥行き**：モスラビットは左・奥（足元が一番高い）、主人公は右・手前（一番低い）、
  ケイオスちゃんはその間の奥。横一列に並べていません。
- **サイズは戦場の高さに対する割合**（敵23% / 主人公25.5% / ケイオス21.5%）で、
  端末幅が変わっても関係が崩れません。3体の矩形は**重なりません**（自動テスト済み）。
- **中央の余白は「削って」いません。** 道が奥へ抜ける空間として使っています。
- **HPは枠付きの小さな板**に。敵は戦場の左上、味方は戦場の**下**（森を1pxも使いません）。
- **コマンドは絵入りの2枚**（攻撃／スキル）。アイコンは既存の細線SVG言語で描いた
  UI装飾で、キャラクターではありません。
- **MUGEN CHOICE は地を暗く落とし**、4つを色と印で描き分けました。
  戦闘コマンドと同じ見た目にすると「4つの必殺技」に見えるためです。

- **参考画像を受け取りました。** v1.0 は参考画像なしで作ったものです。
  今回は参考画像の構図（世界＞キャラ、左奥に敵、右手前に味方、枠付きHP板、
  絵入りコマンド、暗い地のMUGEN CHOICE）に合わせて作り直しています。
- **別コンポーネントとして分離**。`BattleUIPrototype`。DEV ADMIN のフラグで
  `現行の戦闘画面` ↔ `新戦闘画面（試作）` を切り替えます。**既定はOFF**で、
  フラグを触らないプレイヤーには今までと同じ画面が出ます。
- **森の戦闘だけに適用。ガルド戦は常に現行画面です**（E2Eで検証済み）。
- **偽のHPは作っていません。** 数値・スキル・クールダウン・敵のターンは
  すべて既存 `battleLogic` のものです。
- **世界が画面です。** 探索と同じ森の絵を全面に、フィルタなしで。
  白veil・白fade・ぼかし・低彩度化・巨大パネルは一切ありません。
- **左に敵、右に主人公陣営。** 主人公が敵と彼女のあいだに立ち、
  ケイオスちゃんは一歩後ろ（探索での並びと同じ）。3体とも接地影付き。
- **既存素材の再利用のみ。** 新規画像なし。CSS/SVGでの描き直しなし。
  ケイオスちゃんは4面シートの「左向き」矩形をCSSで切り出して使っています
  （**ファイルは無加工**）。
- **戦うことと決めることを分けました。** 通常は 攻撃 / スキル のみ。
  KILL / SPARE / HELP / CAPTURE は決着可能になってから初めて現れます。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-04T01:44:43.325Z / viewport 390x844

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

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-04T01:44:42.911Z
- Build: MUGEN ZERO v0.1 / dd1214f / 2026-09-04T01:44:12.107Z
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
| E2E (playwright) | PASS | 127 passed (10.3m) — 自作テスト2件を修正して再実行（下記 NOTES:3 参照） |
| Build (tsc -b && vite build) | PASS | ✓ built in 7.78s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-CMX_jNHn.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-CnUsu-sh.js                  42.68 kB │ gzip:  14.31 kB
dist/assets/index-6BfvIFhr.js                          139.96 kB │ gzip:  42.45 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen-Be-Hi8w8.js              1,498.86 kB │ gzip: 346.19 kB
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

1. 【新規】**Lv 表示は入れていません。** 参考画像には Lv.3 / Lv.5 がありますが、
   レベルという仕組みがまだ存在しません。数字を捏造するより、無いことを
   報告するほうを選びました。
2. 【新規】**主人公の剣を構えた戦闘ポーズ素材がありません。** 参考画像の
   主人公は抜刀していますが、現存するのは探索用の待機素材だけです。
   最も自然な「左向き待機」をそのまま使っています（新規生成禁止のため）。
3. 【新規】**スキルは中身がありません。** 開くと既存の「身構える」1つと、
   空きであることを明示する1行だけです。存在しないシステムは作っていません。
4. 【新規】**MUGEN CHOICE を出すかどうかは、試作ではデバッグ切替**です
   （正式実装では確率抽選）。両方を実機で見るためです。
5. 【継続】撃破後のモスラビットの差分絵がありません（同じ絵のまま）。
6. 【継続・別issue】`phaseD` の負荷依存フレーク、盗賊ガルドの右脚欠け。
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
- **迷っている点：主人公の位置。** 参考画像どおり右手前に置くと、
  画面の中央寄りに見えます。もっと右に寄せるとケイオスちゃんと重なります。
  今は「重ならない」を優先していますが、実機の判断を待ちます。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前の試作）。**

正式採用・既存戦闘画面の置換・ガルド戦への適用へは進みません。
