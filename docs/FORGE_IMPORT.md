# CHARACTER FORGE → MUGEN ZERO キャラクター採用（AUTHORING / CONTENT IMPORT）

2026-09-27。根拠：`mugen-character-forge-to-zero-bridge-v1.0.zip` と、作者の方針修正（同日）。

> **CHARACTER FORGE は、作者が候補を作って採用し、MUGEN ZERO の正式 NPC として登録するための開発用ツール。**
> 採用した NPC は**全プレイヤー共通のコンテンツ**（ゲームのビルドに入る）。端末の SAVE には入れない。
> SAVE が持つのは、その NPC について**その世界で起きたこと・変わった状態**だけ。

最初の実装（e180a76）は取り込んだ人物を端末の SAVE に入れていた。これは目的と違うため作り直した（§8）。
プレイヤー個人がキャラクターを足す「RUNTIME / PLAYER IMPORT」は今回は実装しない。

流れ（作者の正式方針・2026-09-27）：

```
FORGE JSON → AUTHORING IMPORT → VALIDATION → NORMALIZATION（語彙アダプター）
  → MUGEN ZERO 正式 Character Definition → ゲーム BUILD → lifeActor のキャラだけ WORLD LIFE ENGINE
```

## 0. 作者の正式決定（2026-09-27・確定）

1. **AUTHORING IMPORT**：正式定義は `packages/mugen-core/content/forge/` に置き、ビルドに入れる。SAVE には何も書かない。
   登録は開発サーバー画面または `forge:import` コマンド。preview（確認のみ）→ 作者確認 → `--apply` で反映。
2. **voidIds**：`schemaVersion: 1` / `voidIds: [{ characterId, status: "VOID" }]` を正式形式とする。読み込んだ VOID ID は `void.json` に永続保存。
   台帳登録前に拒否。採用済み ID が VOID として届いたら何も書かず停止し、既存 NPC を削除して解決しない。
3. **Vocabulary Adapter**：UNMAPPED は警告のみ（エラーにしない）。似た値へ自動変換しない。FORGE の元の値は残す。
   性格・価値観・願いの対応表は当面空（FORGE の性格等は Life Engine の種の育ち方に影響させない）。実データを見ながら後で追加する。
4. **ADOPTED と Life Engine 対象**：採用キャラは全員人物台帳に入れる。WORLD LIFE ENGINE／GOD VIEW に入れるのは `lifeActor = true` だけ。
   初期方針は「人間は対象」「モンスター（通常／BOSS）は対象外」。例外は作者判断で切り替える。
5. **Character ID → NPC_ID**：採用時に NPC_ID 入力必須。大文字定数形式、1 人に 1 つ、採用後は変更不可・再利用不可。既存人物を指定した場合、その人物の ID と名前は変えない。
6. **importance**：当面「一般NPC → ORDINARY」の 1 件だけ。
7. **次の段階**：実 FORGE JSON 1 件で preview のみ実行 → 作者確認 → `--apply` → Android 実機確認項目を順に確認。

SAVE_VERSION=3 と保存形式は変えない。RESET WORLD／はじめるの後も採用済み一覧は変わらない（採用済みキャラの存在はビルド内容であり、SAVE には書かない）。

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

- **正式 Character Definition**：`content/forge/forgeVocabularyAdapter.ts` の `zeroCharacterDefinition` が、FORGE の JSON と台帳から
  毎回作る（保存しない）。`forgeDefinitions()` で一覧。
- **人物台帳**：`content/people/allPeople.ts` の `ALL_NPCS` ＝ 手書きの `NPC_REGISTRY` ＋ **採用キャラ全員**（entityType：人間 `PERSON`、モンスター `CREATURE`）。
  `NPC_REGISTRY` 自体は手書きのまま、ツールは書かない。
- **WORLD LIFE ENGINE**：`content/world/mugenWorld.ts` の `cores` に `forgeCores(...)` を追加。**lifeActor のキャラだけ**（§4）。
- **GOD VIEW の名簿**：`WORLD_PEOPLE` に `forgeWorldPeople(...)` を追加。これも lifeActor だけ。

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

## 4. ADOPTED と Life Engine 対象の分離（lifeActor）

- **ADOPTED ＝ MUGEN ZERO 正式コンテンツとして採用された**、という意味だけ。Life Engine の参加資格とは別の軸。
- 台帳の各キャラに `lifeActor: boolean`（WORLD LIFE ENGINE が個体として人生・状態・因果を追うか）。
  - 既定：**人間は対象、モンスターは対象外**（BOSS も既定は対象外）。採用時に作者が変えられる（背景モブの人間を対象外に、物語で追う固有モンスターを対象に）。
  - 採用後の変更は専用操作だけ（画面の「対象にする／対象外にする」、`--set-life-actor <ID> yes|no`）。台帳に履歴が残る。再送出では変わらない。
