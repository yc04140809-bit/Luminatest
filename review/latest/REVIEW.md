# MUGEN REVIEW PACKAGE — 横画面の作り直し / GameStage / 戦闘立ち絵サイズ統一 v1.0（採用前）

- Generated: 2026-09-06T07:55:43.692Z
- Commit: 1d9f752 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: 1d9f752
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**まだ採用していません。** 新機能は止めて、画面の作り直しだけをしました。

**1. 90度回転をやめました（P0）。** ご指摘のとおりでした——縦持ちのホスト
（アーティファクトなど）では、**ページ全体を `rotate(90deg)` して横画面に
見せていました**。文字が端末の横を向いて流れる状態です。これを廃止し、
**最初から横向きのステージへ描く**方式に変えました。
- 端末が横 → **画面全体を使う**（回転なし・レターボックスなし）。
- 端末が縦 → **回転させず、16:9のステージを縮小して中央に置き**、
  余白は暗いレターボックス、下に「端末を横向きにしてください」。
  **遊べる状態のまま**です（塞ぎません）。
- 縮小は `rotate` ではなく **一様な `scale`** です。回転・傾きが
  どこにも無いことを、E2Eが**計算後のtransform行列を読んで**確認します
  （b/c成分が0でなければ落ちる）。

**2. 共通GameStageを1つにしました（P1）。** 画面サイズを測るのは
`LandscapeStage` **だけ**です。各画面は `--stage-w` / `--stage-h` を読み、
自前の回転処理もサイズ計算も持ちません。
短すぎるウィンドウでは、**画面が書かれている高さ(360)でレイアウトして
から縮小**します——縦持ちでタイトルの「はじめる」が画面外に出ていたのは
これが無かったためで、いまは収まります。

**3. 戦闘キャラのサイズを1か所へ集めました（P5/P6/P7）。**
`content/art/spriteFrames.ts` が、**誰をどれだけの「ステージ高さの割合」で
描くか**を持ちます。**元画像のピクセルサイズは一切使いません**
（`species.portraitScale` という「ファイルに対する拡大率」は削除しました）。
足元基準（`bottom` + `flex-end`）なので、**ポーズを差し替えても上下に
飛びません**。

**4. いただいた戦闘用画像4点、全部使えました（P8）。**
4枚ともアルファ付きの正しい切り抜きです（透明率・半透明率・四隅の
アルファをスクリプトで実測しました）。前回「使えません」とご報告した
**主人公の立ち絵とガルドの戦闘ポーズが、透過付きで届いた**ので登録して
います。**1バイトも加工していません**（md5一致を確認済み）。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-06T07:55:43.544Z / viewport 844x390

- `review/latest/01_tavern.png` — TAVERN / TALK：絵本来の色・暗さ・コントラストが戻っているか。白は UI だけか
- `review/latest/02_greenwood_forest.png` — GREENWOOD / BATTLE：主人公とケイオスちゃんが二人の人物に見えるか。発見の気配が世界に馴染んでいるか
- `review/latest/03_greenwood_walking_side.png` — GREENWOOD / BATTLE：横に歩いたときに向きが変わるか。足元がタップ地点に来ているか。ケイオスちゃんが道をなぞって付いてくるか
- `review/latest/04_moss_rabbit_life_choice.png` — GREENWOOD / BATTLE：特殊個体の4択。どれかが「正解」に見えていないか。文字が画面外へ出ていないか
- `review/latest/05_gald_encounter.png` — GALD ENCOUNTER：横画面の会話。ガルドが全身で立っているか（膝から下だけになっていないか）、背景が画面全面か、文章帯が横長で読めるか
- `review/latest/06_gald_battle.png` — GALD BATTLE / MAGIC：横画面の戦闘。敵＝左／味方＝右（主人公が前・ケイオスが後ろ）、3人が同じ地面に立っているか、誰も重なっていないか、上のHPが読めるか、背景の森が見えるか
- `review/latest/07_magic_tray.png` — GALD BATTLE / MAGIC：《魔法》トレイ。星光弾とMP消費が読めるか、横画面スマホの親指で押せる大きさか、上のHP/MP帯が隠れていないか
- `review/latest/08_life_choice.png` — LIFE CHOICE / ENDING：背景を持つ絵に額を付けた結果
- `review/latest/09_battle_prototype.png` — BATTLE UI PROTOTYPE：世界が主役に見えるか。敵と味方の大きさ・接地・HP・メッセージ・攻撃/スキル

