# CHAOS RE:BIRTH — Game Experience Design Ver.2.0

「ケイオスちゃんに会いたい」と思える体験の設計書

---

## 0. 本ドキュメントの位置づけ

- [`GAME_DESIGN_DOCUMENT.md`](./GAME_DESIGN_DOCUMENT.md) が **技術設計書**(エンジン・フォルダ構成・データ構造・アーキテクチャ)であるのに対し、本ドキュメントは **体験設計書**(プレイヤーが何を感じ、何に愛着を持つか)を定義する。両者は補完関係にあり、本書で定義する体験は技術設計書のアーキテクチャ(`core/`・`game/`分離、JSON外部データ駆動、モジュール分割セーブ等)の上に実装される。
- 対応する実装箇所には技術設計書の章番号を `→ 技術設計書 第n章` の形式で相互参照する。

### 0.1 研究方針(コピー禁止)

FGO・ブルーアーカイブ・NIKKE・ペルソナ・ニーアといった作品群から抽出すべきは**個別の演出や画面レイアウトではなく、「なぜプレイヤーが愛着を持つのか」という構造原理**である。

| 参照元 | 抽出した原理(表面のコピーはしない) |
|---|---|
| FGO | 高密度なテキスト演出と「マイルームでの会話蓄積」による関係性の実感 |
| ブルーアーカイブ | 「生徒会室/部室」という帰属先(居場所)の感覚、日常の解像度の高さ |
| NIKKE | 時間帯・親密度に応じた自室の変化、キャラクターが"待っている"感覚 |
| ペルソナ | カレンダー・関係性ランクによる「積み重ねた時間」の可視化 |
| ニーア | 環境音・BGMが語る没入感、派手さより「静けさ」で魅せる演出 |

これらから導いた CHAOS RE:BIRTH 独自の核心原理は以下の3つ。

1. **時間は嘘をつかない**: 現実の時間経過(時間帯・ログイン間隔・誕生日・周年)がそのままケイオスちゃんの反応に反映される(Memory System / Home参照)。
2. **思い出は蓄積し、劣化しない**: 一度記録された思い出は消えず、文脈に応じて自然に呼び戻される(Memory System)。
3. **UIは主張しない**: ホームの主役は常にケイオスちゃんであり、UIはその体験を邪魔しない最小限の存在に徹する(Atmosphere)。

---

## 1. HOME(ホーム画面)

### 1.1 位置づけ

ゲーム起動後・タイトルの「はじめから/つづきから」の後は**必ずホームへ遷移**する(ホームが実質的なメインメニュー兼「帰る場所」)。ストーリー・戦闘・ワールド・キャラクター・ギャラリー・図鑑・設定、すべてホームを起点に開閉する。

### 1.2 表示要素

- ケイオスちゃんの立ち絵(将来Live2D、第5章参照)を画面中央〜やや下に配置。UIチロムは最小限にし、常に画面の主役はケイオスちゃんであることを崩さない。
- 背景・BGM・ライティング(色調オーバーレイ)は時間帯に応じて自動切替。
- 下部にストーリー/ワールド/バトル/キャラクター/ギャラリー/図鑑/設定への導線(アイコン、最小限のタップ数)。

### 1.3 時間帯システム

`game/data/home/time_bands.json` で時間帯の境界・演出をデータ定義する(コード変更なしで時間帯の追加・調整が可能)。

```json
{
  "bands": [
    { "id": "morning",   "start_hour": 5,  "end_hour": 9,  "background": "home/bg_morning.png",  "lighting_tint": "#FFF3D6", "bgm": "bgm_home_morning" },
    { "id": "noon",      "start_hour": 9,  "end_hour": 16, "background": "home/bg_noon.png",     "lighting_tint": "#FFFFFF", "bgm": "bgm_home_noon" },
    { "id": "evening",   "start_hour": 16, "end_hour": 19, "background": "home/bg_evening.png",  "lighting_tint": "#FFC98A", "bgm": "bgm_home_evening" },
    { "id": "night",     "start_hour": 19, "end_hour": 24, "background": "home/bg_night.png",    "lighting_tint": "#4A5BB0", "bgm": "bgm_home_night" },
    { "id": "midnight",  "start_hour": 0,  "end_hour": 5,  "background": "home/bg_midnight.png", "lighting_tint": "#20244A", "bgm": "bgm_home_midnight" }
  ]
}
```

