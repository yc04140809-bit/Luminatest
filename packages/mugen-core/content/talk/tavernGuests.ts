// 酒場の客 — STRANGERS AT THE TAVERN, AS SILHOUETTES (2026-10-09).
//
// Not characters: five SPEAKERS, each a silhouette on a transparent ground
// (mugen-assets/files/characters/tavern-guests), that any number of
// strangers can be. The same silhouette is a different person in a
// different talk; what they are called is a plain label (客, 旅人, 戦士…),
// never a name. Any of them can become somebody later — a talk names its
// speaker by id, so giving one a name is a change here and nowhere else.
//
// WHAT THEY ARE FOR is the room around Grave, not Grave's job: a little
// of the world beyond Alden, a hint, the feeling that something is out
// there. They never tell his story, sell Lina's bread or answer the four
// answers. One to three lines, and never the whole of anything.
//
// ROOM LEFT, NOT BUILT: 本日の客 (`tonightsGuestTalk` turns with the day
// and can be swapped for one that reads the story), 噂話 by speaker, 物々
// 交換 (`kind: 'TRADE'` — the hooded guest for rare things, the warrior for
// gear and materials, the others for small swaps), and the bard's songs
// (`kind: 'BARD'` — the music already heard, to listen to again). Today
// every talk is words only; nothing here is saved.

import type { DialogueLine } from '../dialogue/prologue';

/** The five silhouettes, by the id a talk names its speaker with. */
export type TavernGuestId =
  | 'tavern_guest_male'
  | 'tavern_guest_female'
  | 'tavern_guest_bard'
  | 'tavern_guest_hooded'
  | 'tavern_guest_warrior';

export const TAVERN_GUEST_IDS: readonly TavernGuestId[] = [
  'tavern_guest_male',
  'tavern_guest_female',
  'tavern_guest_bard',
  'tavern_guest_hooded',
  'tavern_guest_warrior',
];

/** What a talk is, for the features to come. Today all are only words. */
export type TavernGuestKind = 'CHAT' | 'RUMOR' | 'HINT' | 'TRADE' | 'BARD';

export interface TavernGuest {
  id: TavernGuestId;
  /** What they are called when a talk does not say. */
  label: string;
  /** What this silhouette is for (the order's 4-1…4-5). */
  roles: readonly TavernGuestKind[];
}

export const TAVERN_GUESTS: Readonly<Record<TavernGuestId, TavernGuest>> = {
  tavern_guest_male: { id: 'tavern_guest_male', label: '客', roles: ['CHAT', 'RUMOR', 'TRADE'] },
  tavern_guest_female: { id: 'tavern_guest_female', label: '旅人', roles: ['CHAT', 'RUMOR'] },
  tavern_guest_bard: { id: 'tavern_guest_bard', label: '吟遊詩人', roles: ['BARD', 'HINT'] },
  // Seldom: worth more for being rare.
  tavern_guest_hooded: { id: 'tavern_guest_hooded', label: '怪しい客', roles: ['HINT', 'TRADE'] },
  tavern_guest_warrior: { id: 'tavern_guest_warrior', label: '戦士', roles: ['HINT', 'RUMOR', 'TRADE'] },
};

/** One stranger's talk. */
export interface TavernGuestTalk {
  id: string;
  guest: TavernGuestId;
  /** This stranger's label, when not the silhouette's own (客 / 旅人 / 冒険者…). */
  label?: string;
  kind: TavernGuestKind;
  /** One to three lines, all theirs. */
  lines: readonly string[];
}

