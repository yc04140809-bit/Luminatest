# Card Database

全78枚のカードデータを管理するデータベースです。
**1カード = 1ファイル**(Markdown + YAMLフロントマター)で管理します。

## 構成

```
card-database/
├── README.md              ← このファイル(運用ルール)
├── _templates/
│   └── card-template.md   ← 新規カードはこれをコピーして作る
├── schema/
│   └── card-schema.json   ← アプリ化用のデータスキーマ(JSON Schema)
└── cards/
    ├── major/             ← メジャーアルカナ 22枚(LA-M-01〜LA-M-22)+ 記入見本 LA-M-00
    └── minor/             ← マイナーアルカナ 56枚(スート確定後にサブフォルダを作成)
```

## 運用ルール

1. **発番が先**: 新しいカードを作る前に [master-library/06_card-master.md](../master-library/06_card-master.md) の台帳に行を追加する
2. **テンプレート厳守**: [`_templates/card-template.md`](./_templates/card-template.md) をコピーして作成。項目の追加・削除はテンプレート改訂として扱う([master-library/05](../master-library/05_card-creation-rules.md) 参照)
3. **ファイル名**: `{card-id}_{slug}.md`(記入見本: `LA-M-00_hajimari-no-hikari.md`)
4. **Card ID は不変**: 一度発番した ID・ファイル名の ID 部分は変更しない
5. **画像プロンプトの本文は書かない**: プロンプトは [Prompt Library](../prompt-library/) が正。カード側はリンクと採用版番号のみ持つ
6. **更新したら履歴を書く**: ファイル末尾の更新履歴と、重要な変更は [master-library/14_changelog.md](../master-library/14_changelog.md) にも記録

## YAMLフロントマターについて

各カードの機械可読データ(ID・タイトル・属性・キーワード・ラッキーカラー等)はフロントマターに、
長文(ストーリー・各運勢メッセージ)は本文セクションに書きます。
将来、フロントマター+本文を [schema/card-schema.json](./schema/card-schema.json) 準拠の JSON に変換してアプリへ配信します。

## テンプレート使用例(LA-M-00)

[`cards/major/LA-M-00_hajimari-no-hikari.md`](./cards/major/LA-M-00_hajimari-no-hikari.md) はテンプレートの使用例(記入見本)です。

- 内容はすべて【仮設定】であり、**正式設定ではありません**
- Master Library(06 カードマスター)の正式一覧には登録しません
- カードID **LA-M-00 はテンプレート専用の予約ID**です。正式カード番号(LA-M-01〜LA-M-22 / LA-S1-01〜LA-S4-14)には使用しません
- 正式なカード制作では、`_templates/card-template.md` を複製し、この使用例を書き方の参考にしてください
- この使用例は制作効率向上のため、削除せず維持します(ユーザー決定: 2026-07-16)