撮影していない画面（変更なし。テスト結果で報告）:
- TITLE — 中身は無変更です。ただし縦持ちの端末では見え方が変わります（90度回転をやめ、16:9ステージを縮小表示＋「端末を横向きにしてください」）
- HOME — 無変更です
- EXPLORE — 無変更です
- SETTINGS — 無変更です
- ARCANA / アルカナ図鑑 — 無変更です
- ADMIN DEV TOOLS — 無変更です
- OPENING THEME / SKIP — 無変更です（楽曲はまだ入っていません）
- PROLOGUE / KAOS — 会話レイアウトの変更は受けますが、ケイオスの語りは中央寄せの別レイアウトなので見た目は無変更です
- WORLD MEMORY — 無変更
- PLAYTEST SURVEY — 無変更
- DEV REVIEW HUB — 無変更

## 3. 新規機能の動作確認結果

**7画面の before / after。**

| 画面 | before | after |
|---|---|---|
| **1 酒場** | 絵が上半分の帯だけ。下半分が巨大なクリーム色の余白で、文章箱が浮いていた | 部屋が**画面全面**（cover）。壁の剣もマスターも見える。下に**横長の会話ボックス** |
| **2 グリーンウッド探索** | キャラが画面高さの約23%。「歩きたい場所をタップ／森を出る」が**キャラに重なっていた** | キャラが約40%。文字は**右上へ移動**し、読めるよう薄い暗がりを敷いた。背景は従来どおり全面 |
| **3 ガルド遭遇** | **膝から下しか映っていなかった**（画像が元サイズのまま描画され、画面外へはみ出していた） | 森の道に**全身で立っている**。下に横長の会話ボックス |
| **4 ガルド戦** | 敵が左寄りで足元が文章箱に隠れ、**右半分は空のクリーム色**（味方の絵が無い）。背景もほぼ白 | **敵＝左／味方＝右**。主人公が前衛・ケイオスが後衛で、3人が同じ地面ラインに立つ。**森の背景が見える**。上のHPは暗がりの上で読める |
| **5 ガルド人生選択** | 画像がタイトル「彼の人生を、どうしますか？」に**重なり**、名前とセリフも重なっていた | **左＝ガルドの絵／名前／セリフ、右＝質問と2×2の選択肢**。4択が一目で全部見える |
| **6 モスラビット戦** | 味方はチビキャラ、サイズは画面ごとの定数 | 味方が**本物の戦闘立ち絵**。サイズは共通レジストリ。主人公とケイオスは**重なりません**（E2Eが矩形の重なりを見ています） |
| **7 モスラビットDOWN** | 大きさは概ね妥当だったが、根拠が画面内の定数だった | **同じ動物が伏せている大きさ**をレジストリが保証。「伏せ姿が立ち姿より大きくならない／半分未満に縮まない」を単体テスト化 |
| （**縦持ちの端末**） | ページ全体が90度回転し、**文字が横を向いていた** | 回転なし。16:9を縮小して中央に置き、下に「端末を横向きにしてください」 |

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-06T07:55:43.449Z
- Build: MUGEN ZERO v0.1 / 1d9f752 / 2026-09-06T05:20:51.231Z
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

新規：`content/art/spriteFrames.ts`（＋テスト）、`ui/battle/BattleSprite.tsx`、
`e2e/landscapeShots.ts`（7画面を撮るだけのカメラ）、
`playwright.shots.config.ts`、
`assets/characters/hero/hero-battle-idle.png`、
`assets/characters/kaos/kaos-battle-idle.png`、
`assets/characters/gald/gald-battle-idle.png`。

変更：`ui/layout/landscape.ts` と `LandscapeStage.tsx`（回転の廃止・16:9・
一様スケール）、`ui/styles.css`（会話・人生選択・戦闘フィールド・探索の
文字位置）、`ui/screens/BattleScreen.tsx`（戦闘フィールドの作り直し）、
`ui/screens/LifeChoiceScreen.tsx` / `CreatureLifeChoiceScreen.tsx`
（横画面クラス）、`ui/common/DialogueSequence.tsx` 周辺のCSS、
`ui/art/CharacterArt.tsx`（boxの無い画像の描画）、
`content/art/partyArt.ts`（戦闘立ち絵の登録）、`assets/manifest.ts`、
`content/enemies/species.ts`（`portraitScale` 削除）、
`content/locations/locationVisuals.ts`（酒場を全面表示へ）、
`game/exploration/GreenwoodScene.ts`（キャラサイズ）、
`scripts/review-encode-assets.mjs`、`e2e/*`、
`content/qa/visualChanges.ts`、`e2e/reviewCapture.ts`。

