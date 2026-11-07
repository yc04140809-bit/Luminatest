# App版 戦闘演出の部品一覧（ロードマップ STEP 11、2026-09-26）

キャラクターや技が増えたときに「毎回ゼロから戦闘演出を書く」のを避けるための部品の地図。
**過度な抽象化はしない**：実際に 2 か所以上で必要になったものだけを共通部品にし、1 か所でしか使っていないものは
その演出の中に置いたまま（ここに「どこにあるか」だけ書く）。

## 大原則：演出と戦闘計算の分離

```
戦闘計算（MUGEN CORE: playerAttack / castMagic / useItem …）
  → 行動の前後の状態と戦闘ログ（actionResult）
  → 演出の再生係（battleTheatre / useScenePlayer）
  → 表示（BattleStage とその部品）
```

- 演出側でダメージ・命中・回復量・勝敗・能力値を**決めない**。表示する数字は「行動前の HP − 行動後の HP」、
  文は戦闘ログの行だけ。
- 本編に接続していない演出（レヴィ・アリア・零閃）は、数字も HP の変化も**出さない**（計算を一切呼ばない）。
- 演出は保存・WORLD MEMORY に触れない。終わったら DOM・クラス・タイマーを何も残さない（自動テストで確認）。

## 共通部品（2 か所以上で使っているもの）

| 部品 | ファイル | 使っているところ |
|---|---|---|
| **再生係（本編の1ターン）** | `src/ui/battle/battleTheatre.ts`（`useBattleTheatre`：`playTurn` / `playSwing` / `playSpell`） | 本編の戦闘、DEBUG プレビュー |
| **再生係（段階の並んだ演出）** | `src/ui/battle/scene/useScenePlayer.ts` | レヴィ・アリア・零閃（STEP 11 で3つの重複を1つに） |
| **場面の口** | `src/ui/battle/scene/fieldScene.ts`（`BattleStage` の `scene`） | レヴィ・アリア・零閃 |
| **段階の時間（×2 と下限）** | `src/ui/battle/scene/stepTimes.ts`（中身は `battleSpeed.visualMs`） | レヴィ・アリア・零閃（本編の部品は各自の `…Ms()` で同じ `visualMs` を使う） |
| **カットイン** | `src/ui/battle/cutin/`（`useCutInDirector`、長さは `cutInTiming.ts`） | ケイオスの魔法5種（本編）、見本4種、レヴィ・アリア・零閃の前 |

## ロードマップの部品名との対応

| 部品名 | 今あるもの | 状態 |
|---|---|---|
| CUT_IN | `cutin/CutIn.tsx` | 共通部品（上の表） |
| ACTOR_MOVE | 主人公の攻撃の歩き：`slash/reach.css` ＋ `battleTheatre` の `reach`（接近→振りかぶり→斬撃→戻し→帰還）。演出からの移動：場面の口の `data-scene-hero` ＋ `vars`（零閃の駆け抜け）、`heroAside`（レヴィ・アリアと交代） | 本編（攻撃）と演出（場面の口）の2通り。どちらも共通の仕組み |
| WEAPON_SLASH | `slash/SwordSlash.tsx`（剣の軌跡と斬り、本編の攻撃）。零閃の斬り筋・月の一閃は零閃の中（`src/dev/hero/zero.css`） | 本編の剣は共通部品。零閃専用の斬撃は1か所のみなので共通化しない |
| MAGIC_AURA | `magic/SpellFx.tsx` の詠唱オーラ（`channel`） | 本編の魔法5種で共通 |
| PROJECTILE | アリアの矢（`src/dev/aria`）、レヴィの幻影槍（`src/dev/levi`） | それぞれ1か所のみ・形も動きも違うので**共通化しない**。ケイオスの魔法は「敵の位置で起こる」設計で飛び道具を使わない |
| IMPACT | 本編：`HitFx.tsx`（当たりの光）、`SwordSlash` の斬り、`SpellFx` の着弾（`impact`）。演出：各自のフィニッシュ | 本編の3つは共通。演出側は各自 |
| SCREEN_SHAKE | 本編：`.bp-stage.kick`（当たりの揺れ）と `battleCamera.ts`（カメラの寄り）。演出：場面の口の `data-scene-step` に合わせて、フィールドと効果の層を同じキーフレームで揺らす（レヴィ・零閃・アリアの寄り） | 仕組み（場面の口）は共通。揺れ方は技ごとに違うので各自 |
| DAMAGE_NUMBER | `HitFx.tsx` ＋ `blows.ts`（本物の数字だけ） | 本編で共通 |
| HEAL_NUMBER | **作らない（仕様）**。回復は数字ではなく結果の1行（「《癒しの光》！ HPが22回復した。」、`BattleStage` の `told`） | STEP C／B-4 の決定どおり |
| RETURN | 主人公の攻撃の帰還（`reach` の `return`）、演出の退場（レヴィ `leave`・アリア `recover`・零閃 `return`） | 本編は共通部品。演出は段階の1つとして各自 |
| FINISH | 撃破のダウン（`battleTheatre` の `KNOCKDOWN_MS`・ダウン絵）。技のフィニッシュ（レヴィの突き、零閃の着弾） | 撃破は本編で共通。技のフィニッシュは各自 |

## 新しい技の演出を作るとき

1. 段階の表（×1 の長さと下限）を書き、`stepTimes` で時間を出す。時間の単体テストを書く（順番・×2 が短い・下限）。
2. `useScenePlayer` に「最初の状態・段階の切り替え（cues）・終わりの時刻」を渡す。
3. 描くものは場面の口（`FieldScene`）で渡す：人の中に描く `field`、HUD の上に描く `over`、人に付ける言葉
   （`heroAside` / `hero` / `enemy`）、CSS 変数 `vars`。
4. 本編の技に接続するときは、数字と文を戦闘計算の結果（行動前後の状態・ログ）から取り、演出側で作らない。
5. 自動テスト：順番、×1／×2、画面内に収まる、何も残らない、操作できない、数字・HP・保存に触れない。

## STEP 11 で変えたこと

- `useScenePlayer`（段階の並んだ演出の再生係）を作り、レヴィ・アリア・零閃の3つの再生係の重複をなくした。
- `stepTimes` を作り、3つの時間表の計算を共通にした。
- 場面の口を `src/ui/battle/scene/` にまとめた（`fieldScene.ts`・`useScenePlayer.ts`・`stepTimes.ts`）。
- DEBUG プレビューの3つの演出欄を1つの表（`SCENE_PARTS`）から作るようにした（ボタン・表示・URL は同じ）。
- 見た目・時間・動きは変えていない（自動テストで確認）。
