# NPC／CHARACTER FORGE／WORLD LIFE ENGINE 連携設計（PRIORITY 1）

2026-09-26 調査と設計案 → 2026-09-27 作者の方針決定（§9）→ 最小実装 C-1・C-2 完了（§10）。
戦闘計算 CORE・SAVE・WORLD MEMORY・SAVE_VERSION=3 には触れない前提で書いている。

---

## 0. 一番大事な発見

**WORLD LIFE ENGINE の中核は、すでにリポジトリ内（`packages/mugen-core/core/life/`）に実装されている。**
ロードマップの「SEED → GROWTH → VINE → BLOOM」はそのままの名前で存在し、テストも揃っている。
しかも次の設計原則がすでにコードに書かれて守られている：

- **時間を刻まない**（tick なし）。種（seed）は「植えられた時刻と今の時刻」から、その場で育ち具合を答える。
  千人の村も、誰かを見るまでは一人分のコストしかかからない。
- **人生を決めない**。BLOOM は「候補（CANDIDATE）」までで止まり、`REALISED` は決してエンジン内で付けない。
- **正史（WORLD MEMORY）は一方通行で読むだけ**（`canonBridge.ts`）。エンジンは正史を書かない。
- **保存しない**。人生の状態は毎回、正史と時計から作り直す（`worldReading.ts`：「life-engine の save file は無い」）。
- **全員×全員の関係計算をしない**。人と人が交わる可能性は、作者が書いた「組（crossing）」だけを調べる。
- **プレイヤーが時間を動かす手段は無い**（`TimeAdvanceReason` は物語の理由だけ）。

したがって今回の設計は「エンジンを新しく作る」ではなく、**すでにある心臓部に、外の世界（CHARACTER FORGE・NPC アプリ）
とゲーム本体をつなぐ「口（データ境界）」を付ける**ことになる。

**CHARACTER FORGE と NPC アプリは、このリポジトリには存在しない**（コード・文書とも見当たらない）。
外部のアプリ／道具として扱い、ファイル（JSON）でのやり取りを前提に設計する。

---

## 1. 既存の関連コード・型・データの一覧

### 1-1. 人（NPC／Character）

| 何 | 場所 | 中身 |
|---|---|---|
| 現在の状態 | `core/characters/types.ts` `CharacterState` | id・名前・年齢（null＝未決定）・生死・居場所・職業・人生段階（CHILD〜ELDER）・配偶者・子（親→子の一方向） |
| 初期状態 | `content/characters/gald.ts`・`lina.ts`・`bakeryOwner.ts` | GALD・LINA・BAKERY_OWNER の3人（リナ14歳・パン屋の手伝い、パン屋の子＝LINA） |
| 性格・価値観・適性・望み | `core/life/types.ts` `NpcCore` ／ `content/world/aldenLife.ts`・`galdLife.ts`・`mugenWorld.ts` | LINA・alden_marta・ALDEN_VILLAGE・GALD・ALDEN_GUARD・BAKERY_OWNER・NEL の7件 |
| 名簿（開発者向け） | `content/world/mugenWorld.ts` `WORLD_PEOPLE` | 9件（上の7件＋PLAYER・KAOS）。名前・地域・重要度（PRINCIPAL／ORDINARY／PLACE） |
| 表示用の文 | `content/characters/characterPresentation.ts` | 肩書き・台詞など（hero・kaos など小文字 ID） |
| 絵・戦闘 | `content/characters/battleProfiles.ts`・`characterAppearance.ts`・`kaosPortraits.ts`・`explorationSprites.ts` | 絵の ID（hero・kaos・gald など小文字） |
| 魔物の個体 | `core/world/world.ts` `EnemyIndividual`（`enemy_individuals`） | 人生を持ちうる個体の魔物（四択の対象） |

### 1-2. WORLD MEMORY（正史）

| 何 | 場所 | 中身 |
|---|---|---|
| 出来事 | `core/memory/types.ts` `MemoryEvent` | id・種類・年日・場所・関係者・重要度・原因（causedBy）。**書き込み1回きり** |
| 出来事の種類 | 同 `MemoryEventType` | **閉じた一覧**：ガルド四択・ガルドの人生の連鎖（10種）・再会4種・魔物四択4種・`WORLD_TIME_SHIFTED` |
| 保存 | `core/memory/idbStore.ts`（IndexedDB）・`memoryOnlyStore.ts` | 出来事の表と `world_state`（キーと値）とメタ情報 |
| プレイヤーが知っていること | `World.getKnownEvents()` | 未発見の人生を見せないための絞り込み |
| 人生の記録（見る画面） | `core/archive/lifeArchive.ts` | 正史からの投影。書かない |

### 1-3. 出来事・イベント

