# UI 素材の置き場所（受け皿、2026-10-16）

ここに置いた画像は、名前どおりの部品・状態に自動で使われる（コードの変更は不要）。

ファイル名：`<部品>.<状態>.png`（または `.webp`）

| 部品 | 用途 |
|---|---|
| menuButton | 村の下の5ボタン（ステータス・噂話・持ち物・世界の記憶・人生の記録） |
| placeLabel | 村の縮図の施設ラベル |
| talkPanel | 左の会話パネル |
| objective | 右上「次の目的」 |
| panel | 汎用パネル |
| listRow | 一覧の1行 |
| backButton | 戻る／とじる |
| confirmButton | 決定・入る・休息するなど |
| frameSquare / frameRound / frameDiamond | 小さな枠（顔・アイコン・戦闘のコマンドなど）。伸ばさず丸ごと |
| frameTall | 大きい縦長の枠（立ち絵）。枠だけ描き、中は立ち絵 |

| 状態 | いつ |
|---|---|
| normal | 通常（これだけあれば全状態に使われる） |
| hover | 指・マウスが乗った時（無ければ normal） |
| active | 押している間（無ければ normal） |
| disabled | 押せない時（無ければ normal を薄く） |
| selected | 選択中（施設ラベルなど。無ければ normal） |

画像は 9 スライス（四隅は伸ばさず、辺と中央だけ伸ばす）で、文字の長さに合わせて伸び縮みする。
四隅の大きさ（伸ばさない幅）は `mugen-app/src/ui/kit/skin.ts` の `KIT_PARTS` の `slice` に書く。

## decor/（飾りの小片）

`decor/` には、シート右下の飾りから切り出した小片を置く（`shard.png`＝結晶片、`spark.png`＝光の粒）。
部品（9スライス）ではなく、演出で散らすもの（BREAK の破片など）。CSS では `--sk-decor-<名前>` で使える。
