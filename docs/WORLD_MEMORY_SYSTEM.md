# WORLD MEMORY SYSTEM — NPC人生データ構造・実装基盤 Ver.1.0（作者、2026-10-16）

> 状態：**仕様の登録のみ。未実装。** 作者指示（2026-10-16）：既存の WorldMemory／NpcState／Relationship／HiddenSeed／
> LifeTick／EventRule の構造を可能な限り維持する。このリポジトリでの対応する既存の仕組みは
> `docs/WORLD_LIFE_LINK_DESIGN.md`（`core/life` の NpcCore・SEED→GROWTH→VINE→BLOOM、`core/narrative`、world の出来事・既読）。
> 取り込みは「ガルド・パン屋ルート PoC」（作業順 5）から、必要な分だけ。
> 主人公不在の間の出来事（OFF-SCREEN EVENT・LIFE TICK・WORLD TRUTH／PLAYER KNOWLEDGE の分離）は `docs/OFF_SCREEN_LIFE_SYSTEM.md`（2026-10-17、仕様の登録のみ）。

## 0. 目的

WORLD MEMORY は「プレイヤーがどのルートを選んだか」を保存するシステムではない。保存するのは、
何が起きたか／誰が何を知ったか／誰が誰をどう思っているか／本人が何を経験したか／どんな可能性を持っているか／
その可能性に気付いているか／時間によって何が変化したか。その結果として、NPC の次の行動や人生が変化する。

## 1. 最重要設計原則

**禁止**：`GARDO_ROUTE = "BAKERY"` のような「このNPCはこのルートです」だけで人生を管理すること。
初回選択によってパン屋・治療所・捕縛・見逃し・死亡という入口は存在するが、その後の人生は1本の固定ルートとして扱わない。

例：×「GARDO_ROUTE = BAKERY → 3年後パン屋」ではなく、
○「ガルドがリナを救った＋リナがガルドを信頼した＋リナの父と出会った＋ガルドが仕事を受け入れた＋パン屋が存続している＋村から追放されていない → パン屋勤務が成立する」。
つまり「ルート」ではなく【複数の事実の組み合わせ】によって未来が決定される。

## 2. NPCデータを2種類に分ける

- **A. CHARACTER BASE**（変化しにくい）：id、名前、年齢、personality、values、desires、fears、potentialSeeds（id／type／strength／discoveredBySelf／discoveredByOthers）。
  strength などの数値は実装調整用の内部数値で、プレイヤーには原則公開しない。
- **B. LIFE STATE**（人生によって変化する）：alive、location、occupation、confidence、stress、guilt、hope、currentGoals、knownFacts、experiencedEvents、activeSeeds、lifeTags。

CHARACTER BASE は「この人がどんな可能性を持っているか」、LIFE STATE は「今、この人がどんな人生を生きているか」。この2つは必ず分ける。

## 3. HIDDEN SEED

NPC が持つ潜在可能性（詳しくは `docs/HIDDEN_SEED_SYSTEM.md`）。才能が存在していても、本人が気付くとは限らない、周囲が気付くとも限らない、
使用する機会がなければ一生開花しない可能性もある。
状態の例：DORMANT（未発見）→ NOTICED（誰かが違和感に気付く）→ RECOGNIZED（才能として認識）→ DEVELOPING（本人が育て始める）→ BLOOM（開花）→ MASTERED（高い水準へ）。
DORMANT のまま人生を終えることもある。

## 4. KNOWLEDGE — 誰が何を知っているか

「世界に存在する真実」と「その人物が知っていること」を分離する。
例：世界の真実「ガルドはエルナの治療費のため盗賊になった（GARDO_SISTER_ILLNESS）」。初期リゼルは知らない（knownFacts 空）。
後に事情を聞くと knownFacts に `{ factId, source: GARDO_CONFESSION, confidence }` が入り、同じガルドを見てもリゼルの判断が変化する。

## 5. RELATIONSHIP

単純な「好感度：80」だけでは管理しない。from／to ごとに trust・respect・fear・affection・debt・suspicion・understanding・sharedHistory。
「好きだけど信用できない」「尊敬しているけど怖い」「恩があるが嫌い」など、矛盾した人間関係を表現できる。これも CHAOS。

## 6. MEMORY — NPC自身の記憶

WORLD MEMORY だけでなく、NPC 自身にも MEMORY を持たせる（memoryId／importance／emotion／beliefImpact）。
出来事は同じでも人物ごとに意味が違う。例（ガルドがリナを救う）：ガルド「子供を助けただけ」／リゼル「悪人だと思っていた人物が命を張って子供を救った」／
リナ「怖い人だと思ったけど私を助けてくれた」／衛兵「犯罪者が逃げずに戦った」。同じイベントから違う MEMORY が生まれる。

## 7. BELIEF — 価値観の変化

例（初期リゼル）：THIEF_EQUALS_EVIL 85／PEOPLE_CAN_CHANGE 20／EFFORT_IS_REWARDED 80 → ガルドとの経験後：45／65／80。
イベントによって性格を突然変えない。価値観が少しずつ動き、一定以上変化した結果として行動が変わる。

