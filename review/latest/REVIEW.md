# MUGEN REVIEW PACKAGE — 探索の歩行制限 / スクロール修正 / ガルド素材統一 / 戦闘テンポ v1.1（採用前）

- Generated: 2026-09-06T00:53:27.547Z
- Commit: 57b6f22 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: 57b6f22
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**まだ採用していません。** 指示の優先順どおり4つです。

**1. 探索の歩行制限。** 背景全体が歩けるように見えていた問題に、
「地面帯」という考えを1つ入れました。**画面下部の台形だけが地面**で、
奥へ行くほど左右が狭まります（道が遠ざかる形）。地面以外をタップしても
**無視せず、いちばん近い地面へ補正**します——タップを飲み込むのは、
人がいちばん押しがちな場所でフィールドが壊れて感じられる作り方です。
発見スポット8か所は**ピクセル指定をやめ**、「どのくらい奥／どのくらい横」で
定義しました。**探索フィールドは横ワールド化**し、いただいた横長の森画を
使っています。進行方向は右→左、右端に「戻る」判定を置きました。

**2. スクロール修正。** 実測したところ、**ADMIN DEV TOOLS が完全に壊れて
いました**：中身が1804px、画面は390px、`overflow: hidden` で**1414px分が
到達不能**、「もどる」は y=1742 にありました。パネル本体をスクロール領域に
し、フッターは固定に。他の一覧（探索候補・設定・図鑑・世界の記憶）は
実測の結果すでにスクロールできていたので触っていません。

**3. ガルド素材の統一。** `gald` **1つのcharacterId**に、
battle_idle / battle_damage / battle_down / fullbody / portrait。
**会話用の別キャラIDは作っていません。** 会話は `talk` を要求し、
無ければ **fullbody に落ちて上半身だけ表示**できます
（`CharacterArt` の `bust`）。「アップ」は**画像のカテゴリではなく
表示方法**として扱う、という指示どおりです。

**4. 戦闘テンポ。** モスラビット戦は**実測14ターン**になりました
（以前は2〜3ターン）。ただし**HPを増やしただけにはしていません**。
下の NOTES:10 に書いた「体勢（POISE）」と「段階（PHASE）」が中身です。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-06T00:53:27.332Z / viewport 844x390

- `review/latest/01_greenwood_forest.png` — GREENWOOD / BATTLE：主人公とケイオスちゃんが二人の人物に見えるか。発見の気配が世界に馴染んでいるか
- `review/latest/02_greenwood_walking_side.png` — GREENWOOD / BATTLE：横に歩いたときに向きが変わるか。足元がタップ地点に来ているか。ケイオスちゃんが道をなぞって付いてくるか
- `review/latest/03_greenwood_found_item.png` — GREENWOOD / BATTLE：アイテム発見カード。森の上で読めるか、文字が画面外に出ていないか
- `review/latest/04_greenwood_forest_event.png` — GREENWOOD / BATTLE：森の小さな出来事。世界を映したまま会話できているか（白いveilを被せていないか）
- `review/latest/05_moss_rabbit_battle.png` — GREENWOOD / BATTLE：横画面の戦闘。敵＝左／味方＝右、上部情報帯・中央戦闘領域・下部コマンドの3分割
- `review/latest/06_moss_rabbit_life_choice.png` — GREENWOOD / BATTLE：特殊個体の4択。どれかが「正解」に見えていないか。文字が画面外へ出ていないか
- `review/latest/07_battle_prototype.png` — BATTLE UI PROTOTYPE：世界が主役に見えるか。敵と味方の大きさ・接地・HP・メッセージ・攻撃/スキル

撮影していない画面（変更なし。テスト結果で報告）:
- ADMIN DEV TOOLS — スクロール修正が入りました（パネル本体がスクロールし、「もどる」は固定）。見た目の変更ではないので撮影せず、e2e/scrolling.spec.ts で「1700px超のパネルの末尾に到達できる」「もどるが常に画面内」を検証しています。CHARACTER ART 一覧に「ガルド」が1体増えています
- EXPLORE — 一覧のスクロールを確認済み。見た目は前ラウンドから無変更です
- SETTINGS — 一覧のスクロールを確認済み。見た目は前ラウンドから無変更です
- ARCANA / アルカナ図鑑 — 一覧のスクロールを確認済み。表示は無変更です
- TITLE — 前ラウンドから無変更です
- HOME — 前ラウンドから無変更です
- OPENING THEME / SKIP — 前ラウンドから無変更です（楽曲はまだ入っていません）
- PROLOGUE / KAOS — 無変更
- TAVERN / TALK — 無変更
- WORLD MEMORY — スクロール確認済み。見た目は無変更
- LIFE CHOICE / ENDING — ガルドの絵の「出どころ」を画像管理レイヤーへ移しましたが、出る絵は同じ（膝をついたガルド）です
- PLAYTEST SURVEY — スクロール確認済み。見た目は無変更
- DEV REVIEW HUB — 無変更