ライティングは背景の上に色調オーバーレイ(半透明ColorRect / CanvasModulate相当)を重ねるだけの軽量実装とし、モバイルでの負荷を抑える。

### 1.4 グリーティング(挨拶)ライン合成

ホーム表示時、以下の要素を合成して1つの挨拶ラインを組み立てる `HomeGreetingComposer`(game層)を用意する。

1. **時間帯コンテキスト**(上記time_bands)
2. **天候/季節コンテキスト**(`game/data/home/weather_lines.json` , `season_lines.json` — 任意要素。天候は端末時刻から疑似生成 or 将来API連携、季節は日付から算出)
3. **ログイン日数コンテキスト**(連続ログイン日数、初回ログインからの経過日数)
4. **Memory参照**(第3章)— その時点で「言えること」があれば優先的に混ぜ込む

優先順位: **Memory(特に高重要度のもの) > 誕生日/周年などの特別日 > 天候/季節 > 通常の時間帯挨拶**。ただし同じ話ばかりにならないよう、Memory側のクールダウン・参照回数制御(第3章)で頻度を制御する。**すべてを毎回言わせるのではなく、時には「今日はいつも通りの一言」で済ませる余白**を意図的に残す(過剰な演出はかえって安っぽく見えるため)。

---

## 2. AFFECTION(親密度システム)

### 2.1 データ構造

親密度の上限は**データ定義でいくらでも拡張可能**にする(ハードコード禁止)。`game/data/affection/<character_id>_affection.json`:

```json
{
  "character_id": "kaosu",
  "levels": [
    { "level": 1,  "required_points": 0 },
    { "level": 2,  "required_points": 100 },
    { "level": 10, "required_points": 5000 },
    { "level": 100, "required_points": 200000 }
  ],
  "rewards": [
    { "level": 5,  "unlocks": [{ "type": "gallery_entry", "category": "expressions", "id": "kaosu_shy" }] },
    { "level": 10, "unlocks": [{ "type": "story_scene", "scene_path": "res://game/data/story/affection/kaosu_lv10.json" }] },
    { "level": 20, "unlocks": [{ "type": "gallery_entry", "category": "costumes", "id": "kaosu_casual" }] },
    { "level": 30, "unlocks": [{ "type": "voice_line", "id": "voice_kaosu_affection_30" }] }
  ]
}
```

現在の親密度ポイント・レベルはセーブ側のモジュール(`affection.json`、→ 技術設計書 第14章)に保存する。**親密度がゲート役として機能する対象は会話・CG・衣装・プロフィール項目・特別ストーリー・ボイス・演出**であり、すべて第2.2節の共通解放条件で表現する。

### 2.2 解放条件の統合(アーキテクチャ提案)

→ 技術設計書 第18章で実装した `core/gallery_engine/GalleryUnlockEvaluator` は元々 `story_flag / event_clear / party_join / item_owned` の4種を判定できる汎用エンジンである。本設計では、これを **`core/unlock_engine/UnlockEvaluator`(名称変更・汎用化)としてGallery専用から格上げし**、以下2種の条件タイプを追加する。

| type | 条件 |
|---|---|
| `affection_level` | 指定キャラの親密度が指定レベル以上 |
| `memory_recorded` | 指定Memory IDが記録済み(第3章) |

これにより、**Gallery・Memory・Affection報酬・将来のCollection・World解放が同一の判定ロジックを共有**する。判定コンテキスト(Callable注入)も一本化され、Flags/Inventory/PartyManager/AffectionManager/MemoryManagerへの参照はすべてgame層の1箇所(`UnlockContext.gd`のようなハブ)にまとめられる。**この統合はPhase2実装時の最優先リファクタリングとして推奨する**(第14章の「20個の追加システム案」とは別に、既存基盤の整理として位置づける)。

