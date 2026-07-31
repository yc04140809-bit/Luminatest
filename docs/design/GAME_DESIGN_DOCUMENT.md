# CHAOS RE:BIRTH ゲーム設計書 Ver.1.2

Episode0 開発用マスタードキュメント / 長期IP前提の拡張設計

**最高位ルール**: [`PROJECT_BIBLE.md`](../../PROJECT_BIBLE.md) がこのプロジェクトの最高位ルールであり、本書を含むすべての設計・コードより優先する。矛盾する場合は必ずPROJECT_BIBLE.mdに従う。

**関連ドキュメント**: 「プレイヤーがケイオスちゃんを好きになる体験」を定義する体験設計書 → [`GAME_EXPERIENCE_DESIGN.md`](./GAME_EXPERIENCE_DESIGN.md)(HOME/親密度/Memory System/Live2D準備/戦闘演出分離/ワールド/図鑑等)。本書(技術設計書)はアーキテクチャ・データ構造を、体験設計書は何を・なぜ作るかを定義する。

---

## 改訂履歴

| Ver | 内容 |
|---|---|
| 1.0 | Episode0を完成させるための最小設計(技術選定〜MVP定義) |
| 1.1 | 長期IPとして育てる前提で、Asset管理/Character System/Story System/Battle System/Save System/Localization/Plugin化 の拡張設計を追加(第10〜16章)。あわせて会話パートの技術方針を自社製StoryEngine(JSON駆動)に更新。 |
| 1.2 | Character Gallery System(キャラクターギャラリー)の設計を追加(第18章)し、Godotプロジェクトへ実装。 |
| — | 体験設計書 `GAME_EXPERIENCE_DESIGN.md` Ver.2.0 を新設(HOME/Affection/Memory System等)。第18章Galleryの拡張要件(Memory一覧・お気に入り)は体験設計書 第10章を参照。 |

---

## 0. 目的とスコープ

- 本ドキュメントは **Episode0(プレイ時間30〜60分)を完成させる** ことのみを目的とする。
- 大規模な汎用RPGフレームワークは作らない。Episode0を動かすために必要な最小構成から出発し、後から拡張できる「余白のある設計」にする。
- 実装は本設計書のPhase1〜Phase3に従って段階的に進める。各Phase終了時に実機(またはエディタ)で動作確認を行う。
- 既存リポジトリ内の `index.html`(ケイオスちゃんチャットUI)、`img/kaosu/` のキャラクター素材は Episode0 のビジュアル・世界観の参照元として活用する。

---

## 1. 技術選定

### 1.1 結論

| レイヤー | 採用技術 |
|---|---|
| ゲームエンジン | **Godot Engine 4.x**(GDScript) |
| 会話・ノベルパート | **自社製 StoryEngine**(JSON駆動、`core/story_engine/` に実装。Dialogicは不採用) |
| 対象プラットフォーム | Android(APK/AAB, Godot標準Androidエクスポート) |
| データ形式 | シナリオ・キャラ・スキル等の**マスタデータはJSON**で外部化。実行時はGodot `Resource`にロードしてキャッシュ |
| セーブ | Godot `FileAccess` + モジュール分割セーブ(第14章)。将来の課金・ガチャ等に対応 |
| ローカライズ | テキストキー方式 + Godot Translation(CSV)/JSON併用(第15章) |
| アーキテクチャ | `core/`(汎用フレームワーク)と `game/`(IP固有コンテンツ)を分離するプラグイン構造(第16章) |
| バージョン管理 | Git / GitHub(本リポジトリ) |

### 1.2 選定理由

要求要件「無料〜低コスト / 将来拡張しやすい / 個人開発向け / スマホ向け / 保守しやすい」に対して評価する。

| エンジン | 費用 | スマホ最適化 | 個人開発適性 | 拡張性 | 保守性 | 判定 |
|---|---|---|---|---|---|---|
| **Godot 4** | 完全無料・MITライセンス(ロイヤリティなし) | 2D特化で軽量、Androidネイティブ書き出し標準対応 | GDScriptは学習コスト低・情報も増加中 | アドオン豊富、ノード/シーンで疎結合 | シーン単位で分離しやすい | **採用** |
| Unity | 個人利用は無料枠あり(条件・規約変更リスクあり) | 3D寄りでビルドが重くなりがち | C#必須、セットアップやや重い | Asset Store豊富 | プロジェクトが肥大化しやすい | 見送り |
| RPGツクールMV/MZ | 買い切り(有料) | モバイル最適化は手動対応が多い | 定型RPGは早いが自由度に制限 | プラグイン依存が強くなる | プラグイン競合が起きやすい | 見送り |
| Ren'Py | 無料 | ノベルパートは強いが戦闘システムは自作が重い | Python学習必要 | バトルUIは弱い | ノベル特化 | 見送り(参考採用: 会話演出の思想のみ) |
| Web(HTML/CSS/JS + Capacitor) | 無料 | 実装済み資産(index.html)が流用できる | 現状のプロトタイプがそのまま活きる | ライブラリ選定が分散しがち | 長期的にアプリらしい挙動(オフライン/アセット管理)の保守が難しくなる | 見送り(UI/配色のリファレンスとして活用) |

**結論**: Episode0は立ち絵・背景・会話・ターン制バトル・探索・セーブロードをすべて含む「小規模だが本格的なRPG」であり、これを**無料でAndroidネイティブに書き出せ、かつ2D特化で軽量・保守しやすい**Godot 4が最適。

既存の `index.html` は破棄せず、**UIの配色・レイアウト・世界観のリファレンス**として扱う(ゴールド×ダークパープルの高級感あるトーン、丸みのあるチャットUIなど)。

**Ver.1.1での方針変更(会話パート)**: Ver.1.0ではDialogic 2の採用を提案していたが、本プロジェクトを**長期IPとして育てる**前提に立つと、シナリオという最も価値の高い資産を**サードパーティ製アドオンの内部フォーマットに閉じ込めるのはリスク**と判断した(Godotのメジャーバージョン更新でアドオンが追随しない可能性、フォーマットがgit差分で読みにくい、非エンジニア(シナリオライター)が編集しづらい等)。
そのため、会話パートは**JSON駆動の自社製StoryEngine**(第12章)を実装する方針に変更する。UI描画コンポーネント(テキストボックス・選択肢ボタン等)自体は元々自作の想定(第5.3節)だったため、実装コストの増分は限定的である。

### 1.3 バージョン方針

- Godot 4.3以降の安定版(LTS的に使える最新の stable)を使用。
- 外部アドオンへの依存は最小限にとどめ、コア機能(会話・戦闘・セーブ)は自社実装で内製化する(第16章のプラグイン方針を参照)。

---

## 2. フォルダ構成

Godotプロジェクトとして以下の構成を採用する(`res://` = プロジェクトルート)。**Ver.1.1では「他作品にも流用できる汎用フレームワーク層(`core/`)」と「CHAOS RE:BIRTH固有のコンテンツ層(`game/`)」を分離する**(詳細方針は第16章)。