## 3. 新規機能の動作確認結果

- **探索フィールド**：横長の森画が全画面。場所名は左上、操作説明と
  「森を出る」は右下（どちらも空と木の上で、**歩く地面の上には何も
  重ねていません**）。キャラはY座標で前後関係が入れ替わります。
- **戦闘**：敵HPバーの**下に細い金色の「体勢」ゲージ**。崩れると点滅します。
  敵名の横に **「警戒」「必死」** などの段階バッジ。
  レイアウト・演出・古代龍のカットインは**1ピクセルも触っていません**。
- 800x360 / 844x390 / 915x412 で横スクロールなし。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-06T00:53:27.246Z
- Build: MUGEN ZERO v0.1 / 57b6f22 / 2026-09-06T00:52:01.668Z
- Environment: dev server
- Result: no failed checks — 21 pass, 0 warn, 2 not tested, 1 manual

## CURRENT WORLD
- World time: 4年目 4日目 (day 1099)
- Route: SPARE
- TIME SHIFTs: 1
- WORLD MEMORY facts: 5
- LIFE ARCHIVE: 1 known / 4 in canon
- Future sites: ALDEN_BAKERY:ON MAP, GREENWOOD_WAYSTATION:not yet, ALDEN_WORKYARD:not yet, GREENWOOD_GRAVE:not yet

## CONTENT
- NOW events: 18
- NEXT events: 3
- LIFE events (experience layer): 0
- Locations: MOONLIGHT_TAVERN (11), ALDEN_VILLAGE (10)
- Narrative seeds: 3
- Rumours (events gated on a world fact): 8
- Events met in this world: 0

