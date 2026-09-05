# MUGEN REVIEW PACKAGE — LANDSCAPE MIGRATION + 画像差し替えシステム v1.0（採用前）

- Generated: 2026-09-05T13:51:10.721Z
- Commit: d602cdd on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: d602cdd
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**まだ採用していません。** フェーズ1と2の2つです。

**フェーズ1 — 全編ランドスケープ固定。** 「縦横切替ではなく常時Landscape」
という指示どおり、**縦画面レイアウトは1つも残していません**。端末を縦に
持っていても、ゲーム側のステージを90度回して**横のまま**出します。
`LandscapeStage` がウィンドウの長辺を必ず横幅にするので、その内側の
全画面は「自分は縦より横が長い」と前提してよくなりました。これが
戦闘画面で敵と味方を左右に離して置けるようになった理由です。

**フェーズ2 — 画像差し替えシステム。** 画面はファイル名を一切知りません。
`enemyArtFor(キャラID, 状態)` / `partyArtFor(...)` に聞くと、
その状態の絵か、いちばん近い既存の絵か、「まだ無い」かが返ってきます。
モスラビットを最初の1体として接続しました。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-05T13:51:10.544Z / viewport 844x390

- `review/latest/01_battle_prototype.png` — BATTLE UI PROTOTYPE：世界が主役に見えるか。敵と味方の大きさ・接地・HP・メッセージ・攻撃/スキル
- `review/latest/02_greenwood_forest.png` — GREENWOOD / BATTLE：主人公とケイオスちゃんが二人の人物に見えるか。発見の気配が世界に馴染んでいるか
- `review/latest/03_greenwood_walking_side.png` — GREENWOOD / BATTLE：横に歩いたときに向きが変わるか。足元がタップ地点に来ているか。ケイオスちゃんが道をなぞって付いてくるか
- `review/latest/04_greenwood_found_item.png` — GREENWOOD / BATTLE：アイテム発見カード。森の上で読めるか、文字が画面外に出ていないか
- `review/latest/05_greenwood_forest_event.png` — GREENWOOD / BATTLE：森の小さな出来事。世界を映したまま会話できているか（白いveilを被せていないか）
- `review/latest/06_moss_rabbit_battle.png` — GREENWOOD / BATTLE：横画面の戦闘。敵＝左／味方＝右、上部情報帯・中央戦闘領域・下部コマンドの3分割
- `review/latest/07_moss_rabbit_life_choice.png` — GREENWOOD / BATTLE：特殊個体の4択。どれかが「正解」に見えていないか。文字が画面外へ出ていないか
- `review/latest/08_title.png` — TITLE：the first screen
- `review/latest/09_home_new_world.png` — HOME：始めたばかりの世界。まだ何も覚えていない状態の第一印象
- `review/latest/10_home_remembering.png` — HOME：記憶を持った世界。数字と最新の記憶が入ったときの見え方
- `review/latest/11_explore.png` — EXPLORE：カードと ✦ 印のコントラスト
- `review/latest/12_settings_opening_row.png` — SETTINGS：オープニングテーマの行。既定でON、説明が1行、BGM音量の下に自然に並んでいるか

撮影していない画面（変更なし。テスト結果で報告）:
- ADMIN DEV TOOLS — ランドスケープ化の影響は受けますが、今回の主題ではないので撮影から外しました。中身の変更は「CHARACTER ART — 実装済み / 未実装」の一覧を1ブロック追加しただけで、演出プレビューは無変更です
- OPENING THEME / SKIP — 前ラウンドから無変更です（楽曲はまだ入っていません）
- ARCANA / アルカナ図鑑 — 画像の出どころを画像管理レイヤーへ移しましたが、表示は同じ絵の同じ切り出しです。幅だけ読める幅に制限しました
- PROLOGUE / KAOS — ランドスケープ化。会話ボックスは読める幅で中央に置いています
- TAVERN / TALK — シーンアート修正版のまま
- WORLD MEMORY — ランドスケープ化のみ
- LIFE CHOICE / ENDING — ランドスケープ化のみ
- PLAYTEST SURVEY — ランドスケープ化のみ
- DEV REVIEW HUB — ランドスケープ化のみ

## 3. 新規機能の動作確認結果

- **戦闘画面（試作）** — 上部情報帯（敵HP＝左／味方HP＝右）／中央戦闘領域／
  下部コマンドUI の3分割。**敵は左、味方は右**、互いを向いています。
  中央領域が画面の 55〜60% を占めます（E2Eで数値として検証）。
- **HOME** — 左に村（円のなか）、右に世界の記憶・探索する・レール。
- **探索フィールド** — Phaser のワールドは**縦のまま**中央に置き、
  左に場所名、右に操作説明と「森を出る」を配置しました（理由は NOTES:9）。
- **タイトル・会話・図鑑・一覧** — 横幅いっぱいに文字を伸ばさず、
  読める幅（560〜680px）で中央に置いています。
- 800x360 / 844x390 / 915x412（＝従来の360/390/412端末を横に持った状態）で
  横スクロール・縦スクロールなし。
- **古代龍の演出・カットイン・召喚事故のタイムラインは触っていません。**

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-05T13:51:10.453Z
- Build: MUGEN ZERO v0.1 / d602cdd / 2026-09-05T13:49:59.536Z
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

新規：`ui/layout/landscape.ts` ＋ `LandscapeStage.tsx`（向きの決定）、
`core/art/artStates.ts`（状態キー・fallback・解決）、`core/art/artRegistry.ts`、
`content/art/enemyArt.ts` / `partyArt.ts` / `artCoverage.ts` / `index.ts`、
`game/battle/battleArtState.ts`（戦況→ポーズ）、`ui/art/CharacterArt.tsx`、
`e2e/landscape.spec.ts`。