| 何 | 場所 | 中身 |
|---|---|---|
| 人生イベント（正史を書く） | `core/events/eventEngine.ts`・`types.ts` `LifeEventDef` | 「必要な過去の出来事1つ＋経過日数＋一度きり」で起こり、正史に書き、人の現在状態を変える（ガルドの連鎖） |
| 体験イベント（正史を書かない） | `core/experience/`（`experienceEngine.ts`・`director.ts`・`types.ts`） | NOW／NEXT／LIFE の3層。場所・条件（過去の出来事の有無・年・見たか）・優先度・一度きり・間隔・珍しさ。**MUGEN を知らない汎用部品** |
| 体験イベントの中身 | `content/experience/aldenExperience.ts`（28件）・`greenwoodExperience.ts`（4件） | 会話と一言 |
| 物語の伏線 | `core/narrative/`・`content/narrative/aldenSeeds.ts` | 見せた「問い」の状態（SEED／HINTED／ACTIVE／RESOLVED）。正史ではない |
| 村のうわさ | `core/news/`・`content/news/aldenNews.ts` | 人生エンジンの読みからうわさを作る。**ただの雑談（NOISE）は意味を持てない型** |
| 交差（人と人が出会う） | `core/life/crossing.ts`・`mugenWorld.ts` `WORLD_CROSSINGS` | 作者が書いた組だけ（4件）。物語が見た時点で記録 |

### 1-4. 会話

| 何 | 場所 | 中身 |
|---|---|---|
| 会話の行 | `content/dialogue/*.ts`（`DialogueLine`） | 話者と文。プロローグ・ガルド・パン屋・未来の場所 |
| 体験イベントの会話 | `TalkContent`（`aldenExperience.ts`） | 場所カードの会話＋ケイオスの一言 |
| 時間経過の会話 | うわさ（news）が近い役割 | 人の変化を「うわさ」として言葉にする |

### 1-5. SAVE・世界・時間

| 何 | 場所 | 中身 |
|---|---|---|
| 世界の持ち主 | `core/world/world.ts` `World` | 正史・時計・人の現在状態を持ち、変更は1回の書き込みにまとめる |
| 保存する行 | 同（`world_state`） | `world_clock`・`character_<ID>`・体験の既読・魔物・所持品・LUMI・成長・装備・BGM 解放・再開位置 など |
| SAVE の版 | `core/world/saveSchema.ts` `SAVE_VERSION = 3` | **行が無い＝新しい世界の初期値**。行を増やすだけなら版を上げない方針が明文化済み |
| 壊れた行の読み方 | `core/world/saveRead.ts` | 下向きにしか直さない |
| 暦 | `core/time/calendar.ts` | 1年365日。`WorldClock {worldYear, worldDay}` |
| 時間を進める | `World.advanceDay`・`timeShift`（ガルドの一度きり）・人生エンジンの `advanceTime(reason)` | プレイヤー操作での時間移動は無い |

---

## 2. 連携アーキテクチャ案（今の構造を壊さない）

```
 ┌───────────────────┐   ① 人の定義（JSON・版付き）         ┌──────────────────────┐
 │ CHARACTER FORGE   │ ───────────────────────────────▶  │ content（ビルド時に取り込み・検証） │
 │ （外部の道具）      │                                   │  名簿／性格・価値観・適性／初期状態 │
 └───────────────────┘                                   └───────────┬──────────┘
                                                                     │ 規則（rules）
 ┌──────────────────────────────── MUGEN ZERO App ──────────────────┼─────────────────┐
 │                                                                   ▼                 │
 │  World（正史の唯一の持ち主）──② 正史＋時計（読むだけ）──▶ WORLD LIFE ENGINE（core/life）│
 │     ▲                                                             │                 │
 │     │ ⑤ 実現：物語が起こすと決めたら World が正史に書く               │ ③ 読み（候補だけ）  │
 │     │                                                             ▼                 │
 │  ゲームの画面・体験ディレクター ◀── ④ イベント候補・会話候補 ─── 連携の口（core/link）│
 └─────────────────────────────────────────────────────────────────┬─────────────────┘
                                                                     │ ⑥ 人の今の様子（JSON・読むだけ）
                                                                     ▼
                                                           ┌──────────────────┐
                                                           │ NPC アプリ（外部）  │
                                                           └──────────────────┘
```

- **① Forge → ゲーム**：人の定義はファイルで受け取り、**ビルド時に**取り込む。ゲームは実行中に Forge を呼ばない。
  取り込み時に検証（ID の形・重複・必須項目・参照先の存在）。
- **② ゲーム → 人生エンジン**：今の `canonBridge`／`readWorldLife` のまま（正史と時計を渡すだけ）。
- **③ 人生エンジン → 口**：種・つる・花の候補を、**人ごと・場所ごとに引ける形**にまとめる（新しく作る部分）。
- **④ 口 → ゲーム**：「今起こりうるイベント」「今話せる会話」の**候補の一覧**を返す。どれを出すかはゲーム
  （体験ディレクター）が決める。
