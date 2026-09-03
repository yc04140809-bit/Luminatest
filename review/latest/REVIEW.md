# MUGEN REVIEW PACKAGE — VISUAL v0.2 FIX — SCENE ART IS THE WORLD

- Generated: 2026-09-03T13:04:47.331Z
- Commit: 063b82c on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: 063b82c
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

人間レビューの2点のみ。HOME・Battle・World Memory・Navigation・ゲームロジックは
一切触っていません。

**1. 酒場の白フェードを除去**

`SCENE ART = 世界` / `WHITE + GOLD = UI` として分離しました。

- 絵にかけていた `brightness(1.14) contrast(0.95) saturate(0.72)` を **`filter: none`** へ。
  酒場アート本来の色・暗さ・コントラストがそのまま出ます。
- **画面全体を覆っていた ivory の veil を撤去**。残したのは最下部の短い立ち上がりだけで、
  これは台詞ボックスと紙面が絵に直線でぶつからないようにするためのものです
  （指示の「Dialogue Box周辺のみ、必要最小限」に対応）。
- 帯の下に敷いていた**ぼかしの下地を削除**。白っぽい霧になっていて、
  「絵が紙に貼られている」ように見せる原因でした。帯の下端はマスクだけで処理します。
- 帯が全力で見えている範囲を広げました（フェード開始 24% → 38%）。

この variant は森の遭遇シーンと共有です。同じ「絵の上にUIが載る」画面なので、
森も同時に本来の色に戻っています（DO NOT WASH THE WORLD OUT の原則どおり）。

**2. ガルドの立ち絵** — コード変更なし。下記 KNOWN ISSUE に登録。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-03T13:04:47.148Z / viewport 390x844

- `review/latest/01_tavern.png` — TAVERN / TALK：絵本来の色・暗さ・コントラストが戻っているか。白は UI だけか

撮影していない画面（変更なし。テスト結果で報告）:
- HOME — v0.2 で承認済み。今回は変更なし
- TITLE — v0.1 のまま（次フェーズの対象）
- PROLOGUE / KAOS — v0.1 のまま
- EXPLORE — v0.1 のまま
- GREENWOOD / BATTLE — v0.1 のまま
- WORLD MEMORY — v0.1 のまま
- LIFE CHOICE / ENDING — v0.1 のまま
- PLAYTEST SURVEY — v0.1 のまま
- DEV REVIEW HUB — v0.1 のまま

## 3. 新規機能の動作確認結果

- 酒場・森の遭遇シーンを実機解像度で確認。台詞は白いボックスの上なので可読性は不変。
- 台詞ボックス・ボタン・紙面は White / Gold のまま。UIレイヤーは何も変えていません。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-03T13:04:46.726Z
- Build: MUGEN ZERO v0.1 / 063b82c / 2026-09-03T13:04:39.890Z
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

`.backdrop-encounter`（酒場・森の遭遇）と、fitted art 用の下地のみ。
HOME（`backdrop-hero`）、TITLE（`backdrop-title`）、BATTLE（`backdrop-battle`）は無変更です。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  278 passed (278) |
| E2E (playwright) | PASS | 104 passed (7.4m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 8.31s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-CFTGOj8V.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-xNkXNx7v.js                  39.08 kB │ gzip:  13.11 kB
dist/assets/index-DmK5pSYk.js                          116.39 kB │ gzip:  34.74 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen-ClygQgrg.js              1,485.94 kB │ gzip: 341.76 kB
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

1. **【要差し替えアセット】盗賊ガルドの立ち絵：右脚の一部が欠けている。**
   原因は SOURCE ASSET 側で、レイアウトではありません（切り抜き画像の下端で
   脚が切れています）。指示に従い CSS での修復・拡大・切り取り・反転・変形は
   **一切行っていません**。Battle のロジックとレイアウトも変更していません。
   必要な正式アセットの条件:
   - FULL BODY
   - TRANSPARENT BACKGROUND
   - BOTH LEGS COMPLETELY VISIBLE
   - NO CROPPING
2. 敗北ガルドの立ち絵は切り抜きではなく暗い背景を持つため、額装で対応中
   （こちらも本来は切り抜き素材が望ましい）。
3. 帯状アートの下端フェード位置は `--band-end` の数値に依存（現在 53%）。
4. 明朝フォントは OS 内蔵依存（Android の一部端末でゴシックにフォールバック）。

## 10. Claude 自身が気になる箇所

- **「白いテーマだから絵も白くする」は明確な誤りでした。** UI の色と世界の色は
  別のレイヤーで、混ぜた瞬間にグレイヴの傷も酒場の空気も消えます。
  今回の指摘は、私が v0.1 で veil を反転したときに自分で気づくべきものでした。
- **ぼかし下地は「継ぎ目を隠す」ためだったが、代償が大きすぎた。** 継ぎ目対策としては
  マスクだけで十分で、下地は画面の半分を灰色の霧に変えていました。
  問題を隠す装置を足すより、問題の出ない構図にするほうが良い。
- 森の遭遇シーンも同じ variant なので同時に直っています。これは範囲拡大ではなく、
  同一の修正対象（同じ CSS 規則）です。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（酒場シーン）。**

指示 §6 に従い停止します。他画面への展開・Live2D・キャラクター切替へは進みません。
