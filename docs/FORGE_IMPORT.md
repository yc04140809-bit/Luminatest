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
6. **importance**：当面「一般NPC → ORDINARY」の 1 件だけ。重要人物・主要人物・特殊NPC などは、作者が正式な基準を決めるまで UNMAPPED（推測・変換しない）。
   性格・価値観・願いの対応表は、FORGE 側の正式な語彙一覧を確認してから決める。それまでは空のまま、SEED／GROWTH 等の計算に影響させない。
   テスト（`forgeVocabularyAdapter.test.ts`）が、この 2 つの表の中身を固定している（正式決定なしに値が入ると失敗する）。
   将来対応表に追加しても FORGE 元の値は `characters/<ID>.json` に残り、失われない（テストで確認）。
7. **次の段階**：実 FORGE JSON 1 件で preview のみ実行 → 作者確認 → `--apply` → Android 実機確認項目を順に確認。

SAVE_VERSION=3 と保存形式は変えない。RESET WORLD／はじめるの後も採用済み一覧は変わらない（採用済みキャラの存在はビルド内容であり、SAVE には書かない）。

**作者判断（2026-09-28・確定）**

8. **性格・価値観・願い**：FORGE の正式な語彙一覧が揃うまで対応表を増やさない。元データ保存・推測変換なし・似た語への自動変換なし・
   UNMAPPED 警告・SEED／GROWTH／VINE／BLOOM などの計算に使わない。「意味が似ているから」での対応づけは禁止。語彙一覧の取得後、作者確認を経て追加する。
9. **importance**：有効なのは「一般NPC → ORDINARY」だけ。重要・主要人物・特殊NPC・イベントNPC・その他未知の値は UNMAPPED
   （採用は止めない。元の値を保持・警告・自動変換しない・補完しない・Life Engine の重要度計算に使わない）。
10. **年齢**：正は `profile.age`。`visualDiversity.ageGroup` は見た目生成用の補助情報で、正式年齢ではない。明らかに矛盾しても
    どちらも書き換えず、`WARNING: AGE / VISUAL AGE GROUP MISMATCH`（SOURCE AGE・VISUAL AGE GROUP・SOURCE DATA PRESERVED・
    GAME DATA NOT AUTO-CORRECTED）を出すだけ。採用は止めない。
11. **警告判定用の暫定年齢帯**（この警告の比較だけに使う。年齢から ageGroup を作る仕様ではない）：child 0〜12、teen 13〜17、
    young_adult 18〜29、adult 30〜49、older_adult 50〜。この 5 つ以外の ageGroup は UNMAPPED（比較しない）。
    実装：`forgeVocabularyAdapter.ts` の `FORGE_AGE_GROUP_BANDS`／`consistencyIssues`。
12. **RIZEL**：正式年齢は 20。visualDiversity の不一致（older_adult・heavy・very_tall・salt_and_pepper・very_short）は FORGE 側データの
    残課題。ZERO 側は元データ保存・GAME MAPPING = UNUSED・警告のみ・自動補正なし。登録は取り消さない。
13. **画像**：キャラクターデータ登録・Life Engine 対象・画像登録は別々の状態（`content/forge/forgeStatus.ts`、表示専用）。
    画像未登録を理由に人物データを無効化しない。正式画像登録は後続作業。
14. **関係 REL-000001**：相手（HUM-000005）が正式採用され、関係内容を作者が確認するまで保留。片方だけの状態で RELATIONSHIP を作らない。
    FORGE の `relationshipRefs` と `characterHistory` の記録（相手・種類・状態）は元データに残り、状態表示で「保留」と分かる。

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

## 9. 保留中の採用：HUM-000001 リゼル（2026-09-28・登録しない）

作者判断：**B（FORGE 側で修正・再書き出ししてから preview → 差分確認 → `--apply`）**。受け取った JSON は正式登録しない。
`content/forge` への書き込みは一切していない（台帳は空のまま）。

**preview の結果（受け取った JSON：送出版 0.1-r2、送出日時 2026-09-27T21:51:51.207Z、hash `sha256:69c9e867e36b68867cc62275de6b812c40f9db2bcf9cc6530d522361c5403afb`）**

