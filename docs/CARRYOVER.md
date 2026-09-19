# 引き継ぎ事項 — APP ALPHA PHASE 2 / ROUND 8 時点

ROUND 6：**条件付き完了**
ROUND 7：**承認**（実機確認は作者側で未実施）
ROUND 8：Artifact の TIME SHIFT を開発専用へ退避
APP ALPHA PHASE 2：**継続**
App移行の最終完了判定：**保留**

記録時点のコミット: Round 8 時点で更新

> **この文書は HANDOFF MASTER ではない。**
> HANDOFF MASTER はリポジトリ外にある正式文書であり、本ファイルは
> その代わりではなく、ラウンド間で失われないようにするための
> **未解決事項の控え**である。両者が食い違った場合は
> HANDOFF MASTER が優先する。
>
> ここに書かれているのは「まだ決まっていないこと」と「まだ直して
> いないこと」だけで、**新しい設定・シナリオ・台詞は一切含まない**。
> 決定は作者が行う。

---

## 1. TIME SHIFT の再提示 — **Round 7 で廃止。対応不要**

正式CANONが「実際に3年進める」から
「3年後を一度だけ観測し、選択直後の現在へ帰還する」へ変更されたため、
「旅立つ／まだ残る」の選択自体が無くなり、再提示という概念が消滅した。
以下の旧記述は経緯として残す。

~~## 1（旧）TIME SHIFT の再提示が未実装~~

**状態**: 未実装。独断で実装しないよう指示済みのため、意図的に保留。

「まだ残る」を選ぶと、その周回では二度と演出に到達できない。
再提示先として「次のガルド関連の物語上の節目」が指定されたが、
**該当する節目が既存CANONに存在しない**ことが調査で判明している。

選択確定後のガルド関連のプレイヤー向けイベントは FUTURE_SITE 訪問
（`PLAYER_REUNITED_WITH_GALD` ほか）のみで、そのいずれもが
「既に時間が経過していること」を前提とする。中間イベント
（`GALD_LEAVES_BANDITS` 等）は世界の真実のみで、設計上プレイヤーには
見えない。

**閉じるために必要なもの**: 再提示を行う具体的なイベントと発生条件の決定。
調査時に挙げた候補（いずれも作者判断が必要）:

| 候補 | 内容 | 懸念 |
|---|---|---|
| (a) | 森での次の戦闘勝利時 | ガルド関連の節目ではない |
| (b) | 通常経過でN日到達時に一度だけ | N の定義が必要 |
| (c) | 通常経過で FUTURE_SITE が開いた時点 | その時点でシフトの意味が失われる |
| (d) | 新しい中間イベントを定義する | **要承認**。独断追加は禁止 |

**REQUIRED_CANON_DECISION**: 上記のどれか、または別案。

**補足（重要）**: 断っても詰まない。93日の休息で後日譚に到達できることは
e2e で保証されており（`packages/mugen-app/e2e/memory.spec.ts` の
「going to the place is what turns his life into something known」）、
「TIME SHIFT を使わなければ到達できない」仕様にはなっていない。
失われるのは演出そのものだけ。

## 2. 提示中にアプリを閉じると演出に戻れない — **Round 7 で解決**

新仕様の未来観測は、観測完了を `experience_seen`（既存キー）に
`evt_kaos_future_vision` として記録する。観測を閉じずに終了した場合は
未完了のまま残り、CONTINUE で観測から再開する。ガルド4択は
先に確定・保存済みなので再実行されない。SAVE schema 変更なし。

~~## 2（旧）提示中にアプリを閉じると演出に戻れない~~

**状態**: 未対応。1 と同根。

`resumeAreaOf('TIME_SHIFT') === 'HOME'`（`core/world/world.ts`）のため、
提示画面を表示中に終了すると再開時は村に戻り、再提示が無いため
演出は失われる。

**閉じるために必要なもの**: 1 の再提示条件が決まれば同時に解決しうる。
単独で解決する場合は「提示が未応答のまま中断された」ことを
どこに持つかの判断が要る（新しい SAVE キーを増やすか、
既存の世界状態から導出するか）。

**REQUIRED_CANON_DECISION**: 1 と併せて判断。SAVE schema を増やすかどうかを含む。

## 3. Artifact 側の自由使用 TIME SHIFT ボタン — **Round 8 で解決**

通常プレイからの到達経路を廃止し、開発専用へ退避した。

- `HomeScreen.tsx` の `time-shift-button` と `onTimeShift` prop を削除。
  村の画面に「旅立つ」は無い。
- `TIME_SHIFT` 画面への入口は DEV ADMIN の
  `open-time-shift`（「TIME SHIFT +3年（開発用・実際に世界時間が進みます）」）
  のみ。出口も DEV ADMIN（「変化した場所を探す」は従来どおり地図へ）。
- `App.tsx` の `case 'TIME_SHIFT'` に `DEV_ADMIN_ENABLED` ガードを追加。
  フラグの無いビルドでは、どうやって遷移させても画面が存在しない。
  Android の通常プレイ用ビルドはこのフラグを立てないため、
  DEV_ADMIN も開発用 TIME SHIFT も到達不能。
- `TimeShiftScreen.tsx` は無変更。「旅立つ／まだ残る」の選択も、
  初回案内も、そのまま残っている（削除・改変しないという指示による）。
- App 側の FUTURE VISION（Round 7）は `TIME_SHIFT` 画面IDを共有するが、
  別実装であり世界時間を進めない。フロー表 `HOME -> TIME_SHIFT` は
  そのために残している。Artifact 側からは何も遷移しない。