```
CHAOS_ReBirth/                        # Godotプロジェクトルート
├─ project.godot
│
├─ core/                              # ★汎用フレームワーク層(IPに依存しない・他作品へ流用可能)
│   ├─ story_engine/                  # 会話・ノベルパートエンジン(第12章)
│   │   ├─ StoryEngine.gd             # JSONシナリオを解釈・再生するコア
│   │   ├─ commands/                  # コマンド実装(say, choice, bgm, fx等。追加=ファイル追加のみ)
│   │   └─ StoryPlayer.tscn           # ノベル再生画面(UI)
│   ├─ battle_engine/                 # ターン制バトルフレームワーク(第13章)
│   │   ├─ BattleSystem.gd
│   │   ├─ BattleUnit.gd              # 戦闘中の1ユニット(HP/状態/ゲージ等)
│   │   ├─ effects/                   # DamageEffect, HealEffect, StatusEffect等(拡張ポイント)
│   │   └─ ElementChart.gd            # 属性相性計算
│   ├─ ui_kit/                        # 共通UIコンポーネント(第5.3節のパーツ群)
│   │   ├─ DialogueBox.tscn
│   │   ├─ ChoiceButton.tscn
│   │   ├─ HpBar.tscn
│   │   ├─ CommandButton.tscn
│   │   └─ PanelFrame.tscn
│   ├─ fx_engine/                     # 演出(トランジション/カメラ/パーティクル)
│   │   └─ SceneTransition.tscn
│   ├─ save_core/                     # セーブ基盤(モジュール分割・バージョン管理。第14章)
│   │   └─ SaveModule.gd              # 各セーブモジュールの基底クラス
│   └─ localization_core/             # ローカライズ基盤(第15章)
│       └─ LocalizationManager.gd
│
├─ game/                              # ★CHAOS RE:BIRTH 固有層(coreに依存するが、逆方向の依存は禁止)
│   ├─ autoload/                      # シングルトン(オートロード)
│   │   ├─ GameManager.gd             # 全体の状態管理・シーン遷移
│   │   ├─ SaveManager.gd             # save_core を用いたセーブ/ロード制御
│   │   ├─ AudioManager.gd            # BGM/SE再生・フェード制御
│   │   ├─ PartyManager.gd            # 所持キャラ・パーティ編成・所持品
│   │   └─ Flags.gd                   # シナリオフラグ・進行状態
│   │
│   ├─ scenes/
│   │   ├─ title/Title.tscn
│   │   ├─ map/
│   │   │   ├─ TownMap.tscn
│   │   │   └─ FieldMap.tscn
│   │   ├─ battle/Battle.tscn         # core/battle_engine を利用する画面
│   │   ├─ menu/                      # StatusScreen / ItemScreen / SkillScreen / SaveLoadScreen / SettingsScreen
│   │   └─ result/BattleResult.tscn
│   │
│   ├─ data/                          # ★マスタデータ本体(JSON中心。第11・12章)
│   │   ├─ characters/                # 1キャラ=1JSON(character_index.jsonで一覧管理)
│   │   ├─ enemies/
│   │   ├─ skills/
│   │   ├─ items/
│   │   ├─ elements/                  # 属性定義・相性表
│   │   ├─ status_effects/            # 状態異常・バフ/デバフ定義
│   │   └─ story/
│   │       └─ episode0/              # シーン単位のJSON(第12章)
│   │
│   ├─ localization/                  # 言語別テキスト(第15章)
│   │   ├─ ja/ ・en/ ・zh-CN/ ・ko/
│   │   └─ ui_strings/                # UI共通文言(CSV, Godot Translation用)
│   │
│   └─ assets/                        # ★素材本体(第10章のAsset管理ルールに従う)
│       ├─ characters/
│       │   └─ kaosu/                 # 例: img/kaosu を移植・再構成
│       ├─ backgrounds/
│       ├─ cg/
│       ├─ ui/
│       ├─ bgm/
│       ├─ se/
│       └─ fx/
│
└─ docs/
    └─ design/
        └─ GAME_DESIGN_DOCUMENT.md    # 本ファイル
```

**設計方針**:
- `core/` は CHAOS RE:BIRTH 固有の名称・データを一切参照しない(例: `core/battle_engine/` は `EnemyData` のようなIP固有クラス名ではなく、汎用インターフェースのみに依存する)。これにより将来別タイトルを作る際は `core/` を丸ごとコピーし、`game/` だけを作り直せばよい。
- `game/` は `core/` の公開APIのみを利用し、`core/` の内部実装に直接依存しない。
- `scenes/` は「画面」単位、`data/` は「データ」単位で分離。バトルUIやダイアログ等の再利用パーツは `core/ui_kit/` に集約する。
- キャラ・敵・スキル・アイテムはすべて Godot の `Resource` (カスタムクラス)として定義し、Inspector上で編集可能にする(エンジニア以外でも調整しやすい=保守性)。

---

## 3. 画面一覧

| No | 画面名 | 概要 | Phase |
|---|---|---|---|
| 1 | タイトル画面 | ロゴ、はじめから/つづきから/設定、演出BG | Phase1 |
| 2 | ストーリー(会話)画面 | 立ち絵・背景・テキストボックス・選択肢(Dialogic) | Phase1 |
| 3 | 街(拠点)画面 | 依頼受注、メニューへの入口、探索エリアへの移動 | Phase2 |
| 4 | 探索(フィールド)画面 | タップ移動 or 選択式のイベントポイント巡回 | Phase2 |
| 5 | バトル画面 | ターン制コマンドバトル(攻撃/スキル/アイテム/逃走) | Phase2 |
| 6 | バトルリザルト画面 | 獲得EXP・アイテム・レベルアップ演出 | Phase2 |
| 7 | メインメニュー | ステータス/アイテム/スキル/セーブ・ロード/設定への分岐 | Phase1〜2 |
| 8 | ステータス画面 | キャラのHP/レベル/装備/スキル一覧 | Phase2 |
| 9 | アイテム画面 | 所持アイテムの使用・確認 | Phase2 |
| 10 | セーブ/ロード画面 | スロット選択式(3〜5スロット想定) | Phase1 |
| 11 | 設定画面 | 音量、テキスト速度、データ削除等 | Phase3 |
| 12 | エンディング画面 | スタッフロール風、Episode1予告 | Phase3 |

将来拡張用に予約(Episode0では未実装): ショップ画面、ガチャ画面、お知らせ/イベント一覧画面。

---

## 4. ゲームループ

### 4.1 Episode0 全体フロー(マクロループ)

```
タイトル画面
   │ はじめから/つづきから
   ▼
オープニング(会話パート)
   ▼
ケイオスちゃん登場(会話パート・キャラ紹介)
   ▼
街(拠点) ── メニュー(ステータス/アイテム/セーブ)への分岐あり
   ▼
最初の依頼(会話パート・目的提示)
   ▼
探索(フィールド) → イベントポイントでランダム/固定エンカウント
   ▼
初戦闘(チュートリアルバトル: コマンド説明つき)
   ▼
バトルリザルト → 会話パート(イベント)
   ▼
探索(フィールド、深部へ)
   ▼
中ボス戦
   ▼
会話パート(真実が少し明らかになる)
   ▼
ラスボス戦
   ▼
エンディング(会話パート)
   ▼
Episode1 予告 → タイトルへ戻る
```

各矢印の遷移は `GameManager` が `Flags`(進行フラグ)を見て次のシーンを決定する。これにより「どのシーンの後に何が来るか」をコード変更なしに `data/story/episode0/` のシナリオ定義側で調整できるようにする。

### 4.2 バトル画面ループ(ミクロループ)

```
戦闘開始演出
   ▼
行動順決定(素早さステータスでソート)
   ▼
┌─ プレイヤーターン ────────────────┐
│ コマンド選択(攻撃/スキル/アイテム/逃げる)  │
│  → 対象選択 → 演出 → ダメージ計算 → HP反映 │
└──────────────────────────┘
   ▼
勝敗判定(敵全滅 / 味方全滅)
   │ 未決着
   ▼
┌─ 敵ターン ─────────────────────┐
│ AI行動選択 → 対象選択 → 演出 → ダメージ計算   │
└──────────────────────────┘
   ▼
勝敗判定 → 未決着なら行動順決定へループ
   │
   ├─ 勝利 → リザルト画面(EXP/アイテム/レベルアップ)
   └─ 敗北 → コンティニュー確認 → 直前セーブ地点 or タイトル
```

