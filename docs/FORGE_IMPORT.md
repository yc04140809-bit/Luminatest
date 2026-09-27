# CHARACTER FORGE → MUGEN ZERO キャラクター採用（AUTHORING / CONTENT IMPORT）

2026-09-27。根拠：`mugen-character-forge-to-zero-bridge-v1.0.zip` と、作者の方針修正（同日）。

> **CHARACTER FORGE は、作者が候補を作って採用し、MUGEN ZERO の正式 NPC として登録するための開発用ツール。**
> 採用した NPC は**全プレイヤー共通のコンテンツ**（ゲームのビルドに入る）。端末の SAVE には入れない。
> SAVE が持つのは、その NPC について**その世界で起きたこと・変わった状態**だけ。

最初の実装（e180a76）は取り込んだ人物を端末の SAVE に入れていた。これは目的と違うため作り直した（§8）。
プレイヤー個人がキャラクターを足す「RUNTIME / PLAYER IMPORT」は今回は実装しない。

---

## 1. 正式定義の置き場所（コンテンツ）

`packages/mugen-core/content/forge/`（リポジトリ内。git で管理し、ビルドに入る）

| ファイル | 中身 | ビルドに入るか |
|---|---|---|
| `roster.json` | 採用台帳：Character ID → NPC_ID、種類・役割、地域、送出版・送出日時・hash、採用日時、取込履歴（NEW／UPDATED／ROLLED_BACK と警告）、直前定義の参照 | 入る |
| `characters/<ID>.json` | 採用した DEPLOY JSON そのもの（未知の項目も含めて保持） | 入る |
| `previous/<ID>.json` | 直前の更新の前の定義（ロールバック 1 段用） | **入らない**（ツール専用） |
| `void.json` | FORGE の VOID／DISCARDED ID 台帳（増えるだけ） | 入る |
| `index.generated.ts` | 上のファイルを読み込む生成モジュール。手で編集しない（テストが台帳との一致を確認） | 入る |

ゲームは `content/forge/forgeContent.ts` で一度だけ読み、次の形で各所へ渡す：

- **人物台帳**：`content/people/allPeople.ts` の `ALL_NPCS` ＝ 手書きの `NPC_REGISTRY` ＋ 採用キャラ（人間は `PERSON`、モンスターは新設の `CREATURE`）。
  `NPC_REGISTRY` 自体は手書きのまま、ツールは書かない。
- **WORLD LIFE ENGINE**：`content/world/mugenWorld.ts` の `cores` に `forgeCores(...)` を追加（§4）。
- **GOD VIEW の名簿**：`WORLD_PEOPLE` に `forgeWorldPeople(...)` を追加。

## 2. FORGE Character ID → NPC_ID

- **採用時に作者が NPC_ID を決める**（必須）。決めるまで登録ボタンは押せない。
- NPC_ID は正式形（英大文字で始まり、英大文字・数字・`_`）。1 つの NPC_ID は 1 人だけ。別名（`alden_marta` など）は使えない。
- **既存の人物を指定できる**（例：FORGE の HUM-000003 → `LINA`）。その人の正式定義として対応づけるだけで、
  既存の ID・名前・現在状態の初期値・地域・life engine の core は**変えない**（名前が違えば警告を出し、本編の名前を使う）。
  PLAYER／KAOS／場所／WORLD、または人間でない人物への対応づけは拒否。モンスターを既存の人物に対応づけることも拒否。
- 採用後は **NPC_ID を変更できない**（再送出で別の NPC_ID を指定すると拒否）。台帳に永久に残る。
- 地域は任意（`ALDEN`／`PORT_TOWN`、空欄＝未配置 `UNPLACED`）。FORGE の希望配置（worldAssignment）から自動では決めない。

## 3. RESET WORLD／はじめる

- 正式定義はビルドの中にあるので、**RESET WORLD・はじめる・再インストールでは消えない**。
- 初期化されるのは、その世界で起きた出来事と現在状態（SAVE）だけ。
- 採用キャラの「ゲーム中に変化した状態」は、既存の人物と同じく NPC_ID をキーに SAVE に置く設計（`character_<NPC_ID>` のように、
  行が無い＝コンテンツの初期状態）。**現時点で採用キャラの状態を書き込むゲーム処理はまだ無い**ので、SAVE に行は増えない。

## 4. WORLD LIFE ENGINE からの参照

`forgeCores(handCores, content)` が採用キャラを life engine の人物（`NpcCore`）にする：

| NpcCore | 人間 | モンスター |
|---|---|---|
| traits | `profile.core.personality`（FORGE の言葉のまま） | なし |
| values | `profile.core.values` | なし |
| desires | `profile.core.desires` | `ecology.desire` |
| aptitudes | `aptitudes` をキー大文字化（MAGIC・SWORD・HEALING…）。どちらも「潜在適性」で意味が同じ | なし（種族の戦闘潜在値は人生の適性ではない） |

- 既存の人物（手書き core がある NPC_ID、別名 `alden_marta` 含む）は追加しない＝二重にならない。
- **言葉の対応は推測しない**：既存の種の種類は `CURIOUS`・`FAMILY` など英語 ID で共鳴を判定するので、「慎重」などの FORGE の言葉は
  そのままでは共鳴しない（最低値で育つ）。作者がその言葉に反応する種を書くか、語彙の対応表を決めたら効くようになる。
