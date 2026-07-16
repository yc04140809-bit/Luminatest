# Development Rules

このプロジェクトで作業するすべての人間とAIエージェントが従うルールです。
**新しいAIセッションを始めたら、まずこのディレクトリの全ファイルを読んでください。**

## ファイル一覧

| ファイル | 内容 |
|---|---|
| [00_project-rules.md](./00_project-rules.md) | **最上位ルール**。ユーザー制定の Project Rules v1.0(原文) |
| [01_development-rules.md](./01_development-rules.md) | 開発の基本原則・AIエージェントの行動規範 |
| [02_naming-conventions.md](./02_naming-conventions.md) | 命名規則(ID・ファイル名・用語) |
| [03_folder-structure.md](./03_folder-structure.md) | フォルダ構成の定義と拡張方針 |
| [04_file-structure.md](./04_file-structure.md) | ファイルの内部構造(フロントマター・章立て) |
| [05_update-rules.md](./05_update-rules.md) | 更新・変更・履歴記録のルール |

## 4行サマリー

1. **勝手に創作しない** — 未確定事項は【未設定】【要確認】【仮設定】で管理し、改善案は【提案】として提示する(採否はユーザーが判断)
2. **Master Library が正** — 迷ったら `master-library/` を見る。矛盾したらそちらに合わせる
3. **テンプレートからコピー** — カード・キャラ・世界エントリ・プロンプトは必ず `_templates/` から作る
4. **変えたら記録する** — 更新はファイル内の履歴と `master-library/14_changelog.md` に「変更履歴・変更理由・影響範囲」を残す