- タップ操作のみで完結させるため、コマンドはすべてボタンタップで選択(スワイプ・長押し等の複雑操作は使わない)。
- スマホ最優先のため、1ターンの情報量(選択肢数)を絞り、誤タップを防ぐレイアウト(ボタン最小サイズの確保)を徹底する。

---

## 5. UI構成

### 5.1 デザインコンセプト

「高級感 / アニメRPG風 / 透明感 / 神秘的 / 未来感」を、以下のビジュアル言語で統一する(既存 `index.html` の配色を踏襲・発展させる)。

- **カラーパレット**: ディープパープル×ブラックのベース(`#0d0a1a`〜`#1a1430`)に、ゴールド(`#d9b56a`〜`#f6e3a8`)のアクセント、要所にピンク(`#ff8ac9`)で「神秘感」を演出。
- **質感**: 半透明パネル(ガラスモーフィズム風、`backdrop-filter`的なぼかし)で「透明感・未来感」を表現。
- **タイポグラフィ**: 和文はゴシック体、数値・記号はやや未来的な等幅/幾何学フォントで差別化。
- **モーション**: 画面遷移はフェード/スライドで統一し、安っぽい即切り替えを避ける。ただしスマホの処理負荷を考慮し、常時パーティクルなどの重い演出は主要箇所(戦闘のスキル演出・イベントCG表示時)に限定する。

### 5.2 画面共通レイアウト規則(縦画面・タップ操作前提)

- 解像度基準: 縦長 9:16〜9:20 系(セーフエリア対応、ノッチ/ホームバー領域を避ける)。
- タップ領域は最小 44×44dp 以上を確保。
- 主要操作(次へ進む、コマンド選択)は画面下半分に集約し、片手持ちでの親指操作を想定。
- 会話パートは画面下部にテキストボックス、画面全体〜上部に立ち絵・背景・CGを表示するADV形式(FGO準拠)。

### 5.3 主要UIコンポーネント(再利用パーツ)

| コンポーネント | 用途 | 再利用箇所 |
|---|---|---|
| `DialogueBox` | 話者名＋本文＋タップで送り | ストーリー全般 |
| `ChoiceButton` | 選択肢 | ストーリー分岐 |
| `HpBar` / `StatusBadge` | HP・状態表示 | バトル、ステータス画面 |
| `CommandButton` | コマンド選択 | バトル、メニュー全般 |
| `PanelFrame` | 半透明の共通パネル枠 | 全メニュー画面 |
| `SceneTransition` | フェード演出 | 画面遷移全般 |
| `ConfirmDialog` | はい/いいえの確認 | セーブ上書き、逃走確認等 |

これらは `scenes/common/` および `scenes/battle/components/` に独立シーンとして配置し、他画面から `PackedScene` として呼び出す形で再利用性を担保する。

---

## 6. データ構造(Episode0 MVP時点の要点)

マスタデータは**JSONを正データ**とし、実行時にGodotの `RefCounted`/`Resource` オブジェクトへパースしてキャッシュする(バランス調整は非エンジニアでもJSONやスプレッドシート→JSON変換で編集できる)。詳細なスケーラブル設計は以下の章に分割して定義する。

- キャラクター関連の詳細設計 → **第11章 Character System**
- シナリオ・会話の詳細設計 → **第12章 Story System**
- 戦闘・属性・状態異常の詳細設計 → **第13章 Battle System**
- セーブデータの詳細設計 → **第14章 Save System**

以下はEpisode0で最低限必要な項目の要点のみ示す(実際のフィールド定義は各章を正とする)。

### 6.1 CharacterData(味方キャラ)の要点

id / display_name(ローカライズキー) / ステータス(HP・攻撃・防御・素早さ) / 属性(element_id) / skill_ids / レアリティ / 立ち絵参照(表情キー→ファイルパスは第10章の命名規則で自動解決)。→ 詳細は第11章。

### 6.2 EnemyData(敵)

```json
{
  "id": "enemy_slime_dark",
  "name_key": "enemy_slime_dark_name",
  "max_hp": 120,
  "attack": 18,
  "defense": 8,
  "speed": 10,
  "element": "dark",
  "skill_ids": ["skill_dark_bite"],
  "exp_reward": 30,
  "drop_item_ids": ["item_herb"],
  "is_boss": false,
  "sprite": "enemies/slime_dark.png"
}
```

### 6.3 SkillData(スキル)の要点

id / 名前・説明(ローカライズキー) / power / mp_cost / target_type / **effect_list(複数エフェクトを配列で保持し、ダメージ+状態異常付与のような複合効果に対応)** / 属性 / 必殺技フラグ・ゲージ消費量。→ 詳細は第13章。

### 6.4 ItemData(アイテム)

```json
{
  "id": "item_herb",
  "name_key": "item_herb_name",
  "description_key": "item_herb_desc",
  "item_type": "consumable",
  "effect_type": "heal",
  "effect_value": 50,
  "icon": "ui/icons/item_herb.png"
}
```

### 6.5 StorySceneData(会話・シナリオ)の要点

シーン単位のJSONで、背景・BGM・登場キャラ・表情・セリフ(ローカライズキー参照)・選択肢・分岐・フラグ操作・戦闘トリガーを表現する。ゲーム本体のコードを書き換えずにJSONファイルを追加するだけでシナリオを追加できる。→ 詳細は第12章。

### 6.6 SaveData(セーブデータ)の要点

Episode0時点で最低限必要なのは「進行状況・パーティ状態・所持品・フラグ」のみだが、**将来のガチャ・実績・課金等を見据えてモジュール分割**した構造で最初から実装する(単一の巨大セーブファイルにしない)。→ 詳細は第14章。

- 保存先: `user://saves/slot_{n}/` 以下にモジュールごとのファイルを分割保存(Godot標準のユーザーデータ領域、Android上ではアプリ内部ストレージ)。

---

## 7. 将来拡張案(Episode0時点では未実装、設計のみ考慮)

| 拡張要素 | 設計上の配慮 | 詳細章 |
|---|---|---|
| **ガチャ** | キャラクターにレアリティ・排出グループを持たせ、セーブ側にガチャ履歴・天井カウンタを保持できるモジュールを用意。 | 第11章・第14章 |
| **課金** | Google Play Billing連携用のプラグイン層を `game/autoload/` に `BillingManager.gd` として後日追加できるよう、決済ロジックとゲームロジックを分離。 | 第14章 |
| **イベント(期間限定)** | `game/data/story/` にepisode0と並列で `event_xxxx/` フォルダを追加するだけで拡張できる構造。 | 第12章 |
| **新章(Episode1〜)** | `game/data/story/episode1/` を追加し、`Flags` の `chapter_progress` で章の切り替えを行う。シナリオ側の作業のみで拡張可能にする。 | 第12章 |
| **新キャラ追加(100人以上を想定)** | 1キャラ=1JSONで追加するだけでパーティ編成候補に追加できる(コード変更不要)。 | 第11章 |
| **多言語展開** | テキストキー方式で全文言を外部化済みのため、翻訳ファイルの追加のみで対応。 | 第15章 |
| **他タイトルへの流用** | `core/` 層(会話・戦闘・UI・演出)はIP非依存のため、新規プロジェクトへそのまま移植可能。 | 第16章 |

**重要方針**: Episode0では上記機能を「実装しない」が、後から追加してもコアシステム(会話・戦闘・セーブ)を壊さないよう、**データ駆動設計**(コードにハードコードせずJSON/セーブモジュールの追加のみで完結させる)を徹底する。上記の詳細な設計は第10〜16章に記載する。

