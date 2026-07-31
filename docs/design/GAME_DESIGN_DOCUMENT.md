# CHAOS RE:BIRTH ゲーム設計書 Ver.1.0

Episode0 開発用マスタードキュメント

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
| 会話・ノベルパート | Godot アドオン **Dialogic 2** |
| 対象プラットフォーム | Android(APK/AAB, Godot標準Androidエクスポート) |
| データ形式 | Godot `Resource`(.tres) ＋ 一部 JSON(バランス調整用マスタデータ) |
| セーブ | Godot `FileAccess` + 独自SaveDataResourceのシリアライズ(暗号化オプション有) |
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

**結論**: Episode0は立ち絵・背景・会話・ターン制バトル・探索・セーブロードをすべて含む「小規模だが本格的なRPG」であり、これを**無料でAndroidネイティブに書き出せ、かつ2D特化で軽量・保守しやすい**Godot 4が最適。会話パートは自作せず、実績のあるアドオン **Dialogic 2** を使うことで、FGOのような「立ち絵＋背景＋テキストボックス＋選択肢」の会話システムを低コストで実現する。

既存の `index.html` は破棄せず、**UIの配色・レイアウト・世界観のリファレンス**として扱う(ゴールド×ダークパープルの高級感あるトーン、丸みのあるチャットUIなど)。

### 1.3 バージョン方針

- Godot 4.3以降の安定版(LTS的に使える最新の stable)を使用。
- Dialogicはリリースされている安定版タグを固定して利用し、破壊的アップデートを避ける。

---

## 2. フォルダ構成

Godotプロジェクトとして以下の構成を採用する(`res://` = プロジェクトルート)。

```
CHAOS_ReBirth/                      # Godotプロジェクトルート
├─ project.godot
├─ autoload/                        # シングルトン(オートロード)
│   ├─ GameManager.gd               # ゲーム全体の状態管理・シーン遷移
│   ├─ SaveManager.gd               # セーブ/ロード
│   ├─ AudioManager.gd              # BGM/SE再生・フェード制御
│   ├─ PartyManager.gd              # パーティ・所持品・レベル管理
│   └─ Flags.gd                     # シナリオフラグ・進行状態
│
├─ scenes/
│   ├─ title/
│   │   └─ Title.tscn
│   ├─ story/
│   │   └─ StoryPlayer.tscn         # Dialogicを呼び出すノベル再生画面
│   ├─ map/
│   │   ├─ TownMap.tscn             # 街(拠点)
│   │   └─ FieldMap.tscn            # 探索エリア
│   ├─ battle/
│   │   ├─ Battle.tscn
│   │   └─ components/
│   │       ├─ BattleUI.tscn
│   │       ├─ HpBar.tscn
│   │       ├─ CommandPanel.tscn
│   │       └─ SkillList.tscn
│   ├─ menu/
│   │   ├─ MainMenu.tscn            # ステータス/アイテム/スキル/セーブ/設定 の入口
│   │   ├─ StatusScreen.tscn
│   │   ├─ ItemScreen.tscn
│   │   ├─ SkillScreen.tscn
│   │   ├─ SaveLoadScreen.tscn
│   │   └─ SettingsScreen.tscn
│   ├─ result/
│   │   └─ BattleResult.tscn
│   └─ common/
│       ├─ SceneTransition.tscn     # フェード等の画面遷移演出
│       └─ ConfirmDialog.tscn       # 共通確認ダイアログ
│
├─ scripts/
│   ├─ battle/                      # BattleSystem, Turn計算, DamageFormula 等
│   ├─ data/                        # Character, Enemy, Skill, Item の Resourceクラス定義(.gd)
│   ├─ save/                        # SaveData Resourceクラス
│   └─ utils/                       # 共通ユーティリティ
│
├─ data/                            # マスタデータ本体(.tres / .json)
│   ├─ characters/                  # 味方キャラ定義
│   ├─ enemies/                     # 敵キャラ定義
│   ├─ skills/                      # スキル定義
│   ├─ items/                       # アイテム定義
│   └─ story/
│       └─ episode0/                # Dialogicのタイムライン(章・シーン単位)
│
├─ assets/
│   ├─ characters/                  # 立ち絵(表情差分含む)
│   │   └─ kaosu/                   # 例: img/kaosu を移植・再エクスポート
│   ├─ backgrounds/                 # 背景CG
│   ├─ cg/                          # イベントCG(スチル)
│   ├─ ui/                          # UIパーツ(ボタン・枠・アイコン)
│   ├─ bgm/
│   ├─ se/
│   └─ fx/                          # エフェクト(パーティクル/スプライトシート)
│
├─ addons/
│   └─ dialogic/                    # 会話システムアドオン
│
└─ docs/
    └─ design/
        └─ GAME_DESIGN_DOCUMENT.md  # 本ファイル
```

