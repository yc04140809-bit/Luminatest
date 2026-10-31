# BattleState 多人数化 — 既存互換を維持した段階的移行案

**status: 設計のみ。この文書に対応するコード変更は行っていない。**

作成時点の対象コミット: A-1（Prototype への AUTO / 倍速移植）直後。

---

## 0. 結論から

思っていたより小さい。理由は調査で分かった一点に尽きる。

**既存4ルート（KILL / SPARE / HELP / CAPTURE）は `BattleState` に一切依存していない。**

```
$ grep -rn "playerHp|BattleState" src/content/events/lifeEvents.ts \
    src/core/events/eventEngine.ts src/core/world/world.ts
（0件）
```

ルートは戦闘後に記録される「4つの答え」だけで分岐する。戦闘の内部表現が
1人プールでも4人配列でも、ルートは同じように動く。
**多人数化で4ルートが壊れる経路は存在しない。**

書き込み箇所も少ない。

| 対象 | 書き込み箇所 | 内容 |
|---|---|---|
| `playerHp` | 4 | 生成(423) / 敵の攻撃(547) / 癒しの光(763) / 召喚回復(951) |
| `playerMp` | 7 | 生成(443) / 魔法コスト×4 / 身構える(918) |

読み取りは `magicChoice.ts` 12件、`BattleUIPrototype` 5件、`BattleScreen` 4件。
合計46箇所だが、**うち実質的な意思決定を含むのは `magicChoice.ts` だけ**。

---

## 1. 現状の各要素への影響

### 1-1. BattleState
- `playerHp / playerMaxHp / playerMp / playerMaxMp` が単一。
- 誰が殴られたか、誰が倒れたかを表現できない。
- `modifiers` / `boosts` / `wardCut` も「パーティ全体」に掛かる。
- **影響: 大。ただし書き込み箇所は上表の11箇所のみ。**

### 1-2. Formation（`src/ui/battle/formation.ts`）
- すでに1〜4人分の配置を持ち、`partyFormation(count)` が引数の人数で答える。
- `BattleParty` は `actors.length` で配置を決める。
- **影響: なし。描画層は多人数化を待っている状態。**

### 1-3. decideTurn（`src/game/battle/magicChoice.ts`）
- `state.playerHp / playerMaxHp / playerMp` を12箇所で読む。
- 「誰を癒すか」の概念が無い（癒す対象はパーティ＝1つのプール）。
- **影響: 中。判断の骨格（5ルール）は変えずに「対象」だけ足せる。**

### 1-4. AUTO
- `decideTurn` の答えを既存コマンドに渡すだけ。
- **影響: 小。`TurnPlan` に `targetId` が増えたら渡す先が1つ増えるだけ。**

### 1-5. ターン順
- **存在しない。** 現在は「プレイヤーが1回 → 敵が1回」の固定交替。
- **影響: 新規追加が必要。ただし後述のとおり Stage 3 まで不要。**

### 1-6. damage / heal
- `applyDamage(raw, multipliers[])` は純粋関数で、対象を知らない。
- **影響: なし。そのまま再利用できる。**

### 1-7. victory / defeat
- `playerHp <= 0` で DEFEAT、`enemyHp <= 0` で VICTORY。
- 多人数では「全滅で敗北」に変わる。
- **影響: 小。判定1箇所。**

### 1-8. 既存4ルート
- **影響: なし**（冒頭のとおり）。

---

## 2. 段階的移行案

各Stageは**単独でマージ可能**で、**前のStageの挙動を1ビットも変えない**ことを
条件にする。

### Stage 1 — 単一プールを「1人パーティ」として言い直す（挙動変更ゼロ）

`BattleState` に配列を足し、既存フィールドを**そこから導出される別名**にする。

```ts
export interface BattleMember {
  id: string;          // 'HERO' | 'KAOS' | ...
  hp: number; maxHp: number;
  mp: number; maxMp: number;
  downed: boolean;
}

export interface BattleState {
  /** 前衛から順に。今は必ず長さ1。 */
  party: readonly BattleMember[];
  // ↓ 既存フィールドは残す。party[0] の写しであることを不変条件とする。
  playerHp: number; playerMaxHp: number;
  playerMp: number; playerMaxMp: number;
  ...
}
```

- 11箇所の書き込みを「`party[0]` と旧フィールドを同時に更新する1つのヘルパ」に置換。
- 読み取り46箇所は**一切触らない**。
- テスト: 既存948件がそのまま通ること＋「party[0] と旧フィールドが常に一致する」
  不変条件テストを追加。
- **リスク: ほぼ無し。** 二重管理が残るが、それは Stage 4 で消す。

### Stage 2 — 「誰に当たったか」を表現できるようにする（1人時は同一挙動）

- `enemyTurn` に**攻撃対象の選択**を入れる。1人なら必ず `party[0]`。
- `applyDamage` はそのまま。ダメージを受ける先が `party[i]` になるだけ。
- ログ行に対象名を入れるかは**1人の間は入れない**（既存ログ文字列を壊さないため。
  既存e2eがログ文言を見ている箇所がある）。
- 敗北判定を `party.every(m => m.downed)` に変更。1人なら等価。
- テスト: 「1人パーティの戦闘ログが Stage 1 と1文字も変わらない」ことを固定。

### Stage 3 — 2人目を実際に立てる（ここで初めて挙動が変わる）

- `activeParty()` が2人返すようにする（すでに `[HERO, KAOS]` を返す下地あり）。
- **ターン順をここで導入する。** 最小案:
  - 「パーティ全員が行動 → 敵が1回」の**ラウンド制**。
  - 素早さは導入しない（新規パラメータを増やさない）。
  - `BattleState` に `turnQueue: readonly string[]` と `acting: string` を追加。
- `decideTurn` を `decideTurn(state, spells, { actor })` に拡張。
  既存5ルールは actor の HP/MP を読むように置換するだけで、判断の骨格は不変。
- `TurnPlan` に `targetId: string | null` を追加（癒しの対象）。
- UI: `BattleParty` はすでに4人まで描ける。コマンド行に「誰の番か」の表示を足す。
- **このStageだけは既存戦闘の手触りが変わる。** 単独で十分な手動プレイテストを要する。

### Stage 4 — 旧フィールドを消す（純粋な後片付け）

- `playerHp / playerMp / playerMaxHp / playerMaxMp` を削除。
- 読み取り46箇所を `party[0]` 相当のセレクタに置換。
- **Stage 3 が安定してから**。急ぐ理由は無い。

---

## 3. この順序にする理由

- **Stage 1 と 2 は挙動を変えないので、いつマージしても既存戦闘は壊れない。**
  「大規模再設計はしない」という現在の制約と両立する。
- 危険は Stage 3 に**一点集中**する。壊れるとしたらそこだけなので、
  レビューもプレイテストもそこに集中できる。
- Stage 4 を最後に置くことで、Stage 3 が失敗しても Stage 1〜2 を戻す必要がない。

## 4. 先に決めておくべきこと（作者判断）

1. **ターン順の方式** — ラウンド制（上記最小案）でよいか、素早さを入れるか。
2. **2人目は誰か** — ケイオスを前衛に立てるのか、彼女は後衛のままなのか。
   現在の Formation は 2人編成で「前1・後1」を想定している。
3. **MPは共有か個別か** — 現在の `PLAYER_MAX_MP = 48` は「ケイオスの力」として
   書かれている。個別化すると《身構える》のMP回復の意味が変わる。
4. **全滅以外の敗北条件** — 主人公だけ倒れたら負けか、全員倒れて負けか。

これらは戦闘の手触りを決める設計判断なので、こちらでは決めていない。
