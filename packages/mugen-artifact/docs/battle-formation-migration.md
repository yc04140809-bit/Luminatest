# B-1 BATTLE FORMATION MIGRATION — 完了記録

**status: 実装済み。見た目の変更なし。**

戦闘プロトタイプのキャラクター位置を、スタイルシートから
`src/ui/battle/formation.ts` のデータへ移した記録。
**位置の移動のみ。座標値は1つも変えていない。**

---

## 0. なぜ移したか

位置がCSSに書かれている限り、それは定数である。
戦闘中にカメラが誰かへ寄る、隊列が3〜4人へ増える、
BLOOMの結果で立ち位置が変わる — どれもCSSからは実行できない。

移行後、位置は「データを読んで描く」形になる。
今回はまだ誰も動かさない。動かせる形にしただけ。

---

## 1. 変更ファイル

| ファイル | 内容 |
|---|---|
| `src/ui/battle/formation.ts` | `PROTOTYPE_PLACEMENTS` / `placementStyle()` / `prototypeStyle()` を追加。`SlotPlacement.depth` を optional 化 |
| `src/ui/battle/BattleUIPrototype.tsx` | 4つのアクター div に `style={prototypeStyle(...)}` を付与（+import 1行） |
| `src/ui/styles.css` | 位置指定のみ削除 |
| `src/ui/battle/formation.test.ts` | プロトタイプ座標の単体ロック（6件追加） |
| `e2e/battleFormation.spec.ts` | **新規** 実画面での座標ロック（6件） |
| `e2e/prototypeModes.spec.ts` | 別件のテスト計測欠陥を修正（下記 5.） |

`BattleActor` / `BattleParty` / `BattleScreen` / `battleLogic` は無変更。

---

## 2. CSSから削除した位置指定

**これ以外は1行も触っていない。** animation / transition / sizing /
`.bp-shadow` / `.bp-summon-ring` / `.bp-dragon` / `.bp-breath` はそのまま。

```css
.bp-enemy        { left: 8%;   bottom: 38%; }
.bp-hero         { right: 25%; bottom: 7%;  z-index: 2; }
.bp-kaos         { right: 0;   bottom: 19%; z-index: 1; }
.bp-enemy.downed { left: 4%;   bottom: 30%; }
.bp-summon       { right: 42%; bottom: 9%;  z-index: 2; }
```

`z-index` も位置指定として扱った。深度は `SlotPlacement.depth`
が元から持っている概念で、CSSに残すと inline と二重定義になるため。
**値は同一**（hero 2 / kaos 1 / summon 2、敵は指定なし）。

---

## 3. formation 側へ移した座標

CSSの百分率を、`SlotPlacement` の「場の幅・高さに対する割合」へ
機械的に変換しただけ。丸めも調整もしていない。

| slot | edge | inset | bottom | depth |
|---|---|---|---|---|
| `enemy` | left | 0.08 | 0.38 | （なし） |
| `enemyDowned` | left | 0.04 | 0.30 | （なし） |
| `hero` | right | 0.25 | 0.07 | 2 |
| `kaos` | right | 0.00 | 0.19 | 1 |
| `summon` | right | 0.42 | 0.09 | 2 |

### `depth` を optional にした理由

敵には `z-index` が**無かった**。`z-index: auto` と `z-index: 0` は
別物で、`0` は stacking context を作る。もし敵に `0` を与えると、
その内側で `z-index` を持つ子要素（`.bp-star-hit` 等）の重なりの
基準がページから敵自身へ移り、**重なり順が変わる**。
そのため「深度なし」を表現できる形にした。
`prototypeStyle('enemy')` は `zIndex` キー自体を返さない。

---

## 4. BattleUIPrototype の取得方法

```tsx
import { prototypeStyle } from './formation';

<div className="bp-actor bp-enemy …" style={prototypeStyle(showingDown ? 'enemyDowned' : 'enemy')}>
<div className="bp-actor bp-kaos …"  style={prototypeStyle('kaos')}>
<div className="bp-actor bp-hero …"  style={prototypeStyle('hero')}>
<div className="bp-actor bp-summon …" style={prototypeStyle('summon')}>
```

