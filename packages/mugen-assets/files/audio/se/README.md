# SE — 効果音

**2026-10-06 に 23 種が納品されました。** 納品されたファイルを**そのまま**（再エンコードせず）
`<id>.mp3` の名前で置いています。

## 音源の置き方

**このフォルダに `<id>.mp3` という名前で置くだけです。**
import もマップへの追記も要りません。`src/sfx.ts` がこのフォルダ自体を読みます。
ファイル名 `battle_hit.mp3` が、そのまま効果音 `battle_hit` になります。

> 名前を間違えると**無言で鳴らないだけ**です。それを防ぐために
> `mugen-core/content/audio/sfxFiles.test.ts` がこのフォルダを読み、
> `SFX_IDS` に無い名前があればテストが落ちます。

使える名前は `packages/mugen-core/content/audio/sfx.ts` の `SFX_IDS` が唯一の正です。

## 納品済み（2026-10-06）

> 戦闘での割り当て・音量補正・×2 対策の全体は `docs/BATTLE_SE.md`。ファイルを持たない瞬間（`battle_hit` など）は、`mugen-core/content/audio/sfxTuning.ts` で納品ファイルを借りて鳴らす。

「鳴る場所」は **App 版**のこと。Artifact 版には効果音は入りません（下記）。

| ファイル名 | 用途（納品時の指定） | App で鳴る場所 |
|---|---|---|
| `battle_attack_slash.mp3` | 斬撃（剣を振る） | 主人公の攻撃（長剣） |
| `battle_attack_dagger.mp3` | ナイフ攻撃（例：ガルド） | ガルドの攻撃（二刀短剣） |
| `battle_attack_bow.mp3` | 弓（例：アリア） | 弓の装備者がまだ戦闘にいない |
| `battle_attack_thrust.mp3` | 槍攻撃 | 槍の装備者（レヴィ）がまだ戦闘にいない |
| `battle_attack_strike.mp3` | 格闘系・素手・人間側の打撃全般 | 武器の決まっていない人間の攻撃（今はいない） |
| `battle_attack_heavy_strike.mp3` | 大柄な人間やモンスターの打撃全般 | モンスターの攻撃（モスラビットの体当たり） |
| `battle_attack_heavy_weapon.mp3` | 斧や大鎌など重量武器 | 該当武器がまだ無い |
| `battle_attack_whip.mp3` | 鞭攻撃 | 該当武器がまだ無い |
| `battle_cutin.mp3` | カットイン発生時 | カットインが出た瞬間 |
| `magic_cast.mp3` | ケイオスのスキル・必殺技など魔法陣展開時（他の魔法キャラも） | ケイオスの詠唱の構え（魔法陣）の時。カットインがあればその後 |
| `battle_heal.mp3` | 回復魔法 | ケイオスの《癒しの光》が味方に届いた時 |
| `battle_finisher_hit.mp3` | 必殺技のダメージ時 | ケイオスの必殺技《彗星撃》が命中した時 |
| `battle_damage.mp3` | 被弾時 | 味方が被弾した瞬間（ダメージがあった時だけ） |
| `battle_down.mp3` | ダウン時 | 倒した相手が地面に倒れた時 |
| `battle_magic_fire.mp3` | 火・炎魔法 | 該当する魔法がまだ無い（ケイオスの魔法はすべて星属性） |
| `battle_magic_ice.mp3` | 氷魔法 | 同上 |
| `battle_magic_thunder.mp3` | 雷魔法 | 同上 |
| `battle_magic_wind.mp3` | 風魔法 | 同上 |
| `battle_magic_earth.mp3` | 土魔法（地震など） | 同上 |
| `battle_magic_dark.mp3` | 闇魔法・暗黒魔法 | 同上 |
| `battle_magic_holy.mp3` | 聖魔法 | 同上 |
| `battle_charge_aura.mp3` | タメ技などオーラが出る大技 | 該当する技がまだ無い |
| `battle_evade.mp3` | 回避時 | 戦闘に回避の処理がまだ無い（処理ができれば鳴る） |

App の戦闘で音を鳴らすのは `mugen-app/src/ui/battle/battleSounds.ts`（戦闘の計算・進行・演出の
タイミングは変えず、既にある「攻撃の瞬間」「命中の瞬間」に音を付けるだけ）。

## 名前はあるが、まだ音源が無い（置けば鳴るもの）

| ファイル名 | App で鳴る場所 |
|---|---|
| `battle_start.mp3` | 戦闘開始時に 1 回 |
| `battle_hit.mp3` | 攻撃が敵に命中した瞬間（ダメージがあった時だけ） |
| `battle_guard.mp3` | 防御の構え |
| `battle_win.mp3` | 勝利 |
| `explore_marker.mp3` / `explore_found.mp3` | 探索：調査ポイントに着いた／調べた |
| `explore_rare_found.mp3` / `explore_rainbow_found.mp3` | 探索：金色の発見／虹の発見 |

ほかの名前（`ui_*`、`battle_attack_thrust`、`battle_magic_hit`、`battle_critical`、
`battle_buff`、`battle_debuff`、`story_*` など）は App ではまだ鳴らす場所がありません。

## 武器種と攻撃音の対応

`packages/mugen-core/content/audio/weaponSfx.ts` が唯一の正です。キャラクター名は出てきません —
同じ武器を持つ人は自動的に同じ音になります。

| 武器種 | 攻撃音 | 持ち主（canon） |
|---|---|---|
| `LONG_SWORD`（長剣） | `battle_attack_slash` | 主人公 |
| `DUAL_DAGGER`（二刀短剣） | `battle_attack_dagger` | ガルド |
| `SPEAR`（槍） | `battle_attack_thrust` | レヴィ |
| `BOW`（弓） | `battle_attack_bow` | アリア |
| モンスター（武器なし） | `battle_attack_heavy_strike` | — |

## Artifact には入りません

Artifact は**単一 HTML 版も Android 版も**、`src/sfx.ts` を `src/sfxNone.ts` に差し替えてビルドされる
ため、効果音は 1 バイトも入りません（Artifact は凍結。Android 版の差し替えは 2026-10-06 に追加）。
`mugen-artifact/scripts/check-build-audio.mjs` がビルド後に確認します。

## 推奨する形式

| 項目 | 推奨 | 理由 |
|---|---|---|
| 形式 | **MP3** | BGMと同じ。Android WebView で確実に鳴る |
| サンプルレート | 44.1 / 48 kHz | BGMは48kHz |
| 長さ | **0.1〜1.5秒** | 連打される |
| 先頭の無音 | **入れない** | そのまま再生遅延になる |
| 音量 | ピーク −3dB 程度 | 個別調整は `SFX_GAIN` で可能 |

## ライセンス

**2026-10-06 納品分の出典・作者・ライセンスは、まだ記録されていません。**
外部素材の場合は、以下を確認のうえ、ここに出典・作者・ライセンス・入手日を記録してください。

- 商用利用が可能か
- ゲームに組み込んでの**再配布**が可能か
- クレジット表記が必要か（必要なら文面と掲示場所）