~~## 3（旧）Artifact 側の自由使用 TIME SHIFT ボタンが正式CANONと矛盾~~

`HomeScreen.tsx:251` の `time-shift-button`（`App.tsx:650` で
`flow.goTo('TIME_SHIFT')` に接続）から `TIME_SHIFT` 画面へ遷移でき、
3年・回数無制限で実行できた。
「ケイオスが最初のガルド関連イベントで一度だけ使用する物語上の
特殊演出」という正式CANONと矛盾していた。

## 4. `magic.spec.ts:163` の既知の不安定性

**状態**: 未修正。製品コードもテストも変更していない。

`packages/mugen-artifact/e2e/magic.spec.ts:163`
「the big one costs more, hits harder, and is still one turn」が
フルスイート実行時に断続的に失敗する（Expected 9 / Received 12）。
テスト自身のコメントに
「nine came back as twelve. Nothing about the fight was wrong.
The stopwatch was.」と、この現象が負荷起因の測定ずれとして
記録されている。12 は通常攻撃（8〜12）の値。

Round 6 では **Artifact のビルドが Round 5 とバイト単位で同一**
（16,264,429 bytes）であり、差分は `packages/mugen-app/` のみ。
同一プログラムで結果が割れているため、変更起因ではない。

**閉じるために必要なもの**: テスト側の `settled()` の強化。
製品コードは触らない。

**注意**: 過去に一度、この症状を「flake」と誤って報告した実例がある
（Round 3）。そのときは実際には Round 1 で混入した
per-render のオブジェクト同一性の破壊が原因で、Round 3 で修正済み
（`content/art/index.ts` のキャッシュ）。同種の症状が出た場合は、
**変更前コミットとの比較測定を行ってから**判断すること。

## 5. HANDOFF MASTER がリポジトリ内に存在しない

**状態**: 未解決。事実の記録のみ。

`*handoff*` での全文検索で該当なし。各ラウンドの指示書が
「HANDOFF MASTER と照合すること」を求めているが、リポジトリ内からは
参照できないため、実装時の参照基準はコード内の既存CANON
（フロー表・イベント定義・content の文言・時間設計）としている。

**閉じるために必要なもの**: HANDOFF MASTER をリポジトリに置くか、
参照すべき箇所を都度提示するかの判断。

---

# Round 7 で新たに記録した事項

## 6. NPC の age は進むが lifePhase は進まない

`timeShift` は生存キャラの `age` を加算するが、`lifePhase` を更新する
処理はコード中のどこにも存在しない。リナは `age: 14 / lifePhase: 'CHILD'`
で、3年経過すると **17歳のまま CHILD** になる。
`LifePhase` には `YOUNG_ADULT` があるため、年齢と段階が食い違う。

**REQUIRED_CANON_DECISION**: 年齢と人生段階の境界。
17歳＝ADULT のような規則を独断で採用しない。

**現状の実害**: なし。新しい未来観測は世界時間を進めないため、
本編でリナが歳を取る経路が現在は存在しない。通常の `advanceDay` でも
`age` は進まない（加齢は `timeShift` のみ）ので、通常プレイでは
不一致は発生しない。Round 8 で Artifact のボタンも開発専用になったため、
起こりうるのは開発ビルドの中だけになった。

## 7. core は2回目以降の `timeShift` を拒否しない

`timeShift` は「実行中の再入」だけを防ぎ、「既に実行済みか」は見ない。
イベントIDが到達先を含む（`evt_world_time_shifted_y4d1`）ため、
2回目は別IDになり素通りする。実測で Y1 → Y4 → Y7。

Artifact の繰り返し可能なボタンにとっては正しい挙動。
App の未来観測は `world.timeShift()` を使わないため影響を受けない。

**Round 8 の判断**: core の `timeShift` は変更しなかった。
繰り返し実行できることは開発ツールとしては正しい挙動であり、
WORLD LIFE ENGINE と共用の時間処理に全面禁止を入れないよう
指示されているため。到達経路を DEV 専用にしたことで、
通常プレイで2回目が起こる経路そのものが無い。

**未解決として残る点**: 開発ビルドの中では今も無制限に実行できる。
禁止するとすれば core ではなく呼び出し側の判断になる。

## 8. Artifact の TIME SHIFT 依存範囲 — **Round 8 で処理済み**

項目3の作業実績。Round 7 の見積もりどおり e2e が広く依存していた。

| 箇所 | Round 8 での扱い |
|---|---|
| `HomeScreen.tsx` の `time-shift-button` | 削除 |
| `App.tsx` の `TIME_SHIFT` 画面 | `DEV_ADMIN_ENABLED` ガード追加、出口を DEV ADMIN へ |
| `DevAdminScreen.tsx` | `open-time-shift` を新設（唯一の入口） |
| `TimeShiftScreen.tsx`（180行） | 無変更 |
| `WorldMemoryScreen.tsx:51` | 無変更（過去のシフト記録は今も読める） |
| `dev/qaSnapshot.ts:64` | 無変更 |
| **e2e 9ファイル・50箇所** | ヘルパー3本（`openDevTimeShift` / `devTimeShiftGo` / `devTimeShift`）に集約し、DEV 経路へ張り替え |

「93日以上の休息」への置き換えは行っていない。テストが確かめている
のは「3年経った世界の真実」であって到達手段ではないため、
同じ画面を DEV 経路から動かすほうが検証内容を保てる。

`navigation.spec.ts` の初回案内テストだけは検証対象そのものが
通常プレイから消えたため、「通常UIから到達できない」ことを確かめる
テストへ置き換えたうえで、案内の内容そのものは DEV 経路で
引き続き検証している（差引きでテストは1本増）。
