# MUGEN ZERO v0.1 — プレイテスト手順

## テスターへの渡し方

1. `npm run build` して `dist/` を配信（静的ホスティングで可）
2. スマートフォンのブラウザで開いてもらう。ホーム画面に追加すると全画面・オフラインで起動します
3. **説明はしないでください。** 普通のゲームとして遊んでもらうことが検証条件です
   - 「パン屋へ行って」「ここをテストして」などの誘導は結果を汚します
   - 詰まった箇所こそ観察対象です

所要時間の目安: 10〜15分（本編）＋ 1〜2分（アンケート）

## テスターが辿る道

タイトル → プロローグ → アルデン村 → グリーンウッドの森 → 盗賊と遭遇 →
戦闘 → 人生の選択 → 休息で数日 → TIME SHIFT（3年） → 探索 → 見慣れない店 →
再会 → LIFE ARCHIVE → 「この世界の感想を伝える」（アンケート）

アンケートは LIFE ARCHIVE 画面からテスター自身が開きます。プレイ中に
ポップアップは出ません。

## 回答の回収

回答は端末内の IndexedDB に匿名で保存されます（外部送信なし）。開発ビルドで
回収してください:

1. HOME 最下部の小さな `DEV` → ロック番号 `0909`
2. `PLAYTEST FEEDBACK` セクションで件数・平均・自由コメントを確認
3. `CSV EXPORT` で CSV を保存（UTF-8 BOM 付き、Excel でも文字化けしません）

本番ビルドでは DEV ADMIN の入口自体が存在しません。テスターの端末から回収する
場合は、開発ビルド（`npm run dev` またはビルド時に `VITE_ENABLE_DEV_ADMIN=1`）
を配布してください。

## 収集する情報

匿名の `playSessionId`（UUID）と 7 問の回答、および観察用の最小コンテキスト
（ルート、世界の日付、既知章数、コア体験到達フラグ）のみ。氏名・連絡先・端末
識別子・広告 ID は一切収集しません。

1プレイにつき1回答です。`RESET WORLD` で新しいプレイを始めると再び回答できます
（過去の回答は保持されます）。

## 見るべき指標

中心仮説は「自分の選択をキャラクターが覚え、その後の人生として返ってきた時、
プレイヤーは続きが見たいと思うか」です。

- **Q2 ガルドのその後が気になったか** — 仮説の核。ここが低ければ設計を疑う
- **Q3 再会時に気づいたか** — `NOT_RECOGNIZED` が多ければ再会演出の失敗
- **Q4 選択が世界に影響したと感じたか** — 因果の伝達度
- **Q1 / Q5** — 継続意欲と収集意欲
- **Q7 自由記述** — 迷った場所・退屈した場所は最優先の改善候補

## 単一HTML版（リンク1本で配る）

静的ホスティングを用意せずにテスターへ渡したいときは、全部入りの1ファイル
（約1.8MB）を作れます。

```bash
npm run build:singlefile
# dist-singlefile/index.html        … そのまま置ける単一HTML
# dist-singlefile/artifact.html     … <head>/<body> を持つ環境へ貼る用
```

開発者パネル付き（回答を回収したい端末用）:

```bash
VITE_ENABLE_DEV_ADMIN=1 npx vite build --config vite.config.singlefile.ts --outDir dist-singlefile-dev
node scripts/build-artifact-page.mjs dist-singlefile-dev/index.html dist-singlefile-dev/artifact-dev.html
```

制約: 単一HTML版は Service Worker と manifest を含まないため、PWA としての
インストールとオフライン起動はできません（ゲーム本編とセーブはそのまま動作
します）。PWA が必要なときは通常の `npm run build` の成果物を配信してください。