**設計方針**:
- `scenes/` は「画面」単位、`scripts/` は「ロジック」単位、`data/` は「データ」単位で分離。
- バトルUIは `components/` 以下に細分化し、他画面でも再利用可能なパーツ(HPバー、確認ダイアログ等)は `common/` に集約。
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

## 6. データ構造

Godotの `Resource`(カスタムクラス)としてマスタデータを定義する。バランス調整は非エンジニアでも `.tres` をInspectorで編集できるようにする。

### 6.1 CharacterData(味方キャラ)

```gdscript
class_name CharacterData
extends Resource

@export var id: String
@export var display_name: String
@export var max_hp: int
@export var attack: int
@export var defense: int
@export var speed: int
@export var skill_ids: Array[String]
@export var portrait_variants: Dictionary   # 例: {"normal": Texture2D, "smile": Texture2D, "sad": Texture2D}
@export var battle_sprite: Texture2D
```

### 6.2 EnemyData(敵)

```gdscript
class_name EnemyData
extends Resource

@export var id: String
@export var display_name: String
@export var max_hp: int
@export var attack: int
@export var defense: int
@export var speed: int
@export var skill_ids: Array[String]
@export var exp_reward: int
@export var drop_item_ids: Array[String]
@export var is_boss: bool = false
@export var sprite: Texture2D
```

### 6.3 SkillData(スキル)

```gdscript
class_name SkillData
extends Resource

@export var id: String
@export var display_name: String
@export var description: String
@export var power: int
@export var mp_cost: int
@export var target_type: String   # "single_enemy" / "all_enemies" / "self" / "ally"
@export var effect_type: String   # "damage" / "heal" / "buff" / "debuff"
@export var animation_id: String
```

### 6.4 ItemData(アイテム)

```gdscript
class_name ItemData
extends Resource

@export var id: String
@export var display_name: String
@export var description: String
@export var item_type: String     # "consumable" / "key_item" / "equipment"
@export var effect_type: String
@export var effect_value: int
@export var icon: Texture2D
```

### 6.5 StorySceneData(会話・シナリオ)

Dialogicのタイムライン(`.dtl`)を基本フォーマットとして採用し、以下の要素を1シーン単位で管理する:

- 背景指定(background_id)
- 登場キャラと立ち絵差分(character_id, expression)
- BGM/SE指定
- セリフ・ナレーション
- 選択肢と分岐先タイムラインID
- シーン終了時に立てる `Flags`(進行フラグ)

### 6.6 SaveData(セーブデータ)

```gdscript
class_name SaveData
extends Resource

@export var save_slot: int
@export var save_timestamp: String
@export var current_scene_id: String
@export var play_time_seconds: int
@export var party_state: Array[Dictionary]   # 各キャラのHP/レベル/EXP/装備
@export var inventory: Dictionary            # item_id -> 所持数
@export var story_flags: Dictionary          # flag_id -> bool/int
@export var chapter_progress: String         # 例: "episode0_midboss_cleared"
```