- 形式：1 キャラ分の DEPLOY JSON として正常。検証エラーなし。voidIds なし（台帳も空）。判定は NEW。
- FORGE ID：HUM-000001 ／ NPC_ID 予定：RIZEL（既存の人物・別名・Life Engine の人物・GOD VIEW・FORGE 台帳のどれとも衝突なし）。
- characterType：human（entityType PERSON）／ lifeActor：対象（人間の既定）／ 地域：未配置。
- 正式定義：standing UNMAPPED、Life Engine aptitudes は MAGIC 0.28・SWORD 0.62・HEALING 0.53 のみ、traits／values／desires は空。
- UNMAPPED（10）：importance「重要」、性格「情に厚い」「臆病」「世話焼き」、価値観「友情」「平和」、願い「静かに暮らしたい」
  「誰かに必要とされたい」、aptitudes commerce・social。
- 警告：REL-000001（HUM-000005 との FAMILY_SIBLING、PROVISIONAL）は保留、画像 VIS-HUM-000001-001 は実ファイルなし、primary 画像なし。
- 元データ保持：書かれる予定だった `characters/HUM-000001.json` は受け取った JSON と完全に同一（改変なし）。

**登録しない理由**：`visualDiversity` がキャラクターシート（作者の CANON）と明確に矛盾する
（`ageGroup` と `lifeStage.visualAge` が older_adult、`bodyBuild` heavy、`hair.color` salt_and_pepper、`hair.length` very_short）。

**リゼルの CANON（作者指定・2026-09-28）**

- Character ID：HUM-000001 ／ NPC_ID 予定：RIZEL ／ 名前：リゼル ／ 年齢：20 ／ 性別：女性 ／ 出身：アルデン村
- 外見：20 歳の若い成人女性、細身、銀灰色の髪、髪は後ろでまとめている。
  very_short ではない・salt_and_pepper ではない・heavy ではない・older_adult ではない。
  very_tall は正式設定として確認できないため推測しない。
- キャラクターシートにない身長・体型・髪型などは補完しない。ZERO 側は FORGE のデータを直さない（直すのは FORGE 側）。

**再書き出しを受け取ったら**：preview（書き込みなし）→ 受け取った JSON との差分確認（特に `visualDiversity`・`lifeStage.visualAge`、
性格・価値観・願い）→ 作者確認 → `--apply`（NPC_ID RIZEL）。ZERO に未登録なので、再送出分も判定は NEW になる。
参考：キャラクターシートの Personality Keywords（社交的・世話焼き・無口・責任を抱え込みすぎる・強さへの憧れ・村への忠誠・
誰かを守りたい・外の世界を見たい・権力者を信用しない）も、今回の JSON の性格・価値観・願いと大きく違う（共通は「世話焼き」だけ）。
どちらが正かは FORGE 側で確認する。

## 10. 提案（未実装）：preview での年齢・外見の食い違い WARNING

リゼルの件の再発防止案。**作者の OK が出るまで実装しない。** 実装する場合も、次の約束を守る：

- 出すのは WARNING だけ。エラーにしない・採用を止めない。
- 自動補正しない。FORGE の元データは一切書き換えない（どちらが正しいかは作者が FORGE 側で決める）。
- 判定の材料は JSON の中の項目どうしだけ。画像や外部の資料から推測しない。

候補とする照合（どれも「両方に値があって、明らかに食い違う時だけ」出す）：

| 照合 | 例（リゼル） |
|---|---|
| `profile.age`（数値） ↔ `visualDiversity.ageGroup` | 20 ↔ older_adult |
| `profile.age` ↔ `lifeStage.visualAge` | 20 ↔ older_adult |
| `visualDiversity.ageGroup` ↔ `lifeStage.visualAge` | （今回は一致） |
| `lifeStage.stage` ↔ `profile.age`（ADULT／CHILD／TEEN など） | ADULT ↔ 20：一致 |
| `profile.gender` ↔ `visualDiversity.genderExpression` | 女性 ↔ androgynous：**矛盾とはしない**（表現の幅なので WARNING 対象外にする案） |
| `identity` の命名状態 ↔ 内容（例：nameStatus CANON なのに name が空） | 既に検証済み（エラー） |

