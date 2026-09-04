# MUGEN REVIEW PACKAGE — 新戦闘画面 — 試作（採用前）

- Generated: 2026-09-04T00:46:47.087Z
- Commit: bfbc66b on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: bfbc66b
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**まだ採用していません。** 既存の戦闘画面は1行も消していません。

- **添付されるはずだった「戦闘画面方向性の参考画像」は届いていません。**
  今回は指示書 §3 の構図図とMUGEN ZEROの既存の視覚言語だけを頼りに作りました。
  参考画像をいただければ作り直します。
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

撮影: 2026-09-04T00:46:46.887Z / viewport 390x844

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

- 360 / 390 / 412px で、通常時・スキル展開・苔かくれ・通常終了・
  MUGEN CHOICE を確認。縦横スクロールなし、ボタンは全て44px以上。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-04T00:46:46.470Z
- Build: MUGEN ZERO v0.1 / bfbc66b / 2026-09-04T00:46:11.189Z
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
| E2E (playwright) | PASS | 126 passed (10.5m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 8.42s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-J9MGgi8z.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-qRxbQu2z.js                  42.38 kB │ gzip:  14.19 kB
dist/assets/index-D8Pncdhl.js                          137.34 kB │ gzip:  41.61 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen--bWlb8Y0.js              1,498.86 kB │ gzip: 346.19 kB
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

1. 【要判断】**参考画像なしで作っています。** 方向性が違えば作り直しです。
2. 【新規】**スキルは中身がありません。** 開くと既存の「身構える」1つと、
   空きであることを明示する1行だけです。存在しないシステムは作っていません。
3. 【新規】**MUGEN CHOICE を出すかどうかは、試作ではデバッグ切替**です
   （正式実装では確率抽選）。両方を実機で見るためです。
4. 【継続】撃破後のモスラビットの差分絵がありません（同じ絵のまま）。
5. 【継続】`phaseD` の負荷依存フレーク。盗賊ガルドの立ち絵：右脚欠け。

## 10. Claude 自身が気になる箇所

- **一番効いたのは「敵を小さくした」ことです。** 最初はモスラビットを
  158pxで置いていて、巨大な魔獣に見えました。122pxに落として主人公を
  132pxに上げた時点で、ようやく「小動物と二人組」の関係になりました。
  数字ではなく**関係**が構図です。
- **HPを画面上の小さなチップにしたのは、パネルにすると森が消えるからです。**
  ステータス欄を作った瞬間に「ゲームの管理画面」になります。
  優先順位（世界→敵→味方→状況→UI）は、UIの面積で決まりました。
- **攻撃と人生選択を同じ行に置かなかったのは、意味が違うからです。**
  同じ場所に並べると「4つの必殺技」に見えます。決着してから
  行そのものが入れ替わることで、別の問いだと分かります。
- **迷っている点：中央の余白。** 二人が画面下寄りなので、道の奥が空きます。
  奥行きは出ますが、間延びして見えるなら全体を上げるべきです。実機の判断待ちです。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前の試作）。**

正式採用・既存戦闘画面の置換・ガルド戦への適用へは進みません。
