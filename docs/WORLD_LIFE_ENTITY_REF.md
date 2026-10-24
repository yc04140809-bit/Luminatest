# WORLD LIFE ENGINE／WORLD MEMORY の Entity 参照（調査と方針・2026-10-10）

## 作者判断（2026-10-10）

- モンスターに NPC_ID を付けない。FORGE 由来の ID 体系をそのまま保つ：**MON-XXXXXX＝モンスター種族、IND-XXXXXXXX＝モンスター個体、NPC_ID＝人間などの NPC**。
- MON-ID・IND-ID を NPC_ID へ変換したり、擬似 NPC_ID を足したりしない。
- 将来、NPC・モンスター種族・モンスター個体などを共通に扱う上位の **Entity 参照**（`entity_type` ＋ ID 文字列そのもの）へ広げられる設計にする。既存 ID は置き換えない。
- WORLD MEMORY も同じ参照方式に統一できる余地を残す。ただし「遭遇しただけ」「勝っただけ」は記録しない。
- 凍結済みの取込基盤は、この判断だけで変えない。最小変更で将来を塞がないことを優先。

**作者決定（2026-10-10）**：今回の最小変更（§4）で進める。WORLD MEMORY／WORLD LIFE ENGINE の大規模な Entity 改修は今は行わない。モンスターの共存・再会・群れ・世代・死亡・仲間化などを WORLD LIFE ENGINE へ本格投入する段階で、今の ID 参照を正式な Entity 参照へ広げる。

## 1. 今の ID 依存箇所（調査結果）

| 場所 | ID の扱い | NPC_ID 前提か |
|---|---|---|
| WORLD MEMORY（`MemoryEvent.actors`） | 文字列の配列。`PLAYER`・`GALD`・`moss_rabbit_001`・`IND-43452DFD` がそのまま入る | **いいえ** |
| WORLD MEMORY → Life Engine（`core/life/canonBridge.ts` の `asWorldMemory`） | actors の1つ目を「した人」、残りを「された相手」として**文字列のまま**渡す。検査も変換もしない | **いいえ**。モンスターの ID もすでに流れているが、どの人物の芯（core）とも一致しないので、何も起きないだけ |
| Life Engine の記録・つながり（`WorldActorId`） | 文字列 | **いいえ** |
| Life Engine の人物の芯・種・開花（core／seed／bloom、`content/world/*.ts`） | `npcId` という名前の文字列で引く。値は今は人物の NPC_ID だけ | 名前だけ。値は文字列 |
| 生き物の個体（`EnemyIndividual`、world_state 行 `enemyIndividuals`） | `individualId`。種は ID の形（`<種>_001`）か `FIXED_INDIVIDUALS`（FORGE の個体 ID → 種、2026-10-10 追加）で引く | **いいえ** |
| 人物台帳（`content/people/registry.ts`・`allPeople.ts`） | NPC_ID で引く。FORGE で採用した人もここに入る（モンスターは種類 CREATURE として入る） | **はい** |
| FORGE の台帳（`content/forge/roster.json`、検査 `core/forge/content.ts`） | **全員に正式な NPC_ID が必須**（無いと台帳の問題として扱う）。採用の手順（`plan`）も NPC_ID が無いと進まない | **はい**（凍結中の取込基盤） |

### 衝突しないことの確認

NPC_ID の形は「英大文字で始まり、英大文字・数字・`_` だけ」（`core/link/npcId.ts`）。`MON-000008`・`IND-2262C6F7` は `-` を含むので、**NPC_ID と取り違えることはない**。ID の形だけで種類を見分けられる。

## 2. 既存仕様との衝突（独断で変えず、報告）

**MON-000001 ヌマワタリは、2026-10-04 に NPC_ID `NUMAWATARI` として採用済み**（モンスター・Life Engine 対象外）。今回の方針（モンスターに NPC_ID を付けない）と合わない。
取込の決まりでは、採用後の NPC_ID は変更できない（`docs/FORGE_IMPORT.md` §2）。ヌマワタリはゲーム画面には出ていない（人物台帳に CREATURE として入っているだけ）。

選択肢：
- A）そのまま残す
- B）取込基盤を「NPC_ID なしのモンスター」に対応させた後、`--rollback` で取り消して、NPC_ID なしで採用し直す

**作者決定（2026-10-10）：B。** ただし第1章の作業を止めてまでは直さない。**ヌマワタリを本編に正式登場させる前に整理する保留項目**とする（MON-000001 を正本として、NPC_ID なしで採用し直す）。

## 3. NPC_ID なしでモンスターを扱うために必要な変更

