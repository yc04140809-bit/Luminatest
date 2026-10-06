import { describe, expect, it } from 'vitest';
import {
  GRAVE_PAST,
  HERO_SPEAKER,
  RUINS_PAST_BATTLE_TRACES,
  SEKIRYUGA_AFTERMATH,
  SEKIRYUGA_APPROACH_KAOS,
  SEKIRYUGA_APPROACH_SIGNS,
  SEKIRYUGA_RUMORS,
  SEKIRYUGA_TAVERN_EVENT,
  TAVERN_PAST_HINT,
} from './sekiryugaArc';
import { RUINS_WALK } from '../exploration/ruinsWalk';

/**
 * THE FIRST BOSS ROUTE'S WORDS: what each step reveals, and — just as
 * much — what none of them does.
 */

const all = (lines: readonly { text: string }[]) => lines.map((l) => l.text).join('\n');
const everything = [
  ...Object.values(SEKIRYUGA_RUMORS),
  ...SEKIRYUGA_TAVERN_EVENT,
  ...SEKIRYUGA_APPROACH_SIGNS,
  ...SEKIRYUGA_APPROACH_KAOS,
  ...SEKIRYUGA_AFTERMATH,
  ...RUINS_PAST_BATTLE_TRACES,
];

describe('the rumours', () => {
  it('are the three the author gave, one each at the bakery, the shop and the tavern', () => {
    expect(SEKIRYUGA_RUMORS.BAKERY).toEqual({
      speaker: 'パン屋の主人',
      text: 'この頃、遺跡の方で妙な音を聞いたって人がいるんだ。\n昔も、あの辺りで何かあったらしいけど……。',
    });
    expect(SEKIRYUGA_RUMORS.SHOP.text).toBe('遺跡へ行くなら気をつけな。\n最近、あっちから戻ってきた奴が“地面が揺れた”って言ってたぞ。');
    expect(SEKIRYUGA_RUMORS.TAVERN).toEqual({ speaker: 'グレイヴ', text: '……遺跡の噂か。\n昔話で済めばいいんだがな。' });
  });

  it('never say the name, that the master sealed it, or that the seal is going', () => {
    const said = all(Object.values(SEKIRYUGA_RUMORS));
    expect(said).not.toContain('セキリュウガ');
    expect(said).not.toMatch(/封印|解け/);
  });
});

