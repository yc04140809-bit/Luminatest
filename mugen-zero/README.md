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
- [ ] PHASE C — EVENT ENGINE（日付進行・条件判定・causedBy）
- [ ] PHASE D — TIME（REST / DAY ADVANCE / TIME SHIFT +3 YEARS）
- [ ] PHASE E — REUNION（3年後のアルデン・ガルド再会「見るな。」）
- [ ] PHASE F — LIFE ARCHIVE（PLAYER KNOWLEDGE連動）
- [ ] PHASE G — POLISH（アート・音・PWA・スマホ最適化）

## 方針

LESS FEATURES. BETTER EXECUTION. COMPLETE THE LOOP.
