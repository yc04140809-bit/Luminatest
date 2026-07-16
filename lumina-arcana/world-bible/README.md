# World Bible

Lumina Arcana の世界設定を管理します。
全体像と原則は [master-library/01_worldview.md](../master-library/01_worldview.md) が正であり、ここは詳細設定の置き場です。

## 構成

```
world-bible/
├── README.md
├── _templates/
│   └── world-entry-template.md   ← 建物・精霊・神獣・用語の個別エントリ用
├── cradle-of-time.md    ← 時のゆりかご(世界の中心)の詳細設定
├── world-map.md         ← 世界地図・土地
├── history.md           ← 歴史・年表
├── mythology.md         ← 神話
├── locations/           ← 建物・場所(1件1ファイル)
├── spirits/             ← 精霊(1件1ファイル)
├── sacred-beasts/       ← 神獣(1件1ファイル)
└── terms/               ← 用語の詳細解説(1件1ファイル)
```

## 運用ルール

1. **個別エントリは1件1ファイル**: `locations/` `spirits/` `sacred-beasts/` `terms/` は [`_templates/world-entry-template.md`](./_templates/world-entry-template.md) をコピーして作る
2. **用語は必ず用語集にも登録**: 新しい固有名詞を作ったら [master-library/03_glossary.md](../master-library/03_glossary.md) に正式表記を追加する
3. **矛盾したら Master Library が正**: 世界観の原則([01章](../master-library/01_worldview.md))と矛盾する設定は作らない
4. **地図・歴史・神話は互いに参照し合う**: 出来事には年代を、場所には地図上の位置を紐づける
5. **「安心できる世界」を壊さない**: 戦争・惨劇を世界の中心テーマにしない。影の要素は「受け止められ、癒される」文脈で描く
