// 噂話 — WHAT ALDEN TALKS ABOUT.
//
// The village's gossip, for the 噂話 menu. Most of it is not a clue: who
// dislikes fish, how the stew tastes on which day. That is the point — a
// village that only ever talks about the next quest is a quest board.
// A few, once the player has reached them, are the first boss route's own
// rumours, kept here so they can be read again.
//
// WHAT NONE OF THESE DECIDES: anybody's age, family or future (Lina's
// least of all), what became of Gald under any of the four answers, what
// セキリュウガ is or guards, or the tavern master's past beyond what he
// has told. A rumour is somebody saying something, not the world's canon.
//
// `when` is read against the world by whoever shows the list:
//   ALWAYS        from the first day
//   AFTER_GALD    once the four answers and the look ahead are behind them
//   ROUTE_HEARD   once a rumour of the ruins has been heard (stage RUMOR+)
//   RUINS_OPEN    once the ruins are on the map (stage TOLD+)
//   AFTER_BOSS    once セキリュウガ has been brought to a stop (BEATEN+)
//   RUINS_CRY     once the first time back at the ruins has been seen and a
//                 night slept in the village after it (sekiryugaArc RUINS_CRY_MARK)

import { stageReached, type SekiryugaStage } from '../../core/world/storyArc';

export type RumorCategory = 'PERSON' | 'PLACE' | 'MONSTER' | 'ITEM' | 'EVENT' | 'TRIVIA';
export type RumorWhen = 'ALWAYS' | 'AFTER_GALD' | 'ROUTE_HEARD' | 'RUINS_OPEN' | 'AFTER_BOSS' | 'RUINS_CRY';

export const RUMOR_CATEGORY_LABEL: Record<RumorCategory, string> = {
  PERSON: '人物',
  PLACE: '場所',
  MONSTER: '魔物',
  ITEM: 'アイテム',
  EVENT: '出来事',
  TRIVIA: 'どうでもいい噂',
};

export interface VillageRumor {
  id: string;
  category: RumorCategory;
  /** What the list shows before it is opened. */
  title: string;
  text: string;
  /** Who was heard saying it, when that matters. */
  from?: string;
  when: RumorWhen;
}

export const VILLAGE_RUMORS: readonly VillageRumor[] = [
  // ---- 人物 ----
  { id: 'LINA_WINDOW', category: 'PERSON', title: 'パン屋の娘', text: 'パン屋の娘、最近よく店の外を見てるらしい。', when: 'ALWAYS' },
  { id: 'GRAVE_BEFORE', category: 'PERSON', title: '酒場のマスターの昔', text: '酒場のマスター、昔は今より怖かったらしいぞ。', when: 'ALWAYS' },
  { id: 'BAKER_WEATHER', category: 'PERSON', title: 'パン屋の主人の天気読み', text: 'パン屋の主人の天気の読み、よく当たるんだとさ。', when: 'ALWAYS' },

  // ---- 場所 ----
  { id: 'FOREST_GLOW', category: 'PLACE', title: '森の光る石', text: '森の奥で光る石を見たって奴がいる。', when: 'ALWAYS' },
  {
    id: 'RUINS_SOUND',
    category: 'PLACE',
    title: '遺跡の妙な音',
    text: 'この頃、遺跡の方で妙な音を聞いたって人がいるんだ。昔も、あの辺りで何かあったらしいけど……。',
    from: 'パン屋の主人',
    when: 'ROUTE_HEARD',
  },
  { id: 'RUINS_QUIET', category: 'PLACE', title: '静かな遺跡', text: '遺跡の方、ここ何日かは静かなもんだ。', when: 'AFTER_BOSS' },
  {
    id: 'RUINS_CRY',
    category: 'PLACE',
    title: '遺跡の奥の鳴き声',
    text: '遺跡の近くを通った旅人が、奥から小さな鳴き声を聞いたらしい。',
    when: 'RUINS_CRY',
  },

  // ---- 魔物 ----
  { id: 'MOSS_RABBIT_HIDES', category: 'MONSTER', title: 'モスラビット', text: '森のモスラビットは、追いかけると苔に潜って隠れるらしい。', when: 'ALWAYS' },
  {
    id: 'RUINS_QUAKE',
    category: 'MONSTER',
    title: '地面が揺れた',
    text: '遺跡へ行くなら気をつけな。最近、あっちから戻ってきた奴が“地面が揺れた”って言ってたぞ。',
    from: '道具屋',
    when: 'ROUTE_HEARD',
  },

  // ---- アイテム ----
  { id: 'HERB_SCENT', category: 'ITEM', title: '薬草の見分け方', text: '薬草は、香りの強いやつほどよく効くんだとさ。', when: 'ALWAYS' },
  { id: 'RUINS_COIN', category: 'ITEM', title: '遺跡の古いコイン', text: '遺跡のあたりで、古いコインを拾った奴がいるらしい。', when: 'RUINS_OPEN' },

  // ---- 出来事 ----
  { id: 'WELL_COLD', category: 'EVENT', title: '村の井戸', text: '村の井戸の水、今年はやけに冷たいらしい。', when: 'ALWAYS' },
  { id: 'TAVERN_BUSY', category: 'EVENT', title: '酒場の客', text: 'このところ、酒場に見ない顔が増えたって話だ。', when: 'AFTER_GALD' },

  // ---- どうでもいい噂 ----
  { id: 'SHOPKEEPER_FISH', category: 'TRIVIA', title: '道具屋の親父', text: '道具屋の親父、魚が嫌いらしい。', when: 'ALWAYS' },
  { id: 'TAVERN_STEW', category: 'TRIVIA', title: '酒場の煮込み', text: '酒場の煮込み、日によって味が違うって噂だ。', when: 'ALWAYS' },
  { id: 'NAPPING_CAT', category: 'TRIVIA', title: '昼寝の猫', text: '村のどこかに、昼寝ばかりしてる猫がいるらしい。飼い主は誰も知らない。', when: 'ALWAYS' },
];

/** Which rumours the village has for this world, in the order written. */
export function rumorsFor(facts: {
  arcOpen: boolean;
  stage: SekiryugaStage;
  /** The cry from the ruins has been heard of (sekiryugaArc `RUINS_CRY_MARK`). */
  ruinsCry?: boolean;
}): VillageRumor[] {
  const holds = (when: RumorWhen): boolean => {
    switch (when) {
      case 'ALWAYS':
        return true;
      case 'AFTER_GALD':
        return facts.arcOpen;
      case 'ROUTE_HEARD':
        return facts.arcOpen && stageReached(facts.stage, 'RUMOR');
      case 'RUINS_OPEN':
        return facts.arcOpen && stageReached(facts.stage, 'TOLD');
      case 'AFTER_BOSS':
        return facts.arcOpen && stageReached(facts.stage, 'BEATEN');
      case 'RUINS_CRY':
        return facts.arcOpen && stageReached(facts.stage, 'SETTLED') && facts.ruinsCry === true;
    }
  };
  return VILLAGE_RUMORS.filter((r) => holds(r.when));
}

/** The read mark a rumour is cleared with (core/world/readMarks.ts). */
export const rumorMark = (id: string): string => `rumor:${id}`;