- **⑤ 実現**：ゲームが起こすと決めたものだけ、`World` が正史（`MemoryEvent`）として書く。書かれた正史は
  次の②でまた人生エンジンに読まれ、**新しい種（NEW SEED）**を植える。エンジン自身は決して書かない。
- **⑥ ゲーム → NPC アプリ**：人の今の様子を読み取り専用の JSON で渡す。NPC アプリから正史へ直接は書けない。
  NPC アプリが作ったもの（会話案など）は①と同じく「内容（content）」として取り込む。

**3つの約束**：ゲームは相手の中身を知らない／相手もゲームの中身を知らない／境界を越えるのは「版の付いた
ただのデータ（関数を含まない JSON）」だけ。

---

## 3. 境界のデータ型（案。まだ書いていない）

置き場所：`packages/mugen-core/core/link/`（型と純粋関数だけ。React・保存・画面を含まない）。
境界の版は **`LINK_SCHEMA_VERSION`**（SAVE_VERSION とは別物。保存形式は変えない）。

```ts
/** ① Forge から受け取る、一人の人（作者が決めたことだけ。未決定は null／省略）。 */
interface NpcProfile {
  npcId: NpcId;                 // 4章
  name: string;
  kind: 'PERSON' | 'PLACE' | 'COLLECTIVE' | 'CREATURE';
  region: RegionId;             // 所属地域
  standing: 'PRINCIPAL' | 'ORDINARY' | 'PLACE';
  age: number | null;           // null＝作者が決めていない（今の CharacterState と同じ意味）
  occupation: string;           // 今の仕事（将来の姿ではない）
  lifePhase: LifePhase;
  family: { parents?: NpcId[]; spouse?: NpcId | null; children?: NpcId[] };
  personality: { traits: string[]; values: string[]; desires: string[]; aptitudes: Record<string, number> };
  canon: 'CANON' | 'DRAFT';     // DRAFT はゲームに入れない（検証で弾く）
  source: { tool: 'CHARACTER_FORGE' | 'HAND'; exportedAt: string; schemaVersion: number };
}

/** ⑥ NPC アプリへ渡す、一人の今（読み取り専用。毎回作り直す）。 */
interface NpcSnapshot {
  npcId: NpcId;
  at: WorldClock;
  current: { location: string; occupation: string; alive: boolean; lifePhase: LifePhase };
  lifeStage: 'SEED' | 'GROWTH' | 'VINE' | 'BLOOM' | 'NEW_SEED' | 'QUIET';  // 5章の要約
  seeds: { type: string; status: SeedStatus; visibility: SeedVisibility }[];  // HIDDEN は外へ出さない選択も可
  relations: RelationView[];
  blooms: { bloomId: string; status: 'CANDIDATE' | 'REALISED' }[];
  knownToPlayer: boolean;       // 未発見の人生を漏らさないため
}

/** 関係（数値を保存せず、種とつるから毎回読む）。 */
interface RelationView {
  target: NpcId;
  kind: 'FAMILY' | 'SPOUSE' | 'BECAUSE_OF' | 'DRAWN_TO' | 'TRUST' | 'WARY' | 'OWES';
  strength: number | null;      // 家族は null（強さの概念が無い）
  source: 'PROFILE' | 'STATE' | 'SEED' | 'VINE';
}

/** ④ ゲームへ返す、起こりうるイベント（候補。決めるのはゲーム）。 */
interface EventCandidate {
  candidateId: string;
  npcIds: NpcId[];              // 対象 NPC
  location: string;             // 対象の場所（地域は名簿から引ける）
  because: { bloomId?: string; seedTypes?: string[]; memoryIds: string[] };  // なぜ今か（追える形で）
  requires: { memory?: string[]; daysSince?: { memory: string; days: number } };
  priority: number;
  exclusiveGroup?: string;      // 同じ組から一つだけ（排他）
  realizes?: MemoryEventType;   // 起こしたときに正史へ書く種類（作者が決めたものだけ）
}

/** ④ ゲームへ返す、話せる会話（候補）。 */
interface TalkCandidate {
  talkId: string;
  npcId: NpcId;
  kind: 'DAILY' | 'EVENT' | 'RELATION_CHANGE' | 'TIME_PASSED';
  location: string;
  linesRef: string;             // 行そのものは content にある（口は参照だけ）
  requires: EventCandidate['requires'] & { seed?: { type: string; atLeast: SeedStatus } };
  priority: number;
}
```

関数（案。すべて純粋、正史と時計と規則を受け取るだけ）：

- `npcSnapshot(events, clock, npcId, { knownOnly })` → `NpcSnapshot`
- `eventCandidates(events, clock, { location? , npcId? })` → `EventCandidate[]`
- `talkCandidates(events, clock, { location, npcId? })` → `TalkCandidate[]`
- `importProfiles(json)` → `{ profiles, errors }`（Forge の取り込みと検証）

