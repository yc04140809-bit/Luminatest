// アルデン村 — SMALL THINGS THAT HAPPEN (襲撃前の日常, 2026-10-10).
//
// Not content to be collected: things that happen in the village, to people
// with lives, while the player is about. Each is half a minute or so. None
// pays anything — no item, no LUMI, no experience, no bond — and none moves
// ALDEN INCIDENT (an ordinary day is not the world moving). Missing one
// costs nothing; nothing waits on any of them.
//
// WHEN (作者判断 2026-10-10):
//   - only once セキリュウガ's part is over (the route SETTLED),
//   - at most ONE in a day, whichever place the player happens to be first,
//   - each once in a world (readMarks `talk:DAILY_<id>`, marked when read to
//     its end — left half way, it is there again),
//   - some only once the signs have begun (`from`, ALDEN INCIDENT's phase).
// There is no button for them and no list of them: each takes the place of
// what the person there would ordinarily say, or — Kaos on the steps — is
// there as they come back into the village from outside.
//
// TWO ARE NOT NEW: the steps and the sword were written for the village's
// talk spots (content/experience/aldenExperience.ts) and are taken from
// there word for word, her closing remark included, so the App and the
// Artifact say the same thing. Lina, the owner and Mirei are new (案,
// docs/CHAPTER1_DAILY_AND_ENEMIES.md). Lina is fourteen and nothing here
// touches Gald or her future.

import type { DialogueLine } from '../dialogue/prologue';
import type { IncidentPhase } from '../../core/world/aldenIncident';
import type { SekiryugaStage } from '../../core/world/storyArc';
import type { NpcExpression } from '../../core/npc/touchReaction';
import { ALDEN_EXPERIENCE_EVENTS } from '../experience/aldenExperience';
import { HERO_SPEAKER } from './sekiryugaArc';

/** Where one happens: the village as they come back, or in place of someone's ordinary word. */
export type DailyScenePlace = 'VILLAGE' | 'BAKERY_LINA' | 'BAKERY_OWNER' | 'TAVERN' | 'SHOP';

export interface DailySceneLine extends DialogueLine {
  /** Mirei's face on this line (the shop draws her); absent, her ordinary one. */
  face?: NpcExpression;
}

export type DailySceneId = 'KAOS_DETOUR' | 'LINA_BURNT_BREAD' | 'OWNER_KILN' | 'GRAVE_GREATSWORD' | 'MIREI_TRAVELERS';

export interface DailyScene {
  id: DailySceneId;
  place: DailyScenePlace;
  /** ALDEN INCIDENT's phase it waits for (0: from the start of the everyday after セキリュウガ). */
  from: IncidentPhase;
  lines: readonly DailySceneLine[];
  /** The talk-spot event it is taken from, when it is not new. */
  takenFrom?: string;
}

const KAOS = 'ケイオス';
const LINA = 'リナ';
const OWNER = '主人';
const MIREI = 'ミレイ';

/** An event written for the talk spots, as a scene: its lines, then her remark (if it has one). */
function fromTalkSpot(eventId: string): readonly DailySceneLine[] {
  const event = ALDEN_EXPERIENCE_EVENTS.find((e) => e.eventId === eventId);
  if (!event) throw new Error(`No talk-spot event ${eventId}`);
  const remark = event.content.kaosLine?.replace(/^「|」$/g, '');
  return [...event.content.lines, ...(remark ? [{ speaker: KAOS, text: remark }] : [])];
}

export const DAILY_SCENES: readonly DailyScene[] = [
  {
    id: 'KAOS_DETOUR',
    place: 'VILLAGE',
    from: 0,
    takenFrom: 'ALDEN_KAOS_DETOUR',
    lines: fromTalkSpot('ALDEN_KAOS_DETOUR'),
  },
  {
    id: 'LINA_BURNT_BREAD',
    place: 'BAKERY_LINA',
    from: 0,
    lines: [
      { speaker: LINA, text: 'あっ、ちょうどいいところに！' },
      { speaker: LINA, text: 'これ、焼き損じちゃったの。お店には出せないから……食べてみて？' },
      { speaker: null, text: '端が少し焦げている。でも、まだ温かい。' },
      { speaker: KAOS, text: 'ん、おいしい♪ 焦げてるとこが一番おいしいかも。' },
      { speaker: LINA, text: 'でしょ！ ……って、それ褒めてる？' },
      { speaker: HERO_SPEAKER, text: '褒めてる。' },
      { speaker: LINA, text: 'えへへ。お父さんには内緒ね。' },
    ],
  },
  {
    id: 'OWNER_KILN',
    place: 'BAKERY_OWNER',
    from: 1,
    lines: [
      { speaker: null, text: '夜明け前。パン屋の裏で、主人が窯に火を入れている。' },
      { speaker: OWNER, text: '起こしちまったか。' },
      { speaker: OWNER, text: '窯の火はな、毎朝こうやって起こすんだ。一日でも休むと、へそを曲げる。' },
      { speaker: KAOS, text: '窯にも機嫌があるの？' },
      { speaker: OWNER, text: 'あるさ。この店で一番の古株だからな。' },
      { speaker: null, text: '火が、ゆっくりと赤くなっていく。' },
    ],
  },
  {
    id: 'GRAVE_GREATSWORD',
    place: 'TAVERN',
    from: 2,
    takenFrom: 'TAVERN_MASTER_OLD_GREATSWORD',
    lines: fromTalkSpot('TAVERN_MASTER_OLD_GREATSWORD'),
  },
  {
    id: 'MIREI_TRAVELERS',
    place: 'SHOP',
    from: 1,
    lines: [
      { speaker: null, text: '棚に、旅支度の包みがいくつも積まれたままになっている。' },
      { speaker: MIREI, text: '……また余っちゃった。', face: 'SAD' },
      { speaker: MIREI, text: '最近、旅の人が来ないのよ。' },
      { speaker: MIREI, text: 'でも、作っておくの。来た人が困らないように。' },
      { speaker: KAOS, text: '……ミレイって、いい人だね。' },
      { speaker: MIREI, text: 'や、やめてよ。商売よ、商売。', face: 'SHY' },
    ],
  },
];

/** readMarks id for a scene (read to its end). */
export const dailySceneMark = (id: DailySceneId): string => `talk:DAILY_${id}`;

export interface DailySceneFacts {
  stage: SekiryugaStage;
  phase: IncidentPhase;
  /** Today (the absolute day of the world's clock). */
  day: number;
  /** The day the last one was seen to its end, or null. */
  lastDay: number | null;
  isRead: (mark: string) => boolean;
}

/** The scene that happens here now, if any: after セキリュウガ, one a day, each once. */
export function dailySceneAt(place: DailyScenePlace, facts: DailySceneFacts): DailyScene | null {
  if (facts.stage !== 'SETTLED') return null;
  if (facts.lastDay === facts.day) return null;
  return (
    DAILY_SCENES.find((s) => s.place === place && s.from <= facts.phase && !facts.isRead(dailySceneMark(s.id))) ?? null
  );
}
