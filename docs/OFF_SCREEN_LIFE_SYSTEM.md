# OFF-SCREEN LIFE SYSTEM — 主人公が見ていない間も続くNPC人生システム Ver.1.0（作者、2026-10-17）

> 状態：**最小部分を実装（2026-10-17、ガルド・パン屋ルート PoC。2026-10-19 STEP ① で完成品質化。末尾「PoC 実装」「STEP ①」）。それ以外は未実装。** `docs/WORLD_MEMORY_SYSTEM.md`・`docs/HIDDEN_SEED_SYSTEM.md`・`docs/GALD_FIVE_ROUTES.md` と同じ扱い。
> 既存の WorldMemory／NpcState／Relationship／HiddenSeed／LifeTick／EventRule の構造を可能な限り維持して取り込む
> （このリポジトリでは `core/life` の人生エンジン、`docs/WORLD_LIFE_LINK_DESIGN.md`）。FORGE 側データは参照のみ。
> 取り込みは「ガルド・パン屋ルート PoC」（作業順 5）から必要な分だけ。ただし今回の PoC にバルドは関係させない（作者 2026-10-16）。

## 0–2. 目的／最重要思想／プレイヤーは全てを見られない

「主人公がその場にいない＝世界が停止する」とはしない。NPC には主人公と出会う前の人生・別れた後の人生・主人公の知らない人間関係がある。
主人公は NPC の人生の「主役」ではなく、その人生へ関わる一人にすぎない。OFF-SCREEN LIFE SYSTEM は、主人公不在の間の出来事を WORLD MEMORY 上で管理する仕組み。
世界で起こった出来事をプレイヤーが必ず目撃できるわけではない（正式仕様）。例：リナとエルナが主人公不在のうちに友達になり、後日二人で歩いている——「いつの間に仲良くなったんだ？」。

## 3. OFF-SCREEN EVENT

主人公不在時に起きる出来事。`playerObserved = false` でも世界では実際に起きた事実として扱う。
例：`{ eventId: OFF_ELNA_LINA_FIRST_FRIENDSHIP, type: RELATIONSHIP, worldTime: 13200, location: ALDEN_VILLAGE, participants: [ELNA, LINA], playerObserved: false, importance: 45, effects: [ELNA_LINA_FRIENDSHIP +20], newSeeds: [ELNA_LINA_NEXT_OUTING] }`

## 4. 種類（5段階）

| LEVEL | 種類 | 例 | 記録 |
|---|---|---|---|
| 1 | DAILY LIFE | パン屋で働く・買い物・掃除・雑談・散歩・訓練・食事 | 詳細ログ不要 |
| 2 | RELATIONSHIP | リナとエルナが仲良くなる・衛兵とガルドが話す・誰かが誰かを励ます | WORLD MEMORY へ保存 |
| 3 | GROWTH | バルドが剣の練習を始める・エルナが治療所を手伝う・ガルドが信用され始める | 保存必須 |
| 4 | BRANCH | 才能の発見・治療を学ぶ決心・村に残る決意 | CAUSAL LINK と NEW SEED を保存 |
| 5 | CRITICAL | 死亡・結婚・重大な離別・追放・裏切り・職業変更・重要NPCとの決別 | 無制限に裏で発生させない（§17） |

## 5–7. 行動の基準／NPC自身の選択／直接関わらなくても繋がる

完全ランダムではない。PERSONALITY・VALUE・DESIRE・FEAR・RELATIONSHIP・MEMORY・KNOWLEDGE・LIFE STATE・LOCATION・WORLD TIME・ACTIVE SEED で決める。
PLAYER CHOICE ではなく NPC の DECISION（例：主人公が村を離れている間に、バルドが「少しだけ練習してみる」＝`TRY_SWORD_TRAINING`）を WORLD MEMORY へ保存する。
主人公がガルドを助けた後は、ガルド→リナ→リゼル→バルド→家族→商会→エルナ支援→治療→リナと友達→治療所を手伝う、と主人公が参加していない出来事が大量に続いてよい。

## 8–10. 例

- **リナ×エルナ**：エルナが移住（NEW SEED `ELNA_MEETS_LINA`）→主人公が別の場所へ→条件（二人とも生存・ALDEN・14歳・関係 neutral 以上）→パン屋付近で会話・友情＋→主人公帰還時に二人が一緒にいる（「エルナ、この前言ってたところ行こうよ！」）。いつ仲良くなったかは知らなくてよい。
- **リゼル×エルナ**：治療所で患者の容体変化にエルナが気付く→リゼル確認、本当に悪化→`ELNA_CARE_TALENT` DORMANT→NOTICED、リゼルの記憶 `ELNA_NOTICED_PATIENT_CHANGE`、NEW SEED `RIZEL_TEACHES_ELNA`。後日リゼルから「エルナ、意外と筋がいいのよ。」と聞くかもしれない。
- **バルド×リゼル**：主人公不在でバルドが剣を練習→リゼルが偶然見る（`RIZEL_SEES_BALDO_SWORD`）→SWORD DORMANT→NOTICED→翌日、二人の会話から主人公が後で知る。

