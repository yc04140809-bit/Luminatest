# 03 フォルダ構成

- **最終更新**: 2026-07-16

## 現在の構成(Phase 1)

```
lumina-arcana/
├── README.md                 # プロジェクト入口。最初に読む
├── assets/                   # 採用画像・マスターデザイン(card-frame/ 等)。版番号付きで保存し旧版は削除しない
├── master-library/           # 【正】ブランドの唯一の正式設定資料(00〜14章)
│   └── specs/                # 章から参照される付属正典(ui-master.md, card-frame-master.md 等)
├── card-database/
│   ├── _templates/           # カードテンプレート
│   ├── schema/               # アプリ用 JSON Schema
│   └── cards/
│       ├── major/            # メジャー22枚
│       └── minor/            # マイナー56枚(スート確定後にサブフォルダ作成)
├── prompt-library/
│   ├── _templates/
│   └── prompts/
│       ├── cards/{CARD-ID}/  # カードごとの履歴(v001.md, v002.md ...)
│       └── characters/{slug}/
├── character-bible/
│   ├── _templates/
│   └── characters/           # 1キャラ1ファイル
├── world-bible/
│   ├── _templates/
│   ├── cradle-of-time.md     # 時のゆりかご詳細
│   ├── world-map.md / history.md / mythology.md
│   ├── locations/ spirits/ sacred-beasts/ terms/   # 1件1ファイル
└── development-rules/        # このルール群
```

## 構成の原則

0. **二正典の分離(標準構成・ユーザー決定 2026-07-16)**: `master-library/` は世界の正典(作品・ブランド・世界観・キャラクター・カード設定のみ)、`development-rules/` は運営の正典(開発・運営・AI役割・命名規則・タグ運用・品質管理)。両者は分離したまま運用し、必要に応じて相互参照する
1. **役割ごとに最上位ディレクトリを分ける**(設定資料/データ/プロンプト/ルール)
2. **量産されるものは「1件1ファイル」+テンプレート**(カード・キャラ・世界エントリ・プロンプト)
3. **各ディレクトリに README.md** を置き、そこだけ読めば運用できるようにする
4. **空フォルダは `.gitkeep`** で構造を保持する

## 将来の拡張方針(予約済みの場所)

必要になった時点で以下を追加する。**この表にないディレクトリを増やす場合は本ファイルを先に改訂する。**

| ディレクトリ(予定) | 用途 | 追加時期の目安 |
|---|---|---|
| `assets/` | 採用画像・地図・ロゴ(容量増大時は外部ストレージ+リンク管理へ移行) | **追加済み(2026-07-18)** |
| `sns/` | SNS投稿ストック・投稿ログ | SNS運用開始時(Phase 2) |
| `app/` | アプリのソースコード | アプリ開発開始時(Phase 3) |
| `scripts/` | Markdown→JSON 変換などの自動化スクリプト | アプリ開発開始時 |
| `books/` | 電子書籍の原稿 | 書籍制作開始時(Phase 3〜4) |
| `community/` | コミュニティガイドライン等 | Phase 4 |
| `.claude/` など | AIエージェント用の設定・スキル | AI連携強化時 |

## 更新履歴

| 日付 | 内容 |
|---|---|
| 2026-07-16 | ユーザー決定により「二正典の分離(Master Library=世界の正典/development-rules=運営の正典)」を標準構成として明文化 |
| 2026-07-16 | 初版作成 |
