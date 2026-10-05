# BGM / SE 基盤 現状監査（2026-10-05）

対象：App（`packages/mugen-app`）の音。曲の割り当ては Artifact と共通の `mugen-core/content/audio/*`。
今回は**監査のみ**で、仕組みは変えていない（古くなったコメント 1 か所と、`BGM_MAP.md` のファイル名を直しただけ）。

## 構造（4 層）

| 層 | ファイル | 役割 |
|---|---|---|
| 音源の登録 | `mugen-assets/src/music.ts`（BGM）、`mugen-assets/src/sfx.ts`（効果音） | trackId → ファイル。BGM は手で書いた表、効果音は `files/audio/se/*.mp3` をフォルダごと読む（id＝ファイル名） |
| 割り当て | `mugen-core/content/audio/sceneBgm.ts` `bgmForScene(cue)` | 画面（＋場所・ケイオス発話・戦闘曲）→ trackId または null（無音）。純粋関数、Artifact と共有 |
| 戦闘曲の決定 | `mugen-core/content/audio/battleBgm.ts` `battleBgmFor()` | 固定曲（ガルド＝ボス戦）→ 選んだ曲（解放済みのみ）→ 既定曲 |
| 再生 | `mugen-app/src/platform/audio.ts` `AudioManager` ＋ `ui/audio/useSceneBgm.ts` | `useSceneBgm` が唯一の配線。画面側は `playBgm` を呼ばない |

## シーン別 BGM の現状

| シーン | trackId | 音源 | App で流れるか |
|---|---|---|---|
| タイトル | `TITLE_MAIN` | `title-main.mp3` | ✅ |
| オープニング | `OPENING` | `opening.mp3` | ✅（PROLOGUE、ケイオスが話す前。1 秒待ってから開始） |
| ケイオスイベント | `KAOS_EVENT` | `kaos-event.mp3` | ✅（ケイオス登場後・四択・結果） |
| アルデン村 | `ALDEN_VILLAGE` | `alden-village.mp3` | ✅（家・ステータス・地図・店・TIME SHIFT。同じ曲のまま途切れない） |
| 酒場 | `TAVERN` | `tavern.mp3` | ⚠ 登録・割り当て済みだが、**App に酒場の画面がまだ無い**ので鳴らない（下の候補 1） |
| 森 | `GREENWOOD_FOREST` | `greenwood-forest.mp3` | ✅（森・遭遇） |
| 戦闘 | `NORMAL_BATTLE` / `BOSS_BATTLE` | `normal-battle.mp3` / `boss-battle.mp3` | ✅（ガルド戦はボス曲固定、勝利後は ♪ で選べる） |

## 求められた 6 点の判定

| 観点 | 判定 | 根拠 |
|---|---|---|
| 追加しやすい構造か | ✅ | 曲を足す手順は「ファイルを置く → `music.ts` に import と 1 行 → `sceneBgm.ts` の割り当て」の 3 手。画面のコードは触らない。戦闘曲は `BATTLE_BGM_IDS` に足すだけで ♪・保存・巡回順・フォールバックが追従。効果音はファイルを置くだけ |
| シーン別 BGM 切替 | ✅ | `useSceneBgm` が画面変化のたびに `bgmForScene` を引き、**答えが変わったときだけ** `playBgm`。500ms クロスフェード。同じ曲なら何もしない（頭に戻らない） |
| BGM 停止 | ✅ | `bgmForScene` が null を返す画面は `stopBgm()`。音源が無い曲も「無音」として扱い、エラーにならない。音量 0 は一時停止（戻すと同じ小節から） |
| BGM 差し替え | ✅ | ファイル差し替えは `music.ts` の import 1 行。割り当て変更は `sceneBgm.ts` の case 1 行。`BGM_MAP.md` を同じコミットで直すルールあり |
| SE との独立管理 | ✅ | BGM と効果音は別の再生要素・別の音量（MASTER／BGM／SFX／VOICE の 4 系統、MASTER は各系統に掛け算）。効果音は撃ちっぱなしで BGM の状態に触れない。同一効果音の連打は `SFX_RETRIGGER_MS` で間引き |
| 将来の戦闘中 BGM 変更 | ✅（土台あり） | 戦闘中の ♪ 切替は既に動く（`battleBgmId` が変わる → `useSceneBgm` がクロスフェード）。フェーズ変化（例：HP 半分で曲が変わる）を足す場合は、`battleBgmFor` に条件を 1 つ足して App から渡すだけで済み、再生側の変更は不要 |

## 気づいた点（大きいので実装せず候補として報告）

1. **酒場の BGM が App で鳴らない**（→ 2026-10-05 App に酒場画面を追加して解消。`TALK_SPOT` ＋ `MOONLIGHT_TAVERN` を渡して `TAVERN` が鳴る）：App は `useSceneBgm` に `locationId: null` を固定で渡している（App に月光亭の画面が無いため）。
   酒場の画面を App に作るときは、その画面の場所 ID（`MOONLIGHT_TAVERN`）を `locationId` として渡せば `TAVERN` が鳴る。割り当て側の準備は済んでいる。
2. **効果音ファイルが 1 つも無い**：`mugen-assets/files/audio/se/` は README だけ。呼び出し（`playSfx('battle_hit')` など）は既に本物で、ファイルを置けば鳴る。現状は無音（仕様どおり）。
3. **`playSe`（旧い SE 経路）**：`SE_ASSETS` は全部 null、App からの呼び出しは無い。`playSfx` が現行の経路。削除はしていない（Artifact と同じコードを保つため）。
4. **`audio.ts` は Artifact の複製**：再生のしかたを変えるときは両方を直す必要がある（ファイル冒頭に明記済み）。
5. **ENDING は無音**：専用曲が無いため。曲が届いたら `sceneBgm.ts` の case を 1 行変えるだけ。

## 自動テストで既に確認している範囲

- `mugen-core/content/audio/sceneBgm.test.ts`：全画面の割り当て（タイトル・オープニング・ケイオス・村・酒場・森・戦闘・無音画面、全曲が使われること、家専用の曲が無いこと）。
- `mugen-core/content/audio/battleBgm.test.ts`：戦闘曲の解放・選択・固定。
- `mugen-app/e2e/music.spec.ts`：実際の画面遷移で正しい曲が 1 曲ずつ鳴ること、ガルド戦のボス曲固定と解放、古いセーブでの ♪ 復帰。
- `mugen-artifact/src/platform/audio.test.ts`：AudioManager（クロスフェード・停止・音量・同じ曲で頭に戻らない）。