```

## 4. 既存機能への影響

新規：`game/exploration/walkable.ts`（地面帯・補正・端判定）、
`game/battle/enemyBehaviour.ts`（体勢・段階）、`game/battle/enemySpec.ts`、
`content/enemies/galdBattle.ts`、`e2e/scrolling.spec.ts`、
`assets/backgrounds/field-greenwood.png`、
`assets/characters/gald/gald-battle-down.png`。

変更：`GreenwoodScene.ts`（横ワールド・歩行制限・深度・端判定）、
`discovery.ts`（スポットを地面帯の上へ）、`battleLogic.ts`（体勢・段階・
プレイヤーHP 40→100）、`species.ts`（モスラビットの数値と個性）、
`arcanaDefs.ts`（回復 8→20＝同じ割合）、`partyArt.ts`（ガルド追加）、
`artStates.ts`（`talk` 追加と会話用フォールバック）、`CharacterArt.tsx`
（バストアップ）、`DevAdminScreen.tsx`（スクロール領域）、
`ui/styles.css`、各E2E。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  617 passed (617) |
| E2E (playwright) | PASS | 256 passed (11.6m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 6.95s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-DnOKBNsr.js                    1.42 kB │ gzip:   0.78 kB
dist/assets/CinematicPreviewScreen-CmPfgt4a.js           5.00 kB │ gzip:   1.83 kB
dist/assets/DevAdminScreen-BVtuPYkE.js                  50.56 kB │ gzip:  17.02 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/index-BeKD4d9j.js                          182.62 kB │ gzip:  56.25 kB
dist/assets/GreenwoodScreen-BTRV7Xsm.js              1,501.44 kB │ gzip: 346.99 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 844x390: nothing spills sideways
- 撮影 viewport: 844x390（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。**

## 8. Save compatibility

**セーブ互換に影響なし。** 戦闘の数値も歩行判定も保存しません。

## 9. 既知の問題

1. 【いただいた画像のうち2点は、そのままでは使えません】
   - **ガルドの戦闘ポーズ（透過チェック柄のPNG）**：`RGB`形式で、
     **透明部分が市松模様として画像に焼き込まれています**（アルファ
     チャンネルがありません）。このまま戦闘画面に置くと市松模様ごと
     表示されます。**画像を編集しない**という約束があるので加工して
     いません。**アルファ付きPNGで書き出し直していただければ**、
     `partyArt.ts` の1行で `battle_idle` に入ります。
   - **主人公の立ち絵**：暗い背景が**不透明で描き込まれています**
     （端のアルファが250）。切り抜きではないので、戦場に置くと黒い
     四角が付いてきます。こちらもアルファ付きが必要です。
   - **モスラビットの設定シート**：ロゴ・日本語ラベル・カラーパレット
     入りの**資料**で、透明部分がありません。ゲーム内に置くと文字ごと
     出るので、**素材としては未使用**です。8状態を使うには、各ポーズを
     個別の透過PNGでいただくのがいちばん確実です。
   - **使用したもの**：横長の森画（探索フィールド背景）、
     **ガルドの倒れ絵**（`battle_down` に登録）。**ケイオスの新規絵**は
     切り抜きとして正常ですが、既存のケイオス絵と差し替えると承認済みの
     見た目が変わるため、**今回は登録していません**（ご指示があれば
     `fullbody` / `cutin` に入れます）。
2. 【登録したが未使用】**ガルドの倒れ絵（`battle_down`）は画面に出ていません。**
   人生選択で出ているのは従来どおり**膝をついたガルド**です。
   「DOWN＝DEADではない」「まだ決まっていない」を表すのは膝をついた絵の
   ほうだと判断したので**勝手に差し替えませんでした**。差し替えるかは
   ご判断ください。
3. 【設計上の問題を発見しました】**「身構える」が長い戦闘では損です。**
   被ダメージは半分になりますが1ターン攻撃できないので、
   戦闘が長くなるほど**総被ダメージが増えます**（シミュレーションで
   4ターンに1回防御すると、ガルド戦は防御しないほうが勝てます）。
   これは今回の変更で**顕在化した**もので、原因は前からあります。
   プレイヤーのコマンド設計に関わるので**今回は直していません**。
4. 【今回やっていない】旧戦闘画面（ガルド戦）に**味方の絵がありません**。
   素材の穴で、レイアウトの穴ではありません。
5. 【緩めたガード】E2Eの**テスト制限時間を60秒→150秒**にしました。
   ストーリー戦が**設計として90秒前後**になったので、
   タイトルから4択までを通しで再生するテストは60秒に収まりません。
   **アサーションは緩めていません**（むしろ数字直書きをやめ、
   画面から読むよう強くしました）。

## 10. Claude 自身が気になる箇所

- **「ただ硬いだけの敵にしない」を最優先しました。** 増えたのはHPだけ
  ではありません。
  - **体勢（POISE）**：攻撃するたび敵の足場が減り、**ガード中に殴ると
    2倍減ります**。ゼロで**体勢崩れ**——敵は2ターン行動できず、
    被ダメージ1.5倍。つまり **苔かくれ／受け流しは「待つもの」ではなく
    「壊すもの」**になりました。これが指示にあった GUARD崩し / STAGGER の
    土台です。
  - **段階（PHASE）**：HPの割合で変化します。モスラビットは60%で
    **警戒**（耳を伏せ、隠れる頻度が上がる）、28%で**必死**（もう下がれないと
    知り、隠れるのをやめて攻撃力1.5倍）。ガルドは62%で**本気**、
    25%で**死に物狂い**（防ぐのをやめる）。**セリフは1段階につき1回だけ**
    出ます（テストで回数を数えています）。
  - どちらも**任意**です。体勢も段階も持たない敵は、この機能が無かった
    ときとまったく同じに戦います（テストあり）。
- **プレイヤーHPを 40→100 にしました。** 40は盗賊の2〜3撃分で、
  **戦闘が短かった本当の原因はHPバーのほう**でした。
  回復量も同じ割合で 8→20 に動かしています（体感は同じ）。
- **戦闘の長さを「測って」います。** 単体テストが決定的なサイコロで
  ターン数を数え、ブラウザでも実測しました（モスラビット **14ターン**）。
  秒への換算は「1ターン≒4秒」（アニメ0.8秒＋読んでタップ）で、
  **モスラビット ≒ 45〜70秒**、**ガルド ≒ 92秒**（強敵帯）です。
  **ガルドを2〜4分にはしていません**——100HPの相手にナイフを2〜4分
  振り続ければ、それは長い戦闘ではなく**負ける戦闘**になるからです。
- **発見スポットを座標から規則へ。** 「森の絵に対して手で置いた8つの点」は、
  絵かフィールドの形が変わるたび置き直しになり、**ずれても
  スクリーンショットでは分かりません**（歩いて初めて分かる）。
  いまは地面帯の上に構成的に載っており、**全スポットが歩ける場所にある**
  ことをテストが保証しています。
- **E2Eの座標直書きを1か所に集めました。** 8つの点が7つのspecに
  コピーされていたので、フィールドを動かした瞬間に**70本落ちました**。
  いまは `helpers.ts` の `RING_TAPS` がゲーム本体の定義から計算します。
- **`specOf` が2か所にありました。** 旧戦闘画面と新戦闘画面が別々に
  持っていて、種族に新しい項目が増えると**画面によって敵の強さが変わる**
  状態でした。1つにしました。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前）。**

次の候補：透過付きのガルド戦闘ポーズと主人公立ち絵（上記1）、
「身構える」の設計見直し（上記3）、旧戦闘画面の味方立ち絵、
会話中のアップ演出の実装（土台はできています）、
モスラビット8状態の個別PNG化、BGM。