## 8. EVENT LEDGER — 世界で起きた事実

すべての重要イベントを記録（eventId／worldTime／location／participants／factsCreated／relationshipChanges／memoriesCreated）。これが世界の歴史になる。

## 9. CAUSAL LINK — 因果関係を残す

「なぜこの未来になったのか」を内部的に追跡可能にする。例：`{ result: ELNA_TREATMENT_SUCCESS, causedBy: [RIZEL_LEARNED_GARDO_TRUTH, BALDO_CONTACTED_FAMILY, MERCHANT_SUPPORT_APPROVED] }`。
開発者自身も「なんでこの未来になった？」を追跡できる。非常に重要。

## 10. NEW SEED

イベントが終わる時、必ず次の可能性が発生する。例（エルナ治療成功）→ ELNA_MEETS_LINA／ELNA_HELPS_CLINIC／ELNA_HEALING_TALENT／GARDO_SETTLES_ALDEN／GARDO_VILLAGE_TRUST。
イベントは終わりではない。次の人生イベントの種を作る。

## 11–12. EVENT CONDITION とイベントルール

イベントは単純なルート番号ではなく、複数条件によって発生する。
例（バルド剣術才能発見）：RIZEL knows BALDO_TRAINS ＋ BALDO has SWORD_TALENT ＋ BALDO_CONFIDENCE < 50 ＋ RIZEL_OBSERVATION ≥ threshold ＋ 二人の関係が完全敵対ではない。
ルールは `{ ruleId, requirements[], effects[], newSeeds[] }` の形。

## 13. 時間

時間そのものが重要なデータ（worldDay／storyYear／season）。イベントには「発生から何日経過したか」という条件も使える
（例：エルナ治療後 30日 回復／90日 村生活に慣れる／180日 リナとの友情深化／365日 治療所を手伝う可能性）。
通常プレイヤーが自由に時間を飛ばす TIME SHIFT 機能は作らない。時間経過は物語進行・イベント・STORY_TIME_ADVANCE によって管理する。
ガルド初回イベントの TIME SHIFT は物語上の特別演出。

## 14. LIFE STATE

同じ職業でも、人間としての状態は変化している（例：ガルド BAKERY_WORKER、socialStatus FORMER_THIEF → 3年後 VILLAGE_RESIDENT、hope・guilt・confidence の変化）。

## 15. 死亡

死亡した NPC を削除しない（alive false、deathEvent、legacySeeds）。死亡後も RELATION・MEMORY・CAUSE・NEW SEED は残り、死んだ NPC も世界へ影響を与え続ける。

## 16. PLAYER CHOICE

プレイヤーの選択も結果ではなく事実として保存（choiceId／selected／worldTime／locked）。選択が直接未来を決めるのではなく、世界状態を変える
（例：CAPTURE → GARDO_STATUS = DETAINED、GUARD_GARDO_SUSPICION +20、ESCAPE_OPPORTUNITY_ENABLED）。そこから人生が続く。

## 17. WORLD SEED（将来拡張案）

純粋な完全ランダムにはしない。将来、WORLD SEED で小さな個体差（世界ごとの個性）を持たせることは可能だが、同じセーブデータ内では結果を固定する。
初期実装では不要。TIGS BUILD では固定データを優先する。

## 18–19. プレイヤーに見せる情報／攻略本で攻略できない理由

内部数値を全部見せない。プレイヤーが見るのは、人物の言葉・表情・行動・関係性・WORLD MEMORY 記録・起きた出来事。
剣術適性・信頼値・治療適性などの数値は原則見せない（人生が攻略対象になりやすいため）。
攻略できない理由はランダムだからではなく、人物の人生が複数の状態の積み重ねによって変化するから。同じ選択でも、それ以前の人間関係・知識・経験・時間・生存人物・世界状態によって意味が変わる。

## 20. 最小実装（TIGS BUILD）

最初から全 NPC へ巨大システムを適用しない。まず対象：ガルド・リゼル・バルド・リナ・エルナ・衛兵・リナの父。
最低限：NPC LIFE STATE／RELATIONSHIP／KNOWN FACTS／IMPORTANT MEMORY／POTENTIAL SEED／EVENT LEDGER／NEW SEED／TIME ADVANCE。
（作者 2026-10-16：今回の PoC はパン屋ルートの因果連鎖のみ。バルドは PoC に関係させない。）

## 21. 推奨データ全体像

```
WORLD_MEMORY
├── WORLD（time / locations / facts）
├── NPC（characterBase / lifeState / knowledge / memories / beliefs / potentialSeeds）
├── RELATIONSHIPS
├── EVENT_LEDGER
├── ACTIVE_SEEDS
├── CAUSAL_LINKS
└── PLAYER_CHOICES
```

## 22. 絶対思想

NPC はルートを進むキャラクターではない。可能性を持って生きる人間。プレイヤーの選択は人生の答えではなく、次の可能性と出会う「きっかけ」にすぎない。
才能があっても開花しないことがある。正しい選択をしても幸せになるとは限らない。間違った選択から新しい人生が生まれることもある。
人間は最適化できない。だから未来が生まれる。攻略できるのは戦闘。人生は攻略できない。