## 11–13. 知る方法／知らないままも許可／WORLD TRUTH と PLAYER KNOWLEDGE

全部をログ表示しない。知る方法：会話（本人）・第三者・環境（建物や場所の変化）・行動（態度の変化）・噂（酒場・村人）・手紙・WORLD MEMORY（重要な人生変化のみ）・偶然目撃。
全てを回収させない（誰にも話さなかった夜の悩みが、翌日の判断を少し変える）。
世界で起きた事実＝**WORLD TRUTH** と、プレイヤーが知っている事実＝**PLAYER KNOWLEDGE** を別管理する（例：`BALDO_STARTED_TRAINING` WORLD=true／PLAYER=unknown → 後日 known）。

## 14–16. PLAYER ABSENCE／主人公がいることで起こらない出来事／PRIVATE EVENT

イベントに主人公不在条件を持たせられる（例：`PLAYER_NOT_IN_ALDEN`・`BALDO_IN_ALDEN`・`RIZEL_IN_ALDEN`・`BALDO_SWORD_EXPOSED` → `RIZEL_BALDO_PRIVATE_TRAINING`）。
主人公がいるとバルドは強がり、いないとリゼルへ本音を話す——主人公の存在自体が世界へ影響する。
NPC 同士だけの PRIVATE EVENT を許可（例：`BALDO_RIZEL_PRIVATE_TALK`。主人公は知らない可能性があるが、バルドの confidence・hope・relationship が変化する）。

## 17–19. CRITICAL EVENT RULE／理不尽な死亡の禁止／EVENT WINDOW

死亡・結婚・重要NPC離脱・村壊滅などは、次のいずれかを満たす：A 事前に十分な伏線／B 主人公が介入する機会があった／C 長期間放置した結果として自然／D 物語上明確な理由／E プレイヤーの過去選択から十分に因果を追える。
「村を10分離れて戻ったらリナ死亡」のような意味のない重大変化は禁止。OFF-SCREEN LIFE はプレイヤーを罰するシステムではなく、世界が生きていると感じさせるシステム。
重要イベントには発生可能期間を持たせる（例：`BALDO_SWORD_DISCOVERY` EARLIEST＝ガルドイベント後、LATEST＝村襲撃前）。

## 20–23. LIFE TICK／優先度／COOLDOWN／感情の余韻

毎秒全員を計算しない。物語時間が進んだ時だけ（クエスト終了・宿泊・地域移動・ストーリー進行・一定日数経過）LIFE TICK を実行：
1 対象NPC確認 → 2 ACTIVE SEED確認 → 3 条件判定 → 4 候補生成 → 5 優先度判定 → 6 確定 → 7 WORLD MEMORY 更新。
優先度：CRITICAL > STORY RELEVANT > RELATIONSHIP > GROWTH > DAILY。同じ人物へ短時間に集中させない。
関係変化には時間が要る（大喧嘩の翌日に大親友は禁止）。感情には余韻（エルナが兄の死を知った翌日に普通に笑わない。一定期間、会話・表情・行動に影響）。

## 24–27. NPC同士でSEEDを作る／OFF-SCREEN BLOOM／人生の「間」／WORLD MEMORY 表示

主人公だけが SEED の発生源ではない（リゼル→バルドの才能発見→商会へ相談→エルナ支援→リナと友情→別NPCを紹介）。
主人公が作った SEED が不在時に BLOOM することもある（数か月後、バルドが村の子供に剣を教えている——「そこまで行ったのか……。」）。
大事件の間の、仕事・練習・友達・失敗・小さな成功・仲直り・積み重ねを補完する。
プレイヤーへ全内部イベントは表示しない。重要なものだけ人生記録に（例：バルド「リゼルの勧めで剣の訓練を始めた。」／エルナ「リゼルの治療所を手伝うようになった。」／リナ「エルナと親しい友人になった。」）。内部数値は非表示。

## 28–29. TIME SHIFT との違い／リアル時間と分離

TIME SHIFT はガルド初回イベントでのみ使う物語上の特別演出。OFF-SCREEN LIFE は通常世界で常に存在する人生進行。プレイヤーが自由に時間を飛ばす機能ではない。
初期仕様では時間は STORY TIME 基準（アプリを3日開かなかったから3年老ける、にはしない）。リアル時間要素は将来限定的に導入の余地。

## 30–31. TIGS BUILD 最小実装／説明例

世界全体はシミュレーションしない。対象：ガルド・リゼル・バルド・リナ・エルナ・衛兵・リナの父。
実装例：主人公がガルドへ選択 → アルデン村を離れる → LIFE TICK → OFF-SCREEN EVENT：リナとエルナが会話 → 友情成立 → 主人公帰還 → 二人が一緒にいる。この一つだけでも「見ていない間も世界が動いた」と体験できる。
（バルドは TIGS 対象に含まれるが、ガルド・パン屋ルート PoC には関係させない — 作者 2026-10-16。）
展示説明：「NPCはプレイヤーのために待機しているわけではありません。プレイヤーが別の場所にいる間にも、NPC同士が出会い、関係を作り、才能を見つけ、新しい選択をします。そして、あなたが村へ戻ってきた時、知らない時間が確かにそこに存在しています。」