---

## 4. NPC_ID の正式な扱い

**今の状態（食い違いがある）**

- 人の状態・正史・人生エンジン：`GALD`・`LINA`・`BAKERY_OWNER`・`ALDEN_GUARD`・`NEL`・`KAOS`・`PLAYER`（大文字）
- 人生エンジンに1件だけ小文字：`alden_marta`
- 絵・表示・戦闘：`hero`・`kaos`・`gald`（小文字。絵の鍵であり別の名前空間）
- 人以外も「行為者」：`ALDEN_VILLAGE`（村そのもの）・`WORLD`・魔物の個体 ID

**提案**

1. **NPC_ID は大文字＋数字＋下線（`^[A-Z][A-Z0-9_]*$`）**。一度決めたら**変えない・再利用しない**
   （保存の `character_<ID>` と正史の `actors` が ID を持っているため）。
2. **既存の ID はそのまま**（GALD・LINA・BAKERY_OWNER など。保存データにあるものは絶対に改名しない）。
3. 絵・表示の小文字 ID は「絵の鍵」として別扱い。名簿で `npcId → artId／presentationId` を対応させる。
4. **名簿（registry）を一つに**：今の `WORLD_PEOPLE` を正式な名簿に格上げし、全員の `npcId・名前・種類・地域・重要度`
   を持たせる。人の状態・性格・会話・イベント・交差で使う ID が**すべて名簿にあること**をテストで確かめる。
5. 人以外の行為者（PLAYER・KAOS・村・WORLD・魔物の個体）も名簿の `kind` で区別する。
6. `alden_marta` は正史にも保存にも出てこない（人生エンジンの content だけ）ので、`MARTA` などへ揃えても
   保存には影響しない。**ただし名前の変更になるので、作者の判断を待つ**（下の「確認したいこと」）。

---

## 5. WORLD MEMORY から NPC の人生へ影響を渡す方法

**今ある道をそのまま使う**：正史の出来事の種類（例 `PLAYER_HELPED_GALD`）が、そのまま人生エンジンの
「行為（action）」の名前になる（`canonBridge.asWorldMemory`）。名前の二重管理は無い。

1. 新しい人の人生に関わる出来事は、**正史の出来事として** `World` が記録する（例：リナに魔法を見せた）。
2. 人生エンジンの行為表（`WorldActionDef`）に「その出来事が何を植えるか・どれくらい・誰に届くか
   （本人／見ていた人／自分）」を**1行**書く。
3. 誰にどう根付くかは、その人の性格・価値観・適性（`NpcCore`）との共鳴で決まる（表は増えない：行為＋人＋種の「和」だけ書けば、未来はその「積」だけ生まれる）。
4. 「助けた／助けなかった」「約束」「事件」も同じ形：**出来事として記録し、行為表で意味を与える**。
   解釈を正史に書かない（正史は「何が起きたか」だけ、意味は見た人ごとに後で決まる）。

**足りないもの**：正史の出来事の種類（`MemoryEventType`）はガルド専用の閉じた一覧になっている。
新しい人の出来事を記録するには、**種類を足す**必要がある（コードの型を足すだけで、保存形式・SAVE_VERSION は変わらない。
ただし「どんな出来事が正史になるか」は作者の決定事項）。

---

## 6. NPC の人生からイベント候補をゲームへ返す方法

1. 人生エンジンは今も BLOOM（こうなりうる未来）を**候補として**計算している（今はうわさと開発用画面だけが使う）。
2. 口（`core/link`）が、BLOOM・種の状態・交差から **`EventCandidate`／`TalkCandidate` を作って返す**。
   返すだけで、何も起こさない。
3. ゲーム側は、今ある**体験ディレクター**（`core/experience`）で「どれを出すか」を選ぶ
   （優先度・一度きり・間隔・同じ顔が続かないように、などは既にある）。
4. そのために体験イベントの条件に、**小さく足す**（体験エンジンは MUGEN を知らないままにする）：
   - 人生の読みを見る条件：`SEED_AT_LEAST`（誰の・どの種が・どこまで）、`BLOOM_CANDIDATE`（どの花が候補か）
   - 経過時間：`DAYS_SINCE_MEMORY`（ある出来事から何日）
   - 排他：`exclusiveGroup`（同じ組から一つだけ）
5. ゲームが「起こす」と決めたら、**`World` が正史の出来事として書く**（⑤）。そのとき花（BLOOM）と正史の
   出来事を結ぶ `realizes`（どの種類の出来事で実現するか）を花の定義に足す。これで「BLOOM → 正史 → 新しい種
   （NEW SEED）」が今の仕組みのまま回る。**エンジンが人生を決めることは無い**。

---

## 7. SAVE に保存するもの／再計算するもの