export const TAVERN_GUEST_TALKS: readonly TavernGuestTalk[] = [
  {
    id: 'GUEST_MALE_FOREST',
    guest: 'tavern_guest_male',
    label: '旅人',
    kind: 'RUMOR',
    lines: ['グリーンウッドの森は、奥へ行くほど静かになる。', '静かすぎるのも、それはそれで落ち着かねぇ。'],
  },
  {
    id: 'GUEST_MALE_ALE',
    guest: 'tavern_guest_male',
    kind: 'CHAT',
    lines: ['この村の酒は悪くない。', '……マスターには言うなよ。調子に乗るからな。'],
  },
  {
    id: 'GUEST_FEMALE_BREAD',
    guest: 'tavern_guest_female',
    kind: 'CHAT',
    lines: ['この村、朝はパンの匂いがするのね。', '旅の途中で寄る村としては、上出来よ。'],
  },
  {
    id: 'GUEST_FEMALE_LIGHTS',
    guest: 'tavern_guest_female',
    label: '客',
    kind: 'RUMOR',
    lines: ['夜の森で、小さな灯りが揺れていたって話よ。', '……ただの見間違いだといいけど。'],
  },
  {
    id: 'GUEST_WARRIOR_HERBS',
    guest: 'tavern_guest_warrior',
    kind: 'RUMOR',
    lines: ['よその土地じゃ、魔物の群れが荒れているらしい。', '森へ行くなら、薬草は多めに持っておけ。'],
  },
  {
    id: 'GUEST_WARRIOR_GUARD',
    guest: 'tavern_guest_warrior',
    label: '冒険者',
    kind: 'HINT',
    lines: ['手強い相手ほど、大技の前に力を溜める。', 'その時は構えておけ。……生き残るコツだ。'],
  },
  {
    id: 'GUEST_BARD_STRINGS',
    guest: 'tavern_guest_bard',
    kind: 'BARD',
    lines: ['一曲いかがかな？ ……と言いたいが、今夜は弦の機嫌が悪い。', 'また来てくれ。その時は、君が旅で聞いた歌を奏でよう。'],
  },
  {
    id: 'GUEST_BARD_OLD_SONG',
    guest: 'tavern_guest_bard',
    kind: 'HINT',
    lines: ['古い歌がある。森のずっと奥で、眠り続けるものの歌だ。', '続きは……まだ思い出せない。'],
  },
  {
    id: 'GUEST_HOODED_RELICS',
    guest: 'tavern_guest_hooded',
    kind: 'HINT',
    lines: ['……珍しいものを集めている。', '古い時代の、誰にも使い方の分からないものをな。', 'いつか、見せてもらうことになるかもしれん。'],
  },
];

const talkById = (id: string) => TAVERN_GUEST_TALKS.find((t) => t.id === id)!;

/**
 * 本日の客 — WHO IS IN TONIGHT, by the day. A fortnight's turn: each talk
 * once, the hooded guest one night in seven (rare on purpose), the bard
 * and the warrior between the ordinary guests. Fixed for now; a version
 * that reads the story or a rest can replace this and nothing else.
 */
export const TAVERN_GUEST_NIGHTS: readonly string[] = [
  'GUEST_MALE_FOREST',
  'GUEST_FEMALE_BREAD',
  'GUEST_WARRIOR_HERBS',
  'GUEST_BARD_STRINGS',
  'GUEST_MALE_ALE',
  'GUEST_FEMALE_LIGHTS',
  'GUEST_HOODED_RELICS',
  'GUEST_WARRIOR_GUARD',
  'GUEST_FEMALE_BREAD',
  'GUEST_BARD_OLD_SONG',
  'GUEST_MALE_FOREST',
  'GUEST_WARRIOR_HERBS',
  'GUEST_MALE_ALE',
  'GUEST_HOODED_RELICS',
];

/** Tonight's stranger, on this absolute day (day 1 is the first). */
export function tonightsGuestTalk(day: number): TavernGuestTalk {
  const n = TAVERN_GUEST_NIGHTS.length;
  const at = ((Math.floor(day) - 1) % n + n) % n;
  return talkById(TAVERN_GUEST_NIGHTS[at]);
}

/** What a stranger is called in this talk. */
export function guestLabelOf(talk: TavernGuestTalk): string {
  return talk.label ?? TAVERN_GUESTS[talk.guest].label;
}

/** The talk as the box reads it: every line theirs, under their label. */
export function guestLines(talk: TavernGuestTalk): readonly DialogueLine[] {
  const speaker = guestLabelOf(talk);
  return talk.lines.map((text) => ({ speaker, text }));
}
