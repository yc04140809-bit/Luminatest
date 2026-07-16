# Lumina Arcana Project

> 「安心・癒し・希望・心を整理する時間」を届ける長期IPブランドの開発基盤

Lumina Arcana は単なるオラクルカード制作プロジェクトではありません。
「時のゆりかご」という安心できる世界を中心に、アプリ・SNS・紙カード・電子書籍・コミュニティへと育てていくオリジナルIPブランドです。

このリポジトリは、その **唯一の正式な設定資料・制作基盤(Single Source of Truth)** です。

## ディレクトリ構成

| ディレクトリ | 役割 |
|---|---|
| [`master-library/`](./master-library/) | ブランドの唯一の正式設定資料。全15章。迷ったらここが正 |
| [`card-database/`](./card-database/) | 全78枚のカードデータ。1カード=1ファイルで管理 |
| [`prompt-library/`](./prompt-library/) | 画像生成プロンプト。カード・キャラごとに履歴管理 |
| [`character-bible/`](./character-bible/) | ルミナ、ケイオスちゃん、アリア、レヴィ等のキャラクター設定 |
| [`world-bible/`](./world-bible/) | 「時のゆりかご」を中心とした世界設定(地図・歴史・神話・建物・精霊・神獣・用語) |
| [`development-rules/`](./development-rules/) | 開発ルール・命名規則・更新ルール。人間もAIもここに従う |

## はじめて触れる人(またはAI)へ

1. まず [`master-library/00_brand-philosophy.md`](./master-library/00_brand-philosophy.md) を読む
2. 次に [`development-rules/`](./development-rules/) の全ファイルを読む
3. 作業対象のディレクトリの `README.md` を読んでから編集する

## 最重要ルール

すべての制作・設計・文章は、ブランド理念
**「安心・癒し・希望・心を整理する時間」**
を損なわないことを最優先とします。

不安を煽る表現、断定的な占い、恐怖をベースにした演出は、このブランドでは扱いません。
詳細は [`master-library/08_writing-guidelines.md`](./master-library/08_writing-guidelines.md) を参照してください。

## 情報の優先順位(Single Source of Truth)

1. `master-library/` — 正式設定。ここと矛盾する記述は誤り
2. `card-database/` `character-bible/` `world-bible/` — 詳細データ。Master Library の各章から参照される
3. その他のメモ・SNS投稿・アプリ内文言 — すべて上記から派生させる

設定を変更する場合は、必ず Master Library を先に更新し、`14_changelog.md` に記録してください。