### 2.3 親密度と口調変化

親密度レベル帯に応じて、呼び方・口調・距離感がテキストキー側で変化する(コード変更不要、ローカライズテーブルに `_affection_low` / `_affection_mid` / `_affection_high` のようなバリアントキーを持たせ、`LocalizationManager` 相当の解決時に現在の親密度帯を考慮する拡張を第15章の仕組みに追加する)。

---

## 3. MEMORY SYSTEM(独自システム)

### 3.1 設計思想

Memory Systemは単なるフラグ管理ではない。**「プレイヤーとケイオスちゃんが共有した時間」を記録し、文脈に応じて自然に呼び戻す**ことで、「覚えていてくれている」感覚を作る。第16章の`core/game`分離方針に従い、**選定ロジック(いつ・どのMemoryを話すか)はIP非依存のcore層**、**Memoryの中身(何を記録するか)はgame層のデータ**として分離する。

### 3.2 レイヤー構成

| レイヤー | 内容 |
|---|---|
| `core/memory_engine/MemorySelector` | 記録済みMemoryの一覧からスコアリングして1件選ぶ汎用ロジック(IP非依存) |
| `game/memory/MemoryManager` | トリガー監視・記録・セーブ連携・`MemorySelector`へのデータ供給(game層) |
| `game/data/memory/*.json` | Memory定義本体(イベント追加=このJSON追加のみ) |

### 3.3 Memory定義(静的データ、JSON外部管理)

```json
{
  "id": "mem_first_battle",
  "category": "milestone",
  "tags": ["battle", "temple", "episode0"],
  "importance": 8,
  "trigger": { "type": "story_flag", "flag": "ep0_first_battle_cleared" },
  "text_key": "memory_first_battle_line",
  "reference_cooldown_days": 3,
  "max_references": null
}
```

**トリガー種別**(発生条件、第18章のGallery解放条件と同じ語彙 + Memory専用の追加型):

| type | 内容 |
|---|---|
| `story_flag` / `event_clear` / `item_owned` | 第18章と共通 |
| `first_time` | 初回発生系(`kind`: `login`/`battle_win`/`battle_loss`/`level_up`/`boss_defeat`/`event_clear`/`outfit_change`/`skill_learned`) |
| `login_streak` | 連続ログイン日数が閾値到達(例: 7日/30日/100日) |
| `absence_return` | 一定日数以上ログインが無かった後の復帰(例: 14日以上) |
| `date_special` | 誕生日、ゲーム開始からの周年(`unit`: `day`/`month`/`year`) |
| `favorite_selected` | プレイヤーがお気に入り武器/衣装等を選択した |

### 3.4 実行時状態(セーブ側、→ 技術設計書 第14章)

Memory定義自体は不変データだが、「いつ発生し」「何回参照され」「最後にいつ参照したか」はプレイヤー固有の状態のため、セーブのモジュール(`memory.json`)に保持する。

```json
{
  "schema_version": 1,
  "records": {
    "mem_first_battle": { "occurred_at": "2026-08-02T19:31:00", "reference_count": 2, "last_referenced_at": "2026-08-10T09:00:00" }
  }
}
```

### 3.5 選定アルゴリズム(同じ話の繰り返しを防ぐ)

`core/memory_engine/MemorySelector` は「発生済み(記録済み)」かつ「クールダウン・参照上限を超えていない」Memoryの中から、以下のスコアで重み付き抽選する。

```
score = importance
      × freshness_factor(reference_countが少ないほど高い)
      × recency_factor(occurred_atが古すぎても新しすぎても補正)
      × tag_diversity_factor(直近参照したMemoryと同じtagを持つ場合は減衰)
      + random_jitter(小さなランダム性で完全な決定論を避ける)
```

選定後、`reference_count += 1` , `last_referenced_at = now` を更新する。**該当するMemoryが無い場合は無理に何か言わせず、通常の時間帯挨拶に留める**(第1.4節の余白の思想)。