- 保存先: `user://saves/slot_{n}.tres`(Godot標準のユーザーデータ領域、Android上ではアプリ内部ストレージ)。
- 将来的なチート対策として軽量な整合性チェック(簡易ハッシュ)を付与可能な設計にしておくが、Episode0時点では必須としない(過剰実装を避ける)。

---

## 7. 将来拡張案(Episode0時点では未実装、設計のみ考慮)

| 拡張要素 | 設計上の配慮 |
|---|---|
| **ガチャ** | `CharacterData` に排出率グループ・レアリティ属性を後付け可能な設計(現状のフィールドは追加のみで破壊的変更が不要な形にする)。ガチャ演出画面は `scenes/` に独立追加。 |
| **課金** | Google Play Billing連携用のプラグイン層を `autoload/` に `BillingManager.gd` として後日追加できるよう、決済ロジックとゲームロジックを分離しておく。 |
| **イベント(期間限定)** | `data/story/` にepisode0と並列で `event_xxxx/` フォルダを追加するだけで拡張できる構造。 |
| **新章(Episode1〜)** | `data/story/episode1/` を追加し、`Flags` の `chapter_progress` で章の切り替えを行う。シナリオ側の作業のみで拡張可能にする。 |
| **新キャラ追加** | `CharacterData` をリソースとして追加するだけでパーティ編成候補に追加できる(コード変更最小化)。 |
| **パーティ編成/仲間システム** | `PartyManager` を最初から「複数キャラを保持できる」設計にしておき、Episode0では固定パーティでも内部的には拡張可能な配列構造で扱う。 |

**重要方針**: Episode0では上記機能を「実装しない」が、後から追加してもコアシステム(会話・戦闘・セーブ)を壊さないよう、**データ駆動設計**(コードにハードコードせず `.tres` / タイムラインデータで完結させる)を徹底する。

---

## 8. 開発スケジュール(Phase制)

個人開発・並行作業なしを前提に、目安の作業ボリュームで区切る(カレンダー日数ではなく「やることの区切り」を優先する)。

### Phase 1: 基盤構築
- Godotプロジェクト作成、フォルダ構成の初期化
- Dialogicアドオン導入、テスト会話シーン1本(立ち絵・背景・テキスト送り・選択肢)
- `GameManager` / `SaveManager` / `AudioManager` の最小実装
- タイトル画面 → 会話シーン → タイトルに戻る、の一連が動くこと
- セーブ/ロードの最小動作確認(1スロットでよい)

✅ Phase1完了条件: 「タイトルから会話パートに入り、セーブ/ロードができる」ことを実機(またはエディタ)で確認。

### Phase 2: コアゲームシステム
- バトルシステム実装(コマンド選択→ダメージ計算→勝敗判定の一連)
- `CharacterData` / `EnemyData` / `SkillData` / `ItemData` の実データ整備(Episode0で使う分のみ)
- 街(拠点)・探索(フィールド)画面の実装(タップ移動 or ポイント選択方式)
- メインメニュー(ステータス/アイテム/セーブロード)の実装

✅ Phase2完了条件: 「街→探索→戦闘→リザルト→街」のループが最初から最後まで通しでプレイできる(仮素材でも可)。

### Phase 3: Episode0シナリオ実装・仕上げ
- Episode0の全シナリオ(オープニング〜エンディング)をDialogicタイムラインとして流し込み
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

## 10. 次のアクション

本設計書の内容で問題なければ、**Phase1(基盤構築)から実装を開始**する。
実装開始前に以下を確認したい:

1. Godotの導入(ローカル環境 or 本セッション上での開発)は問題ないか。
2. 立ち絵・背景・BGM/SE等の素材は「仮素材で進めてよいか」「既存 `img/kaosu/` 以外に用意があるか」。
3. Episode0のシナリオ本文(セリフ)は別途テキストとして用意するか、実装と並行してこちらで仮テキストを作成してよいか。
