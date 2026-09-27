# CHARACTER FORGE → MUGEN ZERO キャラクター取込（受信側 v1.0）

2026-09-27 実装。根拠資料：`mugen-character-forge-to-zero-bridge-v1.0.zip`（README／00_START_HERE／INTEGRATION_CONTRACT／
schemas 2 本／ACCEPTANCE_TESTS）。資料と実コードが違う所は実コードを正本とし、違いは §7 に書いた。

---

## 1. どこにあるか

| 役割（資料 §3） | ファイル | 性質 |
|---|---|---|
| Parser | `packages/mugen-core/core/forge/validate.ts` `parseDeployJson` | 純粋・例外を投げない |
| Validator | 同 `validateDeployPackage` | 純粋。Schema＋意味検証（FORGE の `tools/validate-deploy.mjs` と同じ規則） |
| 正規化 JSON・hash | `core/forge/canonical.ts` | 純粋・同期の SHA-256。FORGE のツールが出した 3 サンプルの hash と一致をテストで確認 |
| Resolver／Import Planner | `core/forge/plan.ts` `planForgeImport` | 純粋。NEW／UPDATE／UNCHANGED／BLOCKED_* を決める |
| Diff Builder | `core/forge/diff.ts` | 純粋。2 階層まで・配列はまとめて比較・`deployment` は比較しない |
| Import Committer | `core/forge/commit.ts`（純粋）＋ `World.commitForgeImport`（1 回の store.commit） | 全部書くか、何も書かない |
| Import History／snapshot | `core/forge/record.ts`（保存行の形と読み取り） | 読めない行は書き換えない |
| UI | `packages/mugen-app/src/dev/ForgeImport.tsx`（＋`forgeImport.css`） | **デバッグビルド限定**（dev サーバー・debug APK） |
| 予約 ID・対応表 | `packages/mugen-core/content/people/forgeIds.ts` | `FORGE_VOID_IDS`／`FORGE_NPC_CORRESPONDENCE`（どちらも今は空・手で書く） |

入口：タイトルの **「DEBUG キャラクター取込」** ボタン、または `?tool=forge-import`。
リリースビルドには入らない（`vite.config.ts` の `withoutDebugTools` と `npm run check:release` のマーカーで確認）。

## 2. 判定

チェックの順番は「絶対に起きてはいけないこと」の順（`plan.ts` 冒頭）。

| 判定 | 条件 | 画面の表示 |
|---|---|---|
| `BLOCKED_VALIDATION` | JSON 構文エラー／source・target 不正／schemaVersion が 1.x 以外／ID 形式不正／HUM-ID×monster など／BOSS の必須項目が空・未設定／`equipment.validation.permitted:false`／assets に data URL | 取込不可（形式エラー） |
| `BLOCKED_SAMPLE_DATA` | `sampleOnly: true` | 取込不可（サンプルデータ） |
| `BLOCKED_SAVE_DAMAGED` | その ID の保存行が読めない（上書きすると唯一のコピーが消える） | 取込不可（保存データを読めません） |
| `BLOCKED_RESERVED_ID` | FORGE の VOID ID、または本編がすでに別のものに使っている ID | 取込不可（予約済みID） |
| `BLOCKED_ID_TYPE_CONFLICT` | 登録済みの ID が別の characterType | 競合 — 取込不可 |
| `UNCHANGED` | 登録済みと同じ payload hash（キー順・空白は無関係） | 変更なし（登録ボタン無効・「二重登録はしません」） |
| `BLOCKED_DEPLOYMENT_CONFLICT` | 同じ ID で内容が違うのに、送出日時が登録済みより**新しくない**（古い／同時刻） | 競合 — 取込不可 |
| `UPDATE` | 同じ ID・同じ type・より新しい送出 | 更新候補 → **[差分を反映]** |
| `NEW` | 未登録の ID | 新規登録 → **[このキャラクターを登録]** |