- 対象外のキャラも正式コンテンツとして存在する（人物台帳にはいる）。SEED／GROWTH／VINE／BLOOM を個体として持たないだけ。
- WORLD LIFE ENGINE の対象単位は「世界の中で個体として追跡する必要がある存在」。人間に限らないが、種族だけでは自動参加しない。

## 4b. 語彙アダプター（FORGE → MUGEN ZERO ADAPTER）

`packages/mugen-core/content/forge/forgeVocabularyAdapter.ts` の 1 か所に対応表を集約。WORLD LIFE ENGINE／CORE の語彙は変えない。

| FORGE | MUGEN ZERO | 対応の仕方 |
|---|---|---|
| characterType | entityType（`PersonKind`） | 表：human→PERSON、monster→CREATURE |
| profile.importance | standing | 表：一般NPC→ORDINARY（ほかは UNMAPPED） |
| aptitudes（人間） | life engine の aptitude | 表：magic→MAGIC、sword→SWORD、healing→HEALING。commerce／social は engine に無いので UNMAPPED |
| profile.core.personality／values／desires、ecology.desire | life engine の traits／values／desires | 表は**空**（まだ対応が決まっていない）→ すべて UNMAPPED |
| profile.habitat | habitat（場所 ID） | 本編の場所の**正式名と完全一致**だけ（「グリーンウッドの森」→GREENWOOD_FOREST）。「森」は場所ではないので UNMAPPED |
| identity.speciesName | species | 本編の既存種族名と完全一致なら speciesId、なければ新しい種族名として保持 |
| profile.classification（種族分類）、profile.activityTime（活動時間） | — | MUGEN ZERO にまだ分類が無い → UNMAPPED（理由付き） |

- UNMAPPED は検証結果（画面の「MUGEN ZERO 正式定義」欄・CLI・台帳の警告）に出る。**エラーではなく、採用は止めない**。似た値へは変換しない。
- UNMAPPED の値はゲームの定義に入れない。FORGE の元の値は `characters/<ID>.json` にそのまま残るので、表に 1 行足せば次のビルドから効く。
- WORLD LIFE ENGINE の core には対応表を通った値だけが入る（以前の「FORGE の言葉をそのまま」はやめた）。
- テストで確認：表が出す値はすべて WORLD LIFE ENGINE が既に使っている語だけ。lifeActor のキャラの前で「魔法を見せる」が起きると
  種が植わり、隣にいる対象外のモンスターには植わらない。

## 5. 採用の流れと道具

判定は以前と同じ（NEW／UPDATE／UNCHANGED／BLOCKED_*。古い送出・同時刻で内容違いは拒否、サンプルは拒否、未解決の関係・画像・場所は警告）。
その上で NPC_ID の確認（§2）が加わる。すべて純粋関数（`core/forge/plan.ts`・`content.ts`）。

| 道具 | できること |
|---|---|
| 開発サーバーの画面（PC、`npm run dev:app` → タイトルの「DEBUG キャラクター取込」または `?tool=forge-import`） | 検証 → 差分確認（NPC_ID・地域・Life Engine 対象の入力、正式定義と UNMAPPED の表示）→ 登録。FORGE 書き出しファイルなら voidIds の台帳取込と、キャラの選択。リポジトリの `content/forge` へ書く。ロールバック、Life Engine 対象の切り替え。 |
| コマンド | `npm run forge:import -w @mugen/core -- <deploy.json> --npc-id SERA [--region ALDEN] [--life-actor yes\|no] [--apply]`（`--apply` なしは確認のみ）／`-- <forge-export.json> [--pick <ID> --npc-id ...] [--apply]`／`-- --rollback <ID> --apply`／`-- --set-life-actor <ID> yes\|no --apply`／`-- --list` |
| debug APK（実機） | 同じ画面が**確認専用**で開く。ビルドに入っている採用済みキャラの一覧と、ファイルの検証・差分・正式定義。書き込みはしない。 |

- 書き込みは毎回ディスクを読み直して計画し直し、画面で確認した判定・hash と違えば何も書かない。
- 書いた後は `content/forge` の変更を git に入れてビルドすると全プレイヤーのゲームに入る。
- 開発サーバーの書き込み口（`/__mugen/forge/*`）は `vite serve` のときだけ存在し、どのビルドにも入らない。
  `&sandbox=<名前>` を付けると OS の一時フォルダに書く（e2e テスト用）。

## 6. VOID ID（正式形式 `voidIds`）

FORGE → ZERO の書き出し JSON の正式形式：

```json
{
  "schemaVersion": 1,
  "exportedAt": "...",
  "characters": [ /* DEPLOY JSON（1人ずつ検証・採用） */ ],
  "voidIds": [ { "characterId": "HUM-000004", "status": "VOID" } ]
}
```

