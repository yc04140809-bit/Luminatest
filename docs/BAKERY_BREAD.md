# パン屋店舗機能＋パン消耗品 MVP Ver.1.0（2026-10-09）

リナからパンを買い、持ち歩き、食べて HP 小回復＋小さなバフ。休息回数で期限が減る。
既存の持ち物・アイテム・LUMI・セーブを使い、別の在庫システムは作らない。

## 遊び方の流れ

アルデン村 →「パン屋」→（リナ）「買う」→ 持ち物の「パン」棚 →「食べる」→ 休息で期限が 1 減る → 0 で【期限切れ】

## 販売パン

| パン | itemId | 価格 | 回復 | バフ | 期限 | recipeId |
|---|---|---|---|---|---|---|
| 焼きたてパン | `FRESH_BREAD` | 18 LUMI | HP+20 | 防御 +5% | 休息 2 回 | `BASIC_LOAF` |
| 森の木の実パン | `FOREST_NUT_BREAD` | 22 LUMI | HP+20 | 素早さ +5% | 休息 2 回 | `NUT_LOAF`（ingredients: `FOREST_NUT`） |
| 魔力パン | `MANA_BREAD` | 26 LUMI | HP+15 | 魔力 +5% | 休息 2 回 | `MANA_LOAF` |
| 旅人の硬焼きパン | `TRAVELER_HARDTACK` | 24 LUMI | HP+20 | 最大HP +5% | 休息 4 回 | `HARD_LOAF` |

- 薬草（16 LUMI・HP+30）より回復は少なく少し高い。バフは 1/20 だけ。必須の強さにしない。
- 1 種類 9 個まで（`BREAD_MAX_STACK`）。売れない（売値 0）。
- データ：`mugen-core/content/economy/breads.ts`（`BREAD_DEFS`・`BAKERY_OFFERS`）。`itemDefs.ts` に展開して同じカタログに入る。
- 型：`ItemCategory` に `FOOD`（表示「パン」）、`ItemDef.bread?: BreadSpec`（`buffType`・`buffValue`・`freshness`・`recipeId`、将来用に `ingredients`・`quality`・`baker`・`recipeLevel`。今は誰も読まない）。

## バフ

| 種類 | 戦闘での効果 |
|---|---|
| 防御 +5% | 受けるダメージ ×0.95（`playerDamageTaken`） |
| 最大HP +5% | 最大 HP ×1.05（増えた分は戦闘開始時に満たされる。戦闘後は通常の最大 HP の範囲で書き戻す） |
| 魔力 +5% | 最大 MP ×1.05（同上） |
| 素早さ +5% | **戦闘に効果なし**（戦闘に素早さ・行動順の数値がまだ無いため。表示と保存のみ） |

- 同時に 1 つだけ。新しく食べると上書き（重ねがけしない）。
- 持続：**次の休息まで**（休息でバフは消える）。
- 攻撃力は変えない。
- 計算：`mugen-core/core/economy/bread.ts` `breadInBattle`。App 戦闘（`src/ui/battle.tsx`）が戦闘開始時に適用。

## 期限

- 現実時間では減らない。**村で休息するたびに 1 減る**（`App.tsx` の休息 → `world.restBread()`）。
- 購入時に設定（2 または 4）。0 で食べられない（持ち物に【期限切れ】と表示、「食べる」ボタンなし）。
- 自動削除はしない。期限切れのパンは持ち物に残る（将来「処分する」を足せる構造）。
- 1 個ずつ年齢を持つ。食べるときは「期限が近い方」から。
- 保存：`breadFreshness` 行 = `{ itemId: [残り休息回数, …] }`。個数は持ち物（inventory）が唯一の正で、読むたびに持ち物と照合（`reconcileFreshness`）。知らないパンは新品扱い、持ち物から消えた分は古い方から忘れる。

## 食べる

