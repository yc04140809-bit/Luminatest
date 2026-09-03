# MUGEN REVIEW PACKAGE — PLAYTEST READINESS — 第三者テスト準備（機能追加なし）

- Generated: 2026-09-03T11:08:15.275Z
- Commit: fb6cf39 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: fb6cf39
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**このラウンドでコードの挙動は変えていません。** Director の重み、
CHARACTER_REPEAT、イベント選択のルールはすべて `fb6cf39` のまま固定です。

やったことは「実プレイで何が起きたかを記録できる状態にする」ことだけ:

- **アンケートに第3ラウンドの設問を追加**（PAGE 5・6）。
  再会に意味を感じたか（5段階）＋ 5つの「どの瞬間か」自由記述。
  既存の設問・保存形式・集計は無変更。追加フィールドはすべて optional。
- **DEV REVIEW HUB に PLAYTEST OBSERVATION を追加**。
  テスターには答えられない2項目（CHARACTER_REPEAT / Director 選択）を
  観察者が書き留め、その時点の Director の判断ごとコピーできる。
- **アンケート送信後に「回答をコピーする」を追加**（後述の理由により）。
- `npm run review` の typecheck を `tsc -b --force` に修正
  （`tsc --noEmit` はこのリポジトリの solution tsconfig では何も検査しない）。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-03T11:08:15.114Z / viewport 390x844

- `review/latest/01_survey_core_questions.png` — PLAYTEST SURVEY：第3ラウンドの新しい設問ページ。スマホで長すぎないか、入力欄が押せるか
- `review/latest/02_dev_review_hub_observation.png` — DEV REVIEW HUB：観察者用メモ欄。スマホで入力できるか、COPY が押せるか
- `review/latest/03_dev_review_hub_qa_report.png` — DEV REVIEW HUB：GENERATE 後のレポート表示。長文が枠内で折り返されているか
- `review/latest/04_director_decision_log.png` — DEV REVIEW HUB：EXPERIENCE DIRECTOR の判断根拠が実際に読めるか

撮影していない画面（変更なし。テスト結果で報告）:
- TITLE — untouched since the key visual
- PROLOGUE / KAOS — untouched
- HOME — untouched
- EXPLORE — untouched
- TAVERN / TALK — untouched — event order changed, layout did not
- GREENWOOD / BATTLE — untouched
- LIFE CHOICE / ENDING — untouched

## 3. 新規機能の動作確認結果

- **アンケート**: 全6ページ。新設問は 1つの5段階評価と5つの自由記述で、
  自由記述は全て空欄で送信可能。360 / 390 / 412px で横スクロールなしを E2E で確認。
- **観察メモ**: HUB 内の折りたたみセクション。入力は localStorage に退避し、
  リロードしても消えない。COPY でメモ＋その時点の Director 判断が1つのテキストになる。
  QA REPORT には混入しない（E2E で確認済み）。
- **回答の持ち出し**: 送信完了画面で全回答をテキスト化してコピーできる。
  クリップボードが使えない環境では同じ文章が画面に出る。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-03T11:08:14.700Z
- Build: MUGEN ZERO v0.1 / fb6cf39 / 2026-09-03T11:07:54.859Z
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
- Events met in this world: 1

```

## 4. 既存機能への影響

既存機能への影響なし。ゲーム内の挙動・レイアウト・セーブ・4ルート・
TIME SHIFT・LIFE ARCHIVE・EVENT ENGINE・EXPERIENCE DIRECTOR はいずれも無変更。

既存 E2E で更新が必要だったのは、アンケートのページ数が 4 → 6 になったことに
伴う手順とページ表示の期待値のみ。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  273 passed (273) |
| E2E (playwright) | PASS | 104 passed (7.3m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 7.14s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-DhX7wewo.js                    1.31 kB │ gzip:   0.76 kB
dist/assets/DevAdminScreen-7aiWUzVC.js                  38.95 kB │ gzip:  13.07 kB
dist/assets/index-sinMmR1Q.js                          112.11 kB │ gzip:  33.51 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen-DxnR4dYz.js              1,485.94 kB │ gzip: 341.76 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。** PlaytestFeedback に optional フィールドを6つ追加しただけで、
store も index も version も変わっていない。第2ラウンドで確立した手順と同じ。
観察メモは IndexedDB ではなく localStorage（開発者用の走り書きであり、
フィードバックでも正史でもないため、スキーマを持たせない）。

## 8. Save compatibility

**既存セーブ・既存回答は壊れない。** 第1・第2ラウンドに保存された回答は
新フィールドを持たないまま読み戻せ、CSV では空欄として書き出される
（unit テストで固定）。

## 9. 既知の問題

1. **回答はテスターの端末から自動では戻ってこない。** サーバーが無いため、
   「回答をコピーする」で本人に送ってもらうのが唯一の経路。
2. **共有ビルド（artifact）ではファイルのダウンロードが動かない。**
   DEV ADMIN の CSV 書き出しは、ローカル or 手元の端末でのみ有効。
3. 前ラウンドからの継続: LIFE layer のイベントは 0 件、seed の回収イベントは未実装、
   GreenwoodScreen チャンク 1.49 MB。
4. VISUAL CHANGES 宣言は手動のまま。

## 10. Claude 自身が気になる箇所

- **`npm run review` の typecheck が今まで何も検査していなかった。**
  `tsc --noEmit` はこのリポジトリの solution tsconfig（`files: []`）では
  即座に成功する。ビルド（`tsc -b`）が毎回通っていたので型安全は保たれていたが、
  レビュー表の1行は無意味だった。今回 `tsc -b --force` に直した。
- **テストファイルは型検査の対象外**（tsconfig.app.json が除外）。
  今回 SurveyAnswers に必須フィールドを足したとき、テストの fixture 不足は
  型ではなく実行時エラーで見つかった。いずれ塞ぐべき穴。
- **アンケートが6ページになった。** 第三者にとっては長い。
  完了率が落ちるようなら、設問ではなくページ構成を先に疑うべき。
- **「回答をコピーする」は指示された範囲（HUB内）の外側にある追加。**
  これが無いとリモートのテスターから回答を回収する手段が存在しないため、
  最小限として入れた。不要なら1コミットで戻せる。

## 11. 次フェーズへ進行可能か

**YES — 第三者プレイテストを開始できる。**

- プレイ用URLは公開済み。ガイドは `review/playtest/` に用意。
- 回答の回収経路がある（コピー → 送信）。
- 観察者側の記録先がある（HUB の PLAYTEST OBSERVATION）。
- Director の重みと CHARACTER_REPEAT は仮説値のまま固定。観測後に判断する。

**注意（配布前に必ず）**: 共有リンクは公開時のバージョンに固定されるため、
テスターに渡す前に共有メニューで最新バージョンを共有し直すこと。
