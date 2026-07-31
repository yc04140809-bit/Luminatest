# CHAOS RE:BIRTH — Godotプロジェクト

設計書: [`docs/design/GAME_DESIGN_DOCUMENT.md`](../docs/design/GAME_DESIGN_DOCUMENT.md)

## Phase1(基盤構築)実装状況

- `core/story_engine/` : JSON駆動の会話再生エンジン(コア層、IP非依存)
- `core/localization_core/` : テキストキー方式のローカライズ基盤
- `game/autoload/` : GameManager / SaveManager / AudioManager(スタブ) / Flags
- `game/scenes/title/` , `game/scenes/story/` : タイトル ⇄ 会話シーンの最小プレイアブルスライス
- `game/data/story/episode0/ep0_000_test.json` : 動作確認用のテストシナリオ(仮テキスト・仮素材)

**Phase1完了条件(設計書 第8章)**: 「タイトルから会話パートに入り、セーブ/ロードができる」ことを確認 → 下記の自動テストで確認済み。

## 動作確認方法

Godot 4.3 (stable) の実行ファイルがあれば、GUIなしで動作確認できる。

```bash
# ロジック単体テスト: StoryEngine → Flags → SaveManager → LocalizationManager の一連
godot --headless --script res://tools/smoke_test.gd

# UIシーンテスト: Title.tscn → (はじめから押下) → StoryPlayer.tscn への遷移確認
godot --headless --script res://tools/ui_smoke_test.gd
```

いずれも最後に `SMOKE_TEST_RESULT: PASS` / `UI_SMOKE_TEST_RESULT: PASS` が出力されれば正常。

エディタで見た目を確認する場合は `project.godot` をGodot 4.3のエディタで開き、`F5`(または `game/scenes/title/Title.tscn` を指定して実行)。

## 既知の制約(Phase1時点)

- 立ち絵・背景は `img/kaosu/` の既存アセットを仮流用(最終アートではない)。
- BGM/SEは未組み込み(`AudioManager` はスタブのみ、Phase3で本実装予定)。
- `core/battle_engine` / `core/ui_kit` / `core/fx_engine` はPhase2以降で実装。