describe('the master’s story', () => {
  const said = all(SEKIRYUGA_TAVERN_EVENT);

  it('tells, for the first time, each thing the route has to reveal', () => {
    expect(said).toContain('とんでもねぇ奴と戦ったことがある'); // a dangerous monster at the ruins
    expect(said).toContain('セキリュウガ'); // its name
    expect(said).toContain('冒険者'); // he was an adventurer…
    expect(said).toContain('腕の立つ連中'); // …in a strong party
    expect(said).toContain('二十年'); // about twenty years ago
    expect(said).toContain('封印した'); // sealed, not killed
    expect(said).toContain('殺さなかった');
    expect(said).toContain('解けかけてる可能性'); // the seal may be weakening
    expect(said).toContain('この村だって無事じゃ済まねぇ'); // Alden in danger
    expect(said).toContain('全員ここにはいねぇ'); // the party not all here
    expect(said).toContain('同じ術も使えねぇ'); // the same seal impossible
    expect(said).toContain('確認してきてくれ'); // they go to look
    expect(SEKIRYUGA_TAVERN_EVENT[SEKIRYUGA_TAVERN_EVENT.length - 1]).toEqual({
      speaker: null,
      text: '古代遺跡へ行けるようになった。',
    });
  });

  it('keeps §4’s own lines in its order', () => {
    const order = ['……遺跡だと？', 'セキリュウガ。', '……いや。', '封印した。', '殺せなかったんじゃねぇ。', '殺さなかった。', '……それはまだいい。', '同じ術も使えねぇ。', '無理なら逃げろ。', 'その時はまた考える。'];
    const at = order.map((t) => SEKIRYUGA_TAVERN_EVENT.findIndex((l) => l.text === t));
    for (const i of at) expect(i).toBeGreaterThanOrEqual(0);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('leaves open what is not decided: names, numbers, lives, why, what it guards, the depths', () => {
    expect(said).not.toMatch(/幼体|子ども|子供|守って|守る/);
    expect(said).not.toMatch(/死んだ|生きて/);
    expect(said).not.toMatch(/\d+人|[二三四五]人/);
    expect(said).not.toMatch(/最深部/);
  });

  it('the hero speaks as the placeholder the screen fills in', () => {
    expect(SEKIRYUGA_TAVERN_EVENT.some((l) => l.speaker === HERO_SPEAKER)).toBe(true);
  });

  it('what is fixed about him is written down as data', () => {
    expect(GRAVE_PAST).toEqual({
      formerAdventurer: true,
      strongParty: true,
      foughtSekiryugaYearsAgo: 20,
      sealedNotKilled: true,
      partyAllHere: false,
      sameSealPossible: false,
    });
    // The tavern's visual hint is a slot, empty until a picture exists.
    expect(TAVERN_PAST_HINT.art).toBeNull();
  });
});

describe('the approach and after', () => {
  it('signs a little at a time, 爪痕 never 巨大な爪痕, then she stops them', () => {
    expect(SEKIRYUGA_APPROACH_SIGNS.map((l) => l.text)).toEqual([
      '空気が少し重い。',
      '地面が、小さく震えた。',
      '奥から、何かが擦れる音がする。',
      '爪痕が石床に残っている。',
    ]);
    expect(all(everything)).not.toContain('巨大');
    expect(SEKIRYUGA_APPROACH_KAOS[0]).toEqual({ speaker: 'ケイオス', text: '……止まって。' });
    expect(SEKIRYUGA_APPROACH_KAOS[SEKIRYUGA_APPROACH_KAOS.length - 1]).toEqual({ speaker: 'ケイオス', text: 'たぶん。' });
  });

  it('after it stops: not dead — and it is not looking at them', () => {
    const said = all(SEKIRYUGA_AFTERMATH);
    expect(said).not.toMatch(/死|息絶|倒れたまま/);
    for (const t of ['この子。', '私たちを見てない。', '奥。', 'ずっと、\nあっちを見てる。']) {
      expect(SEKIRYUGA_AFTERMATH).toContainEqual({ speaker: 'ケイオス', text: t });
    }
    expect(SEKIRYUGA_AFTERMATH[SEKIRYUGA_AFTERMATH.length - 1]).toEqual({ speaker: HERO_SPEAKER, text: '……。' });
    // Nothing explained: not what it guards, not why.
    expect(said).not.toMatch(/守|幼体|理由|封印/);
  });

  it('nothing on the route mentions Gald, Lina, or the four answers', () => {
    expect(all(everything)).not.toMatch(/ガルド|リナ|四択/);
  });

  it('size, colour and build are never described — only what it does', () => {
    expect(all(everything)).not.toMatch(/巨大|大きな体|小さな体|赤い|青い|黒い|白い毛|角|翼|尻尾|鱗|結晶|菌糸/);
  });
});

describe('the ruins’ traces of an old fight', () => {
  it('are the five the brief gave, mixed into the ruins’ ordinary finds', () => {
    expect(RUINS_PAST_BATTLE_TRACES.map((t) => t.text)).toEqual([
      '石柱に、深い剣傷が残っている。',
      '砕けた石のそばに、\n古い金属片が落ちている。',
      '壁に焦げた跡が残っている。',
      '誰かが座っていたように、\n平らな石だけが妙に擦れている。',
      '古い靴跡のような窪みがある。',
    ]);
    const pool = RUINS_WALK.roam!.discoveries.map((d) => d.id);
    for (const t of RUINS_PAST_BATTLE_TRACES) expect(pool).toContain(t.id);
    // The ruins' own finds are all still there, and the gold and rainbow untouched.
    for (const id of ['WHITE_FLOWER', 'SAT_HERE', 'WARM_STONE']) expect(pool).toContain(id);
    expect(RUINS_WALK.roam!.rareDiscoveries!.length).toBe(5);
    expect(RUINS_WALK.roam!.rainbow!.equipmentId).toBe('weapon/star_crest_relic_sword');
  });

  it('never name the tavern’s master', () => {
    const said = all(RUINS_PAST_BATTLE_TRACES);
    expect(said).not.toMatch(/グレイヴ|マスター|酒場/);
  });
});