| 保存する（今と同じ仕組み） | 保存しない（毎回作り直す） |
|---|---|
| 正史の出来事（書き込み1回きり）。人の人生で「実際に起きたこと」「実現した花」も**正史の出来事**として | 種・育ち具合・見え方（HIDDEN／FELT／SPOKEN） |
| 時計（`world_clock`） | つる（関係の線）・関係の強さ |
| 人の現在状態（`character_<ID>`、**初期値から変わった人だけ**。行が無い＝初期値） | 花の候補 |
| プレイヤーが見た・知ったこと（体験の既読など、今ある行） | イベント候補・会話候補・うわさ |
| | NPC アプリへ渡す様子（`NpcSnapshot`） |
| | Forge の人の定義（ビルドに入っている content。保存しない） |

- **SAVE_VERSION は上げない**：新しい人を増やしても「行が無い＝初期値」なので、今の保存と互換（`World` の
  `INITIAL_CHARACTERS` に足すのと同じやり方。コメントにも「保存互換は構造上保証」と書かれている）。
- 規則（性格の数値など）を後で直すと、**読み（種の育ち具合など）は変わる**が、**実際に起きたこと（正史）は変わらない**。
  「一度起きたことは消えない、意味づけは変わりうる」という今の考え方と一致する。
- 人生の状態をゲーム側に別保存しない理由（今のコードの方針）：保存が一つなら、保存と読みが食い違うことが起きない。

---

## 8. NPC が増えても壊れにくくするには

- **今の設計がすでに強い**：時間を刻まない、全員×全員を計算しない、交差は書いた組だけ、表の大きさは「和」。
- **注意点1（読む回数）**：`readWorldLife` は呼ぶたびに正史を最初から読み直す（今は数十件なので問題なし）。
  人と出来事が増えたら、**同じ正史・同じ日の読みを覚えておく（メモ化）**。保存はしない。
- **注意点2（読む範囲）**：画面が必要なのは「この場所の人」「この人」だけ。口の関数は **場所・人で絞って返す**。
- **注意点3（content の置き方）**：地域ごとのファイルに分け（今の `aldenLife`／`galdLife` と同じ）、名簿で地域を引く。
  重複 ID は今の `joined()` が既に弾いている。
- **注意点4（検証）**：名簿・ID の形・参照先の存在・DRAFT の混入を、テストで毎回確かめる（数が増えるほど効く）。
- **注意点5（正史の語彙）**：出来事の種類を人ごとに増やすのではなく、魔物の四択と同じく「種類は少なく、誰に
  起きたかは actors で」表す形を優先する（`CreatureLifeChoiceEventType` と同じ考え方）。

---

## 報告 A〜E

### A. 既に使える既存構造

- 人生エンジン一式（`core/life`）：SEED・GROWTH・VINE・BLOOM・交差、正史の一方向読み込み、毎回作り直す読み、原因の追跡（`traceNpc`）。
- 正史（`MemoryEvent`、書き込み1回きり、原因付き）と、その持ち主 `World`（まとめて1回で書く）。
- 人の現在状態（`CharacterState`、年齢 null の意味付き、家族は親→子の一方向）と、人を足しても保存互換な初期値の仕組み。
- 人生イベント（`LifeEventDef`：必要な出来事＋経過日数＋一度きり）。
- 体験イベントとディレクター（場所・条件・優先度・一度きり・間隔・顔の偏り防止。MUGEN を知らない汎用部品）。
- うわさ（人生の読みから言葉を作る。雑談が意味を持てない型）、伏線、人生の記録（知っていることだけ）。
- SAVE の方針（行が無い＝初期値、版を上げずに行を足せる、壊れた行は下向きにだけ直す）。
- 名簿の原型（`WORLD_PEOPLE`）、暦、物語の理由でしか動かない時間。

### B. 不足している構造

1. **NPC_ID の正式な決まりと、一つの名簿**（大文字と小文字が混在、絵の ID と別、全員が名簿に載っているかの確認が無い）。
2. **人の定義が4か所に分かれている**（現在状態／性格／表示の文／絵）。まとめて受け渡す形（`NpcProfile`）が無い。
3. **Forge・NPC アプリとの受け渡し形式**（版の付いた JSON と、取り込み時の検証）が無い。すべて TS の content。
4. **人生エンジン → ゲームの出口**：花の候補は計算されているが、「イベント候補」「会話候補」として返す口が無い。
   体験イベントの条件も、人生の状態（種・花）や「ある出来事から何日」、排他を見られない。
5. **花が実現する道**：`REALISED` は付かない設計で正しいが、「どの正史の出来事で実現したとみなすか」の対応が無い。
6. **正史の出来事の種類がガルド専用の閉じた一覧**。新しい人の出来事を書くには種類を足す必要がある。
7. **関係の見え方**：家族（状態）と、つる（BECAUSE_OF／DRAWN_TO）はあるが、親密・信頼・対立を「読む形」が無い。
8. **感情状態・現在の目的**：保存された項目は無い（種の見え方・望みから読み取る設計にできる）。

