# App 酒場画面（月灯りの酒場） — 正式実装として確定（2026-10-05）

作者確認のうえ、現在の状態（コミット `5e81f80` 時点）を**正式実装として確定**した。
**追加修正は行わない。** 位置調整・背景加工・会話欄の変更は不要と判断済み。

## 確定した内容

| 項目 | 確定内容 | 場所 |
|---|---|---|
| 画面遷移 | アルデン村 →「月灯りの酒場」→ 酒場 →「話す」→ 会話 →「もどる」→ 酒場 →「店を出る」→ アルデン村 | `src/App.tsx`（HOME の子画面として App 内で保持。共有の画面定義は変更なし） |
| 構成 | 背景・マスター立ち絵・会話欄の 3 レイヤー。マスターは背景に描き込まない | `src/ui/tavern.tsx` |
| 背景 | `location-alden-tavern-interior.png`（1672×941、受け取ったまま） | `mugen-assets/files/backgrounds/` |
| マスター立ち絵 | `tavern-master-standing.png`（971×1619、背景透過、受け取ったまま） | `mugen-assets/files/characters/tavern-master/` |
| マスターの表示位置 | `object-fit: contain`・`object-position: 50% 100%`・`right: max(10%, safe-area)`・`bottom: 2%`・`width: 36%`・`height: 94%`。背景右手前の椅子の「手前に立っている」と読める位置 | `src/ui/styles.css` `.tavern-master` |
| 会話欄 | 左下、幅 56% | `src/ui/styles.css` `.tavern-words` |
| BGM | 酒場の曲（`TAVERN`）。`TALK_SPOT` ＋ `MOONLIGHT_TAVERN` として既存の割り当てに渡す | `src/App.tsx`（`sceneBgm.ts` は変更なし） |
| 会話 | 初回はグレイヴとの初対面、2 回目以降は「また来たな」。台詞は共通シナリオのまま | `aldenExperience.ts` の `MOONLIGHT_TAVERN_FIRST_VISIT` / `TAVERN_MASTER_IDLE` |
| 初対面の地の文 | App 版のみ「カウンターの奥に、大柄な男が立っている。」「片手を腰に当て、豪快な笑みを浮かべていた。」（共通シナリオの「腕を組んだ大男」1 行を App 画面側で置き換え） | `src/ui/tavern.tsx` |

## 触れていないもの（今後も維持）

- SAVE・WORLD MEMORY・既存の進行：酒場は何も記録しない（会話済みかどうかはセッション中だけ保持）。`e2e/tavern.spec.ts` がセーブ不変を確認している。
- Artifact 版の酒場：`location-alden-tavern.webp`（マスター描き込み済み）と共通シナリオの「腕を組んだ大男」はそのまま。統一するかは後で判断する。

## 回帰テスト

`e2e/tavern.spec.ts`（7 本）：遷移・3 レイヤー・BGM・会話・新しい地の文・セーブ不変、横画面 5 サイズ（915×412、844×390、800×360、640×360、640×300）でマスターが切れず会話欄と重ならないこと。