---

## 8. 開発スケジュール(Phase制)

個人開発・並行作業なしを前提に、目安の作業ボリュームで区切る(カレンダー日数ではなく「やることの区切り」を優先する)。

### Phase 1: 基盤構築
- Godotプロジェクト作成、`core/` / `game/` のフォルダ構成初期化
- `core/story_engine/` の最小実装(JSON1本を読み込み、立ち絵・背景・テキスト送り・選択肢を再生できること)
- `GameManager` / `SaveManager` / `AudioManager` の最小実装
- タイトル画面 → 会話シーン → タイトルに戻る、の一連が動くこと
- セーブ/ロードの最小動作確認(モジュール分割セーブの土台のみでよい)

✅ Phase1完了条件: 「タイトルから会話パートに入り、セーブ/ロードができる」ことを実機(またはエディタ)で確認。

### Phase 2: コアゲームシステム
- バトルシステム実装(コマンド選択→ダメージ計算→勝敗判定の一連)
- `CharacterData` / `EnemyData` / `SkillData` / `ItemData` の実データ整備(Episode0で使う分のみ)
- 街(拠点)・探索(フィールド)画面の実装(タップ移動 or ポイント選択方式)
- メインメニュー(ステータス/アイテム/セーブロード)の実装

✅ Phase2完了条件: 「街→探索→戦闘→リザルト→街」のループが最初から最後まで通しでプレイできる(仮素材でも可)。

### Phase 3: Episode0シナリオ実装・仕上げ
- Episode0の全シナリオ(オープニング〜エンディング)をJSONシナリオデータとして流し込み
- 中ボス・ラスボスのバランス調整
- BGM/SE/エフェクトの本組み込み
- UI/演出のブラッシュアップ(トランジション、ボタンタップ時のフィードバック等)
- 設定画面、エンディング画面の実装

✅ Phase3完了条件: Episode0をオープニングからエンディングまで通しプレイし、致命的なバグ・詰みポイントがない状態。

### 完成
- 実機(Android端末)での動作確認、APK/AABビルド
- 軽微な調整・最終QA

---

## 9. MVP定義(Minimum Viable Product)

Episode0における「これが揃えば完成と呼べる」最小ラインを以下と定義する。

**必須(MVP)**:
1. タイトル → オープニング → エンディングまで、ストーリー分岐なしで最初から最後まで通しプレイできる。
2. 立ち絵・背景切り替え・テキスト送り・選択肢(演出上の分岐で可、致命的な分岐でなくてよい)が機能する。
3. ターン制バトルが最低2回(初戦闘・中ボス、または初戦闘・ラスボス)発生し、勝敗判定・HP管理・スキル/アイテム使用が機能する。
4. レベル・経験値の概念が存在し、戦闘後に反映される。
5. セーブ・ロードが1スロット以上で機能し、アプリを閉じても再開できる。
6. BGM・SEが主要シーン(戦闘・イベント・エンディング等)で鳴る。
7. Androidの実機(またはエミュレータ)で縦画面・タップ操作のみで最後まで詰まずにプレイできる。

**MVPに含めない(Episode0では不要)**:
- ガチャ・課金要素
- 複数パーティ編成・仲間の入れ替え
- 多分岐シナリオ(true/badエンド分岐等の複雑な分岐構造)
- ランキング、フレンド等のオンライン要素
- 高度なグラフィック(3Dモデル、フルボイス等)

---

## 10. Asset管理設計

長期運用でアセット数が数百〜数千に膨れ上がっても破綻しないよう、**「フォルダ階層 = 検索の主軸」「ファイル名 = 一意な識別子」**をルール化する。

### 10.1 共通ルール

- ファイル名は **すべて半角英数字と `_`(アンダースコア)のみ**。日本語・スペース・全角文字は使用しない(クロスプラットフォームビルド時の事故防止)。
- 命名は `<種別>_<ID>_<バリエーション>.<拡張子>` を基本形とする。
- 1アセット1IDを徹底し、IDは `game/data/` 側のJSONが参照する識別子と完全一致させる(命名規則が一致していれば、コード側は**規約に基づき自動でパスを解決**でき、Inspectorで1体ずつ手動リンクする必要がない → 100人以上のキャラクターでも運用可能)。
- 元データ(psd/clip studio等の編集用ファイル)はゲームリポジトリに含めず、別途アセット管理(Google Drive等)で保管し、書き出し済みの最終ファイルのみをリポジトリに入れる(リポジトリの肥大化防止)。

### 10.2 種別ごとのフォルダ・命名ルール

| 種別 | 配置 | 命名例 | 補足 |
|---|---|---|---|
| **立ち絵(ベース)** | `game/assets/characters/<character_id>/base/` | `kaosu_base.png` | 表情差分の土台となる全身/バスト絵 |
| **表情差分** | `game/assets/characters/<character_id>/expressions/` | `kaosu_smile.png` / `kaosu_sad.png` / `kaosu_angry.png` | 差分キー(`smile`等)は全キャラ共通のボキャブラリーで統一し、StoryEngineから `character_id + expression_key` で自動解決する |
| **衣装差分** | `game/assets/characters/<character_id>/outfits/<outfit_id>/` | `kaosu_gothic_normal.png` | 衣装追加(ガチャ等)を見据え、衣装ごとにサブフォルダを切る |
| **背景** | `game/assets/backgrounds/<location_id>/` | `bg_town_day.png` / `bg_town_night.png` | 時間帯・天候等のバリエーションは同フォルダ内でsuffix管理 |
| **イベントCG** | `game/assets/cg/<episode_id>/` | `cg_ep0_001.png` / `cg_ep0_001_diff_a.png` | CG番号は各エピソード内で連番。差分(表情違い等)は `_diff_*` サフィックス |
| **BGM** | `game/assets/bgm/` | `bgm_battle_normal.ogg` / `bgm_town_day.ogg` | ループ用メタ情報(ループ開始/終了サンプル位置)は同名の `.json` を併置(例: `bgm_battle_normal.json`) |
| **SE** | `game/assets/se/<category>/` | `se/ui/button_tap.wav`, `se/battle/hit_normal.wav` | カテゴリ分けにより音量バス(UI/battle/system)をグループ管理しやすくする |
| **UI素材** | `game/assets/ui/<screen>/` | `ui/battle/hp_bar_frame.png`, `ui/common/panel_frame.png` | 画面横断で使う共通パーツは `ui/common/` に集約 |

### 10.3 インポート設定の方針(スマホ最適化)

- 立ち絵・背景・CG: モバイル向けに圧縮設定(Godotの `VRAM圧縮` + 必要に応じてミップマップ)を適用し、端末メモリを圧迫しない解像度を上限として定義する(例: 縦解像度2048px程度を上限)。
- UIアイコン等の小型素材はテクスチャアトラス化し、ドローコール数を抑える。
- BGMは `ogg vorbis`、短いSEは `wav` を基本とする(ループ性能と読み込み速度のバランス)。

### 10.4 アセット追加フロー

1. 命名規則に従いファイルを配置。
2. 対応するJSON(キャラ/背景/CG/BGM等のマスタデータ)にIDを追記。
3. コード変更なしでゲーム内から参照可能になる(規約に基づくパス自動解決のため)。

---

## 11. Character System(スケーラブル設計・100人以上対応)

### 11.1 設計方針

- **1キャラクター = 1データファイル(JSON)** とし、全キャラクターを常時メモリに載せない。`CharacterDatabase`(`game/autoload/`)が **IDベースで遅延ロード＋キャッシュ** する設計にすることで、キャラクター数が増えても起動時間・メモリ使用量が線形に悪化しない。
- キャラクター一覧の索引として `game/data/characters/character_index.json`(id・レアリティ・実装日等の軽量メタ情報のみ)を持ち、キャラ一覧UI(将来のガチャ結果画面・図鑑等)はこの索引だけを読み込めば済むようにする(詳細データは選択時に遅延ロード)。

