# 保留項目の状態 — 作者判断が必要なもの

対象: A-2 / B-4 / E-2。いずれも**コード変更は行っていない**。

---

## A-2 — LINA の CHARACTER_STATE に必要なもの

`CharacterState`（`src/core/characters/types.ts`）の全9項目について、
**現在のCANONだけで安全に埋まるもの**と、**作者判断が要るもの**を分けた。

比較のため `INITIAL_GALD_STATE` が唯一の既存実例（`src/content/characters/gald.ts`）。

| 項目 | 型 | 判定 | 値 / 理由 |
|---|---|---|---|
| `id` | string | ✅ 安全 | `'LINA'` — 既に `NpcCore.npcId` がこの値。二重管理にならない |
| `name` | string | ✅ 安全 | `'リナ'` — 指示書の「村娘リナ」から直接取れる |
| `alive` | boolean | ✅ 安全 | `true` — 死亡を示すCANONは存在しない |
| `location` | string | ✅ 安全 | `'ALDEN_VILLAGE'` — 指示書「出身：アルデン村」。既存LocationIdに存在 |
| `spouseId` | string\|null | ✅ 安全 | `null` — 配偶者を示すCANONは存在しない |
| `childrenIds` | string[] | ✅ 安全 | `[]` — 同上 |
| `lifePhase` | LifePhase | ⚠️ 条件付き | 指示書に「**幼少期**のリナへ魔法を見せる」とあるので、**世界開始時点なら `'CHILD'` が導出できる**。ただし `age` を決めないと整合が取れない（下記） |
| `age` | number | ❌ **REQUIRED_CANON_DECISION** | CANONに一切の根拠なし。推測しない |
| `occupation` | string | ❌ **REQUIRED_CANON_DECISION** | 下記のとおり、これは特に危険 |

### `age` — 決めてほしい理由

`lifePhase` と整合が必要なうえ、**BLOOMの日数条件と直結する**。
`LINA_VILLAGE_MAGE` などは `afterDays: 730`（約2年）、
`LINA_GIVES_UP_MAGIC` は `afterDays: 1460`（4年）。
開始年齢を仮に置くと、「魔導士になる」時点の年齢が自動的に確定してしまう。
これは作者が決める世界設定であって、こちらが逆算してよい値ではない。

必要な指定: **世界開始時点（1年目1日目）のリナの年齢**。

### `occupation` — 特に危険

`GALD` は `'BANDIT'` → `'ROADSIDE_HEALER'` のように職業が変わる。
リナの職業は**この世界の未来分岐そのもの**（村の魔導士 / 治癒魔導士 /
放浪魔導士 / 魔法を諦める）。
世界開始時点の職業に何を書いても、それは「彼女が最初は何者だったか」という
CANONを作ることになる。

`'NONE'` は既存の慣例として存在する（`GALD_LEAVES_BANDITS` が
`occupation: 'NONE'` を設定する）ので**選択肢としては安全**だが、
「村娘には職業が無い」という主張自体が世界観の決定なので、
こちらでは選ばない。

必要な指定: 以下のどれか
- `'NONE'`（何者でもない）
- `'VILLAGER'` 等の新しい値
- 家業を手伝っているなら具体名（マルタが井戸番なので、それに準ずる何か）

### 登録できる状態になった時に触る場所

1. `src/content/characters/lina.ts` を新規作成（`gald.ts` と同じ形）
2. `src/core/world/world.ts:241-243` の初期キャラクタ構築に追加
3. GOD VIEW は**変更不要** — `world.getCharacter(id)` を既に全ロスター分呼んでおり、
   登録された瞬間に「CHARACTER_STATE未登録」が実データに変わる

---

## B-4 — GOD VIEW の地域切り替え：構造は阻害していない

結論: **既存データ構造は地域切り替えを一切阻害していない。**

- `observeWorld(state, rules, roster, region, characters)` は
  **`region` を既に引数で受けている**。ハードコードされていない。
- `WorldPerson.region` は全ロスターに入っており、`PORT_REGION` も既に使われている
  （NEL）。
- `outsiders` の算出は「この地域の誰かと線で繋がっている外部の人」を
  `regionOf()` 経由で求めており、地域名に依存していない。