### C. 新しく必要な最小部品（この順で。どれも保存形式は変えない）

1. `core/link/types.ts`：境界の型（`NpcProfile`・`NpcSnapshot`・`RelationView`・`EventCandidate`・`TalkCandidate`）と `LINK_SCHEMA_VERSION`。
2. 正式な名簿（`WORLD_PEOPLE` を格上げ）＋ **ID 検証テスト**（形・重複・全参照が名簿にあること）。**動作の変更なし**。
3. `core/link/read.ts`：`npcSnapshot`・`eventCandidates`・`talkCandidates`（純粋関数、読むだけ、場所・人で絞る、メモ化）。
4. 体験イベントの条件の小さな追加（`SEED_AT_LEAST`・`BLOOM_CANDIDATE`・`DAYS_SINCE_MEMORY`・排他グループ）。
5. 花の定義に `realizes`（実現となる正史の出来事の種類）を足す。
6. Forge の取り込み（JSON → 名簿・性格・初期状態・表示の文）と検証。**Forge の形式が分かってから**。

最初の一歩は 1 と 2（型と名簿と検証テストだけ。画面も保存も動きも変わらない）を提案する。

### D. 変更してはいけない既存部分

- 戦闘計算 CORE、SAVE_VERSION=3 と移行の手順、保存の行の意味（`character_<ID>` など）。
- 正史の「書き込み1回きり」と、人生エンジンが正史を書かない一方向の決まり（`canonBridge`）。
- 既存の ID（GALD・LINA・BAKERY_OWNER、出来事の ID、`character_<ID>` のキー）。改名しない。
- ガルドの四経路とその連鎖・経過日数、TIME SHIFT の正式仕様（最初のガルドの時だけ、ケイオスが一度だけ見せる）。
- プレイヤーが時間を動かせない決まり（`TimeAdvanceReason` に「プレイヤーが望んだ」を足さない）。
- 人生エンジンの原則（tick なし・花は候補まで・全員×全員をしない）、うわさの「雑談は意味を持てない」型、
  人生の記録の「知っていることだけ」、年齢 null の意味、リナの「14歳・手伝い」以外を決めない方針、
  体験エンジンが MUGEN を知らないこと。

### E. 推奨する連携構造

2章の図のとおり：**Forge と NPC アプリはファイル（版付き JSON）で外側に置き、ゲームの中では `World`（正史の持ち主）
→ 人生エンジン（読むだけ）→ 連携の口（候補を返すだけ）→ 体験ディレクター（選ぶ）→ `World`（実現を正史に書く）
の一周**にする。境界を越えるのはデータだけ。人生の状態は保存せず、正史と時計から毎回作り直す。

---

## 作者に確認したいこと（最小実装の前に）

1. **CHARACTER FORGE と NPC アプリの実体**：別のリポジトリ／アプリか。書き出し形式（JSON など）や、見本のファイルはあるか。
   （無ければ、こちらの `NpcProfile` 案を Forge 側の書き出し形式として提案する形にする）
2. **`alden_marta` の ID**：`MARTA` などへ揃えてよいか（保存には影響しない。人生エンジンの content の中だけ）。
3. **マルタは正史か**：名簿では「リナの母」だが、人の状態ではパン屋（リナの父）の配偶者が「なし」で、マルタの
   状態も無い。リナの母は誰で、どこに住んでいるかは作者の決定事項なので、こちらでは決めない。
4. **関係の数値**：親密度・信頼・対立を「保存する数値」ではなく「正史と種から毎回読む値」にする案でよいか
   （保存する数値にすると、保存行の追加と「誰が数値を動かすか」の決まりが必要になる）。
5. **感情状態・現在の目的**：保存項目にせず、種の見え方と望みから読む案でよいか。

---

## 9. 作者の方針決定（2026-09-27・正式）