### 11.2 CharacterData スキーマ(JSON)

```json
{
  "id": "kaosu",
  "name_key": "chara_kaosu_name",
  "profile_key": "chara_kaosu_profile",
  "rarity": 5,
  "element": "chaos",
  "voice_id": "va_001",
  "base_stats": { "hp": 320, "attack": 45, "defense": 28, "speed": 60 },
  "growth_curve_id": "growth_standard_a",
  "skill_ids": ["skill_kaosu_normal", "skill_kaosu_special"],
  "ultimate_skill_id": "skill_kaosu_ultimate",
  "tags": ["main_character", "episode0"],
  "gacha_pool_ids": [],
  "portrait": {
    "base": "characters/kaosu/base/kaosu_base.png",
    "expressions": ["normal", "smile", "sad", "angry", "surprised"],
    "default_expression": "normal"
  },
  "battle_sprite": "characters/kaosu/battle/kaosu_battle.png",
  "release_date": "2026-08-01"
}
```

- `name_key` / `profile_key` は第15章のローカライズキーを参照する(名前・プロフィール文も多言語対応)。
- `portrait.expressions` は表情キーのリストのみを持ち、実ファイルパスは第10章の命名規則(`characters/<id>/expressions/<id>_<expression>.png`)から自動解決する(1体ごとにパスを手打ちしない → 100人以上でも運用コストが増えない)。
- `voice_id` はボイス素材(将来追加)への参照。Episode0時点でボイス未収録でも欠番として問題なくロードできるようにNull許容にする。

### 11.3 CharacterDatabase(ランタイム)

```gdscript
# game/autoload/CharacterDatabase.gd
extends Node

var _cache: Dictionary = {}   # id -> CharacterRuntimeData
var _index: Array = []        # character_index.json の内容

func get_character(id: String) -> CharacterRuntimeData:
    if _cache.has(id):
        return _cache[id]
    var data = _load_character_json(id)
    _cache[id] = data
    return data
```

- 図鑑・ガチャ結果一覧など「大量のキャラを並べて表示する画面」は `_index` の軽量メタ情報のみでリスト描画し、詳細画面に遷移したタイミングで初めて `get_character()` を呼んでフルデータをロードする。

### 11.4 所持キャラクター(ロースター)との関係

- `CharacterData` は「マスタデータ(不変)」。プレイヤーが所持する個体差(レベル・経験値・凸/重複・お気に入り等)は別データ `CharacterInstance` として **セーブ側(第14章 RosterData)** に保持し、マスタデータと分離する。これにより同一キャラを複数体所持する将来のガチャ仕様にも対応できる。

---

## 12. Story System(外部データ化・JSON駆動)

### 12.1 設計方針

シナリオは **JSON外部データ** として管理し、`core/story_engine/StoryEngine.gd` がそれを解釈・再生する。**ゲーム本体(エンジン側コード)を書き換えることなく、シーンJSONファイルを追加するだけでシナリオを追加できる** ことを最重要要件とする。

### 12.2 フォルダ構成

```
game/data/story/
├─ episode0/
│   ├─ scene_index.json       # このエピソードのシーン一覧・遷移順(フラグ分岐も表現可)
│   ├─ ep0_001_opening.json
│   ├─ ep0_002_kaosu_meet.json
│   ├─ ep0_003_town.json
│   └─ ...
├─ episode1/                  # 将来追加。episode0と同構造を複製するだけでよい
└─ event_xxxx/                # 期間限定イベント。同様に並列追加
```

### 12.3 シーンJSONスキーマ

```json
{
  "scene_id": "ep0_002_kaosu_meet",
  "commands": [
    { "type": "background", "value": "bg_night_room" },
    { "type": "bgm", "value": "bgm_mystery", "fade_sec": 1.5 },
    { "type": "character_enter", "id": "kaosu", "position": "center", "expression": "normal" },
    { "type": "say", "speaker": "kaosu", "text_key": "ep0_002_line001" },
    { "type": "expression_change", "id": "kaosu", "expression": "smile" },
    { "type": "say", "speaker": "kaosu", "text_key": "ep0_002_line002" },
    { "type": "choice", "options": [
      { "text_key": "ep0_002_choice_a", "goto": "ep0_002_branch_a" },
      { "text_key": "ep0_002_choice_b", "goto": "ep0_002_branch_b" }
    ]},
    { "type": "set_flag", "flag": "met_kaosu", "value": true },
    { "type": "jump", "target": "ep0_003_town" }
  ]
}
```

### 12.4 コマンド一覧(拡張ポイント)

| type | 内容 |
|---|---|
| `background` | 背景切り替え |
| `bgm` / `se` | 音再生 |
| `character_enter` / `character_exit` | 立ち絵の表示/退場 |
| `expression_change` | 表情差分の切り替え |
| `say` / `narration` | セリフ・地の文表示(`text_key`でローカライズ参照) |
| `choice` | 選択肢分岐 |
| `set_flag` / `if_flag` | フラグ操作・条件分岐 |
| `cg_show` | イベントCG表示 |
| `battle` | 指定の戦闘データへ遷移 |
| `wait` | 演出待機 |
| `jump` | 別シーンJSONへ遷移 |

新しい演出コマンドが必要になった場合も、`core/story_engine/commands/` に**新しいコマンドクラスを1つ追加するだけ**で対応でき、既存シーンJSON・既存コマンドには影響しない(オープン・クローズド原則)。

### 12.5 テキストの扱い

シーンJSON内のセリフは生の文字列を直接埋め込まず、必ず `text_key` でローカライズテーブル(第15章)を参照する。これによりシナリオ本体はテキスト非依存になり、翻訳追加時にJSON自体を変更する必要がない。

---

## 13. Battle System(拡張設計: 属性 / 状態異常 / 必殺技 / バフ・デバフ)

### 13.1 設計方針

Episode0時点のバトルロジック(第4.2節のミクロループ)はそのままに、**「効果(Effect)」を差し替え可能な部品として扱う**ことで、将来の要素追加時に既存コードを変更せず拡張できるようにする(Strategy パターン)。

### 13.2 属性システム

```json
// game/data/elements/element_chart.json
{
  "elements": ["fire", "water", "wind", "light", "dark", "chaos", "neutral"],
  "chart": {
    "fire":  { "weak_to": ["water"], "strong_against": ["wind"] },
    "water": { "weak_to": ["wind"],  "strong_against": ["fire"] },
    "light": { "weak_to": ["dark"],  "strong_against": ["dark"] },
    "dark":  { "weak_to": ["light"], "strong_against": ["light"] }
  }
}
```

`core/battle_engine/ElementChart.gd` がこの表を読み込み、`attacker_element` と `defender_element` からダメージ倍率(弱点1.5倍、耐性0.5倍等)を算出する。属性を追加したい場合はJSONに1行追加するだけでよい。

### 13.3 状態異常・バフ/デバフ(StatusEffect)

バフ・デバフ・状態異常(毒/麻痺/睡眠等)を **同一の基底構造 `StatusEffectData`** として統一的に扱う。

```json
{
  "id": "status_poison",
  "category": "ailment",            
  "name_key": "status_poison_name",
  "icon": "ui/status/poison.png",
  "duration_turns": 3,
  "stack_rule": "refresh",          
  "tick_timing": "turn_end",
  "tick_effect": { "type": "damage", "value_percent_max_hp": 5 }
}
```

