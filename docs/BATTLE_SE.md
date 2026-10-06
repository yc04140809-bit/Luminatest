# 戦闘 SE 割り当て（App）Ver.1.0 — 2026-10-06

効果音ラボの納品 22 ファイルを分類し、App の戦闘に割り当てた記録。
**戦闘ロジック・ダメージ計算・ターン順・アニメーションは変更していない**（既にある「攻撃の瞬間」「命中の瞬間」などに音を付けただけ）。

- ファイル：`packages/mugen-assets/files/audio/se/<id>.mp3`（納品物そのまま。削除・改名・再エンコードなし）
- 名前（SE ID）：`mugen-core/content/audio/sfx.ts` の `SFX_IDS`
- 鳴らし方（借りるファイル・音量・ピッチ・長さ）：`mugen-core/content/audio/sfxTuning.ts` の `SFX_TUNING`
- どの瞬間に鳴らすか：`mugen-app/src/ui/battle/battleSounds.ts`
- Artifact 版には効果音は入らない（単一 HTML 版・Android 版とも `sfxNone.ts` に差し替え）

## 1. 納品ファイルの分類（22）

測定値：長さ・音の出ている区間・ピーク・RMS（音の出ている区間）・重心周波数。分類は納品時の指定と測定から。

| ファイル | 分類 | 長さ | RMS | 特徴 |
|---|---|---|---|---|
| `battle_attack_slash` | 斬撃 | 0.5s | −19.8dB | 高域が多い金属的な「シャキン」、余韻あり |
| `battle_attack_dagger` | 斬撃（短剣） | 0.4s | −15.1dB | 短く低め。ナイフ |
| `battle_attack_thrust` | 刺突 | 0.5s | −16.9dB | 低〜中域の突き |
| `battle_attack_bow` | 弓 | 0.3s | −19.8dB | 弦の音（低域＋高域） |
| `battle_attack_whip` | 鞭／風切り | 0.4s | −21.6dB | 高域の鋭い風切り |
| `battle_attack_strike` | 衝撃・ヒット | 0.3s | −17.3dB | 低い短い「ドッ」 |
| `battle_attack_heavy_strike` | 重いヒット | 0.45s | −18.3dB | 低く重い衝撃 |
| `battle_attack_heavy_weapon` | 重量武器の振り | 0.6s | −16.0dB | 中域の「ゴォッ」が続く |
| `battle_damage` | 被弾 | 0.35s | −16.0dB | 短い衝撃＋高域 |
| `battle_down` | 撃破（ダウン） | 0.4s | −17.0dB | ごく低い「ドスン」 |
| `battle_finisher_hit` | 必殺技の命中（爆発系） | 1.2s | −15.9dB | 低域の厚い衝撃が続く |
| `battle_cutin` | その他（カットイン） | 1.8s | −20.5dB | 中高域 |
| `magic_cast` | 魔法（魔法陣展開） | 3.3s | −21.3dB | 高域の持続音 |
| `battle_charge_aura` | 魔法（溜め・オーラ） | 3.1s | −22.0dB | 高域の持続音 |
| `battle_heal` | 回復 | 1.3s | −20.4dB | 低〜中域、柔らかい |
| `battle_magic_fire` | 魔法（火・炎） | 2.3s | −17.8dB | 低〜中域 |
| `battle_magic_ice` | 魔法（氷） | 1.2s | −18.7dB | 立ち上がりに破裂音、きらめく余韻 |
| `battle_magic_thunder` | 魔法（雷） | 7.7s | −18.1dB | 高域、長い |
| `battle_magic_wind` | 魔法（風） | 0.8s | −17.7dB | 低域の膨らみ |
| `battle_magic_earth` | 魔法（土・地震） | 3.7s | −19.6dB | 超低域、長い |
| `battle_magic_dark` | 魔法（闇）／デバフ | 3.8s | −24.2dB | 中域、暗い |
| `battle_magic_holy` | 魔法（聖）／バフ | 1.7s | −22.8dB | 高域、明るい |

回避・防御に向く素材：回避＝`battle_attack_whip`（風切り）を `battle_evade` として準備済み。**防御（金属衝突）に合う素材は無い**ため `battle_guard` は無音のまま。

## 2. 瞬間ごとの割り当て（借用を含む）

ファイルを持たない瞬間は、ファイル名を変えずに `SFX_TUNING` の `source` で借りる。

| SE ID | 鳴らすファイル | 用途 |
|---|---|---|
| `battle_hit` | `battle_attack_strike` | 敵への通常ヒット |
| `battle_hit_light` | `battle_attack_strike`（小さめ） | 軽いヒット（最大 HP の 4% 以下） |
| `battle_hit_heavy` | `battle_attack_heavy_strike` | 重いヒット（最大 HP の 15% 以上） |
| `battle_boss_hit` | `battle_attack_heavy_strike` | ボス（ガルド）へのヒット |
| `battle_bow_hit` | `battle_attack_strike` | 矢の命中（弓の通常攻撃の 2 段目。弓の通常攻撃はまだ無い） |
| `battle_skill_slash` | `battle_attack_slash`（ピッチ 0.9） | 主人公の強攻撃（一段重い斬撃） |
| `battle_magic_hit` | `battle_magic_ice` | 魔法の着弾（星の破裂） |
| `battle_buff` | `battle_magic_holy`（短く） | バフ |
| `battle_debuff` | `battle_magic_dark`（短く） | デバフ |
| `battle_enemy_defeat` | `battle_down` | 通常敵の撃破 |
| `battle_boss_defeat` | `battle_finisher_hit` | ボスの撃破（通常より重い） |
| `battle_critical` | `battle_attack_slash`（高く・短く） | クリティカルの強調音。**判定が無いので未配線**（通常ヒットに重ねる設計のみ） |
| `battle_evade` | `battle_attack_whip` | 回避。**処理が無いので未配線** |

