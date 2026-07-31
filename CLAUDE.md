# CHAOS RE:BIRTH

## このプロジェクトについて

CHAOS RE:BIRTHは「ゲームを作るプロジェクト」ではない。**ケイオスちゃんというIPを世界中で愛される存在へ育てるプロジェクト**である。ゲームシステムはそのための手段であり、目的ではない。

## 最優先の判断基準(すべての実装判断に適用する)

新機能・仕様変更・実装方針・優先順位に迷ったときは、技術的な面白さ・機能の豪華さ・工数の少なさで判断しない。判断基準はただ一つ。

> **この機能でケイオスちゃんをもっと好きになるか?**

- YES(シンプルでも愛着が深まる) → 採用する。
- NO(豪華でも魅力を損なう、あるいは愛着と無関係) → 採用しない。

機能を「増やす」こと自体には価値がない。迷ったら機能を削る側に倒す。この基準は他のすべての設計原則(アーキテクチャの美しさ・拡張性・パフォーマンス等)より優先する。矛盾する場合はこの基準が勝つ。

## 設計ドキュメント

- [`docs/design/GAME_DESIGN_DOCUMENT.md`](docs/design/GAME_DESIGN_DOCUMENT.md) — 技術設計書(エンジン選定、フォルダ構成、データ構造、Character/Story/Battle/Save/Localization/Plugin化、Character Gallery System 等)
- [`docs/design/GAME_EXPERIENCE_DESIGN.md`](docs/design/GAME_EXPERIENCE_DESIGN.md) — 体験設計書(HOME、親密度、Memory System、Live2D準備、戦闘演出分離、World、Collection、Atmosphere、そして上記の判断基準そのもの)

新しい章・仕様を追加する際は、まずこの2文書のどちらに属するかを判断し(「何を・なぜ作るか」は体験設計書、「どう実装するか」は技術設計書)、既存の章番号を踏まえて追記する。ゼロから書き直さない。

## 実装

Godotプロジェクトは [`chaos_rebirth/`](chaos_rebirth/) 以下にある。詳細は [`chaos_rebirth/README.md`](chaos_rebirth/README.md) を参照。

- `core/` : IPに依存しない汎用フレームワーク層(story_engine, localization_core, gallery_engine, ui_kit 等)。`game/` を参照してはならない(一方向依存)。
- `game/` : CHAOS RE:BIRTH固有のデータ・シーン・配線。
- マスタデータはJSON外部管理を徹底し、新キャラクター・新シナリオ・新ギャラリー項目の追加はコード変更なしでデータ追加のみで対応できることを設計原則とする。

### 動作確認

Godot 4.3 (stable) があれば、GUIなしでheadless実行できる(セッション内でダウンロードする場合は `https://github.com/godotengine/godot/releases/download/4.3-stable/Godot_v4.3-stable_linux.x86_64.zip` を取得し展開する)。

```bash
cd chaos_rebirth
godot --headless --script res://tools/smoke_test.gd          # StoryEngine/Flags/SaveManager/Localizationの一連
godot --headless --script res://tools/ui_smoke_test.gd       # Title→StoryPlayerのシーン遷移
godot --headless --script res://tools/gallery_smoke_test.gd  # Character Gallery Systemの一連
```

いずれも最後に `..._RESULT: PASS` が出れば正常。新しいシステムを実装したら、同様のheadlessスモークテストを `tools/` に追加して検証すること。

## 開発の進め方

一気に全部作らない。Phase1 → Phase2 → Phase3 と段階的に進め、各Phase終了時に動作確認する(詳細は技術設計書 第8章)。
