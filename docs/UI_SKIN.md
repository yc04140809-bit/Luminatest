# UI 素材の受け皿（共通部品・9スライス・状態差分、App、2026-10-16）

作者方針（2026-10-16）：見た目は **ChatGPT 側で確定デザイン準拠の素材を用意** し、Claude Code はそれを使って実装する。
Claude Code 側では新しい形や装飾を作らない。部品は「素材を差し込める受け皿」として用意する。

## 部品（`mugen-app/src/ui/kit/`）

| 部品 | 用途 | コンポーネント |
|---|---|---|
| menuButton | 下部5ボタン | `KitButton` |
| placeLabel | 施設ラベル | `KitButton` |
| talkPanelHead | 左会話パネルの上半分（人物＋名前の帯） | `KitPanel`（`portrait`・`band`） |
| talkPanel | 左会話パネルの下半分（文章・選択肢） | `KitPanel` |
| objective | 右上「次の目的」 | `KitPanel` |
| panel | 汎用パネル | `KitPanel` |
| listRow | 一覧行（選択肢） | `KitButton` |
| backButton | 戻る／とじる | `KitButton` |
| confirmButton | 決定 | `KitButton` |
| frameSquare / frameRound / frameDiamond | 小さな枠（TURN ORDER の顔・丸いチップ・コマンド） | CSS（`--sk-*`）、伸ばさず丸ごと |

- **文字は絶対に見切れない**：高さ固定なし・1行固定なし・文字に overflow hidden / 省略記号なし。長い名前は2行以上になり、部品ごと伸びる。
  折り返し位置を指定したい所は `<wbr />`（例：世界の｜記憶）。
- 各部品は左右・上下の余白（`padX` / `padY`）と最小高さ（`minHeight`）を持つ（タップしやすさのため。上限ではない）。
- 状態：通常 / hover相当 / 押下（active）/ 無効（disabled）/ 選択中（selected）。素材があればそれぞれの画像、無ければ通常の画像（無効は半透明）。
- 見た目とロジックは分離：画面側は文字・状態・押した時の処理だけを渡す。

## 素材の入れ方

1. 画像を `mugen-assets/files/ui/skin/<部品>.<状態>.png`（または .webp）に置く。**コードの変更は不要**（フォルダを読む）。
2. 9スライス：四隅は伸ばさず、辺と中央だけ伸ばす。四隅の大きさ（画像のピクセル）と表示倍率は
   `mugen-app/src/ui/kit/skin.ts` の `KIT_PARTS`（`slice`・`scale`）で合わせる。文字色は `fg` / `fgSelected`。
3. 確認：DEBUG ビルドで `?preview=kit`（全部品×全状態×短い／長い文字×3つの幅）。
4. 名前の決まりに合わないファイルは無視される（テストが検出する）。

## 現在の素材（ui-sheet-v1、2026-10-16）

- 受け取ったシートはそのまま `mugen-assets/files/ui/skin/source/ui-sheet-v1.png`（バイト一致）。
- そこから部品ごとに切り出した（切り出しのみ。加工・描き足しなし）：
  下部5ボタン＝上段4つ（通常・hover・押下・無効）、施設ラベル＝2段目（通常・選択中・無効）、
  汎用パネル＝3段目の大、次の目的＝3段目の中、一覧行＝4〜6段目（通常・選択中・無効）、
  決定／戻る＝左下3つ（通常・hover・無効）、左会話パネル＝左の大きい枠を帯の下で上下2枚に分けたもの。
- 右下の小さな枠（四角・丸・ひし形）は戦闘画面とアイコン枠で使用。左の大きい縦長枠は丸ごと `frameTall` としても切り出した（立ち絵の枠）。右下の飾りはまだ使っていない。

## 使っている画面

- **アルデン村の縮図画面**（部品で組んでいる）。
- **通常の戦闘画面**（2026-10-16、作者「TIGS向け UI統一指示書」）：HUD は Artifact と共有の部品なので触らず、
  App の `ui/battle/battle.app.css` だけで素材に差し替えた（`--sk-*` 変数、`kitRootVars`、`main.tsx` で配る）。
  敵HP・パーティ・WORLD MEMORY・TURN ORDER の台＝汎用パネル、メッセージ・場所名＝施設ラベル型、TURN ORDER の顔＝四角枠、
  コマンド＝ひし形枠（内側に暗い下地）、AUTO／倍速／ESCAPE＝丸枠（文字を表示）。HP／MP バーの中身・選択中の光・押した時の沈みは CSS。
- **3人戦闘（第1章終盤）**（2026-10-16）：通常戦闘と同じ素材に（敵・パーティ・リスト・結果＝汎用パネル、ログ・場所＝施設ラベル型、
  顔＝四角枠、コマンド＝ひし形枠（自分の縦横比のまま）、AUTO／×2／ESCAPE＝丸枠、技リスト＝決定ボタン）。`partyBattle.css` のみ・ロジック不変。
