// WHAT ALDEN IS TALKING ABOUT.
//
// TWO LISTS, AND THE FIRST ONE IS THE IMPORTANT ONE.
//
// The chickens below are not filler and they are not placeholders for
// content that will be written later. They are the reason the other
// list works at all: a player who has heard for three hours that the
// headman's chickens keep escaping and that Tarai-obasan is fighting
// over the drying line again is a player who is not auditing every
// sentence — and is therefore a player who can be QUIETLY TOLD that a
// girl has been practising something at night, and feel it land as
// gossip rather than as a quest marker.
//
// So none of these will ever mean anything. Not one of them is a
// chicken that turns out to have been a clue. If a later round wants a
// chicken to matter, the correct move is to write a NEW line about a
// chicken as a signal and leave these alone — the type system will
// insist on it, since a NoiseNews has nowhere to put a consequence.

import type { NoiseNews } from '../../core/news/types';
import type { NewsSignalDef } from '../../core/news/news';
import { ALDEN_GUARD, GALD, LINA } from '../world/mugenWorld';

/**
 * A Tuesday in Alden.
 *
 * Written to be specific rather than generic — 「パンを3個焦がした」 is a
 * village and 「今日もいい天気だ」 is a loading screen. Specificity is
 * also what makes them survive being heard forty times.
 */
export const ALDEN_NOISE: readonly NoiseNews[] = [
  { kind: 'NOISE', id: 'noise_chicken', text: '村長のニワトリがまた逃げた。三度目らしい。' },
  { kind: 'NOISE', id: 'noise_laundry', text: 'タライおばさん、今日も洗濯物を干す場所で揉めている。' },
  { kind: 'NOISE', id: 'noise_bread', text: 'パン屋、今朝はパンを3個焦がしたらしい。' },
  { kind: 'NOISE', id: 'noise_well', text: '井戸の釣瓶の縄が、そろそろ危ないと誰かが言っていた。' },
  { kind: 'NOISE', id: 'noise_dog', text: '納屋の犬が、昨日から誰にも懐かない。理由は不明。' },
  { kind: 'NOISE', id: 'noise_roof', text: '南の家の屋根板が一枚、風で飛んでいったきり戻らない。' },
  { kind: 'NOISE', id: 'noise_cart', text: '荷車の車輪が鳴く。油をさせばいいのに、誰もささない。' },
  { kind: 'NOISE', id: 'noise_soup', text: '昨日の汁物、塩が多すぎたと三人が言い、一人が擁護した。' },
  { kind: 'NOISE', id: 'noise_cat', text: '納屋の猫に子が生まれた。数は数える人によって違う。' },
  { kind: 'NOISE', id: 'noise_fence', text: '柵の修理、今週こそやると言って今週も終わった。' },
  { kind: 'NOISE', id: 'noise_boots', text: '誰かの片方だけの長靴が、広場に置きっぱなしになっている。' },
  { kind: 'NOISE', id: 'noise_plum', text: '裏の梅が去年より実をつけた。豊作だと喜ぶ者と、疑う者がいる。' },
];

/**
 * What the village says when there is something to say.
 *
 * Every one of them is a rumour with the mechanism removed. Nobody says
 * 「SEED_MAGIC_DREAM が ROOTED になった」; somebody says they saw a light
 * behind the well at an odd hour. The condition is what makes it
 * sayable, and the condition is never in the sentence.
 *
 * Deliberately few. Each is an authored entry, the same as a crossing —
 * there is no pass that turns every seed into a line, because a world
 * that narrates its own state has told the player it is a machine.
 */
export const ALDEN_SIGNALS: readonly NewsSignalDef[] = [
  {
    id: 'signal_lina_practising',
    text: '村の娘が、夜に井戸の裏で何かしているのを見た者がいるらしい。',
    when: { seeds: [{ npcId: LINA.npcId, type: 'MAGIC_DREAM', atLeast: 'GROWING' }] },
    importance: 'MURMUR',
    seedEffect: { npcId: LINA.npcId, type: 'MAGIC_DREAM' },
    // Low: a village girl doing something odd at night does not travel.
    propagationPotential: 0.2,
  },
  {
    id: 'signal_lina_spoken',
    text: 'あの娘、魔法を習いたいと口に出したそうだ。母親は何も言わなかったとか。',
    when: { seeds: [{ npcId: LINA.npcId, type: 'MAGIC_DREAM', atLeast: 'ROOTED' }] },
    importance: 'TALK',
    seedEffect: { npcId: LINA.npcId, type: 'MAGIC_DREAM' },
    propagationPotential: 0.35,
  },
  {
    id: 'signal_lina_gave_up',
    text: 'あの娘、近ごろあの話をしなくなったな、と誰かが言っていた。',
    when: {
      seeds: [
        { npcId: LINA.npcId, type: 'MAGIC_DREAM', atMost: 'FADED', absentCounts: false },
      ],
    },
    importance: 'MURMUR',
    seedEffect: { npcId: LINA.npcId, type: 'MAGIC_DREAM' },
    propagationPotential: 0.05,
  },
  {
    id: 'signal_gald_in_market',
    text: '最近、見かけない男が市に立っている。悪い人ではないらしい。',
    when: { crossings: ['GALD_WALKS_INTO_ALDEN'] },
    importance: 'MURMUR',
    propagationPotential: 0.3,
  },
  {
    id: 'signal_gald_and_guard',
    text: '元盗賊らしき男が、衛兵と酒場で普通に話しているのを見た、という話。',
    when: { blooms: ['GUARD_STOPS_WATCHING_HIM'], crossings: ['GALD_WALKS_INTO_ALDEN'] },
    importance: 'TALK',
    vineEffect: { source: ALDEN_GUARD, target: GALD },
    // The one that would actually travel. A man who used to be hunted
    // drinking with the man who hunted him is a story worth carrying.
    propagationPotential: 0.7,
  },
  {
    id: 'signal_baker_hired',
    text: 'パン屋が、あの男に台の隅を貸しているらしい。物好きなことだ。',
    when: { crossings: ['BAKER_GIVES_GALD_A_CORNER'] },
    importance: 'MURMUR',
    propagationPotential: 0.25,
  },
  {
    id: 'signal_road_healer',
    text: '街道の救護所に、腕のいいのが入ったという噂。名前までは聞いていない。',
    when: { seeds: [{ npcId: GALD, type: 'GALD_REDEMPTION', atLeast: 'ROOTED' }] },
    importance: 'MURMUR',
    seedEffect: { npcId: GALD, type: 'GALD_REDEMPTION' },
    propagationPotential: 0.5,
  },
  {
    id: 'signal_village_uneasy',
    text: 'このごろ夜、戸締まりを二度確かめる家が増えたそうだ。',
    when: {
      seeds: [{ npcId: 'ALDEN_VILLAGE', type: 'PROTECT_VILLAGE', atLeast: 'GROWING' }],
    },
    importance: 'MURMUR',
    seedEffect: { npcId: 'ALDEN_VILLAGE', type: 'PROTECT_VILLAGE' },
    propagationPotential: 0.4,
  },
];

/** How many lines the village says on an ordinary day. */
export const ALDEN_NEWS_PER_DAY = 5;
