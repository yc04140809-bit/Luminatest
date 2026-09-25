# App版 戦闘画面 — Artifact戦闘画面の再現（Phase 1）

状態：**見た目の再現のみ。本編の戦闘には未接続。** 作者の確認待ち。

## 見方（開発時のみ）

```bash
cd packages/mugen-app
npx vite --port 5174
```

ブラウザで横画面サイズ（例 844×390）にして開く：

| URL | 内容 |
|---|---|
| `http://localhost:5174/?preview=battle` | モスラビット戦の開始時 |
| `…?preview=battle&enemy=gald` | ガルド戦の開始時（逃走なし＝本編と同じ） |
| `…?preview=battle&magic=1` | ケイオス覚醒後（魔法コマンドあり） |
| `…&escape=1` / `&escape=0` | 逃走チップを強制的に出す／消す（比較用） |
| `…&bg=RUINS` など | 戦闘背景6種の切り替え（`docs/BATTLE_BACKGROUNDS.md`） |

この確認画面は **開発ビルドにだけ存在** し、リリース（APK）には含まれない
（`import.meta.env.DEV` でビルド時に削除。リリースのサイズは 52MB のまま）。

## 作り

- **画面の部品はArtifactのファイルをそのままコピー**（`src/` からの相対パスも同じ）。
  `formation.ts`（立ち位置）、`battleCamera.ts`、`BattleHud.tsx`（左上・中央上・右上のパネル）、
  `battleHud.ts`、`battleMessage.ts`、`BattleIcons.tsx`、`stagecraft.ts`、`battleArcana.ts`、
  `CharacterArt.tsx`、`Ornament.tsx`。
  `src/ui/battle/artifactCopies.test.ts` が Artifact と1バイトでも違えば失敗する。
- **見た目（CSS）はArtifactのスタイルシートから機械的に抜き出し**
  （`scripts/port-battle-css.mjs` → `src/ui/battle/battle.generated.css`、2,242行）。
  戦闘のクラス（`bp-` / `bx-`）を使うルールと、それが使うアニメーションと配色だけ。
  配色は戦闘画面の中だけに効くようにしてあり、他のApp画面の色は変わらない。
  Artifact側が変わったら `node scripts/port-battle-css.mjs` を再実行（しないとテストが失敗）。
- **画面そのもの**は `src/ui/battle/BattleStage.tsx`。Artifactの `BattleUIPrototype` の
  描画部分と同じ構造・同じクラス名。**本物の戦闘状態（`BattleState`）を受け取って描くだけ**で、
  戦闘計算・ターン進行は一切しない。コマンドは押されたことを知らせるだけ（未接続の今は何も起きない）。
- **画像**は戦闘画面が使うファイルだけを1枚ずつ指定（`src/ui/battle/battleArt.ts`）。
  どの絵を出すかは共通部分の規則で決め、`battleArt.test.ts` がArtifactと同じファイル・
  同じ顔位置になることを確認する。

## 戦闘背景（2026-09-25 追加）

背景はArtifactの `field-greenwood.png` ではなく、**App版の正式な戦闘背景**（`docs/BATTLE_BACKGROUNDS.md`）。
グリーンウッドの森は `FOREST`。引き継いでいるのはArtifactの画面の構造（味方右・敵左・各パネル・コマンド）で、
背景の絵そのものは一致させない。下の比較は背景を差し替える前のもの。

## Artifactとの比較（ピクセル比較・背景差し替え前）

同じ開始状態を、同じ3機種サイズで撮って比べた結果：

| 画面 | 844×390 | 800×360 | 915×412 |
|---|---|---|---|
| モスラビット戦 | **完全一致（差 0.000%）** | 差 0.97%（下記①のみ） | 差 0.67%（下記①のみ） |
| ガルド戦（逃走チップ条件を揃えて） | 差 0.78%（下記①のみ） | — | — |

## Artifactとの差分（意図したもの）

1. **《ケイオスの守護》《ケイオスの弱体》の札が出ない。** Artifactは戦闘開始時にケイオスの介入を
   ランダムに決めて表示するが、App版の戦闘にはその仕組みが無い（本物の仕組み無しに札だけ出すことはしない）。
2. **動きが無い**：攻撃の踏み込み、ダメージ数字、被弾の揺れ、カメラの寄り、倒れる動き、
   ケイオスの詠唱オーラ、カットイン、覚醒シーン。Phase 1 は静止画面の再現のみ。
3. **トレイが開かない**：魔法・スキル・アイテム・アルカナの選択欄。
4. **アルカナ召喚・召喚事故**：App版の戦闘には無い。
5. **WORLD MEMORY 欄と「記憶の深さ」**：確認画面では空（新規の世界と同じ）。本編接続時に
   世界の記録（既知の出来事・アルカナの進み具合）から出す。
6. **AUTO・×2**：確認画面では押すと見た目だけ切り替わる（戦闘の速さには未接続）。
7. **♪（戦闘BGM切替）**：部品は受け口を用意済み（Artifactと同じ位置）。未接続。

## 本編接続（次の段階）で必要になる構造変更

- App版の戦闘画面 `src/ui/battle.tsx`（今の文字だけの画面）の表示を `BattleStage` に置き換える。
  戦闘の進め方（計算・保存・勝敗）はそのまま使う。
- 既存のテスト（gald / memory / parity / music / loop など）が今の文字画面の目印
  （`attack-button`、`enemy-hp` など）を使っているので、書き換えが要る。
- ♪ボタン（音楽作業）は今の文字画面にある。新しい画面の同じ場所へ移す。
- 逃走：Artifactの森の戦闘には「逃走」があるが、App版の戦闘には無い（ゲームの流れの変更になる）。