実装前に決めること：

1. FORGE の `ageGroup`／`visualAge` の正式な語彙一覧と、それぞれが何歳ぐらいを指すか（年齢帯の表）。
   ZERO 側で推測して作らず、FORGE の定義をもらって表にする（`forgeVocabularyAdapter` と同じく 1 か所に置く）。
2. 年齢帯の境目の扱い（例：境目に近い値は WARNING にしない、など）。
3. 体型・髪型は、JSON の中に照合相手になる項目が無いので対象外（キャラクターシートとの照合は機械ではできない）。

### 9b. 2026-09-28 追記：同じ JSON で preview 再実行（作者の最終指示）

作者の最終指示により、§9 の保留は「visualDiversity を FORGE 側の生成補助／多様性管理情報として扱い、ゲームでは使わない」
方針に置き換わった。同じ JSON（hash `sha256:69c9e867…3afb`）で preview を再実行し、作者の OK 待ち（まだ `--apply` しない）。

- `visualDiversity` などゲームが意味付けしない項目は **SOURCE DATA PRESERVED / GAME MAPPING = UNUSED** として preview に一覧表示する
  （`forgeVocabularyAdapter.ts` の `FORGE_SOURCE_ONLY_FIELDS`／`sourceOnlyFields`。表示だけで、変換・補正はしない）。
  外見・Life Engine（SEED／GROWTH／VINE／BLOOM）・性格・能力・イベント判定のどれにも使わない（どんな visualDiversity でもゲームの定義が同じになることをテストで確認）。
- FORGE ↔ ZERO の間に自動送信・API・同期は無い。FORGE の「更新データを再送」は「最新データを JSON として書き出し直す」意味。
  作者が JSON を手で渡し → preview → 作者確認 → apply → content/forge → commit／push → ビルド。

### 9c. 2026-09-28：HUM-000001 → RIZEL を採用（実データ 1 件目）

作者 OK のうえ `npm run forge:import -w @mugen/core -- <JSON> --npc-id RIZEL --life-actor yes --apply` で登録。
書き込み：`content/forge/characters/HUM-000001.json`（受け取った JSON とバイト単位で同一）、`roster.json`、`index.generated.ts`。
RIZEL：人間・PERSON・lifeActor true・地域 未配置・standing 表示 ORDINARY（importance「重要」は UNMAPPED のため表示用の既定値）。
Life Engine には aptitudes（MAGIC・SWORD・HEALING）だけが入り、traits／values／desires は空。visualDiversity は SOURCE DATA PRESERVED / GAME MAPPING = UNUSED。
専用テスト `content/forge/rizel.test.ts`（ビルドの実 content を読む。モックなし）。

### 9d. Android 実機確認（debug APK）

debug APK のタイトル →「DEBUG キャラクター取込」→ 画面下の **実機確認（採用済みキャラクター）** → 確認するキャラクターを選ぶ →「<NPC_ID> を確認」。
（2026-09-29 までは RIZEL 固定の「実機確認（RIZEL）」。§12 の作者指示で、同じ 11 項目を採用済みの誰にでも使う形にした。）
ビルドの採用済みデータとこの端末のセーブを**読むだけ**（World を開かず IndexedDB を直接読む。何も書かない）。
各行は **PASS**（緑）／**FAIL**（赤）／**未確認**（灰：今のセーブの状態では判定できない。説明の手順の後にもう一度押す）。