変更：`main.tsx`、`ui/styles.css`（ステージ・3分割・HOME2段組・森・読める幅）、
`ui/battle/BattleUIPrototype.tsx`（3分割＋画像レイヤー経由）、
`ui/screens/BattleScreen.tsx` のCSS、`content/enemies/species.ts` と
`content/arcana/arcanaDefs.ts`（PNGの直接importをやめ、レジストリ参照へ）、
`public/manifest.webmanifest`（orientation: landscape）、
`dev/DevAdminScreen.tsx`（画像実装状況の一覧を追加）、
`playwright.config.ts` と各E2E（端末サイズを横向きへ）。

**ゲームのルール・確率・戦闘計算・世界・セーブ内容は1つも変更していません。**

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  564 passed (564) |
| E2E (playwright) | PASS | 252 passed (13.1m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 7.61s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-CwcKfN2w.js                    1.42 kB │ gzip:   0.78 kB
dist/assets/CinematicPreviewScreen-RTfR2R9N.js           5.00 kB │ gzip:   1.83 kB
dist/assets/DevAdminScreen-DcC7Xupb.js                  50.61 kB │ gzip:  17.05 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/index-2IzWdgG3.js                          177.98 kB │ gzip:  54.55 kB
dist/assets/GreenwoodScreen-D5ROB8_u.js              1,498.86 kB │ gzip: 346.19 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 844x390: nothing spills sideways
- 撮影 viewport: 844x390（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。**

## 8. Save compatibility

**セーブ互換に影響なし。** 画面の向きも画像レイヤーも保存しません。

## 9. 既知の問題

1. 【今回やっていない・重要】**探索フィールド（Phaser）のワールドは縦のまま**です。
   360x520 のまま中央に置き、左右に画面の要素を配置しました。
   横ワールドにするには、**8つの発見スポットを背景画に合わせて置き直す**
   必要があります。これはコードではなく**絵に対する配置作業**なので、
   勝手にやると森の中の「道」と光る輪の位置がずれます。フェーズ3の候補です。
2. 【今回やっていない】**旧戦闘画面（ガルド戦）には味方の絵がありません。**
   HPは左右に分けて敵の絵を左に寄せましたが、右側は空き地のままです。
   味方が描かれているのは新戦闘画面（試作）だけです。これは**レイアウトの
   穴ではなく素材の穴**です。
3. 【仕様上の帰結】端末を縦に持つとゲームは回転して表示されます。
   実機の**縦持ちでは文字が横倒し**に見えます。これは「常時Landscape」の
   指示どおりの挙動で、バグではありません。PWAとしてインストールした
   場合は manifest の `orientation: landscape` が効きます（ブラウザが
   従うかは端末次第です）。
4. 【変更したガード】`reviewCapture` の**テスト時間の上限だけ**
   60秒→6分へ上げました（15枚を撮るのに森を歩く工程が入るため）。
   **スクリーンショット枚数の上限12枚は変えていません**（今回はちょうど12枚）。
   撮影レシピのうち「モスラビット戦」「特殊個体の4択」は、旧戦闘画面を
   見に行ったまま古くなっていたので、実際に表示される新戦闘画面へ直しました。

## 10. Claude 自身が気になる箇所

- **回転を「見た目の工夫」ではなく1つの純粋関数にしたこと。**
  `stageFor(w, h)` と `stageTransform(box)` だけで、どちらへ何px押し戻すかが
  決まります。ここを間違えるとゲームが画面の外に出て**真っ白に見える**
  ——スクリーンショットでは「空白」としか分からない種類のバグなので、
  押し戻し量まで単体テストで数字を固定しました。
- **E2Eの端末サイズを横向きに変えたこと。** 縦のビューポートのまま測ると、
  回転したステージを窓の座標系で測ることになり、**ゲームが画面の外に
  出ていても通ってしまう**アサーションになります。設定は1か所
  （`helpers.ts` の `PHONES`）に集めました。
- **「ポーズの決定」と「絵があるか」を分けたこと。** 戦闘は
  「この瞬間に**ふさわしい**ポーズ」を要求し、画像レイヤーが
  「実際に**ある**絵」を返します。モスラビットは front と down の2枚しか
  無いので attack も damage も front に落ちますが、**要求は本物**です。
  攻撃ポーズが描かれた日、変更は `content/art/enemyArt.ts` の1行だけで、
  戦闘画面は触りません。
- **代替表示したことを黙らない。** 落ちたときは DOM に
  `data-art-substituted="yes"` が付きます。スクリーンショットでは
  「攻撃ポーズが描かれている」と「攻撃ポーズが立ち絵で代用されている」は
  見分けがつかないので、テストが見分けられるようにしました。
- **足りない絵を偽物で埋めない。** 何も無いときに出るのは、破線の空箱と
  「?」だけです。**CSS/絵文字/シルエットで生き物らしきものを作っていません。**
- **画像ファイル名を1か所に集めたこと。** `moss-rabbit.png` を import
  しているのは `content/art/enemyArt.ts` **だけ**になりました
  （以前は species.ts と arcanaDefs.ts にも書かれていました）。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前）。**

フェーズ3の候補は指示のとおり：探索フィールドの横ワールド化（＋発見スポットの
置き直し）、戦闘UIの高視認性化、図鑑詳細、味方の状態別立ち絵、
会話立ち絵、仮アイコンの改善、軽演出。**今回は手を出していません。**