```json
{
  "id": "buff_attack_up",
  "category": "buff",
  "name_key": "status_attack_up_name",
  "icon": "ui/status/atk_up.png",
  "duration_turns": 3,
  "stack_rule": "stack",
  "stat_modifier": { "stat": "attack", "percent": 20 }
}
```

- `category`: `"buff"` / `"debuff"` / `"ailment"` の3種を同一スキーマで表現。
- `stack_rule`: `"refresh"`(上書き延長) / `"stack"`(重複加算) / `"ignore"`(付与不可)を選択でき、新しい状態異常を追加する際もこの3種の組み合わせで表現できる。
- 新しい状態異常タイプが必要になった場合は `tick_effect.type` に新しいエフェクト種別を追加するだけでよい(後述のBattleEffect拡張ポイントに準拠)。

### 13.4 BattleEffect(拡張ポイント)

```gdscript
# core/battle_engine/effects/BattleEffect.gd (基底クラス)
class_name BattleEffect
extends RefCounted

func apply(source: BattleUnit, target: BattleUnit, context: BattleContext) -> void:
    pass  # サブクラスでオーバーライド
```

サブクラス例: `DamageEffect` / `HealEffect` / `ApplyStatusEffect` / `StatModifierEffect` / `GaugeChargeEffect`。
`SkillData.effect_list` に **複数のBattleEffectを配列で指定**できるようにすることで、「ダメージを与えつつ状態異常を付与する」のような複合スキルも既存コード変更なしで表現できる。

```json
{
  "id": "skill_kaosu_special",
  "power": 80,
  "element": "chaos",
  "target_type": "single_enemy",
  "effect_list": [
    { "type": "damage" },
    { "type": "apply_status", "status_id": "status_poison", "chance_percent": 40 }
  ],
  "gauge_cost": 0,
  "is_ultimate": false
}
```

### 13.5 必殺技(アルティメット)ゲージ

- `BattleUnit` に `ultimate_gauge: int`(0〜100)を持たせ、通常攻撃を受ける/与えるごとに一定量チャージする(`GaugeChargeEffect`)。
- ゲージが満タンになると `ultimate_skill_id` で指定された必殺技が選択可能になり、使用後はゲージが `gauge_cost` 分消費される。
- 必殺技もスキルデータの一種(`is_ultimate: true`)として扱うため、通常スキルと同じ `effect_list` 拡張機構をそのまま使える。

### 13.6 拡張時に変更が不要な範囲

- `BattleSystem.gd` のターン進行ロジック本体。
- 既存スキル・敵データ(新しい属性/状態異常を使わない限り無改修)。

新しい属性・状態異常・必殺技演出を追加する際は、**JSONデータの追加 と 該当する場合のみ新規Effectクラスの追加** で完結し、既存のバトルフロー実装には触れない。

---

## 14. Save System(将来要素対応・モジュール分割設計)

### 14.1 設計方針

単一の巨大なセーブファイルにせず、**機能ごとにモジュール分割**し、モジュール単位でスキーマバージョンを持たせる。これにより将来「ガチャモジュールを追加」しても、既存のセーブファイル(古いバージョン)を破壊せずに読み込め、不足分はデフォルト値で補完(マイグレーション)できる。

### 14.2 セーブファイル構成

```
user://saves/slot_{n}/
├─ meta.json          # スロット一覧表示用の軽量サマリ(最終セーブ日時・プレイ時間・直近シーン名等)
├─ profile.json        # プレイヤー名・総プレイ時間・設定連動情報
├─ story_progress.json # story_flags, current_scene_id, chapter_progress
├─ roster.json          # ★所持キャラ一覧(CharacterInstance配列)
├─ inventory.json       # 所持アイテム
├─ achievements.json    # ★実績の解放状況・進捗
├─ gacha.json           # ★ガチャ通貨残高・天井カウンタ・排出履歴(要約)
├─ events.json          # ★参加中/参加済みイベントの進捗・期限・報酬受取状況
└─ billing.json         # ★購入済みプロダクトID・課金通貨台帳の参照
```

- `meta.json` のみをセーブスロット選択画面で読み込むことで、スロット一覧表示のために全モジュールをパースする無駄を避ける。
- 各JSONの先頭に `"schema_version": 1` を持たせ、ロード時にバージョンが古ければ不足フィールドをデフォルト値で補完してから最新バージョンとして扱う(**Episode0で存在しなかった `gacha.json` 等が後日追加されても、既存セーブが壊れない**)。

### 14.3 RosterData(所持キャラ)の例

```json
{
  "schema_version": 1,
  "owned_characters": [
    { "character_id": "kaosu", "level": 12, "exp": 3200, "duplicate_count": 1, "favorite": true, "equipped_skill_ids": ["skill_kaosu_normal"] }
  ]
}
```

`CharacterData`(マスタ、第11章)と `CharacterInstance`(所持個体、ここ)を分離しているため、キャラクターマスタを何百人分追加しても、セーブデータ側は「プレイヤーが実際に所持している分だけ」を保持すればよく、セーブファイルサイズが不必要に肥大化しない。

### 14.4 課金(billing.json)についての留意事項

- Episode0時点では課金機能自体を実装しないが、将来Google Play Billingと連携する際は**購入検証をクライアント側の値だけで信頼しない**(サーバーサイド検証 or 少なくともレシート情報の保持)方針を設計メモとして残す。`billing.json` はローカルの利便性キャッシュ(所持プロダクトの一覧)にとどめ、真の所有権の正はストア側レシートとする前提を崩さない。

---

## 15. Localization(多言語対応: 日本語 / 英語 / 中国語 / 韓国語)

### 15.1 設計方針

**すべてのユーザー向けテキストをキー化**し、生文字列をコード・シナリオJSON・マスタデータに直接埋め込まない。対象は以下の全種類:

- シナリオのセリフ・ナレーション・選択肢(第12章 `text_key`)
- キャラクター名・プロフィール(第11章 `name_key` / `profile_key`)
- スキル名・アイテム名・説明文・敵名
- UI固定文言(ボタン名、メニュー項目、システムメッセージ)
- 実績名・イベント名(第14章関連)

### 15.2 フォルダ構成

```
game/localization/
├─ ui_strings/            # UI固定文言(Godot Translation用CSV。tr()で参照)
│   └─ ui_strings.csv      # 1行1キー、列がja/en/zh-CN/ko
├─ ja/
│   ├─ story/episode0/ep0_001_opening.json   # シナリオと同じ構造をミラーリング
│   ├─ characters.json
│   ├─ skills.json
│   ├─ items.json
│   └─ enemies.json
├─ en/    (jaと同構造)
├─ zh-CN/ (jaと同構造)
└─ ko/    (jaと同構造)
```

- **UI固定文言**はGodot標準の翻訳機構(CSV → Translationリソースの自動インポート、`tr("KEY")`)をそのまま利用する(実装コストが低く枯れている)。
- **シナリオ・マスタデータのテキスト**は分量が多く、翻訳者(ライター)が言語ごとに作業しやすいよう、`game/data/` のフォルダ構造をそのまま `game/localization/<lang>/` にミラーリングしたJSON群として管理する。

### 15.3 テキスト解決の仕組み

```gdscript
# core/localization_core/LocalizationManager.gd
extends Node

var current_locale: String = "ja"

func t(key: String) -> String:
    # game/localization/<current_locale>/ 以下のロードキャッシュから引く
    # 未翻訳キーが見つからない場合は "ja" にフォールバックする
    ...
```

- 未翻訳のテキストキーがあっても**日本語へ自動フォールバック**することで、翻訳が追いつかない言語でもゲームが崩壊しない。
- 設定画面(第3章の画面一覧)に言語切り替えを追加し、選択言語は**セーブスロットではなく端末単位の設定**(`user://settings.cfg`)として保持する(進行データと切り離す)。

