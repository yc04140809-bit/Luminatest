# App パン屋画面（ALDEN_BAKERY）（2026-10-05）

## 場所の定義（作者決定）

- `ALDEN_BAKERY` は**リナの父が現在営んでいるパン屋**。アルデン村のパン屋はこの 1 軒だけ。
- 3 年後のガルド関連（見逃すルートの未来・再会・「店の一角をガルドに貸す」出来事）も、この同じ `ALDEN_BAKERY` で扱う。ガルドが別の店を開いた設定にはしない。
- 現在：リナは 14 歳で父のパン屋を手伝っている。店主はリナの父で、年齢は未設定のまま。リナの将来は決めない。
- 共通シナリオ `futureSites.ts` の文（「以前は空き店舗だった場所に、新しい店ができている。」）は**変更しない**（Artifact 版はこの文のまま）。
- App 版だけ、未来の場所の一覧（「？？？」段階）で「リナの父が営むパン屋。近ごろ、店の奥が少し賑やかになったらしい。」と表示する。酒場の地の文と同じく App 画面側の表示上書き（`src/ui/futureSite.tsx` の `appUnknownDescription`。共通文と完全一致したときだけ置き換える）。
- 村から普通に入るパン屋では、ガルドの未来を示唆する文は出さない（「リナの父が営むパン屋。焼きたてのパンの匂いがする。」）。

### 作者決定（2026-10-08）

- **パン屋の看板娘はリナ**。既存 CANON どおり「14 歳・パン屋の娘」として扱い、新しい人物設定（好きなもの・夢・性格づけなど）は足さない。
- **パン屋の日常会話でガルドには触れない**。リナとガルドの関係は物語イベント・3 年後の変化につながる要素なので、日常会話で先に固定しない。
  必要になった時に、物語の進行・WORLD MEMORY の状態に応じて会話が変わる形で正式に追加する。
- core `content/dialogue/bakeryShop.test.ts` が、パン屋の会話・説明文・パン屋の噂（セキリュウガ編）にガルドが出ないこと、話し手が主人とリナだけであることを確認する。

## 画面

| 項目 | 内容 | 場所 |
|---|---|---|
| 遷移 | アルデン村 →「パン屋」→ パン屋 →「話す」→ 会話 →「もどる」→ パン屋 →「店を出る」（または Android の戻るボタン）→ アルデン村 | `src/App.tsx`（酒場と同じく HOME の子画面として App 内で保持） |
| 構成 | 背景・パン屋の主人・リナ・会話欄の 4 レイヤー（酒場と同じ方式） | `src/ui/bakery.tsx` |
| 背景 | `location-alden-bakery-interior.png`（1672×941、人物・文字なし、受け取ったまま） | `mugen-assets/files/backgrounds/` |
| 人物 | 既存の `bakery-owner-fullbody.png`（1086×1448）・`lina-fullbody.png`（1254×1254）を加工なしで使用 | `mugen-assets/files/characters/` |
| 表示 | 2 人とも `object-fit: contain`・足元基準。大きさは `min(100vh, 48vw)` を単位に主人 0.94・リナ 0.78。リナは主人の左手前 | `src/ui/styles.css` `.bakery-*` |
| BGM | アルデン村の曲のまま（`TALK_SPOT` ＋ `ALDEN_BAKERY` → `ALDEN_VILLAGE`。同じ曲なので途切れない） | `sceneBgm.ts` は変更なし |
| 会話 | （2026-10-09 から）切替 [リナ][主人]、入店時は毎回リナ。リナ＝初回会話（世界で 1 回、既読 `talk:BAKERY_LINA_FIRST`）→ 以後は短い 1 行、主人＝素材のヒント（＋セキリュウガ編の噂）。物語・将来・ガルド・四択には触れない | `mugen-core/content/dialogue/bakeryTalk.ts` |
| 買う | リナの「買う」でパン 4 種（`docs/BAKERY_BREAD.md`） | `mugen-core/content/economy/breads.ts` |

## 回帰テスト

`e2e/bakery.spec.ts`（6 本）、`e2e/bread.spec.ts`（6 本、パン屋 MVP）、`e2e/futureCg.spec.ts`（一覧のパン屋の文）、App 単体 `src/ui/futureSite.test.ts`（App と Artifact の文が独立していること）。Android の戻るボタンはネイティブ専用でブラウザから押せないため、実機で確認する（酒場と同じ処理経路）。

## パン屋 MVP（2026-10-09）

パンの購入・持ち物・食べる・期限・切替 UI は `docs/BAKERY_BREAD.md`。以前の「主人とリナの紹介 4 行」（`bakeryShop.ts`）は画面では使わなくなり、リナの初回会話に置き換えた。