| 対象 | 変更 | 後方互換 | 既存の NPC への影響 |
|---|---|---|---|
| FORGE の台帳の検査（`core/forge/content.ts`） | モンスターの `npcId` を空（null）でも可にする。人間は今どおり必須 | 既存の台帳はそのまま読める | なし |
| 採用の手順（`core/forge/plan` 系・CLI・開発画面） | モンスターは NPC_ID 無しで採用できる。人間は今どおり | 既存の採用済みは変わらない | なし |
| 人物台帳への載せ方（`content/forge/forgeContent.ts`） | NPC_ID の無いモンスターは人物台帳に入れず、Entity 参照（下の §4）で引く | 既存の人物はそのまま | なし |
| Life Engine | 当面は変更不要（モンスターは Life Engine 対象外が既定）。正式に投入する時に、芯・種・開花の `npcId` を「entityRef」として読む | 値は同じ文字列なので、既存の人物データはそのまま | なし |
| セーブ | **変更不要**。WORLD MEMORY も個体の行も、ID をすでに文字列で持っている。種類は ID の形から分かるので、セーブに `entity_type` を足す必要はない | SAVE_VERSION 3 のまま | なし |

上の最初の3つは**凍結中の取込基盤の変更**。作者の正式な指示があってから行う。

## 4. 今実装した最小変更（2026-10-10）

`packages/mugen-core/core/world/entityRef.ts`（新規・どこからも使われていない純粋な関数。既存の動作は何も変わらない）

```ts
type WorldEntityType = 'NPC' | 'MONSTER_SPECIES' | 'MONSTER_INDIVIDUAL';
interface WorldEntityRef { entityType: WorldEntityType; entityRef: string }  // entityRef は ID 文字列そのもの
entityRefOf(id) // ID の形で種類を見分ける。変換はしない。見分けられなければ null
```

| ID の形 | 種類 |
|---|---|
| `MON-` ＋ 数字6桁（FORGE の種族） | MONSTER_SPECIES |
| ZERO の種 ID（`moss_rabbit`・`fuumimi` など、英小文字） | MONSTER_SPECIES |
| `IND-` ＋ 英数字8桁（FORGE の個体） | MONSTER_INDIVIDUAL |
| ZERO が名付けた個体（`moss_rabbit_001` など） | MONSTER_INDIVIDUAL |
| 正式な NPC_ID（`GALD`・`RIZEL`・`PLAYER` など） | NPC（人物台帳の対象。主人公・ケイオスも含む） |
| `HUM-` ＋ 数字6桁 | **null**（人間は NPC_ID で参照する。HUM-ID は FORGE の台帳が持つ） |

テスト（`entityRef.test.ts`）：形が重ならないこと、今のセーブに入りうる ID（WORLD MEMORY の actors、個体、人物台帳、FORGE の台帳）がすべて見分けられること、ヒョウレイ（MON-000008／IND-2262C6F7）・フウミミ（MON-000002／IND-43452DFD）がそのままの ID で見分けられること。

## 5. 将来へ保留するもの

| 項目 | 内容 | いつ |
|---|---|---|
| 取込基盤の対応（§3 の上3つ） | NPC_ID なしのモンスター採用 | 作者の指示の後 |
| ヌマワタリの整理（§2、決定：B） | 取込基盤の対応後、NPC_ID `NUMAWATARI` を取り消して MON-000001 を正本として採用し直す | ヌマワタリを本編に出す前 |
| Life Engine の芯・種・開花を Entity 参照で引く | `npcId` を `entityRef` として読む（型名の変更と確認） | モンスター個体を Life Engine に正式投入する時 |
| WORLD MEMORY の新しい出来事 | 共存・再会・群れとの関係・世代変化・生態変化・死亡など。actors に IND／MON の ID をそのまま入れる。**意味のある出来事だけ**（遭遇・勝利だけでは記録しない方針は維持） | 物語で必要になった時、1つずつ |
| 表示名の引き方 | `entityRefOf` で種類を見分け、人物台帳・種・個体から名前を引く関数を1つにまとめる（今は `individualName` が個体だけを引いている） | 表示に必要になった時 |

## 6. ID の確認

- **IND-43452DFD は MON-000002 フウミミの個体 ID**（受け取った FORGE データ `profile.individual.individualId`）。リポジトリ内の使用箇所もすべてフウミミ（`content/enemies/fuumimi.ts` ほか）。
- **ヒョウレイ（MON-000008）の個体 ID は IND-2262C6F7**。リポジトリ内では `docs/FORGE_REVIEW_HYOUREI.md` だけに出てくる。**混線は無い**。ヒョウレイの ID は変更していない。