- 持ち物 →「パン」棚 →「食べる」（`world.eatBread`）：前衛の HP 回復・バフ設定・1 個減・期限行 —— すべて 1 回の保存。
- HP 満タンでも食べられる（バフ目的）。回復量は 0。
- **フィールド専用**（`use.where: 'FIELD_ONLY'`）。戦闘中の道具欄には出さない（MVP。戦闘中に食べる処理は入れていない）。
- **AUTO は絶対にパンを食べない**（`autoHeal.ts` で `bread` を除外。そもそもフィールド専用なので戦闘では使えない）。
- 通常の「使う」経路（`useItemFromBag`）はパンを拒否する。

## パン屋の会話（切替）

- 切替 UI：[リナ][主人]。入店時は毎回リナ。入るたびに選ばせない。カウンター画面は作らず、既存の見た目のまま。
- **リナ**：「話す」「買う」「店を出る」。
  - 初回会話（作者の台詞 8 行）は世界で 1 回。最後まで読んだら `readMarks` に `talk:BAKERY_LINA_FIRST`。
  - 2 回目以降は短い 1 行を順番に。
  - 購入時：「まいどあり！」／ LUMI 不足：「あ……LUMIがちょっと足りないみたい。」／ 持ちきれない：「もう持ちきれないよ？」
- **主人**：「話す」「店を出る」。素材のヒントを順番に 1 行（下表）。セキリュウガ編の期間中は、ヒントの後に既存の噂 1 行。
- 2 人の会話は混ざらない。主人に名前を付けない（表示は「パン屋の主人」／切替は「主人」）。
- リナの年齢・人物設定は変更なし。ガルドへの言及なし。リナとガルドの進展なし。
- 以前の「主人とリナの紹介 4 行」（`BAKERY_SHOP_LINES`）は画面では使わなくなった（データとテストは残す）。

### 主人の素材ヒント

1. 木の実なら、グリーンウッドの森で見つかる。
2. 魔力を含んだ素材は、普通のパンとは相性が違う。
3. 硬焼きは、水を少なくしてじっくり焼くんだ。旅の腹持ちが違う。

## セーブ

- `SAVE_VERSION` は 3 のまま。新しい world_state 行を 2 つ追加（無ければ「パンなし・バフなし」として読む。壊れた行は修復して読む）：
  - `breadFreshness`：各パンの残り休息回数
  - `breadBuff`：`{ itemId, buffType, buffValue }` または null
- パンの個数は既存の `inventory`、LUMI は既存の `lumi`、リナの初回会話の既読は既存の `readMarks`。
- 購入（inventory・lumi・breadFreshness）／食べる（inventory・breadFreshness・breadBuff・party_condition）／休息（breadFreshness・breadBuff）はそれぞれ 1 コミット。
- 新しく始める（リセット）でパンの行も消える。

## やらないこと（MVP の範囲外）

料理・レシピ・クラフト・パン屋の成長・村の成長・WORLD LIFE ENGINE への接続・現実時間での腐敗・バフの重ねがけ・AUTO のパン使用・戦闘中に食べる。

## テスト

- core：`core/economy/bread.test.ts`（期限・照合・バフの読み直し・戦闘効果）、`core/world/breadState.test.ts`（購入・LUMI 不足・再読込・薬草は従来どおり・食べる・満タンでも食べられる・上書き・通常経路の拒否・休息・期限切れ・旧セーブ・壊れた行）、`content/economy/breads.test.ts`（4 種・価格・小ささ・フィールド専用・AUTO は食べない）、`content/dialogue/bakeryTalk.test.ts`（話し手・初回台詞・ガルド／将来に触れない・ヒントにネタバレなし）。
- e2e：`bread.spec.ts`（切替・購入・食べる・期限・640×300 / 844×390）、`bakery.spec.ts`（リナの初回会話、記録は既読 1 行だけ）、`sekiryuga.spec.ts`（主人に切り替えて噂）。