### 3.6 会話文の例と実装方針

Memoryの`text_key`はローカライズテーブル(→ 技術設計書 第15章)で管理し、テキスト自体にはコードから触れない。

```json
{
  "memory_first_battle_line": "あの日、神殿で初めて一緒に戦ったよね。",
  "memory_100_days_line": "もう100日も一緒にいるんだね。",
  "memory_absence_return_line": "……久しぶり。少し、心配してた。",
  "memory_anniversary_1y_line": "今日で、出会って一年だね。"
}
```

`login_streak`(100日)や`date_special`(周年)は**MemoryManagerが自動でMemoryレコードとして記録する組み込みMemory**として扱い、個別のイベント追加なしに最初から機能する(第3.3節の定義ファイルにあらかじめ同梱)。

---

## 4. CHARACTER(キャラクター画面の拡張)

→ 技術設計書 第18章で実装した `GalleryCharacterDetailView` を以下の要素で拡張する(実装はPhase2で反映予定)。

- **Live2D対応スロット**: 現在の静的立ち絵表示部分を `CharacterPortraitView`(第5章)という共通コンポーネントに置き換え、将来Live2Dモデルに差し替え可能な形にしておく。
- **親密度表示**: ゲージ + 現在レベル + 次のレベルまでの必要ポイント。
- **Memory一覧タブ**: 記録済みMemoryをカテゴリ/タグ/発生日でフィルタして閲覧できる「思い出帳」(第14章の追加提案15と連動)。
- 既存項目(全身立ち絵/名前/二つ名/プロフィール/世界設定/所属/属性/身長/誕生日/好き/嫌い/スキル一覧/取得済みCG)はそのまま維持。

---

## 5. LIVE2D(将来対応のための構造設計・今は実装不要)

### 5.1 方針

**今フェーズでの実装は行わない。** ただし将来Live2D(または類似のスケルタル/パラメトリックアニメーション技術)を導入した際に既存コードを壊さないよう、以下の抽象化だけを先に用意しておくことを推奨する(Phase2以降で着手)。

### 5.2 `CharacterPortraitView` 抽象化

`core/ui_kit/` に、現在の静的立ち絵表示(TextureRect直接差し替え)をラップする `CharacterPortraitView` を新設し、Story/Home/Gallery/Character画面はすべてこれ経由で立ち絵を表示するよう統一する。

```gdscript
# core/ui_kit/CharacterPortraitView.gd (概念設計)
extends Control

## 静的立ち絵表示。将来Live2Dアダプタに差し替える際の共通インターフェース。

func set_static_expression(image_path: String) -> void: ...
func set_motion_parameter(name: String, value: float) -> void:
    pass  # 静的表示では無視。Live2D実装時にここでモデルパラメータへ反映する
```

`set_motion_parameter` の呼び出し先として、将来以下のパラメータチャンネルを想定する(現時点ではダミー実装でよい)。

| パラメータ | 用途 |
|---|---|
| `blink` | 瞬き |
| `mouth_open` | 口パク(ボイス再生の音量連動リップシンクを想定) |
| `breath` | 呼吸(アイドル時のサイン波ループ) |
| `hair_sway` | 髪揺れ |
| `cloth_sway` | 服揺れ |
| `wing_sway` | 翼揺れ(該当キャラのみ) |

呼び出し元(Home/Story/Character画面)は将来Live2D対応時も**呼び出し方を変える必要がない**ため、今のうちにこのインターフェースへ寄せておく価値がある。

---

## 6. BATTLE DIRECTION(戦闘演出の分離)

→ 技術設計書 第13章の数値ロジック(`core/battle_engine`)とは完全に分離した**演出専任レイヤー**を設計する。

### 6.1 `BattleDirector`(概念設計)

