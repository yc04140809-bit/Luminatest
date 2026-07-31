# CHAOS RE:BIRTH — Godotプロジェクト

最高位ルール: [`PROJECT_BIBLE.md`](../PROJECT_BIBLE.md) / 設計書: [`GAME_DESIGN_DOCUMENT.md`](../docs/design/GAME_DESIGN_DOCUMENT.md) , [`GAME_EXPERIENCE_DESIGN.md`](../docs/design/GAME_EXPERIENCE_DESIGN.md)

## Phase1(基盤構築)実装状況

- `core/story_engine/` : JSON駆動の会話再生エンジン(コア層、IP非依存)
- `core/localization_core/` : テキストキー方式のローカライズ基盤
- `game/autoload/` : GameManager / SaveManager / AudioManager(スタブ) / Flags
- `game/scenes/title/` , `game/scenes/story/` : タイトル ⇄ 会話シーンの最小プレイアブルスライス

## Character Gallery System 実装状況(設計書 第18章)

本編(ストーリー・戦闘)とは独立したサブシステムとして実装。

- `core/gallery_engine/GalleryUnlockEvaluator.gd` : 解放条件判定(IP非依存、Callable経由でgame層から注入)
- `core/ui_kit/GalleryThumbnail.tscn` / `GalleryCategoryTile.tscn` / `GalleryImageViewer.tscn` : サムネイル・カテゴリタイル・タップ拡大＋スワイプ送りの画像ビューア(いずれもIP非依存)
- `game/gallery/GalleryRepository.gd` : `game/data/gallery/*.json` の読み込みと検索/絞り込み(autoload)
- `game/gallery/scenes/GalleryRoot.tscn` : カテゴリ選択 → キャラ一覧(検索/絞り込み) → キャラ詳細 → 画像ビューア

## Phase2 MVP 実装状況(体験設計書 第1・3章、PROJECT_BIBLE準拠)

「ケイオスちゃんに会えて、会話して、もう一度起動したくなる」を完成基準に、新規設計を増やさず動くものを実装。

- `game/scenes/home/Home.tscn` : ホーム画面。ゲーム起動後・各コンテンツ終了後は必ずここへ戻る。時間帯(朝/昼/夕方/夜/深夜、`game/data/home/time_bands.json`)で背景・BGM・挨拶が変化し、Memoryがあれば挨拶に優先的に混ぜ込む。ケイオスちゃんをタップすると挨拶を再抽選できる。
- `core/memory_engine/MemorySelector.gd` : Memory選定ロジック(IP非依存)。重要度×新鮮さ(参照回数)×直近タグの多様性でスコアリングし、同じ話ばかりにならないようにする。
- `game/memory/MemoryManager.gd` : Memory定義(`game/data/memory/*.json`)の読込・発生条件判定・記録・セーブ連携(autoload)。Phase2 MVPでは発生条件は `story_flag` のみに絞り、初回Home訪問・出会い・初戦闘の勝敗を記録する。
- `game/scenes/battle/BattleMock.tscn` : 仮戦闘。攻撃ボタンで殴り合うだけの最小構成。勝敗をFlagsに記録し、Memory Systemの初勝利/初敗北トリガーとなる(第13章の本格的なターン制バトルは未実装)。
- セーブは `story_progress.json` に加えて `memory.json` を保存/復元する(第14章のモジュール分割セーブを踏襲)。
- Title「はじめから」→ 会話(JSON) → Home。「つづきから」→ Home へ直接。

## 動作確認方法

Godot 4.3 (stable) の実行ファイルがあれば、GUIなしで動作確認できる。

```bash
# ロジック単体テスト: StoryEngine → Flags → SaveManager → LocalizationManager の一連
godot --headless --script res://tools/smoke_test.gd

# UIシーンテスト: Title.tscn → (はじめから押下) → StoryPlayer.tscn への遷移確認
godot --headless --script res://tools/ui_smoke_test.gd

# ギャラリーテスト: データ読込・解放条件判定・検索フィルタ・画面遷移の確認
godot --headless --script res://tools/gallery_smoke_test.gd

# Phase2 MVPテスト: Home初回訪問Memory記録・挨拶合成・仮戦闘勝敗・セーブ/ロード往復
godot --headless --script res://tools/phase2_smoke_test.gd
```

いずれも最後に `..._RESULT: PASS` が出力されれば正常(exit code 0)。

エディタで見た目を確認する場合は `project.godot` をGodot 4.3のエディタで開き、`F5`(または `game/scenes/title/Title.tscn` を指定して実行)。

## 既知の制約

- 立ち絵・背景・CG・衣装は `img/kaosu/` の既存アセットを仮流用(最終アートではない)。ホーム背景も2種の既存画像を時間帯ごとに使い回している。
- BGM/SEは未組み込み(`AudioManager` はスタブのみ)。
- ギャラリーの解放条件(`event_clear` / `party_join` / `item_owned`)、Memoryの発生条件(`first_time` / `login_streak` / `absence_return` / `date_special` 等)は、体験設計書で定義済みだが、Phase2 MVPでは `story_flag` のみ実装。InventoryやPartyManager、日付演算を伴うトリガーはPhase3以降で追加する。
- 仮戦闘は属性・状態異常・スキル・必殺技を持たない最小構成(第13章のBattle Systemは未実装)。
- Live2D抽象化(`CharacterPortraitView`)、Affection(親密度)、World/Collectionは体験設計書に設計済みだが未着手。
