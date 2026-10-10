# 提案：WORLD LIFE ENGINE を人間・モンスター共通の「Entity 参照」で扱う（未実装・2026-10-10）

作者判断（2026-10-10）：「フウミミに NPC_ID を無理に付けない」「既存 CANON ID を別の NPC_ID へ変換して二重管理しない」。今回すぐ大規模改修はしない。

## 今の状態（コードの確認結果）

| 場所 | ID の持ち方 |
|---|---|
| WORLD MEMORY の出来事（`MemoryEvent.actors`） | **ただの文字列**。`PLAYER`・`GALD`・`moss_rabbit_001`、そして今回の `IND-43452DFD` もそのまま入る |
| Life Engine の記録・つながり（`WorldActorId`） | **ただの文字列**（`core/life/types.ts`） |
| Life Engine の人物の芯・種・開花（core／seed／bloom） | `npcId` という名前の**文字列**で引いている |
| 生き物の個体（`EnemyIndividual`） | `individualId`。種は ID の形（`<種>_001`）か、今回足した `FIXED_INDIVIDUALS`（FORGE の個体 ID → 種）で引く |
| FORGE の取込（`forge:import`） | **採用には NPC_ID が必須**（`docs/FORGE_IMPORT.md` §2）。モンスターも同じ |

つまり、エンジンの中身はすでに「文字列の ID」で動いていて、**NPC_ID でなければならない理由は名前と取込の決まりだけ**。

## 提案（最小限）

1. **Entity 参照の解決を1か所にまとめる**：`entityOf(id: string)` を core に置く。ID の形で振り分け、変換はしない。
   - `HUM-…`／`MON-…` → FORGE の台帳（roster）の正式定義
   - `IND-…` → 生き物の個体（`EnemyIndividual`、種は `FIXED_INDIVIDUALS`）
   - それ以外 → 既存の人物台帳（`NPC_REGISTRY`、例：`GALD`・`LINA`・`RIZEL`）
   既存の ID はそのまま。新しい ID を作って対応表で二重に持つことはしない。
2. **Life Engine の `npcId` を「entityId」として読む**：型の名前を変えるだけで、値は今と同じ文字列。人物（NPC_ID）も、FORGE の ID（`MON-000002`）も、個体 ID（`IND-43452DFD`）も入れられる。既存データはそのまま読める。
3. **FORGE 取込で、モンスターは NPC_ID なしで採用できるようにする**：台帳はもともと FORGE の Character ID で引いているので、NPC_ID を空にできればよい。人間は今どおり NPC_ID 必須。
   - **これは取込の基盤（`docs/FORGE_IMPORT.md` §11 で、作者の正式な指示なしに変えないと決めた部分）の変更**になる。作者判断が必要。
   - それまでは、フウミミは今回のように「ID の参照だけ」で使い、`content/forge` には入れない（セキリュウガと同じ）。

## 影響とコスト

- 1：小（新しい関数1つとテスト）。既存の動作は変わらない。
- 2：小〜中（型名の変更と、npcId を前提にした箇所の確認）。セーブの形は変わらない。
- 3：中（取込の検査・台帳・確認画面・テスト）。作者の承認が要る。
- Artifact：WORLD MEMORY の表示は個体名を `individualName` で引くので、`FIXED_INDIVIDUALS` を足した時点で「フウミミ」と出る（変更不要）。