### 15.4 その他の考慮事項

- **フォント**: 日本語フォントだけでは中国語(簡体字)・韓国語のグリフをカバーできないため、Godotのフォントフォールバック機構で言語別フォントを切り替える。
- **UIレイアウト**: 英語・中国語は文字数が日本語と大きく異なる(英語は長くなりがち)ため、テキストボックス・ボタンは**可変長を前提としたオートリサイズ**で設計する(固定幅に文字列を無理やり収めない)。
- **画像内テキスト禁止**: CG・背景・UI画像に文字を直接焼き込まない。文字表示は必ずUIのテキストノード側で行い、ローカライズ対象から漏れないようにする。
- **ボイス**: Episode0では日本語ボイスのみを想定。`voice_id` は言語非依存の識別子とし、将来多言語ボイスを追加する場合は `voice_id + locale` で解決する設計にしておく(未収録言語は無音でフォールバック)。

---

## 16. Plugin化(コア・フレームワークの分離設計)

### 16.1 目的

会話・戦闘・UI・演出を「CHAOS RE:BIRTHというIP」から切り離し、**将来別のゲームタイトルでも流用できる資産**として設計する。

### 16.2 レイヤー分離ルール(第2章フォルダ構成の再掲・詳細化)

| レイヤー | 内容 | IPへの依存 |
|---|---|---|
| `core/story_engine/` | JSONシナリオ再生エンジン | なし。`text_key` や `character_id` はただの文字列として扱い、CHAOS RE:BIRTH固有の意味を持たせない |
| `core/battle_engine/` | ターン制バトルフレームワーク、属性/状態異常/エフェクト機構 | なし。`BattleUnit` は汎用ステータス構造のみを持つ |
| `core/ui_kit/` | ダイアログボックス、選択肢ボタン、HPバー等の共通UI部品 | 配色・フォントはテーマ設定(Theme Resource)として外部化し、`core/`側にIP固有の配色をハードコードしない |
| `core/fx_engine/` | 画面遷移・カメラ・パーティクル等の演出 | なし |
| `core/save_core/` | セーブのモジュール分割・バージョン管理基盤 | なし。保存する中身(RosterData等)は `game/` 側が定義 |
| `core/localization_core/` | テキストキー解決・言語切り替え基盤 | なし |
| `game/` | データ(キャラ/敵/スキル/シナリオ)、素材、CHAOS RE:BIRTH固有のシーン構成 | すべてここに閉じ込める |

### 16.3 依存方向のルール

- **`core/` → `game/` への参照は禁止**(一方向依存)。`core/` 内のスクリプトから `game/` 配下のクラス名・ファイルパスを直接参照してはならない。
- `core/` の各モジュールは、必要なデータを **引数・インターフェース経由で受け取る**(例: `StoryEngine.play(scene_json_path: String)`、`BattleSystem.start(battle_config: BattleConfig)`)。
- 新規タイトルを作る際は `core/` ディレクトリをそのままコピーし、`game/` のみを新規作成すれば、会話・戦闘・UI・演出の基盤をゼロから作り直す必要がない。

### 16.4 テーマ(配色・見た目)の外部化

第5章で定義した「高級感・アニメRPG風・透明感・神秘的・未来感」のトーンはCHAOS RE:BIRTH固有の演出方針であるため、Godotの `Theme` リソースとして `game/` 側に定義し、`core/ui_kit/` のコンポーネントはこのThemeを外部から注入される形にする(コンポーネント自体に色をハードコードしない)。これにより将来別タイトルでは配色を差し替えるだけで同じUI部品を使い回せる。

### 16.5 運用ルール

- `core/` 配下のコードレビュー時は「`game/` への依存が紛れ込んでいないか」を確認ポイントとする。
- 可能であれば、CIまたはpre-commitで `core/` 配下から `game/` を参照する `preload`/`load` 呼び出しがないかを簡易チェックするスクリプトを将来的に追加する(Episode0時点では手動レビューで代替し、過剰実装は避ける)。

---

## 18. Character Gallery System(キャラクターギャラリー)

### 18.1 目的・設計方針

プレイヤーが集めたイラスト・立ち絵・設定資料をいつでも閲覧できる機能。**ゲーム本編(ストーリー進行・戦闘)とは独立したサブシステム**として設計し、以下のいずれのタイミングでも(タイトル画面からでも、将来のホーム画面からでも)単独で起動・終了できるようにする。

新キャラクター・新衣装・イベントCG・季節イベント・コラボ・Live2Dが将来追加されても、**コードを触らずデータ追加だけで対応できる**ことを最重要要件とする。第16章のレイヤー分離方針に従い、以下のように配置する。

| レイヤー | 内容 | IPへの依存 |
|---|---|---|
| `core/gallery_engine/` | 解放条件の判定ロジック(`GalleryUnlockEvaluator`) | なし。判定に使う実データ(フラグ/所持品/パーティ等)はCallable経由でgame層から注入される |
| `core/ui_kit/` | サムネイル(`GalleryThumbnail`)、カテゴリタイル(`GalleryCategoryTile`)、フルスクリーン画像ビューア(`GalleryImageViewer`: タップ拡大・スワイプ送り) | なし。表示するのは画像パスと文字列のみ |
| `game/gallery/` | ギャラリー本体の画面構成・データ読み込み(`GalleryRepository`)・画面遷移(`GalleryRoot`) | CHAOS RE:BIRTH固有のデータ配線 |
| `game/data/gallery/` | カテゴリ定義・キャラごとのギャラリーデータ(JSON) | データそのもの |

### 18.2 表示カテゴリ

`game/data/gallery/gallery_categories.json` でカテゴリ一覧をデータ定義する(コード変更なしでカテゴリの追加・並び替え・無効化が可能)。

```json
{
  "categories": [
    { "id": "character_list", "name_key": "gallery_cat_character_list", "enabled": true },
    { "id": "standing_art",   "name_key": "gallery_cat_standing_art",   "enabled": true },
    { "id": "expressions",    "name_key": "gallery_cat_expressions",    "enabled": true },
    { "id": "event_cg",       "name_key": "gallery_cat_event_cg",       "enabled": true },
    { "id": "costumes",       "name_key": "gallery_cat_costumes",       "enabled": true },
    { "id": "weapons",        "name_key": "gallery_cat_weapons",        "enabled": true },
    { "id": "profile",        "name_key": "gallery_cat_profile",        "enabled": true },
    { "id": "voice",          "name_key": "gallery_cat_voice",          "enabled": false },
    { "id": "live2d",         "name_key": "gallery_cat_live2d",         "enabled": false }
  ]
}
```

`enabled: false` のカテゴリ(ボイス・Live2D)はタイル自体は表示するが、グレーアウト＋「Coming Soon」表示で非活性にする(将来実装時は `enabled: true` に変更するだけでよい)。`character_list` と `profile` はいずれもキャラクター一覧画面へ遷移する(プロフィールはキャラクター詳細画面の一部として閲覧する構成のため)。

### 18.3 データ構造(1キャラ = 1ギャラリーJSON)

`CharacterData`(第11章、戦闘・ロースター用)とは別に、**閲覧・収集用データを分離**した `game/data/gallery/<character_id>_gallery.json` を用意する。これにより戦闘バランス調整とギャラリー用フレーバーテキストの担当領域が混ざらない。