倒れた敵はCSSでは `.bp-enemy.downed` の上書きだった。
同じ要素に対して slot を差し替える形にしてある。

`BattleActor` は**使っていない**。あれは `bf-actor` / `bf-shadow` という
別のDOMを出すため、プロトタイプに適用すると見た目が変わる。
共有したのは座標データと `SlotPlacement` 型だけ。

---

## 5. 途中で見つけた別件3件（すべてテスト側のみ・製品コード無変更）

### 5-1. `prototypeModes.spec.ts`「×2 shortens the theatre」

全件並列実行で落ちた（×1 865ms / ×2 867ms）。

原因は計測側。`expect.poll` の既定間隔は 100→250→500→1000ms と
伸びるため、分解能が測定対象より粗い。500ms の演出と 800ms の演出が
同じ 850ms のポーリング境界に落ちて同値に見えていた。

`MutationObserver` をページ内に置いて両端を記録する形へ変更。
実測 **×1 873ms / ×2 529ms（比 0.61）**。

### 5-2. `phaseD.spec.ts`「TIME SHIFT +3y ages Gald」

こちらは**別のボタンを押していた**。

「二度押しが無効であること」の確認に
`go.click({ force: true })` を使っていた。`force: true` は
「その座標にまだ同じ要素があるか」の確認を飛ばす。
負荷時、Playwright が座標を計算してからイベントを飛ばすまでの間に
Reactが完了画面へ差し替わる。完了画面は**同じ位置**に
「変化した場所を探す」を置いているため、
二度押しのつもりのクリックが探索ボタンを押し、画面遷移していた。

`dispatchEvent('click')` へ変更。こちらは testid を再解決するので
「旅立つ」以外には決して届かない。
CPU負荷下で 1/5 → 6/6 通過。

再現手順（4コアで6プロセス回す）:

```
for i in $(seq 1 6); do (timeout 900 sh -c 'while :; do :; done') & done
npx playwright test e2e/phaseD.spec.ts
```

### 5-3. `devReviewHub.spec.ts`「the report knows which world it is describing」

`preset-SPARE_3Y` を押した直後にQAレポートを生成していた。
プリセットは「世界リセット → SPARE → 3年進める」の非同期処理。
負荷時は完了前にレポートが作られ、`Route: NONE` / 1年目1日目 になる。

なぜこのテストだけが落ちるのか:
DEV ADMIN の他のボタンはすべて `disabled={busy}` を持つため、
次のクリックが自動的に完了を待つ。
**`dev-review-hub-entry` だけが `disabled={busy}` を持っていない。**

テスト側で `dev-choice` / `dev-clock` の反映を待つよう修正。
製品側の推奨対応は下記 7. に記載（今回は未実施）。

---

## 6. 提案（今回は未実施・要判断）

`src/dev/DevAdminScreen.tsx:199` の `dev-review-hub-entry` に
`disabled={busy}` を追加する。

DEV ADMIN の他の全ボタンは持っている。
QAレポートは世界の読み取りなので、書き込み中に開けてしまうと
「まだ存在しない世界のレポート」が出る。
1行の追加だが**製品コードの変更**になるため、B-1の範囲外として保留。

---

## 7. 今回やっていないこと

- デザイン改善 / 位置調整 / サイズ変更 / UI変更
- 新しい formation system
- `BattleState` の `playerHp` / `playerMp` 構造（B-2）
- `BattleUIPrototype` と `BattleScreen` の統合（D-4）
- `battleCamera.ts`
- 攻撃ロジック / HP / MP / damage / turn / enemy AI / battle sequence /
  BEAT_MS / speed / AUTO / 2倍速 / summon / WORLD LIFE ENGINE / story /
  ガルド戦 / battle balance
