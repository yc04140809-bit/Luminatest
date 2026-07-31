# CHAOS RE:BIRTH — Godotプロジェクト

設計書: [`docs/design/GAME_DESIGN_DOCUMENT.md`](../docs/design/GAME_DESIGN_DOCUMENT.md)

## Phase1(基盤構築)実装状況

- `core/story_engine/` : JSON駆動の会話再生エンジン(コア層、IP非依存)
- `core/localization_core/` : テキストキー方式のローカライズ基盤
- `game/autoload/` : GameManager / SaveManager / AudioManager(スタブ) / Flags
- `game/scenes/title/` , `game/scenes/story/` : タイトル ⇄ 会話シーンの最小プレイアブルスライス
- `game/data/story/episode0/ep0_000_test.json` : 動作確認用のテストシナリオ(仮テキスト・仮素材)

**Phase1完了条件(設計書 第8章)**: 「タイトルから会話パートに入り、セーブ/ロードができる」ことを確認 → 下記の自動テストで確認済み。

## Character Gallery System 実装状況(設計書 第18章)

本編(ストーリー・戦闘)とは独立したサブシステムとして実装。

- `core/gallery_engine/GalleryUnlockEvaluator.gd` : 解放条件判定(IP非依存、Callable経由でgame層から注入)
- `core/ui_kit/GalleryThumbnail.tscn` / `GalleryCategoryTile.tscn` / `GalleryImageViewer.tscn` : サムネイル・カテゴリタイル・タップ拡大＋スワイプ送りの画像ビューア(いずれもIP非依存)
- `game/gallery/GalleryRepository.gd` : `game/data/gallery/*.json` の読み込みと検索/絞り込み(autoload)
- `game/gallery/scenes/GalleryRoot.tscn` : カテゴリ選択 → キャラ一覧(検索/絞り込み) → キャラ詳細 → 画像ビューア、の内部ナビゲーションを持つ独立モーダル画面
- `game/data/gallery/gallery_categories.json` , `kaosu_gallery.json` : カテゴリ定義とキャラごとのギャラリーデータ(コード変更なしで新キャラ追加可能)
- Title画面に「ギャラリー」ボタンを追加(本編と無関係にいつでも起動可能)

## 動作確認方法

Godot 4.3 (stable) の実行ファイルがあれば、GUIなしで動作確認できる。

```bash
# ロジック単体テスト: StoryEngine → Flags → SaveManager → LocalizationManager の一連
godot --headless --script res://tools/smoke_test.gd

# UIシーンテスト: Title.tscn → (はじめから押下) → StoryPlayer.tscn への遷移確認
godot --headless --script res://tools/ui_smoke_test.gd

# ギャラリーテスト: データ読込・解放条件判定・検索フィルタ・画面遷移の確認
godot --headless --script res://tools/gallery_smoke_test.gd
```

いずれも最後に `..._RESULT: PASS` が出力されれば正常(exit code 0)。

エディタで見た目を確認する場合は `project.godot` をGodot 4.3のエディタで開き、`F5`(または `game/scenes/title/Title.tscn` を指定して実行)。

## 既知の制約(Phase1時点)

- 立ち絵・背景・CG・衣装は `img/kaosu/` の既存アセットを仮流用(最終アートではない)。イベントCGは背景画像を仮流用しており、実際のCGサイズ・サムネイルは未用意。
- BGM/SEは未組み込み(`AudioManager` はスタブのみ、Phase3で本実装予定)。
- ギャラリーの解放条件(`event_clear` / `party_join` / `item_owned`)は、Phase2以降で実装予定のInventory/PartyManager/EventManagerの代わりに、現状は `Flags` の規約キーで暫定的に判定している(`GalleryRepository.gd` 内のコメント参照)。実システム実装後は注入するCallableの中身を差し替えるだけでよい。
- `core/battle_engine` / `core/fx_engine` はPhase2以降で実装。