| # | 項目 | 判定 |
|---|---|---|
| 1 | 採用済み一覧に HUM-000001 → RIZEL | いつでも PASS／FAIL |
| 2 | NPC_ID = RIZEL | 同上 |
| 3 | HUM-000001 ↔ RIZEL の対応 | 同上 |
| 4 | 一覧に「Life Engine 対象」（lifeActor = true） | 同上 |
| 5 | 既存セーブ（つづきから）でも RIZEL が採用済み | プレイ中のセーブで判定。空のセーブでは未確認 |
| 6 | データ消去後、App のセーブが完全に空 | 空のセーブで判定。データがあると未確認 |
| 7 | 「はじめる」で開始しても RIZEL が採用済み | いつでも判定（RIZEL はビルドの中）。データ消去 →「はじめる」の後に押す |
| 8 | SAVE_VERSION = 3 | いつでも |
| 9 | セーブに FORGE の元 JSON・専用情報がない | いつでも |
| 10 | visualDiversity の不一致値がゲーム側に反映・修正されていない | いつでも |
| 11 | 性格・価値観・願いから traits／values／desires を作っていない（0） | いつでも |

**App には RESET WORLD ボタンが無い**（追加しない）。代わりに Android の
「設定 → アプリ → MUGEN ZERO → ストレージ → データ消去」でセーブを完全に消す（その端末の App 版のセーブがすべて消える。Artifact 版は別アプリで影響しない）。
e2e（`e2e/forgeImport.spec.ts` の「実機確認（RIZEL）」）が同じ手順（空 → つづきから → データ消去 → はじめる）で各項目の判定を確認している。

### 9e. 2026-09-29：Android 実機確認 完了（正式記録）

**FORGE → MUGEN ZERO AUTHORING IMPORT 基盤 ／ RIZEL（HUM-000001）／ Android 実機確認完了**（作者確認済み）

- APK：CI run #47（`android-debug-apk-app.yml`）、commit `601cabe`、アーティファクト `mugen-zero-app-debug-apk`。
- 実機（MUGEN ZERO App 1.0）で §9d の 11 項目すべて PASS。

| 確認した内容 | 項目 | 実機での結果 |
|---|---|---|
| HUM-000001 → RIZEL の登録が維持される | 1〜4 | PASS（lifeActor true・Life Engine の人物あり） |
| 既存 SAVE から起動しても RIZEL は採用済み一覧に残る | 5 | PASS（プレイ中のセーブ：出来事 0 件・状態 3 行／2 行） |
| アプリのストレージを完全消去（ユーザーデータ 0 B）した後も、RIZEL はビルドコンテンツとして残る | 6・7 | PASS（出来事 0 件・状態 0 行、RIZEL 採用済み） |
| 「はじめる」で新規開始した後も RIZEL は採用済み一覧から消えない | 7 | PASS（出来事 0 件・状態 2 行のセーブで採用済み） |
| SAVE_VERSION = 3 のまま・既存 SAVE 形式は変更なし | 8 | PASS（ビルド 3／セーブ 3） |
| FORGE の元データは SAVE へ書き込まれていない | 9 | PASS |
| visualDiversity 等の FORGE 専用データがゲーム側の人物状態へ混入していない | 10 | PASS |
| personality／values／desires から Life Engine の状態を自動生成していない | 11 | PASS（traits／values／desires 0） |

Android の「ストレージを消去」（機種により「データ消去」）が §9d の「データ消去」にあたる（「キャッシュを削除」ではない）。

## 11. AUTHORING IMPORT 基盤の固定（2026-09-29）

作者指示：**RIZEL の IMPORT 基盤そのものには追加修正を入れない。** 基準は commit `601cabe`（実機確認済み）。
以下は、作者が変更を正式に指示しない限り変えない。

- 純粋コア：`packages/mugen-core/core/forge/`（validate・plan・content・diff・record・types・canonical hash）
- ディスク操作と CLI：`packages/mugen-core/scripts/forgeContentFs.ts`・`scripts/forge-import.ts`
- 語彙アダプターと状態：`content/forge/forgeVocabularyAdapter.ts`（表は §0 の決定どおり。性格・価値観・願いは空、importance は一般NPC だけ）・`forgeStatus.ts`・`adoptionView.ts`
- 画面：`packages/mugen-app/src/dev/ForgeImport.tsx`・`forgeDeviceCheck.ts`、開発サーバーの書き込み口（`vite.config.ts` の `/__mugen/forge/*`）
- 採用済みデータ：`content/forge/roster.json`・`void.json`・`characters/HUM-000001.json`（受け取った JSON とバイト単位で同一）

