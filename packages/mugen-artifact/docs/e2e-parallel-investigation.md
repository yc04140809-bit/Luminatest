# C-2 — e2e が3ワーカー並列時のみ落ちる件：調査結果

**結論から: 報告されていた `explorationLoop.spec.ts` は、今回の再現実行では落ちなかった。
代わりに別の原因が2つ見つかり、うち1つは私自身が今回入れた回帰だった。**

---

## 1. やったこと

`npx playwright test --workers=3`（全318件）をフル実行して**実際に落とした**。
仮説で報告せず、失敗を現物で捕まえることを優先した。

### 結果（1回目・A-1実装直後）

```
5 failed
  e2e/stability.spec.ts:178 › the battle screen sits inside its stage
  e2e/summon.spec.ts:255   › a finished memory › is the player's to spend…
  e2e/summon.spec.ts:561   › summoning fits a 800x360 phone
  e2e/summon.spec.ts:561   › summoning fits a 844x390 phone
  e2e/summon.spec.ts:561   › summoning fits a 915x412 phone
313 passed (16.7m)
```

`explorationLoop` は**全件通った**。

---

## 2. 見つかった原因

### 原因1 — summon 4件は私の回帰（並列とは無関係）

単独実行でも落ちた。つまり並列問題ではなく、A-1 で入れた CSS の破壊。

AUTO / 倍速を**コマンドの下に独立した行**として置いたため:

- `.bp-commands` に `flex-wrap: wrap` を足した
  → ARCANA が自分の行へ落ちた
  → `summon.spec.ts:268` の
    「`expect(arcana.y).toBeCloseTo(attack.y, 0)` — 他の2つと同じ行にある」が破綻
- モード行が約43px を消費
  → 戦場が画面の 42% に縮小
  → `summon.spec.ts:593` の
    「`bg.height / phone.height > 0.5` — 森が画面の過半を占める」が破綻

**修正**: `flex-wrap` を撤回し、モードを**コマンドと同じ行の細いチップ**にした
（`.bp-modes { display: contents }` でラッパーをレイアウトから消し、
各チップを `min-height: 44px` にしてコマンド行の高さを1pxも変えない）。
summon 20件全通過を確認済み。

**この2つのテストは私が入れたものではなく、既存のテストが正しく私を止めた。**
C-1（テスト型チェック）と同じく、ここでもテストが仕事をしている。

### 原因2 — 並列時に本当に起きていること：フレームレート半減と「長い尾」

計測した（`document.hasFocus()` と `requestAnimationFrame` 間隔）。

| 条件 | 中央値 | p95 | 最大 | 50ms超 |
|---|---|---|---|---|
| 1ワーカー | 16.7ms | 17.9ms | 23ms | 0 |
| 3ワーカー | 31.0ms | 55.4ms | 102ms | 4 |

**フレームレートがほぼ半分になる。**

当初疑った経路は2つとも**外れ**だったので記録しておく:

- ❌ **Phaser の delta ハードクランプ** — `TimeStep._min = 1000/minFps = 200ms`。
  実測最大102msなので到達していない。
- ❌ **ウィンドウのフォーカス喪失** — Phaser は `!inFocus` のとき delta を
  `_target`(16.67ms) に固定するので有力だったが、3ワーカー同時実行でも
  3つとも `document.hasFocus() === true` だった。実測で否定。

残る実際の要因は移動速度そのものではなく、**contention の集中**:

`playwright.config.ts` は `fullyParallel` を設定していない（既定 false）ため、
**1ファイル内のテストは1ワーカーで直列に走る**。
`battlePrototype.spec.ts` は19テスト中18が世界をゼロからブートする
（IndexedDB全消去 → reload → プロローグ8クリック）ので、
**単独で6.8分、1ワーカーを占有し続ける**。
その間ほかの2ワーカーは全部終えて遊んでいて、スイートの終盤は
「重いファイル1つ＋残りの最も遅いテスト」が重なる最悪の時間帯になる。

`walkUntil`（explorationLoop）のような**実時間予算のループ**
（1タップあたり 12×180ms = 2.16秒固定）は、まさにこの時間帯に弱い。

---

## 3. 実装した修正

`e2e/battlePrototype.spec.ts` の先頭に:

```ts
test.describe.configure({ mode: 'parallel' });
```

- **ピーク負荷は変わらない**。`workers: 3` の上限はそのままなので、
  同時に走るブラウザは最大3のまま。
- 変わるのは「1ワーカーが6分占有する尾」が消えること。
- 安全な理由: 各テストは独自の page / context を持ち、`freshWorld` が
  自分でストレージを消し、ファイルにモジュールレベルの可変状態が無い
  （`grep -n "^let |^var |beforeAll|afterAll"` → 0件で確認）。

**効果（単独計測）: 6.0分 → 1.7分。**

### やらなかったこと（指示どおり）

- テストの削除: なし
- assertion の緩和: なし
- timeout の延長: なし（`playwright.config.ts` は1文字も触っていない）
- `workers=1` への固定: していない

---

## 4. 残るリスクと、次にやるとしたらの最小案

`explorationLoop` の `walkUntil` は依然として**実時間予算**で歩いている。
今回は落ちなかったが、構造的な弱さは残っている。

**最小修正案（未実装）**: 予算を実時間ではなく**ゲーム内経過**で切る。

```ts
// 現在: 1タップあたり 12 × 180ms = 2.16秒（実時間）
// 案:   requestAnimationFrame を N 回待つ（＝ゲーム内の同じ時間）
async function waitFrames(page: Page, n: number) {
  await page.evaluate((count) => new Promise<void>((done) => {
    let left = count;
    const tick = () => (--left <= 0 ? done() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }), n);
}
```

遅いマシンでは実時間としては長く待つが、**ゲーム内では同じだけ待つ**。
到達しなければ依然として落ちるので、assertion は1つも緩まない。

今回実装しなかった理由: `explorationLoop` が今回落ちていない以上、
再現しない不具合に対して歩行ヘルパを書き換えるのは、
直したのか偶然通ったのか区別がつかなくなる。
**次に実際に落ちたときに、この案を当てるのが正しい順序**と判断した。
