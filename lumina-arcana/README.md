# Lumina Arcana Project

> 「安心・癒し・希望・心を整理する時間」を届ける長期IPブランドの開発基盤

Lumina Arcana は単なるオラクルカード制作プロジェクトではありません。
「時のゆりかご」という安心できる世界を中心に、アプリ・SNS・紙カード・電子書籍・コミュニティへと育てていくオリジナルIPブランドです。

このリポジトリは、その **唯一の正式な設定資料・制作基盤(Single Source of Truth)** です。

## 標準構成(ユーザー決定 2026-07-16)

このプロジェクトは2つの正典を分離して管理します。両者は分離したまま運用し、必要に応じて相互参照します。

| 正典 | 場所 | 管理する内容 |
|---|---|---|
| **世界の正典** | [`master-library/`](./master-library/) | 作品・ブランド・世界観・キャラクター・カード設定など、作品世界に関する正式設定 |
| **運営の正典** | [`development-rules/`](./development-rules/) | 開発・運営・AI役割・命名規則・タグ運用・品質管理など、プロジェクト運営ルール(Project Rules / AI Role Definition を含む) |

## ディレクトリ構成

| ディレクトリ | 役割 |
|---|---|
| [`master-library/`](./master-library/) | 【世界の正典】ブランドの唯一の正式設定資料。全15章。世界観・設定で迷ったらここが正 |
| [`card-database/`](./card-database/) | 全78枚のカードデータ。1カード=1ファイルで管理 |
| [`prompt-library/`](./prompt-library/) | 画像生成プロンプト。カード・キャラごとに履歴管理 |
| [`character-bible/`](./character-bible/) | ルミナ、ケイオスちゃん、アリア、レヴィ等のキャラクター設定 |
| [`world-bible/`](./world-bible/) | 「時のゆりかご」を中心とした世界設定(地図・歴史・神話・建物・精霊・神獣・用語) |
| [`development-rules/`](./development-rules/) | 【運営の正典】開発・運営・AI役割・命名規則・タグ運用・品質管理のルール。人間もAIもここに従う |

## はじめて触れる人(またはAI)へ

1. まず [`development-rules/00_project-rules.md`](./development-rules/00_project-rules.md)(最上位ルール・Project Rules v1.0)を読む
2. 次に [`master-library/00_brand-philosophy.md`](./master-library/00_brand-philosophy.md) と [`development-rules/`](./development-rules/) の全ファイルを読む
3. 作業対象のディレクトリの `README.md` を読んでから編集する

設定の状態は【未設定】【仮設定】【要確認】【正式設定】【廃止】の5タグ、AIからの改善案は【提案】タグで管理します(正式定義: [development-rules/00_project-rules.md](./development-rules/00_project-rules.md) のタグ運用ルール)。
タグ付きの項目を確定できるのはユーザーだけです。

## 最重要ルール

すべての制作・設計・文章は、ブランド理念
**「安心・癒し・希望・心を整理する時間」**
を損なわないことを最優先とします。

不安を煽る表現、断定的な占い、恐怖をベースにした演出は、このブランドでは扱いません。
詳細は [`master-library/08_writing-guidelines.md`](./master-library/08_writing-guidelines.md) を参照してください。

## 情報の優先順位(Single Source of Truth)

**世界観・設定について:**

1. `master-library/` — 世界の正典。ここと矛盾する記述は誤り
2. `card-database/` `character-bible/` `world-bible/` — 詳細データ。Master Library の各章から参照される
3. その他のメモ・SNS投稿・アプリ内文言 — すべて上記から派生させる

**運営ルールについて:**

1. `development-rules/00_project-rules.md`・`06_ai-role-definition.md` — ユーザー制定の最上位ルール
2. `development-rules/` のその他ファイル — 上記を実務に落とし込んだ運用規範

設定を変更する場合は、必ず Master Library を先に更新し、`14_changelog.md` に記録してください。
