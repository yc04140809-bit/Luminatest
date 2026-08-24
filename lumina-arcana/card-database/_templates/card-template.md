---
# ===== 機械可読データ(アプリ用)=====
card_id: "LA-X-00"            # 例: LA-M-00(メジャーは00〜21) / LA-S1-01。発番は master-library/06 で行う
title_ja: ""                  # 日本語タイトル
title_en: ""                  # 英語タイトル
arcana: ""                    # major / minor
suit: ""                      # メジャーは null。マイナーはスート名(確定後)
attribute: ""                 # 属性(4属性は 01_worldview と整合させる)
keywords: []                  # キーワード(目安3〜5個。特別な意味を持つカードは増やしてよい) 例: ["はじまり", "光", "一歩"]
symbols: []                   # 象徴(モチーフ・登場キャラID) 例: ["朝の光", "CHR-001"]
lucky_color: ""               # ラッキーカラー
lucky_number: null            # ラッキーナンバー
image:
  prompt_ref: "../../../prompt-library/prompts/cards/LA-X-00/"  # プロンプト履歴フォルダ
  adopted_prompt_version: ""  # 採用したプロンプト版 例: "v001"
  adopted_image: ""           # 採用画像ファイル名 例: "LA-X-00_v001.png"
status: "draft"               # planned / draft / review / released / revising
version: "0.1"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
---

# LA-X-00 タイトル(日本語) / Title (English)

<!--
  Lumina Arcana 共通フォーマット Version 1.0(2026-07-18 正式採用)
  カード本文は以下5項目で統一する: Card Message / Reading / Reflection / Today's Light / Keywords
  (旧名 Meaning / Affirmation は廃止。既存22枚・今後追加される全カード・アプリUI・JSON・DB共通仕様)
  Reading は「カード自身が語りかける形式」を正式仕様とする
  Design Philosophy(カード固有の特別な意味合いの注釈)はカードデータに含めない。
    05_card-creation-rules.md(開発ドキュメント側)でのみ管理する
  執筆ガイドラインは master-library/08_writing-guidelines.md を参照
-->

## Card Message(メッセージ)

<!-- 1文、50字前後。今日のあなたへ、短く手渡す言葉。アプリ画面①に表示される -->

## Reading(リーディング)

<!-- カードが一人称(「私は〜」)で語りかける形式。詩的な複数行。アプリ画面②に表示される -->

## Reflection(問いかけ)

<!-- 1つの問い。静かに自分と向き合うための問いかけ。Yes/Noで終わらない開いた問いにする。ジャーナルへの橋渡し -->

## Today's Light(今日の光)

<!-- 一人称の短い宣言文。例: 「私は、今日の小さな一歩を信じます。」 -->

## Keywords(キーワード)

<!-- フロントマターの keywords が正。ここでは重複記載しない -->

## 画像管理

| 版 | ファイル名 | プロンプト版 | 生成ツール | 生成日 | 状態 | メモ |
|---|---|---|---|---|---|---|
| v001 | | | | | 候補/採用/差替済 | |

## 更新履歴

| 日付 | 版 | 内容 |
|---|---|---|
| YYYY-MM-DD | v0.1 | 下書き作成 |
