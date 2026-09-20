# SE — 効果音

**現在この フォルダは空です。** 効果音は1つも納品されていません。
ゲームが無音なのは不具合ではなく、そういう状態です。

## 音源の置き方

**このフォルダに `<id>.mp3` という名前で置くだけです。**
コードの変更は一切要りません — import も、マップへの追記も、テストの更新も不要です。
`src/sfx.ts` がこのフォルダ自体を読みます。

ファイル名 `battle_hit.mp3` が、そのまま効果音 `battle_hit` になります。

> 名前を間違えると**無言で鳴らないだけ**です。それを防ぐために
> `src/sfxFiles.test.ts` がこのフォルダを読み、`SFX_IDS` に無い名前が
> あればテストが落ちます。

## 使える名前

`packages/mugen-core/content/audio/sfx.ts` の `SFX_IDS` が唯一の正です。
現在24種。うち戦闘・UIで**実際に鳴らす配線が済んでいるのは11種**です。

### 配線済み（置けば鳴る）

| ファイル名 | 鳴る瞬間 |
|---|---|
| `battle_start.mp3` | 戦闘開始時に1回 |
| `battle_attack_slash.mp3` | 長剣を振り始めた瞬間（LONG_SWORD / 剣術） |
| `battle_attack_dagger.mp3` | 二刀短剣（DUAL_DAGGERS）※装備者は現在いません |
| `battle_attack_thrust.mp3` | 槍（SPEAR）※装備者は現在いません |
| `battle_attack_bow.mp3` | 弓（BOW）※装備者は現在いません |
| `battle_hit.mp3` | 敵に命中した瞬間 |
| `battle_damage.mp3` | 自分が被弾した瞬間 |
| `battle_guard.mp3` | 防御の構え |
| `magic_cast.mp3` | 魔法のカットイン |
| `battle_win.mp3` | 勝利 |
| `ui_decide.mp3` | 戦闘コマンドの決定 |
| `ui_cancel.mp3` | コマンドの引き出しを閉じる |
| `ui_menu_open.mp3` | コマンドの引き出しを開く |
| `ui_menu_close.mp3` | 戦闘中の世界の記憶を閉じる |
| `ui_memory_open.mp3` | 戦闘中の世界の記憶を開く |

### 武器種と攻撃音の対応

`packages/mugen-core/content/audio/weaponSfx.ts` が唯一の正です。
**キャラクター名はこの表に一切出てきません** — 同じ武器を持つ人は
自動的に同じ音になります。

| 武器種 / 戦闘スタイル | 攻撃音 | 現在の装備者 |
|---|---|---|
| `LONG_SWORD`（長剣） | `battle_attack_slash` | 主人公 |
| `DUAL_DAGGERS`（二刀短剣） | `battle_attack_dagger` | なし |
| `SPEAR`（槍） | `battle_attack_thrust` | なし |
| `BOW`（弓） | `battle_attack_bow` | なし |
| `MAGIC`（魔法特化） | `magic_cast` | ケイオス |

選ばれる順番は **① スキル専用音 → ② 手に持っている武器 → ③ 戦い方**。
①がカットイン・アルカナ召喚・ボス固有技の受け口です。

### 名前はあるが未配線

`ui_tap` `explore_found` `explore_event_start` `explore_encounter`
`explore_marker` `battle_magic_hit` `battle_heal` `battle_buff`
`battle_debuff` `battle_critical` `story_choice` `story_event`
`story_memory_written`

置いても鳴りません。鳴らす場所を決めれば1〜2行で配線できます。

## 推奨する形式

| 項目 | 推奨 | 理由 |
|---|---|---|
| 形式 | **MP3** | BGMと同じ。Android WebView で確実に鳴る |
| サンプルレート | 44.1 / 48 kHz | BGMは48kHz |
| チャンネル | **モノラルで可** | 効果音に定位は不要。容量が半分 |
| ビットレート | 128〜192 kbps | 短いので容量は問題にならない |
| 長さ | **0.1〜1.5秒** | 連打される |
| 先頭の無音 | **入れない** | そのまま再生遅延になる |
| 音量 | ピーク −3dB 程度 | 個別調整は `SFX_GAIN` で可能 |

## 事前読み込み

戦闘の5種（`battle_attack_slash` `battle_hit` `battle_damage`
`battle_guard` `magic_cast`）は、プレイヤーが最初に画面へ触れた時点で
取得・デコードされます（`SFX_PRELOAD`）。振りの絵と同じフレームで音を
出すためで、初回の一撃だけ遅れるのを防ぎます。

UI の音は事前読み込みしません。短く、頻度が低く、10ミリ秒は誰も気づかないためです。

## Artifact には入りません

単一HTMLのArtifact（16MiB上限）は `src/sfx.ts` を `src/sfxNone.ts` に
差し替えてビルドされるため、**効果音は1バイトも入りません**。
最後の1MBは絵に使うべきで、剣の音が正しいかはAPKで確かめる話だからです。
Android版はこのフォルダの納品ファイルをそのまま収録します。

## ライセンス

**現在このフォルダに第三者の素材はありません。**

外部素材を入れる場合は、以下を確認のうえ、このREADMEに出典・作者・
ライセンス・入手日を記録してください。

- 商用利用が可能か
- ゲームに組み込んでの**再配布**が可能か
- クレジット表記が必要か（必要なら文面と掲示場所）
