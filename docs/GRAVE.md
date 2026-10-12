# グレイヴ — 会話用表情差分・戦闘立ち絵（2026-10-12）

※ ゲーム内の表記は既存どおり「グレイヴ」です（指示書の「グレイブ」は同じ人物）。

## 表情差分（会話）

- 管理方法：ケイオス・主人公と同じ方式。台詞（`DialogueLine`）に `graveFace` を書くと、その表情で表示されます。書いていない台詞は NORMAL。
  - 定義：`mugen-core/content/characters/graveFaces.ts`（8種・代わりの順番・`graveFaceOf`）
  - 絵：`mugen-app/src/assets/graveFaces.ts`（届いた7枚。TROUBLED は未着で SERIOUS が代わる）
  - 画像：`mugen-assets/files/characters/grave/grave-face-*.png`（届いたまま配置）
- 届いた絵の割り当て（ご確認ください）：2枚目 SURPRISED／3枚目 LAUGH／4枚目 GRIN／5枚目 NORMAL／6枚目 SERIOUS／7枚目 SAD／8枚目 ANGRY。TROUBLED は未着。
- 酒場：グレイヴが話している間（台詞・小メニュー「どうした。」・加工パネル）だけ、立ち姿の代わりにその表情の上半身を表示。話していない時は今まで通りの立ち姿。
  - 加工：成功＝LAUGH、作成済み＝GRIN、素材不足・持ちきれない＝TROUBLED（今は SERIOUS の絵）。
- 既存台詞の文章は変えていません。表情を付けたのは一部だけ（森が静かすぎる＝SERIOUS、両手剣＝SAD、焦げたシチュー＝TROUBLED→LAUGH、セキリュウガの話の要所＝SURPRISED／SERIOUS／SAD／ANGRY など）。
- 襲撃イベント：イベントの台詞にも同じ `graveFace` を書けます（ケイオスの `kaosFace`、主人公の `heroFace` と並べて書ける）。3人で並ぶ会話画面はまだ作っていません。

## 戦闘立ち絵

- `mugen-assets/files/characters/grave/grave-battle-idle.png`（届いたまま、左向き・透過）。
- 戦闘の絵の一覧（`mugen-app/src/ui/battle/battleArt.ts`）に `grave` として登録（左向き、ターン順の顔の位置つき）。まだどの戦闘にも出していません。

## 3人戦闘（一時加入）— 保留中

今の戦闘は「味方1人分（HP 1本・MP 1本を主人公とケイオスで共有）」の作りです。方針の確認待ち（報告を参照）。
