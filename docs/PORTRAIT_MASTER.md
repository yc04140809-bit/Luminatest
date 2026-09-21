# キャラクター画像仕様 — MUGEN ZERO

キャラクター画像は **UIに描き込まず、差し替え可能な専用画像**として
扱います。画面デザインの修正と画像の修正は、互いに影響しません。

## 0. 画像は2種類ある

用途が違うので、仕様も別です。**片方がもう片方を待つことはありません。**

| | ステータス画面専用ビジュアル | 透過立ち絵マスター |
|---|---|---|
| 識別子の例 | `status_visual_chaos` | `standing_master_chaos` |
| `assetRefs` のキー | `statusVisual` | `statusPortrait` |
| 背景 | **込み**（描き込まれている） | **完全透過** |
| 形 | 長方形。寸法自由 | 1200×1800 固定 |
| 透過 | 不要 | 必須 |
| 用途 | ステータス画面**のみ** | 汎用（着せ替え・表情差分・他画面） |
| 担うもの | **画面の豪華さ** | **将来の拡張性** |

ステータス画面は**ビジュアルがあればそれを優先**し、無ければマスターを
使います（`statusArtOf()`）。表示のされ方も種類で変わります。

- ビジュアル … 絵として額に収める。全高・画像の比率どおりの幅
- マスター … 床に立たせる。幅32% × 高さ82%・下揃え

現在の登録：

| キャラクター | ビジュアル | マスター |
|---|---|---|
| 主人公 | `hero-status-visual.png` 1024×1536 (1:1.500) | `hero-battle-idle.png`（仮。マスター仕様未適合） |
| ケイオス | `kaos-status-visual.png` 941×1672 (1:1.777) | `kaos-battle-default.png`（仮。マスター仕様未適合） |

2枚は比率が違いますが、`contain` なので**どちらも切れません**。
全高表示での幅は主人公 30.8%、ケイオス 26.0% で、40% の表示エリアに
対する余りはグラデーションが埋めます（画像の複製では埋めません）。

## 1. 透過立ち絵マスター仕様（新規立ち絵はこれに従う）

| 項目 | 値 |
|---|---|
| キャンバス | **1200 × 1800 px** |
| 比率 | **2 : 3** |
| 形式 | PNG（アルファ付き） |
| キャンバス | 全キャラ同一 |
| 足元基準線 | 全キャラ統一（下記） |
| 収める範囲 | 頭頂・翼・武器の先端まで、はみ出さない |
| 背景 | 完全透過 |

### 足元基準線

**不透明部分の下端を `y = 1746`（キャンバス下端から 3%）に揃える。**

なぜ基準線が要るのか：UI側は下揃えで表示します。足元の位置が画像ごとに
違うと、キャラクターを切り替えた瞬間に**地面が上下にずれて見えます**。
基準線を決めておけば、切り替えても立っている床が動きません。

下に 3% の余白を取るのは、影や靴底の描き込みが切れないようにするためです。

### 収まりの確認

- 頭頂・翼・武器の先端がキャンバスに接していないこと（各辺 1px 以上空ける）
- アルファが完全に 0 でない画素がキャンバス外に出ないこと（＝切れていない）

## 2. UI側の表示仕様

`packages/mugen-app/src/ui/styles.css` の `.status-screen` に2行あります。

```css
--portrait-w: 32%;   /* 画面幅に対する立ち絵エリアの幅 */
--portrait-h: 82%;   /* 画面高に対する立ち絵エリアの高さ */
```

| 項目 | マスター | ビジュアル |
|---|---|---|
| 位置 | 右側固定・下揃え | 右側固定・下揃え |
| 幅 | 画面全体の **32%** | 画面全体の **26%** |
| 高さ | 画面全体の **82%** | 画面全体の **100%** |
| 表示 | `object-fit: contain` | `object-fit: contain` |
| はみ出し | `overflow: hidden` | `overflow: hidden` |
| 揃え | `object-position: bottom center` | 同左 |

ビジュアルの 26% × 100% は、頂いた 941×1672 を 844×390 の横画面に
**letterbox も crop も無しで**収める値です（実測 219×390）。
比率の違うビジュアルに差し替える場合は、
`npm run check:portraits -w @mugen/app` が必要な幅を計算して表示します。

UI側の各行は `padding-right: var(--portrait-w)` で同じ帯を空けます。
**エリアを変えたいときは、この2行だけを書き換えてください。**
コンポーネントは一切この数値を知りません。

> **実測メモ（844 × 390 の横画面）**
> 32% × 82% = **270 × 320 px**。2:3 のマスターを `contain` で入れると
> 高さ基準で **213 × 320 px** に描画されます。
> 参考画像の立ち絵は画面高の約 93% を占めており、82% はそれより小さく
> なります。大きくしたい場合は `--portrait-h` を上げてください
> （93% 相当なら `--portrait-h: 93%`）。

## 3. データの分離

```
CharacterData        … 誰で、どう戦うか
  battleProfiles.ts    characterId / weaponType / battleStyle
                       （HP・MP・LVは world が持つ実データ。ここには無い）

CharacterAppearance  … 今どう見えているか
  characterAppearance.ts
                       CharacterAppearance(characterId, defaultSkinId, selectedSkinId)
                       SkinDefinition(skinId, characterId, displayName,
                                      assetRefs, availability, version)
                       assetRefs.statusPortrait / normal / angry / sad /
                                 battle / skill / cutIn
```

解決の流れ：

```
characterId
  → appearanceOf()      selectedSkinId ?? defaultSkinId
  → skinOf()            SkinDefinition
  → assetRefs.statusPortrait
  → portraits.ts        そのキー1枚だけを動的 import
```

**スキンは見た目しか変えません。** `SkinDefinition` に能力値のフィールドは
意図的にありません。1つでも数値を持たせた瞬間、着せ替えは「強い衣装」に
なります。

**SAVE schema は変更していません。** `selectedSkinId` は全員 `null` で、
選択機能は未実装です。存在しないスキンが選ばれていた場合は既定へ戻り、
選択自体は残るため、スキンが復活すれば戻ります。

> `BattleProfile` の `portraitKey` / `skinId` は **互換シム**です。
> mugen-artifact が `portraitKey` を読んでおり、今回 artifact は変更
> 禁止のため、新レジストリから値を埋めて形だけ維持しています。
> 新しいコードは `statusPortraitKeyOf()` / `skinOf()` を直接使います。

## 4. 現在の立ち絵の適合状況

`npm run check:portraits -w @mugen/app` で確認できます。
**現時点で2枚ともマスター仕様を満たしていません。**
`object-fit: contain` なので表示は破綻しませんが、キャラクターを
切り替えたときに足元がわずかにずれます。

差し替え用のマスターを作る際は、上の仕様でご用意ください。
既存ファイルを機械的に変換することも可能ですが、主人公は拡大処理
（再サンプリング）が、ケイオスは比率が違うため透明余白の追加が必要に
なります。**元の絵に手を入れることになるため、指示があるまで行いません。**
