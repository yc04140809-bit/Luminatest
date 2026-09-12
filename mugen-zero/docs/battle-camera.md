# C-2 BATTLE CAMERA FOUNDATION — 完了記録

**status: 実装済み。通常攻撃1種類のみ接続。IDLEの見た目は B-1 完了時と同一。**

---

## 0. 何を作ったか

B-1でデータ化した `formation` を基準に、
**「今この瞬間、誰をどこへ描くか」**を返す純粋な層。

```
base formation （どこに立っているか）
        +
camera offset  （今どう描かれているか）
```

**base は絶対に書き換えません。** カメラを切っても、壊れても、
画面は B-1 のままに戻ります。

戦闘ロジック・HP・MP・damage・AI は一切持ちません。

---

## 1. camera / presentation state

| phase | 意味 | ACTOR | ALLY | TARGET |
|---|---|---|---|---|
| `IDLE` | 誰も行動していない。formationそのもの | 0 | 0 | 0 |
| `FOCUS` | 行動キャラが対象へ寄る | inset +0.06 | 0 | 0 |
| `RETREAT` | 他の味方が退避 | inset +0.06 | bottom +0.04 | 0 |
| `IMPACT` | 接触。最も踏み込む | inset +0.10 | bottom +0.04 | 0 |
| `RETURN` | 陣形へ帰る | 0 | 0 | 0 |

`RETURN` と `IDLE` が同じ位置なのは意図的です。
違いは「**まだ動いている場**」と「**静止した場**」で、
CSSはカメラ稼働中だけ位置の移動を許可します。
別phaseにしておくことで、後から RETURN に
overshoot や settle を足すときに呼び出し側が1行も変わりません。

### role という考え方

`ACTOR / ALLY / TARGET / BYSTANDER`。
「主人公」「敵」ではなく**その瞬間の役**で持っています。
敵が攻撃する番が来たら、敵は同じコードで ACTOR になります。

---

## 2. formation との接続

```ts
cameraStyle(slot, phase)
  = placementStyle({
      ...PROTOTYPE_PLACEMENTS[slot],
      inset:  base.inset  + offset.inset,
      bottom: base.bottom + offset.bottom,
    })
```

`IDLE` は両方に 0 を足すので、
`cameraStyle(slot, 'IDLE')` は **`prototypeStyle(slot)` と完全に同一**です。
単体テストで直接固定しています。

`formation.ts` は1行も変更していません。

---

## 3. 移動量

| | 量 | 844px幅での実寸 |
|---|---|---|
| ACTOR の寄り（FOCUS） | 場の幅の 0.06 | 約 50px |
| ACTOR の踏み込み（IMPACT） | 場の幅の 0.10 | 約 84px |
| ALLY の退避（RETREAT） | 場の高さの 0.04 | 約 9px |

**ズームは一切していません。** 戦場の広さも敵の位置も変わりません。
「顔だけになる寄り」は構造上不可能です（カメラはactorのoffsetしか返さない）。

ALLYが横ではなく**奥（bottom+）**へ下がる理由：
ケイオスは既に右端 inset 0 で、横に逃げる余地がありません。
この戦場では奥行きが距離の軸です。

**この数値は暫定です。** 実機調整前提の初期値。

---

## 4. timing — 第二のタイミングシステムは作っていません

カメラのcueは `play()` の**同じループ・同じ `beatMs`・同じ `timers` 配列**
でスケジュールされます。

```ts
swingCues(actorBeatMs, turnMs, glideMs)
```

- 呼び出し側が**既に計算済みの**ビート長を渡す
- cueは全てその**割合**（0 / 0.30 / 0.62 / beat終 / turn終）
- `battleCamera.ts` にミリ秒は `CAMERA_GLIDE_MS` の1つだけ

結果として：

- ×2 は自動的に半分（元の数値が半分になっているため）
- 演劇をキャンセルすればカメラもキャンセルされる
- カメラが戦闘からずれることが構造的に起きない

`--bp-cam` はTS側から `beatMs(CAMERA_GLIDE_MS, speed)` で渡すので、
CSSはspeedを知りません。

---

## 5. hit stop

**実装しました。** 新しい停止機構は作っていません。

`IMPACT` の間だけ CSS の transition を切ります。

```css
.bp-stage[data-camera='IMPACT'] .bp-actor { transition: none; }
```

滑って到達するのではなく**踏み込み位置へ即座に到達して、そこで保持される**。
これが打撃の止め。ゲームロジックは1msも止まりません。

---

## 6. RETURN 保証

4重です。

| 状況 | 何が戻すか |
|---|---|
| 通常完了 | **track の最後のcueが必ず `IDLE`**（構造保証） |
| 戦闘終了 / ケイオス介入 / アクシデント | `useEffect` が `IDLE` を強制 |
| 次のcommand | `play()` が既存timerを全clearしてから再構築 |
| screen離脱 | 既存の unmount cleanup が全timerをclear |

`swingCues` の最後が `IDLE` であることは、
「どんな duration を渡しても」で単体テスト済み（負値・0・×2含む）。

---

## 7. QA-4

調査したところ、**`command` と `cast` は既にガード済み**でした
（`if (battle.outcome !== 'ONGOING') return;`）。
今回のセッションで追加したものではなく、当初からあります。

ガードが無かったのは **`callArcana`** の1つだけで、ここに追加しました。
`mendPlayer` は状態を守っていましたが、
`setSummoned` / `setSaid`（召喚獣を場に出す・台詞板を出す）が
終了済みの戦闘でも走る状態でした。QA-2と同じ構図です。

---

## 8. 今回やっていないこと

- 全魔法・全スキル・全召喚・全キャラへの展開（`command('ATTACK')` のみ）
- GUARD / MAGIC / SUMMON の専用ショット（`filming === null` で従来通り）
- ズーム・スケール
- `BattleScreen` 側への接続
- BattleState / playerHp / playerMp / damage / enemy AI / balance
- D-4（画面統合）
