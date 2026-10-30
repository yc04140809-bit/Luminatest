# ボイス再生の土台

2026-10-30 タスクD。仕組みは `packages/mugen-app/src/platform/voice.ts`（対応表）と `platform/audio.ts` の `playVoice`（再生）です。

## 仕組み

- 台詞やシーンごとに ID があり、対応表（`VOICE_LINES`）が「誰が言うか（KAOS / HERO）」と「ファイル名」を決めます。
- 音声ファイルは `packages/mugen-assets/files/voice/` に、対応表に書いた名前で置けば使われます（コードの変更は不要）。
- 次の場合はすべて無音で、エラーにもならず、ゲームも止まりません。
  - 対応表にない ID
  - ファイルがまだ置かれていない
  - 画面に一度も触れていない（ブラウザの制限）
  - ボイス音量が 0
- 一度に鳴るボイスは1つだけです。次の台詞が来たら、前の台詞は止まります。
- 音量は BGM・SE とは別のボイス用の系統です（`setVolumes` の第4引数、既定 0.8）。

## ID の付け方

| 系統 | ID | 鳴るタイミング |
|---|---|---|
| 戦闘（カットインの叫び） | `battle.<技・魔法のID>` | カットインが入るとき（1回） |
| 漫画OP | `op.<シーン>`／`op.<シーン>.SMILE` | そのページが出たとき／選択ページの「……なんてね♪」 |
| イベント（村の小さな出来事） | `daily.<シーンID>.<行番号>`（1から数える） | その行が出たとき |

## 現在の対応表（ファイルは未納品）

| ID | 誰 | ファイル名 | 台詞 |
|---|---|---|---|
| `battle.soukyoku_rinkai` | ケイオス | `kaos_battle_soukyoku_rinkai.mp3` | 《双極臨界》！ |
| `battle.higanbana` | 主人公 | `hero_battle_higanbana.mp3` | 《彼岸花》！ |
| `battle.shundan` | 主人公 | `hero_battle_shundan.mp3` | 《瞬断》！ |
| `op.SCENE11.SMILE` | ケイオス | `kaos_op_scene11_smile.mp3` | ……なんてね♪ |
| `daily.LINA_BURNT_BREAD.4` | ケイオス | `kaos_daily_lina_burnt_bread_4.mp3` | ん、おいしい♪ 焦げてるとこが一番おいしいかも。 |
| `daily.LINA_BURNT_BREAD.6` | 主人公 | `hero_daily_lina_burnt_bread_6.mp3` | 褒めてる。 |

行を足すときは、対応表に1行追加し、ファイルを置くだけで済みます。

## 動作確認用のダミー音声

デバッグ用ビルドだけに入る確認の入口です。

- **入口**：`?preview=party&collapse=1&voice=dummy`、または DEBUG メニューの「ボイス確認（ダミー）」。
- **鳴る場面**：ケイオスの《双極臨界》のカットインで、短いダミー音が鳴ります。
- **リリース用ビルドには入らない**：ダミーのファイル（`src/dev/voice-dummy.mp3`）はリリース用ビルドに入りません。`check:release` で確かめています。