## 3. キャラクター別

| | 通常 | スキル | 必殺技 |
|---|---|---|---|
| 主人公（長剣） | 斬撃 → ヒット | （強攻撃は本編に無い） | 「ゼロ」：溜め（`battle_charge_aura`）→ 突進の斬撃（`battle_skill_slash`）→ 命中（`battle_finisher_hit`） |
| ケイオス（魔法） | カットイン → 魔法陣（`magic_cast`）→ 着弾（`battle_magic_hit`） | 回復＝`battle_heal`、星盾＝`battle_buff`、星霞＝`battle_debuff` | 《彗星撃》：カットイン → 溜め（`battle_charge_aura`）→ 命中（`battle_finisher_hit`） |
| レヴィ（槍） | 刺突（`battle_attack_thrust`、本編未参戦） | — | 「幻影槍6本」：構え（`battle_debuff`）→ 槍が刺さるたび刺突 → 突進（`battle_attack_heavy_weapon`）→ フィニッシュ（`battle_finisher_hit`） |
| アリア（弓） | 弓（`battle_attack_bow`、本編未参戦）→ 命中（`battle_bow_hit`、準備のみ） | — | 「蒼薔薇の矢」：発射（`battle_attack_bow`）→ 薔薇（`battle_buff`）→ 光（`battle_heal`） |
| ガルド（短剣二刀・敵） | ナイフ（`battle_attack_dagger`、毎回わずかにピッチを変える） | — | — |
| モンスター | 体当たり＝重い打撃（`battle_attack_heavy_strike`） | — | — |

- 味方の被弾：`battle_damage`。撃破：通常敵＝`battle_enemy_defeat`、ボス＝`battle_boss_defeat`。
- レヴィ・アリア・ゼロの必殺技は DEBUG の戦闘演出プレビューでのみ再生できる（本編未接続）。
- 魔法の着弾・必殺技の命中が鳴った直後（0.32 秒）は、同じ一撃の通常ヒット音を鳴らさない（重ねない）。

## 4. 音量補正（`gain`、SFX スライダーに掛ける）

基準は通常の斬撃。測定 RMS から、通常攻撃・ヒット＝−21dB 前後、スキル＝少し上、必殺技＝最も存在感、長い魔法音＝控えめ、を目安に設定（端末は元ファイルより大きくは鳴らせないので 1 以下）。

| SE | gain | | SE | gain |
|---|---|---|---|---|
| attack_slash | 0.85 | | finisher_hit | 0.85 |
| attack_dagger | 0.48 | | cutin | 0.88 |
| attack_thrust | 0.60 | | magic_cast | 0.78 |
| attack_bow | 0.85 | | charge_aura | 0.80 |
| attack_strike | 0.62 | | heal | 0.88 |
| attack_heavy_strike | 0.66 | | magic_hit（ice） | 0.70 |
| attack_heavy_weapon | 0.60 | | buff（holy） | 0.75 |
| attack_whip | 0.90 | | debuff（dark） | 0.85 |
| hit（strike） | 0.50 | | enemy_defeat / down | 0.62 |
| hit_light | 0.36 | | boss_defeat | 0.80 |
| hit_heavy | 0.68 | | damage | 0.55 |
| boss_hit | 0.58 | | skill_slash | 0.95 |

必殺技は音量だけでなく、低域の厚い `finisher_hit`・溜めの持続音・段数（2〜3 段）で差を付けている。

## 5. ×2 SPEED の対策

- **長い音を途中で切る**：`maxMs` を持つ音は、その長さで 0.14 秒かけて消える。×2 ではさらに 6 割の長さ（`SFX_FAST_RING`）。例：魔法陣 1.3s→0.78s、カットイン 1.6s→0.96s、溜め 0.9s→0.54s。
- **レヴィの槍 6 本**：×1 は 6 回、×2 は 1・3・5 本目だけ（3 回）。
- **同じ音の連続**：同じ SE は 60ms 以内に 2 回鳴らない（既存の `SFX_RETRIGGER_MS`）。
- **重ねない**：魔法・必殺技の命中は、同じ一撃の通常ヒット音の代わりに鳴る。

## 6. ピッチの揺らぎ

通常攻撃・ヒット系だけ、毎回 0.96／1.00／1.04 のどれか（短剣は 0.95／1.00／1.05、矢の命中は ±0.06 まで）。必殺技・魔法は固定。主人公の強攻撃は固定 0.9。

## 7. 未使用の SE 候補

- `battle_magic_fire` `battle_magic_thunder` `battle_magic_wind` `battle_magic_earth`（火・雷・風・土の魔法がまだ無い）
- `battle_attack_whip`（鞭の使い手がいない。回避音 `battle_evade` として準備）
- `battle_attack_heavy_weapon` は通常攻撃では未使用（斧・大鎌がいない）。レヴィの突進にだけ使用
- `battle_bow_hit` `battle_critical` `battle_evade`（ID と割り当てだけ準備）
- 防御 `battle_guard`：合う素材が無い

## 8. 実機で確認すること

- 主人公：剣 → 斬撃 → 命中のテンポ、命中音（短い「ドッ」）の強さ
- ケイオス：カットイン → 魔法陣 → 着弾の聞こえ方、彗星撃の重さ
- ガルド戦：ナイフの連続が機械的に聞こえないか、ボスへのヒットの重さ、撃破音
- DEBUG 戦闘演出プレビュー：レヴィ・アリア・ゼロの必殺技
- ×2：音が詰まって騒がしくならないか
- BGM との音量バランス（SFX スライダー基準）