## 32–33. 将来拡張／AI導入時

数十〜数百NPCへ拡張しても全員を常時計算しない。ACTIVE／RELEVANT／BACKGROUND／SLEEP に分類し、物語に近い人物ほど細かく、遠いNPCは簡略に。
AI を導入しても完全自由行動はさせない。WORLD MEMORY・PERSONALITY・VALUE・DESIRE・FEAR・RELATIONSHIP・KNOWN FACTS・ACTIVE SEED の制約内で行動候補を生成する補助役（人生を勝手に作る神ではない）。

## 34–35. 絶対ルール／思想

主人公不在＝停止にしない。しかし主人公不在＝完全ランダムにもしない。NPC はその人物の人生に沿って動く。
重要イベントには原因がある。人間関係には時間が必要。出来事には記憶が残り、その記憶が次の選択を変える。
世界は主人公を待っていない。だからこそ、戻ってきた時に「時間が流れていた」と感じられる。あなたが見ていない間も、その人の人生は続いている。

---

## PoC 実装（2026-10-17、作者指示：LIFE TICK／不在時の NPC 同士の出来事／WORLD TRUTH と PLAYER KNOWLEDGE の分離）

| 仕様 | 実装 |
|---|---|
| LIFE TICK（§20） | 物語時間が進む時だけ：宿で休む夜（`World.advanceDay`）。既存の人生 resolver（`core/events/eventEngine.ts`）で、四択の連鎖と不在時の出来事を一緒に解く（`LIFE_TICK_DEFS`）。見るだけ・画面を開くだけでは何も起きない。自由な TIME SHIFT・リアル時間はなし |
| OFF-SCREEN EVENT（§3–4） | `content/events/offScreenLife.ts`：パン屋ルートの6つ（RELATIONSHIP／GROWTH／BRANCH）。actors に PLAYER なし＝`playerObserved: false`。誰の選択か（`decidedBy`）と NEW SEED 名も持つ |
| NPC 自身の選択（§6） | パン屋で働く＝ガルド、手紙＝リナ、見張り番の前で話す＝リゼル。プレイヤーの選択肢ではない |
| 波及（§7・§24） | リナの父・エルナ・見張り番（森にいなかった人）へ。人生エンジンが同じ出来事を読み、各人に種を残す（`content/world/bakeryRouteLife.ts`。関係・感情は保存せず毎回読む） |
| WORLD TRUTH／PLAYER KNOWLEDGE（§13） | 事実＝世界の出来事（`getEvents`）。知識＝新しい行 `playerKnowledge`（`core/world/playerKnowledge.ts`）：知った事実・日・経路（`talk:`／`rumor:`／`seen:`）。**起きていないことは知れない**。全部を知った事実だけが世界の記憶・人生の記録に載る。一部だけ（「パン屋に新しい働き手」）は載らない |
| 知る方法（§11） | 会話（リナ・主人）、第三者（リゼル）、環境（パン屋の店の奥）、噂（噂話・アルデン通信）、世界の記憶、人生の記録。知らないまま終わる出来事もある |
| CRITICAL（§17–18） | なし（死亡・離別などは起こさない） |
| バルド | 関係させない（テストで確認） |

詳細は `docs/GALD_FIVE_ROUTES.md`「パン屋ルート PoC 実装」。

## STEP ① 完成品質化（2026-10-19、TIGS2027）

- 出来事に「人が変わっていること」の条件を付けた（`LifeEventDef.bloom`：人生エンジンの BLOOM を、その日までの出来事で判定）。前の出来事がその人に残した種で、次の出来事の条件が成り立つ。
- パン屋ルートは9つの出来事（新しく3つ：リゼルがエルナを診ると申し出る／村へ話が伝わる／リナの父が働き口を申し出る）。
- TIME SHIFT（§28）は夜と同じ連鎖を読み、パン屋ルートの3年後を一度だけ見せる。自由な TIME SHIFT は今も無い。
- 詳細・要判断は `docs/GALD_FIVE_ROUTES.md`「パン屋ルート STEP ① 完成品質化」。

## 第2の連鎖：見逃す（2026-10-20、TIGS2027 第2検証ルート）

同じ LIFE TICK・同じ解決器・同じ「人の中にあるもの」の条件で、見逃した世界にだけ起きる2件：`GALD_SAVES_MERCHANTS`（村の外で、ガルドが襲われた商会の人々を助ける）と
`MERCHANTS_LEARN_OF_ELNA`（商会の人々が妹の存在を知る）。商会の人々は匿名（`MERCHANT_CARAVAN`）。プレイヤーには伝わらない（OFF_SCREEN_FACTS なし）。
`OFF_SCREEN_LIFE_DEFS` はパン屋ルートと見逃すルートの2本。根の答えが同時には存在しないので、一つの世界で混ざらない。詳細：`docs/GALD_FIVE_ROUTES.md`「見逃すルート 第2検証ルート」。

