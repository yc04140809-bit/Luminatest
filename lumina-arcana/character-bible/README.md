# Character Bible

Lumina Arcana のキャラクター設定を管理します。
**1キャラクター = 1ファイル**。一覧・関係性・共通ルールは [master-library/04_characters.md](../master-library/04_characters.md) が正です。

## 構成

```
character-bible/
├── README.md
├── _templates/
│   └── character-template.md   ← 新キャラはこれをコピー
└── characters/
    ├── lumina.md        (CHR-001 ルミナ)
    ├── chaos-chan.md    (CHR-002 ケイオスちゃん)
    ├── aria.md          (CHR-003 アリア)
    └── levi.md          (CHR-004 レヴィ)
```

## 運用ルール

1. **発番が先**: 新キャラは master-library/04 の一覧表に CHR-xxx を追加してからファイルを作る
2. **口調・一人称は固定資産**: 一度確定した話し方は、全媒体(カード・SNS・アプリ)で統一する。変更は「設定変更」として履歴に残す
3. **ビジュアルはプロンプトとセットで管理**: 見た目の決定版プロンプトは [prompt-library/prompts/characters/](../prompt-library/prompts/characters/) に置き、キャラファイルからリンクする
4. **理念との整合**: どのキャラも「利用者を安心させる側」に立つ。完全な悪役は作らない
5. **セリフサンプルを必ず持つ**: AIがそのキャラとして文章を書くとき、サンプルが最重要の参照になる