2 人目以降の採用で変わるのは `content/forge/` のデータ（`roster.json`・`characters/<ID>.json`・生成物 `index.generated.ts`・必要なら `void.json`）と、
そのキャラ専用の確認テストだけ。仕組みは増やさない。

## 12. 今後の優先順位（2026-09-29・作者指示）

1. **PRIORITY 1：FORGE との正式な受け渡し仕様を完成させる。** 対象と現状：

   | 項目 | 現状（ZERO 側） | 決めるのに必要なもの |
   |---|---|---|
   | personality／values／desires | 表は空。すべて UNMAPPED・元データ保存・計算に使わない | FORGE の正式語彙一覧 → 作者が承認した対応表 |
   | importance | 一般NPC → ORDINARY だけ。ほかは UNMAPPED | FORGE の正式語彙一覧と、作者の基準 |
   | visualDiversity | SOURCE DATA PRESERVED / GAME MAPPING = UNUSED。ageGroup は年齢不一致 WARNING の比較だけ | FORGE の ageGroup 等の正式語彙（年齢帯を含む） |
   | characterType | human → PERSON、monster → CREATURE | 他の値があるかの確認 |
   | lifeActor | 人間は対象・モンスター（BOSS 含む）は対象外が既定。作者判断でだけ変える | —（決定済み） |
   | VOID ID | `{schemaVersion:1, voidIds:[{characterId, status:"VOID"}]}`。台帳は増えるだけ | —（決定済み） |
   | Character ID | FORGE の ID（HUM-／MON-）。NPC_ID とは別 | —（決定済み） |
   | NPC_ID | 採用時に作者が指定。大文字・1 人 1 つ・変更不可・再利用不可 | —（決定済み） |

   FORGE の元データは自動補正しない。正式対応していない語は UNMAPPED として保持・警告。類義語変換・推測変換は禁止。
   Life Engine の語彙へ変換するのは、作者が正式承認した対応表だけ。

