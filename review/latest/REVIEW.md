# MUGEN REVIEW PACKAGE — VISUAL IDENTITY v0.2 — HOME PROTOTYPE

- Generated: 2026-09-03T12:33:02.143Z
- Commit: c8aab90 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: c8aab90
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**対象は HOME 1画面のみ。ゲームロジックの変更は 0。**

v0.1 は「黒いUIを白くした」に留まりました。v0.2 では指示どおり
LOGIC LOCK / VISUAL FREEDOM とし、HOME の構成そのものを作り直しています。

- **画面を「1枚の額装された紙面」として組み直した**。外周に金の二重罫と
  四隅の角飾り。Webビューではなく「作られたページ」に見せるための骨格。
- **紋章（LEVEL 1）**：明朝体の MUGEN ZERO ＋ WORLD MEMORY RPG ＋ 翼の marks。
- **WORLD MEMORY（LEVEL 2）を画面上部へ**。記憶 / 出会い / 再会 / 問い の4数値と、
  最新の記憶の1行。すべて既存データの投影で、新しい保存も新しい世界ロジックも無し。
- **中央の輪（LEVEL 3）**：村のアートを**円の中だけに**クリップ。世界が
  「記憶の中に held されている」ように見える。外周は静かな余白のまま。
  **将来ここにケイオス / 主人公 / NPC / Live2D が立つ**ことを前提にした空間で、
  今回はキャラクターを一切描いていない（空の輪は「誰かを待つ場所」に見える）。
- **探索する（LEVEL 4）**：金が収束する唯一の場所。左右から金線が伸び、
  ボタンだけが金の縁と wash を持つ。他のどのボタンとも形が違う。
- **導線（LEVEL 5）**：白い大きな長方形をやめ、細い区切り線＋記号＋小さなラベルの
  静かな rail に。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-03T12:33:01.970Z / viewport 390x844

- `review/latest/01_home.png` — HOME：the menu the player returns to

撮影していない画面（変更なし。テスト結果で報告）:
- TITLE — v0.1 のまま（次フェーズの対象）
- PROLOGUE / KAOS — v0.1 のまま
- EXPLORE — v0.1 のまま
- TAVERN / TALK — v0.1 のまま
- GREENWOOD / BATTLE — v0.1 のまま
- WORLD MEMORY — v0.1 のまま
- LIFE CHOICE / ENDING — v0.1 のまま
- PLAYTEST SURVEY — v0.1 のまま
- DEV REVIEW HUB — v0.1 のまま

## 3. 新規機能の動作確認結果

- HOME のみ再設計。他画面は v0.1 のまま（指示 §21）。
- 共有CSSへの影響が出ないよう、新規ルールはすべて `.home-*` 名前空間に閉じています。
  `ScreenBackdrop` に `hero` variant を追加しましたが、使用箇所は HOME だけです。
- 既存 testid（explore-button / world-memory-button / time-shift-button /
  settings-button / archive-button / rest-button / world-clock / home-place /
  home-backdrop / kaos-aside / dev-admin-entry）はすべて維持。**E2E の書き換えゼロ。**

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-03T12:33:01.536Z
- Build: MUGEN ZERO v0.1 / c8aab90 / 2026-09-03T12:32:55.894Z
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

**なし。** ロジック・保存・進行・他画面いずれも無変更。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  278 passed (278) |
| E2E (playwright) | PASS | 104 passed (7.4m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 7.36s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-DHlPz--q.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-Q2HdIiEH.js                  39.09 kB │ gzip:  13.12 kB
dist/assets/index-LFAe2bVs.js                          116.48 kB │ gzip:  34.76 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen-EV6zcwzZ.js              1,485.94 kB │ gzip: 341.76 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。**

## 8. Save compatibility

**セーブ互換に影響なし。** HOME が表示する数値は保存された既知イベントと
導出済み seed からその場で計算するだけで、何も書き込みません。

## 9. 既知の問題

1. **紋章の翼は小さい。** 30px 幅では「翼」というより記号に見える。
   大きくすると紋章が重くなるため現状で止めたが、専用のロゴマークがあれば
   ここが最も効く場所。**必要アセットの候補**。
2. 中央の輪に入るのは現在「場所のアート」のみ。キャラクターが入ると
   構図の主役が変わるため、そのときは輪のサイズと余白の再調整が要る。
3. 明朝体はOS内蔵フォント（Hiragino Mincho / Yu Mincho / Noto Serif JP）に依存。
   Android の端末によっては明朝が無くゴシックにフォールバックする。
   Web フォントを積むかどうかは、読み込み時間とのトレードオフ。
4. v0.1 からの継続課題（敗北ガルドの切り抜き素材、band-end 依存、他画面）。

## 10. Claude 自身が気になる箇所

- **「白くしただけ」から抜けた実感はあるが、判断は人間のもの。** 自己レビューで
  §24 の4問には YES と答えられたが、それは自分の作ったものへの評価なので
  参考値でしかない。スクリーンショット1枚で判断してください。
- **輪の中にアートを閉じ込めたのが今回の中心的な発明。** 背景として敷くと
  「メニューの後ろの壁紙」にしかならないが、円の中に入れると
  「記憶の中の世界」に見える。この語彙は他画面へ展開できる。
- **数値を出すことの怖さ。** 記憶 2 / 出会い 1 のような小さな数字は、
  序盤では「まだ何もしていない」ことを強調してしまう可能性がある。
  逆に「これから増える」と読めれば成功。ここは実プレイで観測したい。
- **e2e が1回だけ落ちた**（`phaseD` の TIME SHIFT 二重タップ待ち）。
  単体で2回連続通過、その後の全体再実行でも通過したため、負荷由来の
  タイミング flake と判断しています。HOME とは無関係の画面です。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN HOME REVIEW。**

指示 §27 に従い、他画面への展開・Live2D・キャラクター切替・新機能へは進みません。
