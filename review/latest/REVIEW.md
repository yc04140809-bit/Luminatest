# MUGEN REVIEW PACKAGE — モスラビット — 森の最初の通常敵

- Generated: 2026-09-03T23:37:23.106Z
- Commit: 5b39dd0 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: 5b39dd0
- Verdict: SOMETHING FAILED — see 5

## 1. 実装前 → 実装後の変更点

**探索画面の見た目は無変更です。** 背景・主人公・ケイオスちゃん・金色リング・
UIには一切触れていません。変わったのは「BATTLEを引いたとき何と戦うか」から先です。

- **添付画像をそのまま使用**。`moss-rabbit.png` は受け取ったファイルと
  **バイト単位で同一**です。**アルファチャンネルはあります**（画素の74.8%が完全透明）。
  切り抜き・縮小・色変更・再生成はしていません。
- **モスラビットは「種族」です。** 1体倒しても、殺しても、森からモスラビットは
  いなくなりません。通常の勝利は WORLD MEMORY に**何も書きません**。
- **まれに、その1体が「誰か」になります。** そのときだけ `moss_rabbit_001` の
  ような個体IDが発行され、KILL / SPARE / HELP / CAPTURE の4択が出て、
  選んだ結果が WORLD MEMORY に残ります。
- **確率は 10 / 15 / 25 / 40 / 60%**（特殊個体なしの連続回数で上昇）。
  さらに**8連続で必ず発生**する天井があります。20回戦って一度も出ない事故は
  起きません。プレイヤーには確率を表示しません。
- **リーフタックル**：身を沈めて突進し、葉が散って戻る。
  **苔かくれ**：身を丸め、緑の輪が閉じ、2発ぶんダメージが半分になる。
  **白フェードは使っていません。** 森の背景画像にも触れていません。
- **苔かくれで戦闘が止まらないようにしてあります**：重ねがけ不可、
  クールダウン3ターン、1戦につき最大2回。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-03T23:37:22.948Z / viewport 390x844

- `review/latest/01_greenwood_forest.png` — GREENWOOD / BATTLE：主人公とケイオスちゃんが二人の人物に見えるか。発見の気配が世界に馴染んでいるか
- `review/latest/02_greenwood_walking_side.png` — GREENWOOD / BATTLE：横に歩いたときに向きが変わるか。足元がタップ地点に来ているか。ケイオスちゃんが道をなぞって付いてくるか
- `review/latest/03_greenwood_found_item.png` — GREENWOOD / BATTLE：アイテム発見カード。森の上で読めるか、文字が画面外に出ていないか
- `review/latest/04_greenwood_forest_event.png` — GREENWOOD / BATTLE：森の小さな出来事。世界を映したまま会話できているか（白いveilを被せていないか）
- `review/latest/05_moss_rabbit_battle.png` — GREENWOOD / BATTLE：モスラビットの絵が正しく出ているか。名前・HP・行動が読めるか
- `review/latest/06_moss_rabbit_life_choice.png` — GREENWOOD / BATTLE：特殊個体の4択。どれかが「正解」に見えていないか。文字が画面外へ出ていないか

撮影していない画面（変更なし。テスト結果で報告）:
- HOME — v0.2 で承認済み
- TAVERN / TALK — シーンアート修正版のまま
- TITLE — v0.1 のまま
- PROLOGUE / KAOS — v0.1 のまま
- EXPLORE — v0.1 のまま
- WORLD MEMORY — v0.1 のまま
- LIFE CHOICE / ENDING — v0.1 のまま
- PLAYTEST SURVEY — v0.1 のまま
- DEV REVIEW HUB — v0.1 のまま

## 3. 新規機能の動作確認結果

- 360 / 390 / 412px で、遭遇・苔かくれ・撃破・特殊個体シーン・4択・
  選択後・森への復帰まで撮影して確認。
- E2E で「通常個体では何も記録されない」「特殊個体では記録される」
  「殺しても次のモスラビットが出る」を検証。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-03T23:37:22.538Z
- Build: MUGEN ZERO v0.1 / 5b39dd0 / 2026-09-03T23:36:32.896Z
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

新規：モスラビットの種族定義・特殊個体抽選と天井・4択画面。
変更：戦闘ロジック（敵ごとの数値とスキル）、戦闘画面（絵と2つの技）、
World（撃破カウントと個体台帳）、WORLD MEMORY型（生き物用の4種）、
画面遷移。**ガルド戦のコードパスは数値も文言も無変更です。**

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  337 passed (337) |
| E2E (playwright) | PASS | 116 passed (8.8m) — 前ラウンドの仮敵を参照していた1件を新しい敵に合わせて更新 |
| Build (tsc -b && vite build) | PASS | ✓ built in 5.98s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-BnMFo8CD.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-0SElQ8js.js                  41.37 kB │ gzip:  13.85 kB
dist/assets/index-DLeXj6Wj.js                          129.28 kB │ gzip:  39.01 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen-d_fn4e8Q.js              1,500.88 kB │ gzip: 346.83 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB追加あり（後方互換）。** `enemy_progress` と `enemy_individuals` の
2キーを world_state に足しました。**既存セーブでは単に存在せず、
「まだ何もしていない」として読まれます。** MEMORY_EVENT の型は4つ増えましたが、
既存イベントの形式・IDは無変更です。

## 8. Save compatibility

**セーブ互換：既存セーブはそのまま読めます。** 逆に、この版で作った
セーブを古い版で開くと生き物のイベントがラベル未定義になります（前進のみ互換）。

## 9. 既知の問題

1. 【新規】**再会イベントは未実装**です。逃がした／助けた／連れて行った個体は
   `reunionAvailable: true` で記録されますが、数年後に会う本編はまだありません。
   構造だけ用意してあります。
2. 【新規】**CAPTURE しても連れ歩きません。** 「連れて行く」を選ぶと世界は
   そう記録しますが、探索画面に姿は出ません。記録と表現がまだ噛み合っていません。
3. 【新規】**倒れた姿の差分絵がありません。** 撃破後も同じ絵のままです。
4. 【新規】前ラウンドの仮敵「はぐれ狼」（絵文字プレースホルダー）は**削除**しました。
   森の通常敵はモスラビット1種です。
5. 【継続】`phaseD` の負荷依存フレーク。盗賊ガルドの立ち絵：右脚欠け。

## 10. Claude 自身が気になる箇所

- **「種族」と「個体」を分けたのが今回の骨格です。** ここを混ぜると、
  モスラビットを1体殺した瞬間に森からモスラビットが消えるか、
  逆にどの1体も特別でなくなるかのどちらかになります。
  通常の勝利は世界に何も書かない、という判断が全部を決めました。
- **確率に天井を付けたのは、これが「ガチャ」ではないからです。**
  レートは見せませんし、通貨もありません。運が悪いだけで
  「特別な出会い」に一度も届かない人が出ないように、8連続で確定にしてあります。
- **HELPをSPAREと別物にするために、理由を1つだけ作りました。**
  後ろ足に古い蔓が絡んでいる。これがないと「逃がす」と「助ける」が同じ意味になり、
  4択が2択になります。説教はしていません。何があるかだけ書いてあります。
- **敵の技は絵ではなく動きで作りました。** 新規アニメ画像はありません。
  1枚の絵の位置・拡大・短いモーションと、葉のparticleだけです。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（モスラビット）。**

次の敵、再会イベント本編、CAPTURE同行表示へは進みません。