`core/battle_engine/BattleDirector.gd` が、戦闘ロジック側が発するイベント(通常攻撃/スキル/必殺技/勝利/敗北/レベルアップ)を購読し、`game/data/battle_direction/*.json` のプリセットに従ってSE/BGM/カメラ/エフェクト/台詞を再生する。ロジックとは疎結合(シグナル経由)のため、**演出データを差し替えるだけで印象を変えられる**。

```json
{
  "event": "victory",
  "se": "se_battle_victory_fanfare",
  "bgm": "bgm_victory",
  "camera": "pull_back",
  "effect": "fx_victory_sparkle",
  "voice_line_key": "voice_kaosu_victory_common"
}
```

個別スキル用の演出が未定義の場合は `event` 単位の汎用プリセットにフォールバックする(全スキルに専用演出を用意する必要はなく、個人開発の工数を圧迫しない)。

---

## 7. SPECIAL(必殺技専用演出)

必殺技のみ、通常のBattleDirectionとは別に**専用シーケンス**を定義する。

```json
{
  "skill_id": "skill_kaosu_ultimate",
  "cut_in_image": "characters/kaosu/special/kaosu_cutin.png",
  "special_background": "backgrounds/special/bg_chaos_realm.png",
  "special_bgm": "bgm_special_kaosu",
  "screen_shake": { "intensity": 8, "duration_sec": 0.4 },
  "slow_motion": { "time_scale": 0.3, "duration_sec": 1.2 },
  "final_hit": { "flash_color": "#FFF6D9", "freeze_frames": 6 }
}
```

再生順序: ①カットイン ②専用背景・専用BGMへの一時切替 ③スロー演出 ④最後の一撃(画面フラッシュ+フリーズフレーム) ⑤通常戦闘BGM・背景へ復帰。`SpecialSequencePlayer`(core/battle_engine)が順に処理し、途中でスキップ操作(タップ)を受け付けて短縮できるようにする(周回時のストレス軽減)。

---

## 8. WORLD(ワールドマップ)

現在は神殿・街・森の3拠点のみだが、**100以上のマップ追加を前提**にデータ駆動で設計する。`game/data/world/world_map.json`:

```json
{
  "nodes": [
    { "id": "temple", "name_key": "world_temple_name", "type": "town", "thumbnail": "world/temple_thumb.png", "unlock_conditions": [], "connections": ["town"] },
    { "id": "town",   "name_key": "world_town_name",   "type": "town", "thumbnail": "world/town_thumb.png",   "unlock_conditions": [{ "type": "story_flag", "flag": "met_kaosu" }], "connections": ["temple", "forest"] },
    { "id": "forest", "name_key": "world_forest_name", "type": "field","thumbnail": "world/forest_thumb.png", "unlock_conditions": [{ "type": "story_flag", "flag": "ep0_town_cleared" }], "connections": ["town"] }
  ]
}
```

初期実装は一覧/簡易マップUIで十分(グラフ構造さえ保っていれば、将来グラフィカルなワールドマップ画面に差し替えてもデータは無改修で流用できる)。解放条件は第2.2節で統合した `UnlockEvaluator` を再利用する。

---

## 9. COLLECTION(図鑑)

キャラ/武器/敵/BGM/CG/衣装/用語集/世界設定/実績を横断する図鑑。→ 技術設計書 第18章の `Gallery` はキャラクター中心のビジュアルコレクションであるのに対し、**Collectionはゲーム世界全体の百科事典**と位置づける。

第2.2節の統合方針と同様に、**GalleryとCollectionは同じ「解放可能エントリ」の仕組み(id・サムネイル・unlock_conditions・カテゴリ)を共有する**ことを推奨する。`game/data/collection/collection_categories.json` でカテゴリ(敵図鑑/BGM図鑑/用語集/世界設定/実績)を定義し、Gallery実装時に作った `GalleryThumbnail` / 検索UI(→ 技術設計書 第18.6節)をそのまま流用する。

---

## 10. CHARACTER GALLERY(差分反映)

→ 技術設計書 第18章で実装済みのCharacter Gallery Systemに対し、本ドキュメントで以下の追加要件を反映する(実装はPhase2で着手)。