| 事項 | 決定 |
|---|---|
| 外部ツール | CHARACTER FORGE と NPC アプリは**ゲーム本体とは別の外部ツール／別リポジトリ／別アプリ**。やり取りは**版付き JSON**。既存の形式が無いので、**§3 の案（`core/link/types.ts`）を暫定正式案**とする。ゲームは相手の中身を知らず、JSON の契約だけを知る |
| 正式 ID | **大文字の定数形式**（`GALD`・`LINA`・`MARTA`）。`alden_marta` のような小文字・地名付き ID は正式 ID にしない |
| 別名（alias） | 互換のため、**import／検証／境界で別名として受け取る**のは可。既存 ID は壊さない |
| 絵の ID | `hero`・`gald` などの絵の ID と NPC_ID は**別物・別フィールド** |
| MARTA | ID `MARTA` は定義してよい。**「MARTA＝リナの母」は正式確定しない**。家族関係・配偶情報は作者の決定まで未確定。自動で付与しない |
| 親密度・信頼・対立 | SAVE に保存する固定数値にしない。**出来事と種から毎回計算**。実行中の一時キャッシュは可、永続保存はしない |
| 感情状態・現在の目的 | SAVE に保存しない。**種の見え方・本人の望み・記録された出来事から読む** |
| SAVE | 保存するのは出来事・時計・変わった人の現在状態だけ。**SAVE_VERSION は上げない**（3 のまま） |
| 最初の実装範囲 | **C-1（境界の型）と C-2（正式な名簿と ID 検証テスト）だけ**。UI・SAVE 形式・イベントの出し分け・Forge import 本実装・会話候補の本接続・人生エンジンの改修はまだやらない |
| 次の順番 | ① 読むだけの関数（人の様子・イベント候補・会話候補。場所・人で絞る）→ ② 体験イベントの条件追加（種の状態・BLOOM 候補・経過日数・排他グループ）→ ③ BLOOM に「何の出来事で実現扱いか」→ ④ Forge の形式が分かり次第 import |
| 変えてはいけない | 戦闘計算 CORE、SAVE_VERSION=3、既存の保存形式、出来事を書き換えないこと、人生エンジンが出来事を書かないこと、既存 ID、ガルドの4結末とその後の流れ、TIME SHIFT は一度だけ・プレイヤーは時間を動かせない、人生エンジンの思想（時間を刻まない・BLOOM は候補まで・全員×全員をしない・雑談は意味を持たない・知っていることだけ見せる） |

戦闘側の残り1件（古い SAVE での ♪ 自動解放の実機確認）は、この作業とは切り離して並行扱い（ブロッカーではない）。

## 10. 最小実装 C-1・C-2（2026-09-27）

**画面・保存・動きは変えていない**。新しいモジュールはどこからも使われていない（名簿がID規則を使うだけ）。

### 追加したファイル

| ファイル | 中身 |
|---|---|
| `packages/mugen-core/core/link/types.ts` | 境界の型（契約）。`LINK_SCHEMA_VERSION = 1`（SAVE_VERSION とは別物）、`LINK_FORMAT = 'mugen-zero.link'`、`NpcId`・`ArtId`・`RegionId`・`LocationId`、`PersonKind`・`PersonStanding`、`PersonDefinition`（人の定義）、`PersonState`（人の今の様子：`current`＝現在状態、`reading`＝読み取り値〔人生段階・感情・目的・種〕、保存しない）、`LifeStage`（QUIET／SEED／GROWTH／VINE／BLOOM／NEW_SEED）、`RelationshipView`・`RelationshipKind`（親密・信頼・対立など、境界の出力値）、`ConditionSummary`、`EventCandidate`（候補ID・対象人物・場所・優先度・排他グループ・条件の要約・実現する出来事の種類）、`ConversationCandidate`（候補ID・話者／相手・場所・種類・表示条件の要約・優先度・会話の参照）、`LinkDocumentKind`・`LinkPayloads`・`LinkDocument`（JSON の包み：形式名・種類・版・作成ツール・作成時刻・中身） |
| `packages/mugen-core/core/link/npcId.ts` | 正式 ID の規則 `NPC_ID_PATTERN = /^[A-Z][A-Z0-9_]*$/`、`isFormalNpcId`、名簿の1行 `NpcRegistryEntry`（ID・表示名・種類・地域・重要度・**絵の ID は別フィールド**・別名）、`aliasTable`、`resolveNpcId`（正式 ID→そのまま／別名→正式 ID／それ以外→null。大文字小文字を勝手に揃えない）、`registryProblems`（不正 ID・重複・空の名前・別名の衝突）、`unresolvedIds`（誰でもない参照を場所付きで報告） |
| `packages/mugen-core/content/people/registry.ts` | **正式な名簿 `NPC_REGISTRY`**（`WORLD_PEOPLE` を土台に、GRAVE と WORLD を追加）と `registryEntry` |
| `packages/mugen-core/content/people/registry.test.ts` | 名簿と ID の検証（14件） |
| `packages/mugen-core/core/link/link.test.ts` | 境界の文書が JSON を往復しても変わらないこと、版が SAVE とは別であること（2件） |

### 正式 ID と別名

