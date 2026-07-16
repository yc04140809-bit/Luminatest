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
| [06_ai-role-definition.md](./06_ai-role-definition.md) | **最上位ルール(00と同格)**。ユーザー制定の AI Role Definition v1.0(原文)。ケイオス師匠/Lumina/Claude Code の役割・権限 |

## 5行サマリー

0. **役割を守る** — Claude Code は開発責任AI。世界観・キャラ・カード内容の創作は Lumina とケイオス師匠の領分([06_役割定義](./06_ai-role-definition.md))
1. **勝手に創作しない** — 設定の状態は5タグ【未設定】【仮設定】【要確認】【正式設定】【廃止】で管理し、改善案は【提案】として提示する(採否はユーザーが判断。正式定義は 00 のタグ運用ルール)
2. **Master Library が正** — 迷ったら `master-library/` を見る。矛盾したらそちらに合わせる
3. **テンプレートからコピー** — カード・キャラ・世界エントリ・プロンプトは必ず `_templates/` から作る
4. **変えたら記録する** — 更新はファイル内の履歴と `master-library/14_changelog.md` に「変更履歴・変更理由・影響範囲」を残す