**唯一の固定箇所**は UI 1行:

```
src/dev/GodViewScreen.tsx
  observeWorld(life, WORLD_LIFE_RULES, WORLD_PEOPLE, ALDEN_REGION, characters)
                                                     ^^^^^^^^^^^^
```

地域切り替えを入れるときに必要なのは
「ロスターに存在する region の一覧をボタンにして `useState` で差し替える」だけ。
**モデル側の変更は不要。**

（次段階で着手するとして、現時点で先回りの構造変更は入れていない。）

---

## E-2 — 「孤立」表示の改善案（実装せず、案のみ）

### 現状の問題

衛兵はガルドと**和解した結果**、彼への `BECAUSE_OF` 線が `BROKEN` になり、
`linkedTo` が空になって「⚠ 孤立」と表示される。
データとしては正しい（現在アクティブな人物接続が0本）が、
**「人生上まったく誰とも関係が無い」ように読める**。

マルタ（一度も誰とも繋がったことがない）と衛兵（繋がっていたが解けた）が
同じ表示になるのは、作者にとって意味のある区別を潰している。

### 案1（推奨）— 2語に分ける。ロジック変更なし

現在の判定はそのままに、**表示だけ**を過去の線の有無で出し分ける。

```
マルタ（リナの母）  ⚠ 孤立（誰とも繋がったことがない）
アルデンの衛兵      ○ 現在は無接続（過去の線 1本：GALD [BROKEN]）
```

- 必要な情報は既に `NpcObservation.vinesOut / vinesIn` にある
  （`status: 'BROKEN'` の線が残っている）。新しい計算は不要。
- `isolatedPeople()` の戻り値は変えず、表示層で `vinesOut.length > 0` を見るだけ。
- 「孤立NPCを発見する」という本来の目的は、マルタだけが ⚠ になることで
  **むしろ鋭くなる**。

### 案2 — BROKEN も接続として数える

`linkedTo` に BROKEN の相手も含める。
- 利点: 実装が最小（フィルタ1つ外すだけ）
- 欠点: **本来の目的を壊す**。「今この村で誰にも触れていない人」が
  見つけられなくなる。一度でも誰かに関わった人は永久に非孤立になる。
- **非推奨。**

### 案3 — 「過去の縁」を別欄にする

ロスターは案1のまま、詳細画面に「かつての縁」セクションを足す。
- 利点: 一番読みやすい
- 欠点: 画面が増える。ALDEN MVP段階では過剰

### 推奨

**案1**。表示層だけの変更で、検出ロジックにも `PERSONAL_VINE` の定義にも触らない。
指示があれば実装する。

---

## 【追記 2026-09】ALDEN NPC VISUAL + CHARACTER STATE BATCH v0.1 実施後

A-2（LINA の CHARACTER_STATE）は**解決済み**。上の表のうち作者判断待ちだった
`age` / `occupation` / `lifePhase` は指示書で確定した。

未確定として残るのは以下1件のみ。

### REQUIRED_CANON_DECISION — BAKERY_OWNER の年齢

`src/content/characters/bakeryOwner.ts` に `age: null` として登録済み。

- リファレンスシートには中年男性として描かれているが、**絵から読み取った数字は
  1ヶ月後には作者が決めた数字と区別がつかなくなる**ため、記入していない。
- `CharacterState.age` を `number` → `number | null` へ最小拡張した。
  null は「欠落」ではなく「まだ決めていない」という**明示的な記録**。
- `world.ts` の3年経過処理は `age === null` をスキップする。
  これがないと `null + 3 = 3` になり、**誰も決めていない「3歳」が
  正史として書き込まれていた**（型チェックが検出）。
- GOD VIEW は `年齢未定（REQUIRED_CANON_DECISION）` と表示する。

**必要な指定**: 世界開始時点（1年目1日目）のパン屋の主人の年齢。

副次的に未確定: `lifePhase`。現在 `'ADULT'`（CHILD/YOUNG_ADULT/ADULT/ELDER のうち
「子供でも老人でもない」という最も弱い主張）。年齢が決まれば整合させる。