- テストで確認：採用キャラの前で「魔法を見せる」が起きると、そのキャラに種が植わる（core が無ければ植わらない）。

## 5. 採用の流れと道具

判定は以前と同じ（NEW／UPDATE／UNCHANGED／BLOCKED_*。古い送出・同時刻で内容違いは拒否、サンプルは拒否、未解決の関係・画像・場所は警告）。
その上で NPC_ID の確認（§2）が加わる。すべて純粋関数（`core/forge/plan.ts`・`content.ts`）。

| 道具 | できること |
|---|---|
| 開発サーバーの画面（PC、`npm run dev:app` → タイトルの「DEBUG キャラクター取込」または `?tool=forge-import`） | 検証 → 差分確認（NPC_ID・地域の入力）→ 登録。リポジトリの `content/forge` へ書く。ロールバック。 |
| コマンド | `npm run forge:import -w @mugen/core -- <deploy.json> --npc-id SERA [--region ALDEN] [--apply]`（`--apply` なしは確認のみ）／`-- --rollback <ID> --apply`／`-- --void <FORGEのVOID書き出し.json> --apply`／`-- --list` |
| debug APK（実機） | 同じ画面が**確認専用**で開く。ビルドに入っている採用済みキャラの一覧と、ファイルの検証・差分。書き込みはしない。 |

- 書き込みは毎回ディスクを読み直して計画し直し、画面で確認した判定・hash と違えば何も書かない。
- 書いた後は `content/forge` の変更を git に入れてビルドすると全プレイヤーのゲームに入る。
- 開発サーバーの書き込み口（`/__mugen/forge/*`）は `vite serve` のときだけ存在し、どのビルドにも入らない。
  `&sandbox=<名前>` を付けると OS の一時フォルダに書く（e2e テスト用）。

## 6. VOID／DISCARDED ID

- `void.json` に永久保存（増えるだけ、消さない）。FORGE の書き出しファイルから取り込む（`--void`）。
  FORGE の正式な書き出し形式が未確定なので、ID の配列、`{voidIds|discardedIds: [...]}`、`{characters|entries: [{characterId, status: VOID|DISCARDED}]}` を読む。
  読めなかった値は理由を返す。
- VOID の ID は採用できない（BLOCKED_RESERVED_ID）。
- **採用済みの ID が VOID として届いたら、何も書かずに止める**（NPC を消して解決しない。作者が FORGE と照合）。

## 7. テスト

| テスト | 件数 | 内容 |
|---|---|---|
| `core/forge/forge.test.ts` | 40 | hash、A1〜A6、B（コンテンツとして）、C1〜C7、古い送出、ファイル改ざん、NPC_ID の規則、VOID、D1〜D6、E1〜E6、F1〜F5、未知の項目、結果スキーマ、差分、生成 index |
| `core/forge/contentFs.test.ts` | 6 | 一時フォルダで実際にファイルを書く：採用・同じファイル再読込・確認後に変わったら書かない・サンプルは書かない・更新とロールバック・手で編集された定義の検出・VOID 取込 |
| `content/forge/forgeContent.test.ts` | 11 | ビルドの content が読めて index が生成物と一致、サンプル・VOID・NPC_ID 重複なし、人物台帳・life engine・GOD VIEW への反映、**life engine が採用キャラに種を植える**、既存人物への対応づけで何も増えない、SAVE に FORGE 行が無い、RESET WORLD で消えない、e180a76 の SAVE（FORGE 行・出来事入り）がそのまま開ける |
| `mugen-app/e2e/forgeImport.spec.ts` | 6 | 画面の 3 段階（サンドボックスに書く）、NPC_ID 入力、HUMAN／通常モンスター／BOSS、サンプル・壊れた JSON、二重登録なし、再送出の差分、ロールバック、既存人物への対応、リポジトリの content を触っていないこと |

「非サンプルの FORGE JSON」：実データはまだ手元に無いので、FORGE のサンプルから `sampleOnly` を外したコピー（テストの中だけ）で確認している。
作者の実データは `npm run forge:import -w @mugen/core -- <file> --npc-id <ID>`（`--apply` なし）でそのまま確認できる。

## 8. e180a76（SAVE 方式）から変わったこと

- `World` の FORGE 用メソッド・行（`forge_character_*` など）・到着イベントの書き込みを**削除**。`World` の変更は `hasProgress` の 1 行だけ残した
  （下記の旧イベントを進行とみなさない）。
- `CHARACTER_IMPORTED_FROM_FORGE`／`CHARACTER_UPDATED_FROM_FORGE` はもう書かない。ただし e180a76 の debug ビルドで取り込んだ SAVE を
  読めるように型とラベルは残し、進行・プレイヤーの知識・life engine からは今まで通り除外。旧 `forge_*` 行は書き換えずに残る。
- 「WORLD MEMORY 初期イベント」（資料 §13）は、採用が世界の中の出来事ではないため、**台帳（roster.json）の取込履歴**として記録する形に変えた。
- SAVE_VERSION は 3 のまま。SAVE の形式は何も変えていない。
