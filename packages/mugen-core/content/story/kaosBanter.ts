// 主人公×ケイオス — SHORT EXCHANGES BETWEEN THE TWO OF THEM (作者指示 2026-10-11).
//
// Not to tell the player anything: to let them like the two of them. Two to
// four lines, the hero answering back (相棒, not one who explains and one
// who listens), her face on each of her lines (content/characters/
// kaosFaces.ts). Four directions mixed: 可愛い（プク顔・照れ・小さな喜び）,
// 面白い（ツッコミ・ズレた感想・小さな自慢）, 頼れる（危険察知・注意）,
// 優しい（気遣い）.
//
// WHEN: never every time. At a moment (setting out on the region map, coming
// back into the village) one MAY be said — a roll, `BANTER_CHANCE` — and
// only when nothing of the story is being said there (the incident's word on
// the map, today's small thing in the village come first). Each is said once
// in a world (read mark `talk:BANTER_<id>`) and marked NEW while it is; read,
// it is gone. Light ones stop once the signs grow heavy (phase 3), so the
// serious stays serious. Nothing here moves the world: no point, no memory,
// no reward.
//
// TO ADD ONE: a new entry below — an id, the place, the lines, and when (if
// it should wait for something). A reaction to the player going somewhere
// again and again (「……またここ？」) is a `when` on `forestVisits`.

import type { DialogueLine } from '../dialogue/prologue';
import type { KaosFace } from '../characters/kaosFaces';
import type { SekiryugaStage } from '../../core/world/storyArc';
import type { IncidentPhase } from '../../core/world/aldenIncident';
import { HERO_SPEAKER } from './sekiryugaArc';

const KAOS = 'ケイオス';
const HERO = HERO_SPEAKER;

export type BanterLine = DialogueLine & { kaosFace?: KaosFace };

/** Where one may be said: setting out (the region map), or coming back into the village. */
export type BanterPlace = 'SETTING_OUT' | 'HOMECOMING';

export interface BanterFacts {
  stage: SekiryugaStage;
  phase: IncidentPhase;
  /** Real visits to the forest so far (exploration visits). */
  forestVisits: number;
  /** The world's absolute day. */
  day: number;
}

export interface KaosBanter {
  id: string;
  place: BanterPlace;
  lines: readonly BanterLine[];
  /** Only when this holds (absent: always, while the signs are light). */
  when?: (f: BanterFacts) => boolean;
  /** Said even when the signs are heavy (phase 3) — the serious ones. */
  heavy?: boolean;
}

/** How likely one is said at a moment where one could be. */
export const BANTER_CHANCE = 0.35;

export const banterMark = (id: string): string => `talk:BANTER_${id}`;

