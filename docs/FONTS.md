# 同梱フォント — MUGEN ZERO

## 使い分け（作者 2026-10-17「アプリ全体フォント統一・可読性改善」）

| 役割 | 書体 | 太さ | 例 |
|---|---|---|---|
| タイトル・章名・場所名・大見出し（`--font-display`） | Noto Serif JP | 400 | STATUS、アルデン村、BATTLE RESULT、噂話・持ち物・人生の記録などの画面タイトル、店名 |
| 本文・会話・説明（`--font-body`） | Noto Sans JP | 400（行間 1.45〜1.6） | 会話の一行、説明文、ヒント |
| ボタン・メニュー・タブ（`--font-ui`） | Noto Sans JP | 500 | 下部5ボタン、扉、技リスト、戻る |
| 名前（人物・アイテム・スキル・記録の見出し） | Noto Sans JP | 500（話す人の名前・ステータスの名前は 600） | |
| 数値（`--font-number`） | Noto Sans JP | 600・等幅数字 | HP／MP、LUMI、価格、所持数、ステータス、戦闘結果 |

- 戦闘画面（通常・3人・カットインの技名）は**すべてゴシック**（装飾フォントなし）。
- 英字（STATUS の下の MUGEN ZERO、WORLD MEMORY など）は日本語より小さく、字間を広め、少し薄く（`opacity 0.72`）。
- 影は背景が複雑な所だけ、弱く（戦闘のコマンド・丸ボタン：`0 1px 2px rgba(0,0,0,.6)`。以前の太い縁取りはやめた）。
- 共通トークンは `mugen-app/src/ui/styles.css` の `:root`（`--font-*`・`--text-*-size`・`--text-*-weight`・`--line-height-*`・`--text-main`／`--text-sub`）。
  画面ごとに font-family を増やさない。役割ごとのルールは styles.css 末尾「文字の役割」。
- 読み込みは `main.tsx` で一度だけ（全画面共通）。`@font-face` は文字が使われるまで何もダウンロードしない。
- 文字サイズは 844×390（CSS px）の横画面に合わせた。会話の一行 15px、場所名 18〜20px、画面タイトル 22〜30px、
  ボタン 14〜15px、補助英字 7〜10px。指示書の目安（本文 16〜20px）をすべてに当てると、画面の高さ 390px では
  レイアウトが変わる（配置を変えない約束）ため、読みやすさを確かめながら一段ずつ上げた。

## Noto Sans JP（2026-10-17 追加）

| 項目 | 内容 |
|---|---|
| 書体名 | Noto Sans JP |
| 配布元 | Google — npm パッケージ [`@fontsource/noto-sans-jp`](https://www.npmjs.com/package/@fontsource/noto-sans-jp) v5.3.0（固定）経由で自己ホスト |
| ライセンス | **SIL Open Font License, Version 1.1 (OFL-1.1)**。商用利用・組み込み・再配布可。本文の同梱が必須（npm 依存の `LICENSE` で満たす） |
| 同梱 | ウェイト **400・500・600**、サブセット **japanese と latin のみ** |
| サイズ | japanese 各約 1.0 MB ×3 ＋ latin 各約 13 KB ×3 ＝ **約 3.1 MB** |

## Noto Serif JP

見出し（タイトル・場所名）の明朝体。2026-10-17 から全画面の見出しに使う（以前はステータス画面のみ。本文はゴシックへ）。

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
