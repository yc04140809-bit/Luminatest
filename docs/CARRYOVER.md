# 引き継ぎ事項 — APP ALPHA PHASE 2 / ROUND 6 時点

ROUND 6：**条件付き完了**
APP ALPHA PHASE 2：**継続**
App移行の最終完了判定：**保留**

記録時点のコミット: `25e28bb`

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

## 1. TIME SHIFT の再提示が未実装 — 次ラウンド優先

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

## 2. 提示中にアプリを閉じると演出に戻れない — 次ラウンド優先

**状態**: 未対応。1 と同根。

`resumeAreaOf('TIME_SHIFT') === 'HOME'`（`core/world/world.ts`）のため、
提示画面を表示中に終了すると再開時は村に戻り、再提示が無いため
演出は失われる。

**閉じるために必要なもの**: 1 の再提示条件が決まれば同時に解決しうる。
単独で解決する場合は「提示が未応答のまま中断された」ことを
どこに持つかの判断が要る（新しい SAVE キーを増やすか、
既存の世界状態から導出するか）。

**REQUIRED_CANON_DECISION**: 1 と併せて判断。SAVE schema を増やすかどうかを含む。

## 3. Artifact 側の自由使用 TIME SHIFT ボタンが正式CANONと矛盾

**状態**: 現状維持（暫定措置）。**正式仕様として扱わないこと。**

`HomeScreen.tsx:251` の `time-shift-button`（`App.tsx:650` で
`flow.goTo('TIME_SHIFT')` に接続）から `TIME_SHIFT` 画面へ遷移でき、
3年・回数無制限で実行できる。`TimeShiftScreen.tsx` の冒頭コメントには
「TIME SHIFT never happens automatically — the player decides.」と
明記されており、これは
「ケイオスが最初のガルド関連イベントで一度だけ使用する物語上の
特殊演出」という正式CANONと矛盾する。

Round 6 では実装範囲を限定するため Artifact に手を触れていない
（Artifact のビルドは Round 5 とバイト単位で同一）。

**閉じるために必要なもの**: 削除か仕様変更かの決定。
**App移行の最終完了判定の前に整合を取る必要がある。**

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
