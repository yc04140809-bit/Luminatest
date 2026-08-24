# Prompt Library

画像生成プロンプトを**履歴付きで**管理するライブラリです。
「あの雰囲気をもう一度出したい」を実現するため、使ったプロンプトは必ずここに残します。

スタイルの方針・共通ベースプロンプトは [master-library/07_image-generation-guidelines.md](../master-library/07_image-generation-guidelines.md) が正です。

## 構成

```
prompt-library/
├── README.md            ← このファイル(運用ルール)
├── _templates/
│   └── prompt-template.md
└── prompts/
    ├── cards/           ← カード用。Card ID ごとに1フォルダ
    │   └── LA-M-03/
    │       ├── v001.md  ← 1バージョン = 1ファイル
    │       └── v002.md
    └── characters/      ← キャラクター用。キャラslugごとに1フォルダ
        └── lumina/
            └── v001.md
```

## 運用ルール

1. **1バージョン = 1ファイル**: プロンプトを変えて再生成するときは、上書きせず `v002.md` のように新しいファイルを作る
2. **版番号は3桁連番**: `v001` から。欠番・枝番は作らない
3. **結果も記録する**: 生成ツール・日付・出来栄えメモ・採用/不採用を必ず書く(失敗の記録が次の成功を作る)
4. **採用したら Card Database 側に反映**: カードファイルのフロントマター `image.adopted_prompt_version` に版番号を記録
5. **共通ベースプロンプトの変更は 07章で**: 個別ファイルでベース部分を勝手に改変しない(改変が必要なら 07章を改訂)

## 新規カードのプロンプトを作る手順

1. `prompts/cards/{CARD-ID}/` フォルダを作成
2. [`_templates/prompt-template.md`](./_templates/prompt-template.md) をコピーして `v001.md` を作成
3. 07章の共通ベース+カード固有の要素でプロンプトを構成
4. 生成 → 結果を記録 → 必要なら v002 へ
