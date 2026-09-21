# 同梱フォント — MUGEN ZERO

## Noto Serif JP

ステータス画面の明朝体。**この画面にのみ適用**し、他の画面は従来どおりです。

| 項目 | 内容 |
|---|---|
| 書体名 | Noto Serif JP |
| 配布元 | Google — npm パッケージ [`@fontsource/noto-serif-jp`](https://www.npmjs.com/package/@fontsource/noto-serif-jp) v5.3.0 経由で自己ホスト |
| 原典 | [Google Fonts / Noto Serif JP](https://fonts.google.com/noto/specimen/Noto+Serif+JP) |
| ライセンス | **SIL Open Font License, Version 1.1 (OFL-1.1)** |
| 商用利用 | **可**。ゲームへの組み込み・再配布ともに可 |
| 帰属表示 | **OFL は表示義務を課していません。**ただしライセンス本文の同梱が必須です |
| ライセンス本文 | `node_modules/@fontsource/noto-serif-jp/LICENSE`（依存として同梱） |

### OFL で守るべきこと

1. **ライセンス本文を同梱する。** npm 依存として `LICENSE` が入るため満たしています
2. **フォント単体を有償で販売しない。** ゲームに組み込んでの販売は問題ありません
3. **改変版に "Noto" の名前を使わない。** 改変していません
4. クレジット表記は義務ではありませんが、入れる場合は
   「Noto Serif JP — Google, SIL Open Font License 1.1」で足ります

### 何を同梱しているか

ウェイトは **400 のみ**、サブセットは **japanese と latin のみ**です。

| ファイル | サイズ |
|---|---|
| `noto-serif-jp-japanese-400-normal.woff2` | 1,363,780 bytes |
| `noto-serif-jp-latin-400-normal.woff2` | 18,748 bytes |
| **合計** | **約 1.38 MB** |

同パッケージには unicode-range で125分割された版（合計 5.08 MB）もありますが、
採用していません。分割版は Web では遅延読み込みが効きますが、Android では
結局すべて APK に入るため、1.38 MB のほうが軽く、リクエストも1回で済みます。

ウェイト 500 以上は同梱していません。1行のために 1.36 MB を追加することになり、
明朝体の合成太字は破綻して見えるためです。強調はサイズと色で行っています。

### 読み込みのされ方

`@font-face` の宣言だけではダウンロードは発生しません。フォントは
**その書体で実際に文字が描画されるとき**に初めて取得されます。書体は
`.status-screen` にのみ適用しているため、ステータス画面を開かないプレイヤーは
1バイトも取得しません。Android ではローカルファイルなので取得自体が発生しません。

`font-display: swap` なので、到着前はフォールバック（端末の明朝：
Hiragino Mincho ProN / Yu Mincho / Noto Serif CJK JP）で描画され、
到着後に差し替わります。**未同梱の環境でも字形は明朝のまま**です。

### 未収録文字について

`japanese` サブセットに無い稀少漢字（プレイヤーが名前に入力した場合など）は、
端末のフォントで描画されます。表示は崩れません。