- `schemaVersion` `1.1` など同じ major の新しい版は警告付きで 1.0 の規則で読む（契約 §7）。`2.0` などは BLOCK。
- BOSS は `monster + encounterRole: BOSS`。保存上の type は `monster` のまま。「HUMAN／通常モンスター／BOSS」は画面用に毎回計算する。
- **警告であって拒否しないもの**：未解決の `relationshipRefs`（UNRESOLVED_REFERENCE）、画像の実ファイルなし（MISSING_ASSET）、
  primary 画像なし、希望配置の場所が本編に無い（WORLD_ASSIGNMENT_UNRESOLVED）／名前が一致（…NAME_MATCH・自動配置はしない）、
  見た目レビュー未承認、未知の項目（保持する）、`FUTURE_TENDENCY`／`FUTURE_ASPIRATION`（現在の事実にしない）、
  遭遇の役割の変更（NORMAL↔BOSS）、以前に取り込んだことのある payload（ロールバック後の再取込）。

## 3. 保存するもの（SAVE_VERSION は 3 のまま・migration なし）

キャラクター 1 人につき `world_state` に 3 行。**新しい行なので migration は不要**（「行が無い＝何も取り込んでいない」）。
セーブの修復処理はこのキーを知らないので、読み込み時に書き換えない。バックアップ（`worldBackup`）には他の行と同じく入る。

| キー | 中身 |
|---|---|
| `forge_character_<ID>` | `ForgeCharacterRecord`：`characterId`・`characterType`・`encounterRole`・`npcId`（null）・`forgeBaseline`（受け取った JSON そのまま・未知の項目も含む）・`runtimeState`（本編の状態。取込は書かない）・`importMetadata`（hash・契約版・送出版・送出日時・初回／最終取込時刻・取込 ID） |
| `forge_history_<ID>` | 取込履歴（importId・characterId・payloadHash・sourceSchemaVersion・deployedVersion・deployedAt・importedAt・result NEW/UPDATED/ROLLED_BACK・warnings・snapshotRef） |
| `forge_snapshot_<ID>` | 直前 1 回分の記録（更新の前に取る）。ロールバックで使い切ると null |

1 人 3 行にしたのは、読めない行があってもその 1 人だけが止まり、他の人の取込は続けられるようにするため。

**WORLD MEMORY**（出来事ストア・書き込み 1 回きり）に 1 件ずつ足す：

| 出来事 | id | いつ |
|---|---|---|
| `CHARACTER_IMPORTED_FROM_FORGE` | `evt_forge_import_<ID>`（1 人 1 回きり） | 新規登録 |
| `CHARACTER_UPDATED_FROM_FORGE` | `evt_forge_update_<importId>` | 更新 |

actors は `[<ID>]`、importance は AMBIENT、日付は今の世界の時刻、`forge` 欄に source・送出版・送出日時・hash・importId・
`canonStatus: 'CANON'`。この 2 種類は「作者が世界の記録に人を加えた」事実であって、誰かの一日に起きたことではないので：

- `hasProgress()`（タイトルの「つづきから」）に数えない — 取り込んだだけの新しいセーブは「はじめる」のまま
- `getKnownEvents()`（プレイヤーが知っていること）に入らない — actors に PLAYER がいないため、既存の規則のまま
- WORLD LIFE ENGINE は読まない（`canonAsWorldMemories` で除外）— 入れると時計が進み、記憶の数が変わり、読みがずれる（テスト G4 で確認）

## 4. 更新・ロールバックで変わるもの／変わらないもの

- **更新で変わる**：`forgeBaseline`（丸ごと差し替え）と `importMetadata`。履歴に 1 行、WORLD MEMORY に 1 件、スナップショット 1 件。
- **更新で変わらない**：`runtimeState`・`npcId`・既存の WORLD MEMORY・時計・所持品・LUMI・他の人物・戦闘の値・画像ファイル。
- **ロールバック**：`forgeBaseline` と `importMetadata` をスナップショットへ戻す（初回取込時刻は保つ）。`runtimeState`・`npcId`・
  WORLD MEMORY はそのまま（「更新を受け入れた」事実も残る）。1 段だけ・スナップショットは使い切り。新規登録は戻せない（戻す前が無い）。
- 本編がまだ `forgeBaseline` を書き換えないので、v1 では「FORGE と本編が同じ項目を別々に変えた」競合は起きない。
  将来 `runtimeState` に名前などを持たせたら、項目単位の「FORGE を採用／本編を維持」をここに足す。