- **戦闘UI 5項目**（2026-10-16、作者指示。通常戦闘・3人戦闘とも）：
  1. **HP の赤い残像**：HP が減ると、減った分が赤く一瞬残ってから追いつく（通常戦闘は Artifact のメーターを触らず、App 側の `meterTrail.ts` が
     メーターの土台に値を写す。パーティのリング HP も同じ。3人戦闘は `Bar` が残像の帯を持つ）。
  2. **BREAK**：「BREAK!!」の後ろのクリスタル板が光り、ひびで二つに割れて飛び、シートの結晶片（`ui/skin/decor/shard.png`・`spark.png`、シートからの切り出し）が散る。約1秒で消える。
  3. **TURN ORDER**：行動中は明るく（光が一度だけ走る）、次は少し暗く、その先はさらに暗く。
  4. **ボスの重いプレート**：同じパネルを太い縁で、内側に黒金と細い赤の線（通常戦闘はボス表示のある敵、3人戦闘は `boss` の敵）。
  5. **キャラ差し色**：主人公＝赤黒、ケイオス＝白銀＋黒金、グレイヴ＝青金、アリア＝青緑＋白、レヴィ＝黒金＋青。顔枠の淡い光と、パーティ札の細い線だけ（形は共通）。
  - 動きを減らす設定（prefers-reduced-motion）では、残像・光の走り・破片の飛散は出さない。
- **ステータス画面**（2026-10-16、作者「クリスタルUI素材を共通UIキットとして転用」の優先1）：機能・情報量・縦スクロールはそのまま、見た目だけ置換。
  立ち絵＝大きい縦長フレーム（`CrystalFrame`、枠だけ・中は立ち絵）、名前＝`CrystalHeader`、各ページ（ステータス／プロフィール／スキル）＝`CrystalPanel`（横長大）、
  6つの数値・装備・武器種・戦闘スタイル・スキル＝`CrystalListRow`、人物タブ・下のページ＝決定ボタン型（`CrystalTab`、開いているページは選択中の光、
  ストーリー・スキンは無効の画像）、もどる＝`CrystalButton kind="back"`、人物タブの顔＝`CrystalIconFrame`（四角）。背景は濃紺に（明るい大聖堂の色だった）。
  装備画面は旧クラスを共有しているが `.st-v2` に限定したので変わっていない。
- まだ：道具屋・酒場・パン屋・持ち物・噂話・世界の記憶・人生の記録（ステータスの確認後、この順に同じ部品で展開）。

## 共通クリスタル部品（`mugen-app/src/ui/kit/Crystal.tsx`）

画面はこの部品の組み合わせで作る（画面ごとに似た枠・ボタン・CSS を新しく作らない）。どれもシートの切り出しを 9スライスで描き、
四隅と端の結晶は伸ばさず中央の平らな部分だけ伸ばす。小さい枠は自分の縦横比のまま丸ごと（`background-size: 100% 100%` は縦横比が同じ時だけ）。

| 部品 | 素材 | 用途 |
|---|---|---|
| `CrystalFrame` | frameTall（左の大きい縦長枠、枠のみ） | 立ち絵・プロフィール |
| `CrystalPanel` size large / medium | panel / objective | 本文・詳細・一覧のまとまり |
| `CrystalHeader` | placeLabel | タイトル・名前の札 |
| `CrystalButton` kind confirm / back / menu | confirmButton / backButton / menuButton | 決定・入る・ページ／戻る／村の下の5つ |
| `CrystalTab` | confirmButton（要素と属性は画面が決める） | 人物タブ・開いているページ・未実装のページ |
| `CrystalListRow` | listRow | 一覧の1行（数値・装備・スキル・商品・噂） |
| `CrystalIconFrame` shape square / round / diamond | frameSquare / frameRound / frameDiamond | アイコン・顔 |
| `CrystalLocationLabel` | placeLabel | 地図の場所ラベル |

- 選択中（全画面共通）：外周の淡い青白い光（`kit.css`、`[data-selected]`）。押した時：0.98倍に一瞬沈む。
- 下地は `KitBox`（どの要素でも部品として描く）・`KitButton`・`KitPanel`（`Kit.tsx`）。

## テスト

- app `src/ui/kit/skin.test.ts`：ファイル名の読み取り・フォルダ内の全ファイルが正しい部品名・状態の差し替え・最小高さ（固定高さなし）
- e2e `kit.spec.ts`：`?preview=kit` を 844×390 / 640×300 で、全部品の文字が自分の枠からはみ出さない・省略記号なし・長い文字で部品が伸びる・無効／選択中の状態、
  村の画面（640×300）でも文字の見切れなし
