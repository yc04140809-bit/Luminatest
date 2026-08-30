# MUGEN ZERO v0.1

人生収集RPG / Narrative Life RPG — Vertical Slice

> 「すべてのキャラクターに、MUGENのストーリーを。」

検証する問い: **一度出会ったキャラクターの“その後”を、プレイヤーはもっと見たいと思うか？**

## 技術構成

- TypeScript / React / Vite（UI層）
- Phaser（探索・ゲーム演出層）
- IndexedDB（ローカル保存 — PHASE Bで導入予定）
- バックエンド・外部APIなし（APIコスト0円）

## アーキテクチャ

```
React UI  →  MUGEN CORE (src/core — React/Phaser非依存)  →  Phaser Game Layer (src/game)
```

- `src/core/` — ゲームロジック（フロー、将来: WORLD MEMORY / EVENT ENGINE / TIME）
- `src/game/` — 探索（Phaser）・戦闘ロジック
- `src/content/` — キャラクター・台詞・場所などのコンテンツデータ
- `src/ui/` — React画面（スマホ縦画面優先）
- `assets/reference/` — コンセプトアート等の参照資料（ビルドには含まない）

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm run build      # 型チェック + ビルド
npm test           # ユニットテスト (vitest)
npm run test:e2e   # E2E (Playwright)
node scripts/screenshots.mjs  # 画面キャプチャ（要 vite preview --port 4173）
```

## 開発フェーズ状況

- [x] **PHASE A — SKELETON**: TITLE → PROLOGUE → HOME → EXPLORE → GREENWOOD → GALD ENCOUNTER → BATTLE → LIFE CHOICE の一気通貫画面遷移
- [x] **PHASE B — WORLD MEMORY**: 4択のMEMORY_EVENTをIndexedDBへ永続化。排他・write-once・再起動復元・RESET WORLD
- [x] **PHASE C — EVENT ENGINE**: WORLD CLOCK、SPARE+3日経過→GALD_LEAVES_BANDITS、causedBy因果記録、CHARACTER STATE原子的更新
- [x] **PHASE D — TIME SYSTEM**: 365日カレンダー・年跨ぎ、REST(+1日)、TIME SHIFT +3年（確認画面・取りこぼし防止キャッチアップ・NPC加齢・WORLD_TIME_SHIFTED正史記録）
- [x] **PHASE D.5 — DEV ADMIN**: 開発者用管理画面（LOCK 0909、ダッシュボード、TIME CONTROL、正規フロー再現プリセット、RESET SCENARIO/WORLD、イベントタイムライン）。devビルドのみ有効（本番は `VITE_ENABLE_DEV_ADMIN=1` を付けない限り非表示）
- [x] **PHASE E — FIRST REUNION**: ガルドの人生連鎖（離脱→アルデン到着→パン屋）、探索での「？？？」発見、再会「……見るな。」、PLAYER_REUNITED_WITH_GALD記録、再訪、最小PLAYER KNOWLEDGEフィルタ（未発見の人生をUIでネタバレしない）
- [x] **PHASE F — LIFE ARCHIVE**: 人生記録の射影（WORLD MEMORY → PLAYER KNOWLEDGE → LIFE ARCHIVE PROJECTION → UI）。既知章のみ表示＋単一「？？？」カード、再会で一本の人生記録に接続。DEV ADMINにKNOWN/UNKNOWNデバッグ
- [ ] PHASE G — POLISH（アート・音・PWA・スマホ最適化）

## 方針

LESS FEATURES. BETTER EXECUTION. COMPLETE THE LOOP.