## 5. 安全規則（資料 §9・§10）がどこで守られているか

- 潜在適性から技能・職業・装備を作らない：取込は `forgeBaseline` を受け取ったまま保存するだけで、何も導出しない。
  現在の事実を読むときは `forgeHumanCurrentFacts`（`currentSkills` そのまま、職業は `CURRENT_FACT` の時だけ、
  `FUTURE_ASPIRATION` は「将来の希望」として別に返す）。
- 個体名が null なら null のまま。表示だけ種族名で代わりにする（`forgeDisplayName`）。
- BOSS の遭遇設計は 19 項目すべて保持するが、戦闘の数値・身体構造には変換しない。通常モンスターの `bossEncounter` は null を要求。
- 関係・場所・画像は推測で作らない。

## 6. テスト

- `core/forge/forge.test.ts`（32）：hash（FIPS ベクタ＋FORGE の 3 サンプル）、A1〜A6、B（純粋部分）、C1・C2・C6・C7、古い送出の拒否、
  D1〜D6、E1〜E6、F1〜F5、未知の項目、予約 ID、保存行破損、結果スキーマ、差分。
- `core/world/forgeImport.test.ts`（17）：fake-indexeddb で実際に保存・再読込。B1〜B8、A2・A6（保存が変わらない）、C1〜C6、
  古い計画の拒否、二度押し、G1〜G6（既存の行・出来事・人物が 1 バイトも変わらない、migration なし、TIME SHIFT・WORLD LIFE・
  ニュースが取込の有無で同じ、戦闘の値が同じ）、「はじめる」のまま、保存行破損、dev の SCENARIO RESET、RESET WORLD。
- `mugen-app/e2e/forgeImport.spec.ts`（5）：画面で 3 段階、HUMAN／通常モンスター／BOSS、サンプル・壊れた JSON、二重登録なし、
  再送出の差分、ロールバック、取り込まない、タイトルが「はじめる」のまま。

サンプル（`sampleOnly: true`）はテスト用フィクスチャとしてそのまま置き（`core/forge/fixtures/`）、登録できないことをテストする。
登録のテストは、テストの中でだけ sampleOnly を外したコピーを、使い捨てのストアへ入れる。

## 7. 資料との違い・作者に確認したいこと

1. **取り込んだ人はその端末のセーブに入る**（資料どおり「本編データへ登録」＝ WORLD MEMORY・履歴・スナップショットを持つ）。
   連携設計 §7 で想定していた「Forge の人の定義はビルドに入る content（保存しない）」とは違う置き場所になる。
   全プレイヤーに同じ人物を配るには、登録済みの人を content（ビルド）へ書き出す段階が別に要る（未実装）。
   また `resetWorld`（Artifact の NEW GAME／dev の RESET WORLD）はセーブごと消すので、取り込んだ人も消える。
   App の「はじめる」はリセットしないので消えない。dev の SCENARIO RESET は取り込んだ人と到着の出来事を残す。
2. **古い送出は拒否（BLOCKED_DEPLOYMENT_CONFLICT）**。資料の判定表に無いケースなので、新しい基礎設定を古いもので上書き
   しない側に倒した。同時刻で内容が違う場合も同じ。
3. **結果（import result 1.0）の保存**：登録した取込（NEW／UPDATED／ROLLED_BACK）は履歴に保存。UNCHANGED・BLOCKED は画面に
   結果を作って表示するが保存しない（ID の無い壊れた JSON は保存先の鍵が無い）。
4. **BLOCKED_ID_TYPE_CONFLICT はほぼ起きない**：ID の接頭辞（HUM／MON）が type と一致しないファイルはその前の検証で止まる
   （A5）。登録済みの記録自体の type が食い違っている時だけこの判定になる。どちらでも取り込まれない。
5. **ZERO 側に FORGE の VOID 台帳は無い**。`FORGE_VOID_IDS` を作ったので、作者が退役させた ID をここへ書く。
   本編の NPC_ID・別名・敵の種族 ID・敵個体 ID との衝突も BLOCK する（形が違うので実際には起きない）。
6. `npcId`（NPC_ID との対応）は null のまま。§11 の対応表 `FORGE_NPC_CORRESPONDENCE` は空。
