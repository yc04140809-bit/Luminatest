# 戦闘背景 — 一覧と使い方

2026-09-25 受領の6枚。**届いたファイルをそのまま**使用（1672×941 PNG・再圧縮なし）。

## 背景ID

| ID | 内容 | ファイル | 割り当て |
|---|---|---|---|
| `FOREST` | 森全般（木々・石段・遺跡の門） | `mugen-assets/files/backgrounds/battle/forest.png` | **グリーンウッドの森**（モスラビット戦・ガルド戦） |
| `RUINS` | 遺跡全般（青い旗のある遺跡の石畳） | `…/battle/ruins.png` | 登録のみ |
| `SWAMP` | 沼・湿地帯 | `…/battle/swamp.png` | 登録のみ |
| `CITY` | 街中・城下町 | `…/battle/city.png` | 登録のみ |
| `BEACH` | 浜辺・海岸 | `…/battle/beach.png` | 登録のみ |
| `GRASSLAND` | 草原・高原 | `…/battle/grassland.png` | 登録のみ |

「登録のみ」の5枚は、その場所・ダンジョン・イベントが実装されたときに割り当てる。
既存の場所に「見た目が近いから」という理由で割り当てることはしない。

## 仕組み（最小構造）

- 背景IDの型：`mugen-assets/src/keys.ts` の `BattleBackgroundKey`（既存の `BackgroundKey` と同じ方式）
- 画像の読み込み：`mugen-assets/src/battleBackgrounds.ts`（1枚ずつ、使う時に読み込む）。
  全素材一覧（manifest）には**載せていない**。載せるとArtifact版の単一ファイル（上限16MiB）に入らないため。
- 場所 → 背景ID：`mugen-core/content/locations/battleBackgrounds.ts`（`battleBackgroundFor(場所ID)`）
- 戦闘画面は背景IDを受け取るだけ：
  - 本物の戦闘（今の画面）`mugen-app/src/ui/battle.tsx` の `background`
  - 再現した戦闘画面 `mugen-app/src/ui/battle/BattleStage.tsx` の `background`（省略時は場所の背景）
- ボス戦・イベントで背景を変えたいときは、その戦闘に別のIDを渡すだけ。

## 追加するとき

1. `files/backgrounds/battle/` に画像を置く
2. `keys.ts` の `BattleBackgroundKey` と `BATTLE_BACKGROUND_KEYS` に追加
3. `battleBackgrounds.ts` に1行追加
4. 使う場所があれば `content/locations/battleBackgrounds.ts` に割り当て

## 容量

6枚で約20MB。App版のビルドは 52MB → 71MB。Artifact版は変化なし。
現状は届いた画質のまま。軽くしたい場合（WebP化など）は、見た目の確認をしてから別途判断する。

## 開発用の確認（リリースには入らない）

`http://localhost:5174/?preview=battle&bg=CITY` のように `bg=` で6枚を切り替えて見られる。