export const KAOS_BANTERS: readonly KaosBanter[] = [
  // ---- setting out ----
  {
    id: 'WHICH_WAY',
    place: 'SETTING_OUT',
    lines: [
      { speaker: KAOS, text: 'ねえ、今日はどっち行く？', kaosFace: 'SMILE' },
      { speaker: HERO, text: '森かな。' },
      { speaker: KAOS, text: 'じゃあ、迷子にならないようにね。', kaosFace: 'DOYA' },
      { speaker: HERO, text: 'それはこっちの台詞だ。' },
    ],
  },
  {
    id: 'NOT_LISTENING',
    place: 'SETTING_OUT',
    when: (f) => f.day >= 2,
    lines: [
      { speaker: HERO, text: 'さっき、何て言ってた？' },
      { speaker: KAOS, text: '……。', kaosFace: 'PUKU' },
      { speaker: HERO, text: 'ケイオス？' },
      { speaker: KAOS, text: 'もう知らない。', kaosFace: 'PUKU' },
    ],
  },
  {
    id: 'AGAIN_THE_FOREST',
    place: 'SETTING_OUT',
    when: (f) => f.forestVisits >= 3,
    lines: [
      { speaker: KAOS, text: '……また森？', kaosFace: 'TROUBLED' },
      { speaker: HERO, text: '何かある気がする。' },
      { speaker: KAOS, text: 'その勘、この前も聞いたよ。', kaosFace: 'PUKU' },
    ],
  },
  {
    id: 'LOOKS_STRONG',
    place: 'SETTING_OUT',
    when: (f) => f.stage === 'SETTLED',
    lines: [
      { speaker: HERO, text: '強そうなのが出たら、どうする？' },
      { speaker: KAOS, text: '見た目で決めるのは危ないよ。', kaosFace: 'SERIOUS' },
      { speaker: HERO, text: 'それ、お前が言う？' },
      { speaker: KAOS, text: '……どういう意味？', kaosFace: 'PUKU' },
    ],
  },
  {
    id: 'PRAISE',
    place: 'SETTING_OUT',
    when: (f) => f.day >= 3,
    lines: [
      { speaker: HERO, text: 'この前は、助かった。' },
      { speaker: KAOS, text: 'えへへ。もっと褒めてもいいよ？', kaosFace: 'BLUSH' },
      { speaker: HERO, text: '調子に乗るな。' },
      { speaker: KAOS, text: '乗ってないよー。', kaosFace: 'LAUGH' },
    ],
  },
  {
    id: 'THE_WIND',
    place: 'SETTING_OUT',
    heavy: true,
    when: (f) => f.phase >= 2,
    lines: [
      { speaker: KAOS, text: '……待って。', kaosFace: 'SERIOUS' },
      { speaker: HERO, text: 'どうした？' },
      { speaker: KAOS, text: '風の匂いが、いつもと違う。……気をつけてね。', kaosFace: 'SERIOUS' },
      { speaker: HERO, text: '分かった。お前もな。' },
    ],
  },
  // ---- coming back into the village ----
  {
    id: 'TADAIMA',
    place: 'HOMECOMING',
    lines: [
      { speaker: KAOS, text: 'ただいまー。', kaosFace: 'SMILE' },
      { speaker: HERO, text: '誰に言ってるんだ。' },
      { speaker: KAOS, text: '村に。', kaosFace: 'DOYA' },
    ],
  },
  {
    id: 'BREAD_SMELL',
    place: 'HOMECOMING',
    lines: [
      { speaker: KAOS, text: 'パンのいい匂いがする……。', kaosFace: 'SMILE' },
      { speaker: HERO, text: 'さっき食べただろ。' },
      { speaker: KAOS, text: 'それとこれとは別なの。', kaosFace: 'PUKU' },
    ],
  },
  {
    id: 'ARE_YOU_TIRED',
    place: 'HOMECOMING',
    heavy: true,
    when: (f) => f.day >= 2,
    lines: [
      { speaker: KAOS, text: '疲れてない？', kaosFace: 'NORMAL' },
      { speaker: HERO, text: '平気だ。' },
      { speaker: KAOS, text: '……そういう時ほど、無理してるんだよ。', kaosFace: 'SAD' },
      { speaker: HERO, text: '分かった分かった。今日は休む。' },
    ],
  },
  {
    id: 'STRANGE_STONE',
    place: 'HOMECOMING',
    when: (f) => f.forestVisits >= 1,
    lines: [
      { speaker: KAOS, text: '森にあった変な形の石、覚えてる？', kaosFace: 'TROUBLED' },
      { speaker: HERO, text: '触ってみればよかったな。' },
      { speaker: KAOS, text: 'なんで！？', kaosFace: 'SURPRISED' },
    ],
  },
  {
    id: 'VILLAGE_BRIGHTER',
    place: 'HOMECOMING',
    when: (f) => f.stage === 'SETTLED',
    lines: [
      { speaker: KAOS, text: '村の人たち、ちょっと元気になったね。', kaosFace: 'SMILE' },
      { speaker: HERO, text: 'そうか？' },
      { speaker: KAOS, text: 'うん。……よかった。', kaosFace: 'SAD' },
    ],
  },
];

/**
 * What may be said here now, for a roll in [0, 1): nothing most of the time;
 * else the first not yet heard whose time has come — light ones only while
 * the signs are light (below phase 3).
 */
export function banterAt(
  place: BanterPlace,
  facts: BanterFacts,
  isRead: (mark: string) => boolean,
  roll: number,
): KaosBanter | null {
  if (roll >= BANTER_CHANCE) return null;
  return (
    KAOS_BANTERS.find(
      (b) =>
        b.place === place &&
        !isRead(banterMark(b.id)) &&
        (b.heavy || facts.phase < 3) &&
        (b.when?.(facts) ?? true),
    ) ?? null
  );
}
