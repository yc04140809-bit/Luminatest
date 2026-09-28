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

debug APK のタイトル →「DEBUG キャラクター取込」→ 画面下の **実機確認（RIZEL）** →「確認を実行」。
ビルドの採用済みデータとこの端末のセーブを**読むだけ**（World を開かず IndexedDB を直接読む。何も書かない）。

| # | 項目 | 画面での確認 |
|---|---|---|
| 1 | RIZEL が採用済み一覧に表示 | 採用済み一覧の「HUM-000001 → RIZEL」／確認 1 |
| 2 | NPC_ID = RIZEL | 確認 2 |
| 3 | HUM-000001 との対応 | 確認 3 |
| 4 | lifeActor = true | 一覧の「Life Engine 対象」／確認 4 |
| 5 | 既存 SAVE がそのまま開く | タイトルの「つづきから」で村に戻れる → 確認 5（プレイ中のセーブ） |
| 6 | RESET WORLD 後も RIZEL が消えない | **App には RESET WORLD ボタンが無い**ため、Android の「設定 → アプリ → MUGEN ZERO → ストレージを消去」（セーブを完全に消す＝RESET WORLD 相当）の後、確認 1〜4 が PASS |
| 7 | 「はじめる」後も消えない | ストレージ消去後にタイトルの「はじめる」→ プロローグ → 確認 1〜4 が PASS |
| 8 | SAVE_VERSION = 3 | 確認 8（ビルドとこのセーブ） |
| 9 | WORLD MEMORY に FORGE データを書かない | 確認 9（出来事・状態のどちらにも FORGE のデータなし） |
| 10 | visualDiversity 不一致からゲームデータを作らない | 確認 10 |
| 11 | UNMAPPED から Life Engine 状態を作らない | 確認 11（traits・values・desires が 0） |

「状態」行：キャラクター 登録済み／Life Engine 対象／画像 未登録／関係 REL-000001 保留。
ストレージ消去は端末上のそのアプリのセーブをすべて消す。必要なら先に別の端末・別のアプリ（Artifact 版は別アプリで影響しない）で確認する。
