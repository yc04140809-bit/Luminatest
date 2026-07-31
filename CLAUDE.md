# CHAOS RE:BIRTH

## 最高位ルール: PROJECT_BIBLE.md

[`PROJECT_BIBLE.md`](PROJECT_BIBLE.md) が、このプロジェクトの**最高位ルール**である。コードより、設計より、新機能より優先する。本ファイルを含む他のすべての文書・設計・コードはこれに従属し、矛盾する場合は必ず `PROJECT_BIBLE.md` に立ち返って判断する。

作業を始める前に `PROJECT_BIBLE.md` を読むこと。特に **CORE PHILOSOPHY**(最優先判断基準)は、迷ったときに必ず適用する。

> **この機能でケイオスちゃんをもっと好きになるか?**
>
> YES(シンプルでも愛着が深まる) → 採用する。
> NO(豪華でも魅力を損なう、あるいは愛着と無関係) → 採用しない。

機能を「増やす」こと自体には価値がない。迷ったら機能を削る側に倒す。この基準は他のすべての設計原則(アーキテクチャの美しさ・拡張性・パフォーマンス等)より優先する。

`PROJECT_BIBLE.md` の他の柱(PLAYER=プレイヤーは相棒、CHAOS-CHAN=案内人/親友/家族、EMOTION=届けたい感情のリスト、SOUL=善悪でなく二人だけの物語、TIME=時間は嘘をつかない、MEMORY=データではなく思い出を保存する)は、機能設計・シナリオ執筆・UI/UX判断すべてに適用される前提として扱う。

## 設計ドキュメント

- [`PROJECT_BIBLE.md`](PROJECT_BIBLE.md) — 最高位ルール(このプロジェクトが何であり、何でないか)
- [`docs/design/GAME_DESIGN_DOCUMENT.md`](docs/design/GAME_DESIGN_DOCUMENT.md) — 技術設計書(エンジン選定、フォルダ構成、データ構造、Character/Story/Battle/Save/Localization/Plugin化、Character Gallery System 等)
- [`docs/design/GAME_EXPERIENCE_DESIGN.md`](docs/design/GAME_EXPERIENCE_DESIGN.md) — 体験設計書(HOME、親密度、Memory System、Live2D準備、戦闘演出分離、World、Collection、Atmosphere 等。PROJECT_BIBLEの理念を実装可能な設計へ翻訳したもの)

新しい章・仕様を追加する際は、まず `PROJECT_BIBLE.md` に反するものでないか確認したうえで、技術設計書と体験設計書のどちらに属するかを判断し(「何を・なぜ作るか」は体験設計書、「どう実装するか」は技術設計書)、既存の章番号を踏まえて追記する。ゼロから書き直さない。

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

**Phase2以降は新しい設計書を増やさない。実装・プレイ・改善を繰り返す。** 設計より体験を優先する。一気に全部作らず、小さく動くものを作っては確かめる。

### Golden Slice Review(各機能完成後に必ず実施)

機能を1つ完成させるたびに、次の7項目でレビューする。

1. ケイオスちゃんが一番目立っているか
2. 操作していて気持ちいいか
3. テンポが良いか
4. 無駄なUIはないか
5. 初めて遊ぶ人でも迷わないか
6. PROJECT_BIBLEに反していないか
7. 「もう一度起動したい」と思えるか

**全項目YESなら次へ進む。1つでもNOがあれば、新機能より改善を優先する。** レビュー結果と対応は会話上で明示し、コミットメッセージにも根拠を残す。