| 正式 ID | 表示名 | 種類 | 地域 | 絵の ID | 別名 |
|---|---|---|---|---|---|
| `PLAYER` | プレイヤー | PLAYER | ALDEN | `hero` | — |
| `KAOS` | ケイオス | COMPANION | ALDEN | `kaos` | — |
| `GALD` | ガルド | PERSON | ALDEN | `gald` | — |
| `LINA` | リナ | PERSON | ALDEN | `LINA` | — |
| `ALDEN_GUARD` | アルデンの衛兵 | PERSON | ALDEN | — | — |
| `BAKERY_OWNER` | パン屋の主人 | PERSON | ALDEN | `BAKERY_OWNER` | — |
| `MARTA` | マルタ | PERSON | ALDEN | — | `alden_marta` |
| `GRAVE` | グレイヴ | PERSON | ALDEN | — | — |
| `ALDEN_VILLAGE` | アルデン村 | PLACE | ALDEN | — | — |
| `NEL` | ネル | PERSON | PORT_TOWN | — | — |
| `WORLD` | 世界 | SYSTEM | WORLD | — | — |

- `alden_marta` は人生エンジンの content の中では今のまま動く（改名しない）。境界では `MARTA` として読む。
- MARTA には家族・配偶・現在状態を付けていない（テストで確認）。
- `GRAVE`（酒場の主人）は、体験イベントと伏線ですでに登場人物として使われていたが、名簿に無かったので追加した。
- `WORLD` は、時間の経過や行為者の書かれていない正史の行為者（`advanceTime`・`canonBridge`・`World.timeShift`）。
- 魔物の個体 ID（四択の対象）は人ではないので名簿に入れない。

### ID 検証テストが確かめること

- 名簿：正式 ID の形、重複なし、表示名あり、別名が誰かの正式 ID と衝突しない・二人を指さない。
- **content が使う ID がすべて名簿の誰かを指す**：現在状態（ID・配偶者・子）、人生エンジンの人・BLOOM・交差・前史、
  正史の人生イベントの関係者と状態変化の対象、`World` が書く行為者、体験イベントの登場人物、伏線の関係者、`WORLD_PEOPLE`。
  （どの出どころからも実際に ID を読めていることも別に確認し、検査が空振りしないようにしている）
- `WORLD_PEOPLE` と名簿の地域・重要度が一致すること。
- 絵の ID は別フィールドで、書かれた絵が実在すること。小文字の絵の ID（`hero` など）は人の ID として通らないこと。
- MARTA：`alden_marta` → `MARTA`、家族として誰にも登録されていないこと。
- 検査そのものが働くこと：不正 ID・重複・別名の衝突・誰でもない参照・大文字小文字の違いを、わざと作って落ちることを確認。

### テスト結果

- 新規：16件すべて通過（名簿14・境界2）。
- 既存：CORE 1337件（既存1321＋新規16）すべて通過、App 単体127件すべて通過、型チェック（CORE・App）エラーなし。
- 画面・保存・戦闘のコードは変更していないため、e2e は今回は再実行していない（前回 STEP 12 で158件通過）。

## 11. Forge の永久 ID と NPC_ID（作者の決定・2026-09-27）

- CHARACTER FORGE の仕様「MUGEN ZERO DEPLOY BRIDGE PREPARATION SPEC」（2026-09-27）を受領。Forge の Character ID は
  `HUM-000006` のような**ハイフン入りの永久 ID**で、MUGEN ZERO の正式 NPC_ID の規則（大文字・数字・下線のみ）と形が違う。
- **決定：別フィールドで対応する**。どちらの規則も変えない。
  - Forge の ID は **`forgeId`** として、DEPLOY PACKAGE からゲーム側まで必ず持ち運ぶ（書き換えない・再利用しない）。
  - MUGEN ZERO 側の NPC_ID（例 `ORDO` や `HUM_000006`）とは**対応表**で結ぶ。再送（Deployment #2 以降）でも同じ対応を使い、
    新しい人として受け取らない。
- Forge 側の実装（DEPLOY PACKAGE・検証・配属履歴・「行ってらっしゃい」・JSON 書き出し）は、Forge のコードが
  このセッションから見えるようになってから行う（現時点でアクセスできる別リポジトリ `yc04140809-bit/-` は空）。

---

## 12. FORGE の採用（AUTHORING / CONTENT IMPORT・2026-09-27）

作者の方針修正により、FORGE で採用したキャラクターは**全プレイヤー共通の正式 NPC（コンテンツ）**として
`packages/mugen-core/content/forge/` に入れ、ビルドに含める。§7 の「Forge の人の定義はビルドに入る content（保存しない）」の通り。
SAVE には、その NPC について起きたこと・変わった状態だけを置く。詳細は [`docs/FORGE_IMPORT.md`](./FORGE_IMPORT.md)。

- §11 の対応表は台帳 `content/forge/roster.json`（Character ID → NPC_ID）。採用時に作者が NPC_ID を決め、以後変えない。
- 人物台帳は `ALL_NPCS`（手書き `NPC_REGISTRY` ＋採用キャラ）。`PersonKind` に `CREATURE` を追加（採用したモンスター）。
- WORLD LIFE ENGINE の `cores` に採用キャラを追加（FORGE の言葉のまま、推測で英語 ID に置き換えない）。
