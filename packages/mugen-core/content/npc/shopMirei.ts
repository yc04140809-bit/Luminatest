// ミレイ — アルデン道具屋の店員 (NPCタッチ反応システム PHASE 1, 2026-10-07).
//
// The lines are the author's, word for word (NPCタッチ反応システム仕様書
// Ver.1.0 §6-1). What else is written about her there — the family shop,
// her teacher, the whip, a day she might fight beside them — is the spec's
// memo for later and is NOT decided here: nothing in this file says it.
//
// Pictures: shop_mirei_<face>.png (mugen-assets/files/characters/shop-mirei).
// Only the ordinary face has been delivered; a face not yet drawn shows
// the ordinary one, and the line still changes.

import type { NpcTouchDef } from '../../core/npc/touchReaction';

/** The first boss route's stage, as the draw counts it: TOLD (the ruins open) = 2. */
const RUINS_OPEN = 2;

export const SHOP_MIREI: NpcTouchDef = {
  npcId: 'shop_mirei',
  name: 'ミレイ',
  baseExpression: 'NORMAL',
  lines: {
    NORMAL: [
      'いらっしゃい。今日は何を探してるの？',
      '必要なものがあれば言って。旅支度は大事よ',
      '準備不足で困る前に、揃えておきなさい？',
    ],
    HAPPY: ['ふふ、気に入ってもらえたなら嬉しいわ', 'いい買い物になったみたいね', 'それ、案外あなたに似合ってるかも'],
    EXASPERATED: ['……また忘れ物？', 'ほんと、見ていて危なっかしいわね', 'その調子だと、いつか本当に困るわよ？'],
    SAD: ['そう……それは少し残念ね', '無茶だけはしないで', '帰ってくるまでが旅よ'],
    AMAZED: ['えっ……本気で言ってるの？', 'それは想像してなかったわ', 'ちょっと、今のは聞き捨てならないわね'],
    EMBARRASSED: ['……急にそういうこと言わないで', '別に、照れてなんか……ないわ', 'そういう顔で見ないで'],
    ANGRY: ['こら。商品は丁寧に扱って', 'あまりふざけると、怒るわよ？', '……それ以上は見逃せないわね'],
  },
  // Once the ruins are open, now and then she says what a traveller going
  // there should hear.
  conditional: [
    { text: '無茶だけはしないで', expression: 'SAD', when: { kind: 'ARC_AT_LEAST', stage: RUINS_OPEN } },
    { text: '帰ってくるまでが旅よ', expression: 'SAD', when: { kind: 'ARC_AT_LEAST', stage: RUINS_OPEN } },
  ],
  premium: [
    { text: '……あなたが来る気がしてた', expression: 'HAPPY' },
    { text: '他のお客には、ここまで話さないんだけど', expression: 'EMBARRASSED' },
    { text: '戦う時が来たら……私も後ろにいるわ', expression: 'NORMAL' },
    { text: '師匠に似てるのよ。放っておけないところが', expression: 'HAPPY' },
    { text: 'ガルドのこと、気になってるんでしょう？', expression: 'NORMAL', when: { kind: 'GALD_DECIDED' } },
    { text: '道具屋に見える？……それだけなら、安心ね', expression: 'HAPPY' },
  ],
  // The spec's first weights: 70 / 20 / 7 / 3.
  weights: { NORMAL: 70, EMOTION: 20, CONDITIONAL: 7, PREMIUM: 3 },
  // 1–3 taps: everyday; 4–6: a little more feeling; 7 and on: tired of it.
  chain: { warm: 4, tired: 7 },
  moods: {
    calm: ['HAPPY', 'AMAZED', 'SAD'],
    warm: ['HAPPY', 'AMAZED', 'EMBARRASSED', 'EXASPERATED'],
    tired: ['EXASPERATED', 'EMBARRASSED', 'ANGRY'],
  },
};

/** How long a line is shown, and a face held, after a tap; and the pause between taps. */
export const TOUCH_TIMING = { lineMs: 3200, faceMs: 2400, cooldownMs: 300 } as const;