- **Memory一覧**: キャラクター詳細画面に、第3章のMemory Systemと連動したMemory一覧セクションを追加する(第4章参照)。
- **お気に入り登録**: 第18.8節で「将来拡張」としていた `favorite: bool` を、セーブのRosterData(→ 技術設計書 第14章)に前倒しで追加し、キャラクター一覧・詳細画面にお気に入りトグルを追加する。
- 表示カテゴリ・キャラクター詳細項目・解放条件・検索仕様は第18章の設計を踏襲する(変更なし)。

---

## 11. ATMOSPHERE(演出の一貫性・作り込み)

個人開発でも「作り込まれている」と感じさせるために、**演出の物理量を統一ルール化**する(バラバラな演出は安っぽさの最大要因)。

| 要素 | ルール |
|---|---|
| **画面遷移フェード** | UI内遷移: 150〜250ms(素早く)。シーン間(Home→Story等): 400〜600ms。感情的な節目(エンディング、周年演出等): 800〜1200ms |
| **イージング** | UI要素は ease-in-out cubic 基調で統一。ハードカット(戦闘開始の一撃等)のみ例外的に線形/瞬時 |
| **BGMクロスフェード** | 通常は2秒クロスフェード。戦闘開始等の緊急性が高い場面のみ即切り替え(スティンガー) |
| **SE統一** | UIタップ音は原則1種類に統一(操作の一貫性)。意味のあるアクション(解放・達成等)のみ専用SEを割り当てる |
| **パーティクル語彙** | 塵・花弁・燠火・雪など季節/場所に紐づく限定パレットに絞り、素材コストと処理負荷を抑える |
| **ライティング** | 第1.3節のtime_bandsによる色調オーバーレイのみで表現し、リアルタイムライティングは導入しない(モバイル軽量化優先) |

---

## 12. QUALITY(品質目標)

- **軽量**: テクスチャは第10章(→ 技術設計書)の命名規則・圧縮設定を厳守し、未使用データを起動時にロードしない(→ 技術設計書 第11.3節のCharacterDatabase遅延ロード方針をHome/Gallery/World/Collectionすべてに適用)。
- **ロード時間最小化**: シーン単位の分割ロード、必要になるまでキャラクター/Memory/Gallery/Worldデータを読み込まない設計を徹底する。
- **スマホ最適化**: 60fps目標(中〜低スペック端末含む)。リアルタイムライティング・重量級ポストプロセスは避け、色調オーバーレイ等の軽量表現で「高級感」を演出する。
- **将来のSteam展開**: 既に技術設計書で徹底しているタッチ/マウス両対応(→ 実装済みの`GalleryImageViewer`等)、`Control`ベースのUI設計、`core/game`分離により、将来のデスクトップ移植コストを最小化する方針を継続する。

---

## 13. FINAL GOAL(最終目標)

CHAOS RE:BIRTHは「RPG」ではなく、**プレイヤーがケイオスちゃんと人生を共に歩む"居場所"**である。

- 時間は嘘をつかない(第0章) → HOMEの時間帯・Memory Systemが実現する。
- 思い出は蓄積し、劣化しない(第0章) → Memory Systemのスコアリング・クールダウン設計が実現する。
- UIは主張しない(第0章) → Atmosphere(第11章)の統一ルールが実現する。

この3原則から外れる機能追加は、たとえ技術的に魅力的でも本作の核心を損なうため、実装判断時に立ち返る基準とする。

---

## 14. 追加システム案 20選(実装優先順位つき)

