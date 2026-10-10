# 回帰テスト一覧（2026-10-05）

ZERO 本体を変更したときに壊れていないかを確かめる項目と、それを確かめている自動テストの対応表。
App の e2e は `packages/mugen-app` で `npx playwright test --config playwright.config.ts`（開発サーバー
`npx vite --port 5174 --host 127.0.0.1 --strictPort` が必要）。core の単体テストは `npm test -w @mugen/core`。

## まず回すもの（通しのスモーク）

`e2e/regression.spec.ts` — **1 つのセーブで最初から最後まで**通す 1 本（約 1.5 分）。
各画面のテストが個別に通っていても、画面と画面のつなぎ目が壊れていればここで落ちる。

はじめる → OPENING → 命名（レイ）→ 村 → ステータス（名前・スクロール領域・もどる）→ 森 → 戦闘 → 勝利（結果画面、アイテム名）→
ガルド → 覚醒 → CUT-IN（星光弾）→ 四択 → TIME SHIFT（日付が進まない）→ WORLD MEMORY（1 件）→ 再起動 → つづきから（名前・記録・ガルドが再出現しない）、
最後にページエラーが 0 件であること。

## 項目ごとの対応

| 項目 | 自動テスト | 備考 |
|---|---|---|
| ゲーム開始 | `regression`、`loop`「the whole loop…」 | 初回は「はじめる」だけ、再起動後は「つづきから」 |
| OP | `regression`、`scenes`「the prologue is the world alone, then Kaos…」、`music`（曲） | |
| 名前入力 | `regression`、`naming`（4 本：入力・空白拒否・既定名・再起動） | |
| 第0話 導入イベント（名前決定 → ケイオス初対面 → MUGEN ZERO / ALDEN VILLAGE） | `intro`（7 本：暗転 → 声だけ → 登場 → 心の声 → 「？？？」から名前を名乗ってケイオス → 名前を呼ぶ → タイトル → 村・再起動後は再生しない、一瞬の沈黙（暗くなる・ボタンが出るまで待つ・元の表情へ）、SKIP の確認・note の文・戻る・スキップする、見た場合とスキップした場合でセーブ全行が一致、人生の記録 → 回想（再視聴でセーブ不変）、640×300 / 844×390 で画面内）、`regression`（導入を最後まで読む）、core `openingIntro.test.ts` | 内容は `docs/OPENING_INTRO.md`。他の e2e は SKIP で村へ |
| 村 | `regression`、`loop`、`parity`「the shop takes LUMI…」、`uxRound`（横画面 5 サイズで「噂話」まで画面内） | 選択肢の配色（アイボリー＋ゴールド＋茶）は見た目だけで、e2e は機能のみ確認。高さ 420px 以下ではボタンと間隔を詰めて、9 つの選択肢すべてを画面内に収める（2026-10-07。以前は 640×300 で 2 段目がはみ出していた） |
| 序盤UX（酒場の初訪問順・《瞬断》・AUTO 解禁・BOSS カットイン・戦闘後の酒場・目的地通知・噂話・NEW） | `uxRound`（15 本）、core `talkQueue.test.ts`・`readMarks.test.ts`・`villageRumors.test.ts`・`sekiryugaBattle.test.ts` | 内容は `docs/UX_EARLY_GAME.md` |
| ALDEN INCIDENT 予兆フェーズ | `aldenIncident`（6 本：平常・行動で加算・重複なし・休息の連打で増えない・PHASE 1〜3 の噂と NEW・ケイオスの一言（地方画面、1 回ずつ）・グレイヴ 1 回・PHASE 3 でも何も始まらない・再起動後も保持・844×390 / 640×300）、core `aldenIncident.test.ts` | 内容は `docs/ALDEN_INCIDENT.md`。襲撃本編は未実装 |
| 探索素材 → 村施設連携（用途ヒント・パン屋主人の反応） | `materials`（4 本：拾得通知は従来どおり・持ち物の用途ヒント・主人の反応は世界で 1 回ずつ（再起動後も繰り返さない）・古代の破片は売れない／交換に出ない・鉄鉱石は売れる・酒場の交換、640×300）、core `materialUses.test.ts` | 内容は `docs/MATERIAL_USES.md` |
| 村メニュー（店舗のまとまり・道具屋の入口・EXP 非表示） | `villageMenu`（8 本：村から道具屋へ直接 → 村へ、パン屋・酒場、地方画面に道具屋なし・森へ行ける、EXP なし・Lv./HP/MP あり、横画面 5 サイズ） | 内容は `docs/VILLAGE_MENU.md` |
| 酒場 | `tavern`（9 本：村 → 酒場 → 背景・マスター・BGM・会話 → 村、セーブは初対面の既読 `talk:GRAVE_MEETING` 1 行以外不変、横画面 5 サイズでマスターが切れない、初対面は新規セーブで 1 回だけ（再入店・再起動後は自己紹介しない）、`readMarks` の無い既存セーブ）、core `graveTalks.test.ts` | 初対面はセーブ単位で 1 回（2026-10-07 改定、`docs/APP_TAVERN.md`） |
| パン屋 | `bakery`（村 → パン屋 → 背景・主人・リナ・リナの初回会話 → 村、BGM は村の曲のまま、セーブは既読 `talk:BAKERY_LINA_FIRST` 1 行以外不変、横画面 5 サイズで 2 人が切れず会話欄と重ならない）、core `bakeryShop.test.ts`（話し手は主人とリナだけ・ガルドに触れない・道具屋の噂の話し手は「道具屋」のまま） | Android の戻るボタンはブラウザから押せないため実機で確認 |
| 森 | `regression`、`loop`、`battleBackground`、`explore`（古代遺跡と同じ歩き回り：手前／奥で大きさが変わる・ケイオスが同じ奥行き・木や空は最寄りの床へ・「！」は近づいたときだけ・調べたら完全に消える・固定 4 か所の一言・その後も小さな発見が別の場所に出続ける・新しい足跡（四択前だけ・セーブ不変）・ガルド／戦闘への出口・セーブ不変・四択後の変化・動きを減らす設定・横画面 5 サイズで出口ボタンの後ろに立たない）、core `walkScene.test.ts`・`walkPlaces.test.ts`、App `roam.test.ts` | 歩き心地は実機で確認 |
| 古代遺跡（DEBUG。通常進行からは酒場のイベント後に地方図から） | `exploreRuins`（DEBUG 入口・2D タップ移動（手前／奥で大きさが変わる・壁や空は最寄りの床へ・ケイオスが同じ奥行きでついて来る・歩行中の再タップ・実際に少しずつ歩く）・「！」（最初は出ない・近づくと出る・調べたら完全に消える・同時に最大 2 個）・固定 3 ポイントの一言・3 つ調べた後も小さな発見が別の場所に出続ける（文章の重複なし・待つのは最大 2 つ）・ボタンでは歩かない・動きを減らす設定・世界を開かない・横画面 5 サイズ）、core `walkPlaces.test.ts`、App `roam.test.ts`・`walkPath.test.ts` | 通常進行からは酒場マスターのイベント後に入れる（`sekiryuga`）。森は従来の右→左のまま |
| 古代遺跡の発見の格・虹装備（DEBUG） | `exploreRareFinds`（NORMAL → 金色 → 虹 → 取得の光・名前・説明 → セーブ → 再起動 → 所持したまま装備できる → 同じ遺跡で虹が二度と出ない・有効訪問は 3 つ目の発見で 1 回だけ数える・セーブが無いときは何も作らず「記録されません」）、core `explorationState.test.ts`・`equipment.test.ts`、App `roam.test.ts`（確率・8 回目の確定） | 戦闘への性能反映は 2026-10-07 から（下の「星紋の遺剣（戦闘）」） |
| セキリュウガ編（噂 → 酒場 → 古代遺跡 → BOSS → 戦闘後） | `sekiryuga`（16 本：四択 4 つそれぞれで村へ戻り噂が始まる・ガルド前は噂も遺跡も無い・道具屋の噂 → 酒場で自動開始 → 遺跡解放・マスター本人の噂からそのまま続く・地方図から遺跡（タップ移動・奥行き・調査で「！」が消える）・接近 → BGM 停止 → 地響き → 登場 → BOSS 戦 → 戦闘後（結果画面なし・死亡表現なし）→ WORLD MEMORY 不変 → 再起動後も保持・逃走／引き返す・咆哮の予告と防御・横画面 5 サイズ）、core `storyArc.test.ts`・`sekiryugaBattle.test.ts`（実測）・`sekiryugaArc.test.ts`、App `sekiryugaRoute.test.ts` | 全文・数値は `docs/SEKIRYUGA_ROUTE.md` |
| セキリュウガ撃破後の再訪・遺跡の鳴き声の噂 | `sekiryugaRevisit`（5 本：撃破前・戦闘後の場面の前は出ない・撃破後の初回だけ（台詞・こちらを一度見て奥へ戻る・最後にケイオスだけ黙って見る・再戦なし・既読 `event:SEKIRYUGA_REVISIT`・WORLD MEMORY 不変・2 回目以降は「奥を見ている」と短い一言だけ・再起動後も初回は出ない）・再訪前の休息では噂なし → 再訪 → 村 → 休息で噂「遺跡の奥の鳴き声」・NEW は読んだ時に消える・再起動後も既読・640×300 / 844×390 で文字・ボタン・ケイオスが画面内）、core `sekiryugaArc.test.ts`（再訪の台詞・向き・禁止語・既読 ID）、`villageRumors.test.ts`（噂の条件・幼体／卵と言わない） | 内容は `docs/SEKIRYUGA_ROUTE.md`「撃破後の再訪」 |
| 酒場の客・物々交換・MUSIC ARCHIVE・村 BGM（酒場ハブ化 Phase 1） | `tavernGuests`（10 本：今夜の客のシルエット・会話・交換の申し出 → やめる → マスター、7 晩の客と役割（交換／会話／吟遊詩人／怪しい客）、交換（不足は何も変わらない・成功で減って増える・同じ夜は 1 回・再起動後も交換済み）、怪しい客のレア交換、MUSIC ARCHIVE（聞いた曲だけ・再生・酒場を出ると元の曲・森に行くと増える）、村 BGM（村とパン屋で流れる・再起動後も・森と戦闘は専用曲・元に戻す）、640×300 / 844×390）、`tavern`（初対面と酒場の曲の記録以外は不変）、core `tavernGuests.test.ts`・`tavernTrades.test.ts`・`musicArchive.test.ts`・`tavernHub.test.ts` | 内容は `docs/TAVERN_HUB.md` |
| パン屋 MVP（切替・パン購入・食べる・期限） | `bread`（6 本：入店時はリナ → 主人 → リナ（会話は混ざらない・初回会話は 1 回だけ・再起動後も）・4 種の価格／効果／期限・購入で LUMI 減・所持 +1・LUMI 不足はリナの一言で何も変わらない・再起動後も保持・食べると HP 回復／バフ／1 個減・2 個目でバフ上書き・再起動後もバフ保持・休息で期限 -1・バフ終了・0 で【期限切れ】（残るが食べられない）・640×300 / 844×390 で画面内）、`bakery`、`sekiryuga`（主人に切り替えて噂）、core `bread.test.ts`・`breadState.test.ts`・`breads.test.ts`（AUTO はパンを食べない）・`bakeryTalk.test.ts` | 内容は `docs/BAKERY_BREAD.md`。素早さは戦闘に効果なし |
| 探索アイテム・道具屋（拾う → 持ち物 → 買う／売る） | `items`（9 本：森で拾う・通知・取得済みは再訪／再起動後も出ない・持ち物の棚・遺跡の古代の破片（特別な通知・売れない）・買う／LUMI 不足・売る／0 個で行が消える・再起動後の保持・横画面 5 サイズで全ポイントへ歩けて調べられる）、core `pickups.test.ts`（world・content） | 内容は `docs/ITEMS_SHOP.md`。配置量・光り方は実機で確認 |
| 道具屋のミレイ（タッチ反応） | `npcTouch`（8 本：画像は受け取ったまま・タップで言葉と表情 → 戻る・セーブ不変・連打・7 回目以降・横画面 5 サイズ）、core `touchReaction.test.ts` | 内容は `docs/NPC_TOUCH.md`。表情の画像は通常のみ |
| 戦闘開始 | `regression`、`attack`、`battleStage`（配置） | |
| 逃走 | `escape`（森が戦闘前と同じ：立ち位置・調べ済み・小発見・一言、HP/MP・薬草・EXP・LUMI が戦闘前のまま、逃走音、地図から入り直すと最初から、ガルド戦には逃走が無い） | |
| 戦闘の効果音（App） | `battleSounds`（斬撃 → 命中の順・ピッチの揺らぎ、モンスター＝重い打撃、ガルド＝ナイフ・ボスヒット・被弾、撃破、彗星撃／癒しの光／星光弾の各段、ゼロ・レヴィ・アリアの必殺技の段、×2 でレヴィの槍が半分）、App 単体 `battleSounds.test.ts`、core `sfxTuning.test.ts`・`sfxFiles.test.ts`。割り当て表は `docs/BATTLE_SE.md` | 実際の音量・聞こえ方は実機で確認。Artifact には効果音が入らないこと（`check-build-audio`） |
| 勝利 | `regression`、`loop`（経験値・LUMI・レベル・アイテム名）、`attack`「beaten, it goes down…」 | |
| DEBUG 演出見本（ケイオス「双極崩界」v19・レヴィ・アリア・零閃） | `kaosSkill`（7 本：カットイン「双極崩界」→ 双極臨界（オーラ）→ 術式固定 → 界核崩壊（爆発・閃光）→ 何も残らない・ケイオスが 2 人にならない・HP 不変・v19 の基準時間・爆発は敵の中心で衝撃波 5・破片 36・数字なし・kaos-cast.png をそのまま・×2 でも爆発 1.8 秒以上・本編には出ない）、`levi`・`aria`・`zero`、App 単体 `kaosTiming.test.ts` ほか | 内容は `docs/APP_BATTLE_SCREEN.md` |
| CUT-IN | `regression`（本編）、`magic`（本編の全 5 魔法）、`cutin`（DEBUG プレビュー） | |
| 四択 | `regression`、`gald`（4 択の表示・1 回限り・再起動後も保持） | 4 つのうち本編で通すのは SPARE。残り 3 つの結果は core の単体テスト |
| WORLD MEMORY 保存 | `regression`、`memory`（記録の中身・日付・場所・人物・重み、再起動） | |
| TIME SHIFT 特殊イベント | `regression`、`memory`「the look ahead costs the world nothing」ほか 7 本 | 時間が進まない・途中で終えたら再起動後にまた出る・終えたら二度と出ない |
| 未来 CG（ガルド） | `futureCg`（TIME SHIFT は選んだ未来の 1 枚だけ・4 ルート、場所に入ったらその場所の CG・4 ルート、横画面 5 サイズで CG が欠けず「つづける」が画面内）、App 単体 `futureVision.test.ts`・`eventCg.test.ts` | 高さの低い画面（640×300）では TIME SHIFT の本文だけが縦スクロールし、「つづける」は常に画面内 |
| ステータス画面 | `regression`、`status`（11 本、Android 横画面 6 サイズでのスクロール含む・スキル欄（《瞬断》の威力と再使用・ケイオスは未習得・NEW は開いただけでは消えず、スキルを開いて確認した時に消える））、`equipment`、core `heroSkills.test.ts` | |
| 星紋の遺剣（戦闘） | core `relicSword.test.ts`（未装備・装備・装備解除後・+2・先手の一閃 ×1.25・1 回だけで二重にかからない・HP 満タンでない時はかからない・《瞬断》と重なる時は ×2 の後に ×1.25・無い戦闘の状態は以前と同じ）、`equipment.test.ts`、`exploreRareFinds`（装備一覧に「攻撃 +2」） | 内容は `docs/UX_EARLY_GAME.md`「実装メイン⑥ PHASE 1」 |
| AUTO の薬草（HP 35% 以下） | core `autoHeal.test.ts`（満タン・35% ちょうど／超え・薬草 0 個・回復しない道具だけ・回復魔法が先・MP 不足なら薬草・傷の大きさで薬草／上薬草・戦闘終了後は使わない）、`autoHeal`（4 本：HP 20・MP 0 で薬草を飲む → 1 個減ってセーブ → 勝利後も → 再起動後も同じ数・MP があれば魔法が先で薬草は減らない・薬草 0 個でも止まらず戦い続ける・満タンでは使わない） | 内容は `docs/AUTO_NOTICE_LOWSCREEN.md` |
| 共通通知キュー | App 単体 `noticeQueue.test.ts`（8 本：1 件・同時 2／3 件は優先度順→来た順・重要＋アイテムは重要が先・表示中は割り込まない・後から来たものは先に待っていたものを追い越さない・常に 1 件だけ・同じ種類の合算（薬草 ×3）・同じ id は 1 回／clear）、`notices`（5 本：1 件・同時 2／3 件が順番に 1 件ずつ・表示中に来たものは待つ・薬草 ×3 の合算・森の拾得通知もキュー経由で、森を出たら待っていた分は捨てる）、既存の `uxRound`・`items`・`exploreRuins`（通知の文言・testid は以前のまま） | 同時に 2 件以上が画面に出ないこと |
| 低画面の戦闘 UI（640×300 など）・敵 HP 枠の位置 | `lowScreen`（18 本：640×300・720×360・800×360 でセキリュウガの HP 枠が下半身・味方・コマンドに重ならず名前が切れない・敵名／HP／味方 HP／ログ／BOSS／TURN ORDER／コマンドが 10px 以上で画面内・味方 HP が丸い枠の内側・コマンドの高さ 44px 以上・TURN ORDER の顔 5 つ、5 サイズすべてでセキリュウガの枠と BOSS 札が絵・味方・コマンド・PARTY 欄に重ならない・モスラビットは足元のまま、844×390 の文字は以前のまま・640×300 で通知が画面内）、既存の `battleStage`・`sekiryuga`（横画面 5 サイズ） | 高さ 360px 以下だけ。実機で文字の読みやすさを確認 |
| NPC DEPLOY プレビュー | `forgeImport`（取り込み・差分・実機確認） | 書き込み先は content（セーブではない） |
| NPC DEPLOY 検証 | `forgeImport`「A2 / A6…」「C7 / D4 / D6…」（事前検証 PASS/WARNING/ERROR を含む）、core `forge/preflight.test.ts`・`forge/validate.test.ts` | |

## 自動化していない（手で確認するもの）

- **実機の音**：Android で実際に鳴るか・音量・最初のタッチで鳴り始めるか。自動テストは「どの曲・どの効果音を頼んだか」までで、スピーカーの出力は見られない。
- **実機の画面端**：切り欠き・ジェスチャーバーとの重なり（`docs/BATTLE_AUDIT_2026-10.md`）。