`assets/characters/gald/gald-battle-down.png` は、いただいた**新しい書き出しへ
差し替え**ました（同じ絵・同じ1536x1024ですが別ファイルです）。旧ファイルは
gitの履歴に残っています。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  680 passed (680) |
| E2E (playwright) | PASS | 270 passed (12.6m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 6.80s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-lNXTVgP3.js                    1.42 kB │ gzip:   0.78 kB
dist/assets/CinematicPreviewScreen-Du7aFZYW.js           5.00 kB │ gzip:   1.83 kB
dist/assets/DevAdminScreen-C8D4VYLo.js                  51.28 kB │ gzip:  17.47 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/index-DeBO4l0d.js                          191.78 kB │ gzip:  59.33 kB
dist/assets/GreenwoodScreen-DOTC5bl0.js              1,501.45 kB │ gzip: 346.98 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 844x390: nothing spills sideways
- 撮影 viewport: 844x390（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。**

## 8. Save compatibility

**セーブ互換に影響なし。** 画面レイアウトと画像登録だけの変更です。

## 9. 既知の問題

1. 【いただいた画像4点：**全部使いました**】実測値です。
   - 主人公の立ち絵（1024x1536）：透明36.1% / 半透明12.6% / 不透明51.3%。
     半透明は**足元の影**で、背景の焼き込みではありません。→ `battle_idle`
   - ケイオス（1374x1145）：透明48.2% / 半透明4.6%。→ `battle_idle`
   - ガルドの戦闘ポーズ（1208x1302）：透明49.9% / 半透明2.0%。→ `battle_idle`
   - ガルドの倒れ絵（1536x1024）：透明47.5% / 半透明1.4%。→ `battle_down`
   **前回お渡しした「使えません」の2点（主人公・ガルド戦闘ポーズ）は、
   今回のアルファ付き書き出しで解決しています。**
2. 【1つ、意図的に古いまま残しています】**人生選択のガルドの絵**は、
   従来どおり「膝をついた」絵です。この1枚だけ**背景が焼き込まれている**ため、
   戦場に切り抜きとして置かず、**額縁付きのカードとして表示**しています
   （P8の方針どおり）。膝をついた透過絵をいただければ、`battle_damage` の
   1行差し替えで戦場に立ちます。
3. 【テストの上限を1つ広げました。理由を書きます】
   `battlePrototype.spec.ts` の「誰も広場を埋め尽くさない」上限を
   **0.4 → 0.75**（ステージ高さに対する割合）にしました。
   **落ちたテストを通すためではなく**、今回の指示が「通常人型は画面高さの
   55〜70%」であり、味方がチビキャラから本物の立ち絵になったためです。
   下限0.15と「重なり禁止」はそのままで、**上限は依然として意味を持ちます**
   （0.75を超えれば落ちます）。
4. 【E2Eが2本落ち、2本とも**テスト側**の問題でした】
   - `mossRabbit`「もう1匹出てくる」：森を歩くループが**回数**で打ち切られて
     いて（12フレーム×8地点）、3ブラウザ同時実行で歩き切る前に次をタップし、
     自分が待っていた歩行をキャンセルしていました。**時間予算**の共通ヘルパー
     へ寄せました（`swingUntil` と同じ考え方）。
   - `landscape`「縦スクロールしない」：`goto` 直後に測っていたため、
     **開発サーバがCSSをJSで注入する前の一瞬**（body の既定マージン8px）を
     掴んでいました。**8px** という数字がそのまま出ています。
     アプリが描かれてから測るようにしました。**しきい値は動かしていません。**
5. 【もう1本、テストが本物の不具合を捕まえました】
   召喚（アルカナ）で呼んだモスラビットのサイズを 0.23→0.26 に上げたところ、
   **「呼ばれた方が、実際に戦っている動物より小さく見えること」**という
   ルールが破れました（55px対59px）。モスラビット同士の戦いでは、この
   大きさの差が**どちらがどちらか分かる唯一の手がかり**です。
   召喚専用の帯（0.16〜0.30）を作って **0.20** に下げ、テストは
   1文字も変えていません。
6. 【撮影が1回失敗し、原因は自分のバグでした】
   最初「撮影に時間が足りない」と判断して持ち時間を6分→9分にしましたが、
   **誤診でした**。実際は今回追加した2枚の撮影手順が
   **「世界がまだ無い前提」で「はじめる」を押しに行っていた**ためで、
   前の撮影が世界を作った後だとタイトルは「つづきから」になり、
   永久に待っていました。各撮影の先頭で世界を消すように直したところ、
   **9枚で1.2分**で終わったので、**持ち時間は6分に戻しました**。
   なお、前ラウンドで撮った解禁シーンの1枚は今回の撮影から外しています
   （中身は無変更で、1枚のために戦闘を丸ごと再生する価値がないため）。
7. 【今回やっていないこと（指示どおり）】ケイオスの魔法追加・AUTO・倍速・
   新規敵・新規ストーリー・新規戦闘システムは**一切足していません**。
   既にある魔法システムはそのままです。
8. 【アーティファクト】新しい立ち絵3枚で**6.6MBのPNG**が増えました。
   単一HTMLは16MB制限（実測では約9.5MBが限界）なので、
   **アーティファクト用の再エンコード（WebP・同解像度）に3枚追加**しました。
   **リポジトリの元PNGは1バイトも変えていません。**

## 10. Claude 自身が気になる箇所

- **「回転して横に見せる」と「横画面で作る」は別物です。** 前者は
  スクリーンショットでは正しく見えます——テストも全部通っていました——
  が、実機では文字が横を向きます。今回いちばん大きい変更はこれで、
  **回転が存在しないこと自体をテストにしました**（transform行列のb/c成分）。
- **サイズは「ファイル」ではなく「ステージ」から取る。** 遭遇シーンで
  ガルドの膝しか映らなかったのは、`height: 88%` が**高さの決まっていない
  親**に対して解決され、画像が原寸で描かれていたからです。原因はCSSの
  詳細度でした（`.screen.has-backdrop > *` が `position: relative` を
  上書きしていた）。同じ罠を前ラウンドでも踏んでいるので、今回は
  **セレクタの詳細度をコメントに書き残しました**。
- **「箱の無い画像」で人が消えていました。** `CharacterArt` は切り出し矩形の
  ある画像を背景画像として描きますが、矩形の無い画像では `width: auto` が
  **0px**になり、解決も配置もされているのに**何も描かれません**でした。
  矩形の無い画像は `<img>` で描くようにしています（ブラウザが縦横比を知って
  いるので）。
- **サイズの帯（band）を決めました。** 通常人型55〜70% / 小型25〜40% /
  大型50〜75% / ボスは個別。**単体テストが、登録された全キャラが自分の
  申告した帯に入っていることを確認**します。伏せ姿・膝つき姿は
  「立ち姿より大きくならない／半分未満に縮まない」も同時に見ています。
- **探索キャラを大きくしました。** 主人公は画面高さの約23%→約40%。
  数字は「ファイルの解像度とほぼ同じ大きさ」に合わせてあるので、
  **拡大ボケがほとんど起きません**（元絵は102px幅で、以前は3分の1を
  捨てていました）。
- **歩行制限（P4）は前ラウンドのままで、変更していません。**
  地面帯のみ歩行可・進行方向は右→左・開始位置は右・歩行不可地点は最寄りの
  地面へ補正——すべて既存の単体テストが見ています。今回いじったのは
  キャラの大きさと、重なっていた文字の位置だけです。
- **スクリーンショットQA（P12）を仕組みにしました。**
  `e2e/landscapeShots.ts` は**何もアサートしません**。7画面を撮るだけの
  カメラです（`SHOT_DIR=... npx playwright test --config
  playwright.shots.config.ts`）。今回の修正は**ほぼ全部これで見つけました**——
  「膝しか映らない」「男が消える」「HPが読めない」「翼が主人公に重なる」は、
  どれも通っているテストの下で起きていた不具合です。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前）。**

次の候補（**今回は入れていません**）：膝をついたガルドの透過絵（上記9-2）、
攻撃・被弾ポーズ（いまは立ち絵に落ちています）、モスラビットの8状態、
そして中断している ケイオス魔法の続き / AUTO / 倍速。