| # | システム名 | 概要 | 優先度 |
|---|---|---|---|
| 1 | デイリーひとこと日記 | ケイオスちゃんがその日のプレイ内容に反応する一言日記を自動生成、Memoryと連動 | 高 |
| 2 | 手紙システム | 長期不在明けや特別な日に「置き手紙」形式のメッセージを残す(Memory Systemのabsence_return/date_specialを活用) | 高 |
| 3 | 呼び方・口調の親密度連動 | 親密度帯によって一人称・距離感・語尾が変化(第2.3節) | 高 |
| 4 | おかえり演出 | 久しぶりログイン専用のミニイベント+専用グリーティング | 高 |
| 5 | 誕生日サプライズ | 誕生日ログインで専用台詞+限定CGを自動解放 | 高 |
| 6 | プレイヤーの呼称カスタム | プレイヤー名を会話中で自然に呼ぶ仕組み(テキスト差し込み) | 高 |
| 7 | Memory検索/思い出帳UI | Memory一覧をタグ・カテゴリ・日付で振り返れる専用画面(第4章と連動) | 高 |
| 8 | サウンドスケープレイヤー | 神殿の鐘、街の喧騒、森の風など場所固有の環境音層で没入感を底上げ | 高 |
| 9 | 未来の記憶(エンドコンテンツ) | 本編クリア後も増え続けるMemoryで関係性の蓄積を継続させる仕組み | 高 |
| 10 | 周年ダイジェスト | 年単位でこれまでのMemoryを振り返る回顧ムービー/ダイジェスト画面を自動生成 | 中 |
| 11 | 対話傾向の性格反映 | 選択肢の傾向を記憶し、口調や小エピソードに緩やかに反映 | 中 |
| 12 | ホームカスタマイズ | 家具・装飾アイテムでホーム空間を彩る軽量な生活感演出 | 中 |
| 13 | 季節衣装ライン | 実カレンダー連動の季節限定衣装(第18.8節の季節衣装切替と連動) | 中 |
| 14 | 今日の一言通知 | 任意設定のプッシュ通知でケイオスちゃんからの一言を届ける | 中 |
| 15 | 感情パラメータ(機嫌) | 親密度とは別軸の短期的な「機嫌」で表情・台詞に変化をつける | 中 |
| 16 | はじめての日 回顧モード | 初回プレイの記録を後から見返せるタイムカプセル的機能 | 中 |
| 17 | 思い出アルバム自動生成 | 取得済みCG・Memory・日付を組み合わせた閲覧用アルバムページ | 中 |
| 18 | BGMプレイヤー | 解放済みBGMをホーム背景で再生できる「思い出のBGM」選択機能 | 低 |
| 19 | 疑似天候演出 | 端末時刻から天候風の演出を疑似生成(実天候APIは任意の将来拡張) | 低 |
| 20 | 待受ミニ演出 | タップで短い一言を返す、ホーム画面の軽量アイドル演出 | 低 |

**優先度の考え方**: 「高」はMemory Systemと直接連動し、第0章の3原則(時間は嘘をつかない/思い出は蓄積する/UIは主張しない)を最も強く体現するもの。「中」は体験の厚みを増すが単体でも成立する拡張。「低」は演出的な味付けであり、Episode0〜1の段階では優先度を下げてよいもの。

---

## 15. 次のアクション

本ドキュメントはEpisode0の技術基盤(Phase1〜3、→ 技術設計書 第8章)とは独立した**中長期の体験設計指針**である。実装への落とし込みは以下の順序を推奨する。

1. **Phase2着手前の基盤整理**: 第2.2節で提案した `GalleryUnlockEvaluator` → `UnlockEvaluator` への汎用化(Gallery/Memory/Affection/World/Collectionが解放条件ロジックを共有できるようにする)。
2. **Memory System基盤**(第3章): `core/memory_engine/MemorySelector` と `game/memory/MemoryManager` の実装。Episode0のテストシナリオに1〜2個のMemoryトリガーを仕込み、Home画面での挨拶合成を最小構成で動作確認する。
3. **HOME画面**(第1章): Phase1で実装したTitle/StoryPlayerに次ぐ3つ目の主要画面として実装し、時間帯・Memory連動の動作確認を行う。
4. **Affection基盤**(第2章): セーブモジュール追加 + 簡易な解放連動(まずはGalleryの表情差分1件で確認)。
5. それ以外(Battle Direction/Special/World/Collection/Live2D抽象化/20選の各システム)は、Episode0本編(戦闘・探索)の実装が一段落してから優先度順に着手する。
