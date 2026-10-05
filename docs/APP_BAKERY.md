# App パン屋画面（ALDEN_BAKERY）（2026-10-05）

## 場所の定義（作者決定）

- `ALDEN_BAKERY` は**リナの父が現在営んでいるパン屋**。アルデン村のパン屋はこの 1 軒だけ。
- 3 年後のガルド関連（見逃すルートの未来・再会・「店の一角をガルドに貸す」出来事）も、この同じ `ALDEN_BAKERY` で扱う。ガルドが別の店を開いた設定にはしない。
- 現在：リナは 14 歳で父のパン屋を手伝っている。店主はリナの父で、年齢は未設定のまま。リナの将来は決めない。
- `futureSites.ts` の「？？？」段階の説明は「リナの父が営むパン屋。近ごろ、店の奥が少し賑やかになったらしい。」（誰が・なぜは書かない。旧文「以前は空き店舗だった場所に、新しい店ができている。」は現在の設定と矛盾するため置き換え）。この文は Artifact 版の同じカードにも出る。

## 画面

| 項目 | 内容 | 場所 |
|---|---|---|
| 遷移 | アルデン村 →「パン屋」→ パン屋 →「話す」→ 会話 →「もどる」→ パン屋 →「店を出る」（または Android の戻るボタン）→ アルデン村 | `src/App.tsx`（酒場と同じく HOME の子画面として App 内で保持） |
| 構成 | 背景・パン屋の主人・リナ・会話欄の 4 レイヤー（酒場と同じ方式） | `src/ui/bakery.tsx` |
| 背景 | `location-alden-bakery-interior.png`（1672×941、人物・文字なし、受け取ったまま） | `mugen-assets/files/backgrounds/` |
| 人物 | 既存の `bakery-owner-fullbody.png`（1086×1448）・`lina-fullbody.png`（1254×1254）を加工なしで使用 | `mugen-assets/files/characters/` |
| 表示 | 2 人とも `object-fit: contain`・足元基準。大きさは `min(100vh, 48vw)` を単位に主人 0.94・リナ 0.78。リナは主人の左手前 | `src/ui/styles.css` `.bakery-*` |
| BGM | アルデン村の曲のまま（`TALK_SPOT` ＋ `ALDEN_BAKERY` → `ALDEN_VILLAGE`。同じ曲なので途切れない） | `sceneBgm.ts` は変更なし |
| 会話 | 主人とリナの紹介 4 行だけ。物語・将来・ガルド・四択には触れない。世界には何も記録しない | `mugen-core/content/dialogue/bakeryShop.ts` |

## 回帰テスト

`e2e/bakery.spec.ts`（6 本）。Android の戻るボタンはネイティブ専用でブラウザから押せないため、実機で確認する（酒場と同じ処理経路）。