- 必須は `characterId` と `status: "VOID"` だけ。`reason`・`voidedAt` などは付いていてもよい（読まない）。status が VOID 以外の行は読み飛ばして理由を出す。
- ZERO 側は手入力で管理しない。書き出しを読み込んで `content/forge/void.json` に永久保存（増えるだけ）。
- voidIds の ID は：新規採用しない／既存の人物（例 LINA）への対応づけもしない／ZERO の NPC として生成しない。
  書き出しに入っている VOID は、台帳に取り込む前から拒否する（同じファイルの中の該当キャラを選んでも BLOCKED_RESERVED_ID）。
- **採用済みの ID が VOID として届いたら、何も書かずに止める**（NPC を消して解決しない。作者が FORGE と照合）。
- schemaVersion が 1 以外の書き出しは読まない。以前の試験形式（ID の文字列配列、`discardedIds` など）は互換として読むが「旧形式」と表示する。

## 7. テスト

| テスト | 件数 | 内容 |
|---|---|---|
| `core/forge/forge.test.ts` | 46 | hash、A1〜A6、B（コンテンツとして）、C1〜C7、古い送出、ファイル改ざん、NPC_ID の規則、**voidIds 正式形式・旧形式・書き出し内の VOID**、**lifeActor の既定・指定・固定・切り替え**、D1〜D6、E1〜E6、F1〜F5、未知の項目、結果スキーマ、差分、生成 index |
| `core/forge/contentFs.test.ts` | 8 | 一時フォルダで実際にファイルを書く：採用、確認後に変わったら書かない、サンプルは書かない、更新とロールバック、手で編集された定義の検出、正式 voidIds の取込、書き出し内 VOID の拒否、lifeActor の切り替え（台帳だけ変わる） |
| `content/forge/forgeVocabularyAdapter.test.ts` | 9 | 表は WORLD LIFE ENGINE の既存の語しか出さない、人間・モンスターの変換、UNMAPPED の理由、場所は正式名の完全一致だけ、UNMAPPED は警告 |
| `content/forge/forgeContent.test.ts` | 11 | ビルドの content が読めて index が生成物と一致、サンプル・VOID・NPC_ID 重複なし、人物台帳（全員）・life engine／GOD VIEW（lifeActor だけ）、**life engine が lifeActor に種を植え、対象外のモンスターには植えない**、既存人物への対応づけ、SAVE に FORGE 行が無い、RESET WORLD、e180a76 の SAVE |
| `content/forge/adoptedBuild.test.ts` | 3 | **採用済みキャラ入りのビルドを模擬**（生成 index をこのテストだけ差し替え）：人物台帳・life engine・GOD VIEW、既存 SAVE の読み込み → RESET WORLD → はじめる、の後も消えず、SAVE には書かれない |
| `mugen-app/e2e/forgeImport.spec.ts` | 8 | 画面の 3 段階（サンドボックスに書く）、NPC_ID、HUMAN／通常モンスター／BOSS、サンプル・壊れた JSON、二重登録なし、再送出の差分、ロールバック、既存人物、**FORGE 書き出し（voidIds 取込・VOID の拒否・キャラ選択）**、**lifeActor と UNMAPPED 表示・切り替え**、リポジトリの content を触っていないこと |

「非サンプルの FORGE JSON」：実データはまだ手元に無い。FORGE のサンプルから `sampleOnly` を外したコピー（テストの中だけ）で確認。

### 実データ 1 件での登録試験の手順（作者のファイルが届いたら）

1. `npm run forge:import -w @mugen/core -- <FORGE書き出し.json>`（確認のみ）で、正式形式か・voidIds・characters の一覧を確認。
2. `-- <FORGE書き出し.json> --pick <FORGE ID> --npc-id <NPC_ID>`（確認のみ）で、判定・FORGE ID・NPC_ID・characterType・
   Life Engine 対象（既定または `--life-actor`）・正式定義・UNMAPPED・警告を確認。
3. 作者の確認後に `--apply`。`content/forge` の差分を git で確認してコミット → ビルド。
4. `content/forge/forgeContent.test.ts`（ビルドの content が壊れていない）を含むテストを流す。

## 8. e180a76（SAVE 方式）から変わったこと

- `World` の FORGE 用メソッド・行（`forge_character_*` など）・到着イベントの書き込みを**削除**。`World` の変更は `hasProgress` の 1 行だけ残した
  （下記の旧イベントを進行とみなさない）。
- `CHARACTER_IMPORTED_FROM_FORGE`／`CHARACTER_UPDATED_FROM_FORGE` はもう書かない。ただし e180a76 の debug ビルドで取り込んだ SAVE を
  読めるように型とラベルは残し、進行・プレイヤーの知識・life engine からは今まで通り除外。旧 `forge_*` 行は書き換えずに残る。
- 「WORLD MEMORY 初期イベント」（資料 §13）は、採用が世界の中の出来事ではないため、**台帳（roster.json）の取込履歴**として記録する形に変えた。
- SAVE_VERSION は 3 のまま。SAVE の形式は何も変えていない。
