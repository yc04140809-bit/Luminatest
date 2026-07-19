# Card Database

全78枚のカードデータを管理するデータベースです。
**1カード = 1ファイル**(Markdown + YAMLフロントマター)で管理します。

## 構成

```
card-database/
├── README.md                          ← このファイル(運用ルール)
├── _templates/
│   ├── card-template.md               ← 新規カードはこれをコピーして作る(空テンプレート)
│   └── card-template-filled-example.md ← 記入見本(LA-TEMPLATE-00。内容はすべて仮設定)
├── schema/
│   └── card-schema.json               ← アプリ化用のデータスキーマ(JSON Schema)
└── cards/
    ├── major/             ← メジャーアルカナ 22枚(LA-M-00〜LA-M-21・0始まり)
    └── minor/             ← マイナーアルカナ 56枚(スート確定後にサブフォルダを作成)
```

## 運用ルール

1. **発番が先**: 新しいカードを作る前に [master-library/06_card-master.md](../master-library/06_card-master.md) の台帳に行を追加する
2. **テンプレート厳守**: [`_templates/card-template.md`](./_templates/card-template.md) をコピーして作成。項目の追加・削除はテンプレート改訂として扱う([master-library/05](../master-library/05_card-creation-rules.md) 参照)
3. **ファイル名**: `{card-id}_{slug}.md`(例: `LA-M-00_cradle-of-life.md`)
4. **Card ID は不変**: 一度発番した ID・ファイル名の ID 部分は変更しない
5. **画像は版管理・差し替え可能な構造にする**: 採用画像は [`assets/cards/`](../assets/cards/) に `{card-id}_v{3桁}.png` で保存し、カード側のフロントマター `image.adopted_image` から参照する。画像プロンプトの本文自体は書かない([Prompt Library](../prompt-library/) が正)
6. **更新したら履歴を書く**: ファイル末尾の更新履歴と、重要な変更は [master-library/14_changelog.md](../master-library/14_changelog.md) にも記録

## YAMLフロントマターについて

各カードの機械可読データ(ID・タイトル・属性・キーワード・ラッキーカラー等)はフロントマターに、
長文(ストーリー・各運勢メッセージ)は本文セクションに書きます。
将来、フロントマター+本文を [schema/card-schema.json](./schema/card-schema.json) 準拠の JSON に変換してアプリへ配信します。

## 画像アセットの更新方法(画像ファイルのみで差し替え可能な設計)

1. 新しい画像を `assets/cards/{card-id}_v{次の版番号}.png` として追加する(旧版は削除しない)
2. 対象カードの Markdown フロントマターの `image.adopted_image` を新しいファイル名に更新する
3. これ以外(UI・ロジック・データ構造)は変更しない — 画像ファイルの追加とこの1フィールドの更新だけで最新版に切り替わる

## テンプレート使用例

[`_templates/card-template-filled-example.md`](./_templates/card-template-filled-example.md)(識別子: `LA-TEMPLATE-00`)はテンプレートの記入見本です。

- 内容はすべて【仮設定】であり、**正式設定ではありません**
- Master Library(06 カードマスター)の正式一覧には登録しません
- 識別子 `LA-TEMPLATE-00` は実カードの Card ID パターン(`LA-M-\d{2}` 等)とは一致しない、テンプレート専用の表記です
- 正式なカード制作では、`_templates/card-template.md` を複製し、この記入見本を書き方の参考にしてください
- この記入見本は制作効率向上のため、削除せず維持します(ユーザー決定: 2026-07-16)

※ 以前は `LA-M-00` を記入見本用の予約IDとしていましたが、実際のカード画像には 0〜21 の番号が焼き込まれており `LA-M-00` は正式カード「生命の揺り籠(Cradle of Life)」であるため、2026-07-18 に識別子を `LA-TEMPLATE-00` へ変更し、記入見本を `_templates/` 配下へ移設しました。