```json
{
  "character_id": "kaosu",
  "profile": {
    "name_key": "chara_kaosu_name",
    "alias_key": "chara_kaosu_alias",
    "profile_key": "chara_kaosu_profile",
    "world_setting_key": "chara_kaosu_world_setting",
    "affiliation_key": "chara_kaosu_affiliation",
    "element": "chaos",
    "height_cm": 152,
    "birthday": "??-??",
    "likes_key": "chara_kaosu_likes",
    "dislikes_key": "chara_kaosu_dislikes",
    "rarity": 5,
    "full_body_art": "characters/kaosu/gallery/kaosu_full_body.png",
    "unlock_conditions": [ { "type": "story_flag", "flag": "met_kaosu" } ]
  },
  "standing_art": [
    { "id": "kaosu_base", "image": "characters/kaosu/base/kaosu_base.png", "unlock_conditions": [] }
  ],
  "expressions": [
    { "id": "kaosu_normal", "image": "characters/kaosu/expressions/kaosu_normal.png", "unlock_conditions": [] },
    { "id": "kaosu_smile",  "image": "characters/kaosu/expressions/kaosu_smile.png",  "unlock_conditions": [ { "type": "story_flag", "flag": "met_kaosu" } ] }
  ],
  "event_cg": [
    { "id": "cg_ep0_001", "image": "cg/episode0/cg_ep0_001.png", "thumbnail": "cg/episode0/cg_ep0_001_thumb.png", "unlock_conditions": [ { "type": "story_flag", "flag": "ep0_midboss_cleared" } ] }
  ],
  "costumes": [
    { "id": "kaosu_gothic_dress", "image": "characters/kaosu/outfits/gothic_dress/kaosu_gothic_dress.png", "unlock_conditions": [ { "type": "item_owned", "item_id": "item_gothic_dress_ticket" } ] }
  ],
  "weapons": []
}
```

新キャラクターを追加する場合は `<新ID>_gallery.json` を1ファイル追加するだけでよく、`GalleryRepository` が起動時に `game/data/gallery/` を走査して自動的に読み込む(第11章のCharacterDatabaseと同じ思想)。スキル一覧はここでは持たず、`game/data/characters/<id>.json` の `skill_ids` を参照する(単一ソースの原則)。

### 18.4 解放条件

初期状態はすべて未解放。`core/gallery_engine/GalleryUnlockEvaluator` が以下4種の条件タイプを判定する。

| type | 条件 | 判定コンテキスト(game層から注入) |
|---|---|---|
| `story_flag` | 指定フラグが立っている | `Flags.get_flag(flag)` |
| `event_clear` | 指定イベントをクリア済み | 将来の `EventManager`(現状は `Flags` の規約キーで代替) |
| `party_join` | 指定キャラが仲間になっている | 将来の `PartyManager`(現状は `Flags` の規約キーで代替) |
| `item_owned` | 指定アイテムを所持 | 将来の `Inventory`(現状は `Flags` の規約キーで代替) |

`unlock_conditions` は配列で複数指定可能。`unlock_logic: "any"`(いずれか1つで解放、デフォルト)または `"all"`(すべて満たして解放)を選べる。**`core/gallery_engine` はFlags/Inventory/PartyManagerを直接参照せず、Callable経由でgame層から判定関数を注入される**(第16章の依存方向ルールを踏襲)。Phase2以降でInventory/PartyManager/EventManagerが実装され次第、注入するCallableの中身だけを差し替えればよく、コアロジックやギャラリーUI側の変更は不要。

### 18.5 画面構成

`GalleryRoot`(game層)が内部スタックで以下のビューを切り替える、独立したモーダル的サブアプリとして実装する(タイトル画面等から起動し、閉じると呼び出し元に戻る)。

```
GalleryRoot(戻る/閉じるボタン付きの共通フレーム)
 ├─ GalleryTopView            … カテゴリ選択(9タイル)
 ├─ GalleryCategoryGridView   … 選択カテゴリの全キャラ横断サムネイル一覧
 ├─ GalleryCharacterListView  … キャラクター一覧 + 検索/絞り込み
 ├─ GalleryCharacterDetailView… キャラクター詳細(プロフィール・スキル・取得済みCG)
 └─ GalleryImageViewer(共通オーバーレイ) … タップ拡大 + スワイプで次/前へ
```

- **キャラクター詳細画面**: 全身立ち絵、名前、二つ名、プロフィール、世界設定、所属、属性、身長、誕生日、好きなもの、嫌いなもの、スキル一覧、取得済みCG一覧を1画面に集約(縦スクロール)。
- **サムネイル → 拡大**: `GalleryThumbnail` タップで `GalleryImageViewer` をオーバーレイ表示。未解放サムネイルはシルエット表示でタップ無反応。
- **スワイプ送り**: `GalleryImageViewer` は開いた時点のカテゴリ内の**解放済み画像のみ**を配列として保持し、左右スワイプで前後移動する(タップで閉じる)。

### 18.6 検索・絞り込み

`GalleryCharacterListView` に検索バーを設置し、`GalleryRepository.get_character_summaries(filter)` へ以下のフィルタ条件を渡す。

- 名前(部分一致、`LineEdit`)
- 属性(`OptionButton`、キャラデータから動的に選択肢生成)
- 所属(同上)
- レアリティ
- 取得済み / 未取得(`CheckButton`、両方ON/OFFの組み合わせも許容)

フィルタはすべてクライアント側の絞り込みで完結し(キャラ数が数百規模になっても軽量なDictionaryフィルタで十分なパフォーマンスが出る想定)、サーバー通信は不要。

### 18.7 UI方針

第5章のUIコンセプト(高級感・アニメRPG風・透明感・神秘的・未来感)を踏襲し、ゴールド×ダークパープルの配色で統一する。`ScrollContainer` + `GridContainer` によるサムネイルグリッドで快適なスクロールを実現し、タップ領域は他画面同様44dp以上を確保する。

### 18.8 将来拡張

| 拡張要素 | 設計上の配慮 |
|---|---|
| **お気に入り登録** | `RosterData`(第14章)に `favorite: bool` を追加するだけで対応可能(既に設計済みのフィールドを流用)。 |
| **ホーム画面設定/壁紙保存** | `GalleryThumbnail` からの長押しメニュー等を追加する形で拡張。画像パス自体は既にデータとして持っているため、保存/設定処理を追加するだけでよい。 |
| **Live2D表示** | カテゴリ定義の `live2d.enabled` を `true` に切り替え、対応する再生コンポーネントを `core/ui_kit/` に追加。ギャラリーデータの `live2d_model` フィールドを各キャラJSONに追加するだけでデータ側は対応可能。 |
| **ボイス再生** | 同様に `voice.enabled` を `true` にし、`AudioManager.play_se` 系の仕組みを流用してボイス再生ボタンを追加。 |
| **季節衣装切替** | `costumes` エントリに `season` タグを追加し、`GalleryCategoryGridView` 側でタグフィルタを足すだけで対応。 |
| **人気ランキング** | 集計はサーバー/分析基盤側の話であり、クライアントは「お気に入り数」等のローカル集計値をランキングAPIに送るだけで対応可能な設計(ローカルのみでも簡易版は実装できる)。 |

上記はいずれも**既存のcore/gallery_engineやGalleryRootの構造を変更せず、データ追加または注入するCallableの差し替えのみ**で実現できることを設計上の要件とする。

---

## 19. 次のアクション

本設計書の内容で問題なければ、**Phase1(基盤構築)から実装を開始**する。
実装開始前に以下を確認したい:

1. Godotの導入(ローカル環境 or 本セッション上での開発)は問題ないか。
2. 立ち絵・背景・BGM/SE等の素材は「仮素材で進めてよいか」「既存 `img/kaosu/` 以外に用意があるか」。
3. Episode0のシナリオ本文(セリフ)は別途テキストとして用意するか、実装と並行してこちらで仮テキストを作成してよいか。