2. **PRIORITY 2：2 人目の実キャラクターで同じ手順を通す**（再現性確認。新しい仕組みは増やさない）：
   FORGE 書き出し → preview → 差分確認 → 作者確認 → `--apply` → `content/forge` 登録 → commit／push → APK（CI）→ Android 実機確認。
   手順は §7「実データ 1 件での登録試験の手順」と同じ。
   - 2026-09-29 時点の受け入れ準備：`forge:import --list` で採用済み 1 人（RIZEL）・VOID 0 件・内容の問題なし。FORGE 関連テスト 105 件 PASS
     （2 人以上の採用・生成 index・NPC_ID 重複なしは `contentFs.test.ts`／`adoptedBuild.test.ts` で確認済み）。
   - **実機確認画面の汎用化（2026-09-29・作者指示・実装済み）**：§9d の画面は RIZEL 固定をやめ、採用済みキャラクターから確認対象を選ぶ。
     - 選べるのはビルドの `content/forge` に実際に登録済みで、定義ファイルがある人物だけ（VOID ID・未採用・存在しない ID は出ない）。
     - 選んだ人物について同じ 11 項目を、その人物のファイルから評価する（キャラクターごとのコードは書かない）。
       RIZEL で決めた項目はそのまま。人物に合わせたのは次の点だけ：
       2 は FORGE の名前（既存の人物に採用した場合はゲームの名前のまま）、
       4 は lifeActor = false の人物なら「Life Engine 対象外で、Life Engine に入っていない」、
       10 はその人物自身の visualDiversity の値がゲーム側の定義・人物台帳・Life Engine のどれにも無いこと、
       9 は FORGE の Character ID（HUM／MON）・形式名・送出 hash・FORGE 専用の出来事と行がセーブに無いこと（NPC_ID はゲーム側の ID なので対象外）。
     - 判定できない項目は PASS にせず「未確認」、登録されていない人物は FAIL。読むだけで、選択・確認はセーブにも端末の保存領域にも何も書かない。
     - DEBUG 専用（`src/dev/`、リリースビルドには入らない）。テスト：`mugen-app/src/dev/forgeDeviceCheck.test.ts`（3 人入りのビルドを模擬）、
       `e2e/forgeImport.spec.ts`（一覧がリポジトリの roster と一致・HUM-000005 が出ない・選択で何も書かない・RIZEL の手順）。
   - **2 人目：HUM-000002 エッダ**（作者指定 2026-09-29）。HUM-000005 は CHARACTER FORGE に存在しないため対象にしない
     （生成しない・欠番を埋めない・別人に割り当てない）。REL-000001 は相手未確定のまま保留。
     FORGE JSON の到着後に preview（書き込みなし）→ 確認 → 問題がなければ `--apply`。
     NPC_ID は JSON の正式名から決め、既存の人物・別名・Life Engine の人物・FORGE 台帳と重複しないこと。lifeActor は human なら true、
     地域は JSON に正式値がある場合だけ使い、無ければ未配置。対応表（personality・values・desires・importance・visualDiversity・ageGroup・characterType）は増やさない。
   - **2026-09-29：HUM-000002 → EDDA を採用（実データ 2 件目）**。RIZEL と同じ手順・同じ道具で、仕組みは何も増やしていない。
     `npm run forge:import -w @mugen/core -- <JSON> --npc-id EDDA --life-actor yes --apply`。
     書き込み：`characters/HUM-000002.json`（受け取った JSON と内容同一。ファイル末尾の改行 1 バイトだけが付く保存形式で、RIZEL と同じ）、`roster.json`、`index.generated.ts`。

     | 確認項目 | preview の結果 |
     |---|---|
     | Character ID／名前 | HUM-000002／エッダ（nameStatus CANON） |
     | characterType | human → PERSON |
     | NPC_ID | EDDA（正式名エッダから。既存の人物・別名・Life Engine の人物・FORGE 台帳のどれとも重複なし） |
     | lifeActor | true（human の既定） |
     | 地域 | 未配置（`profile.currentRegion` が空。補完しない） |
     | 正式定義 | PERSON／standing なし（importance が空）／traits・values・desires 空／aptitudes MAGIC 0.91・SWORD 0.28・HEALING 0.45 |
     | UNMAPPED | personality（皮肉屋・頑固・短気）、values（友情・強さ）、desires（故郷を守りたい・誰かを守れる人になりたい）、aptitudes（commerce・social）、visualDiversity.ageGroup「elderly」 |
     | visualDiversity 警告 | AGE / VISUAL AGE GROUP MISMATCH は出ない（`profile.age` が空で、elderly は 5 つの年齢帯にない＝比較しない）。SOURCE DATA PRESERVED / GAME MAPPING = UNUSED |
     | personality／values／desires | すべて UNMAPPED。Life Engine の traits／values／desires は 0 |
     | importance | 空（値なし）。UNMAPPED 扱いで standing は未設定、人物台帳・GOD VIEW の表示用既定は ORDINARY |
     | VOID ID との競合 | なし（VOID 台帳 0 件。この JSON は 1 人分の DEPLOY JSON で voidIds なし） |
     | 画像・関係 | 画像 VIS-HUM-000002-001 はメタ情報のみ（未登録・代表なし）。relationshipRefs なし |

     FORGE 側の値で空のもの（ZERO 側では埋めない）：`profile.age`・`gender`・`origin`・`currentRegion`・`occupation`・`importance` など。
     テスト：`content/forge/edda.test.ts`（ビルドの実 content。モックなし）。`rizel.test.ts` の「採用済みは RIZEL だけ」という前提の 3 か所は
     「RIZEL が含まれる」に変更（RIZEL 自身の確認内容は同じ）。
3. **PRIORITY 3**（2 人目が通ってから）：CHARACTER FORGE → MUGEN ZERO → WORLD LIFE ENGINE → WORLD MAP → NPC イベントの連携設計。

**今回やらない（別フェーズ）**：RESET WORLD ボタン、自動送信、API 同期、WORLD MAP 実装、NPC イベント実装、RIZEL 画像登録、
REL-000001 の確定、importance の推測拡張、personality／values／desires の自動変換。
