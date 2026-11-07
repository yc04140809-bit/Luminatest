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
// WHAT A STRANGER CAN DO (酒場ハブ化 Phase 1, 2026-10-09) is the talk's
// `role`: TALK (words only), TRADE (one swap after the words — content/
// economy/tavernTrades), RARE_TRADE (the hooded guest's, a little rarer)
// or BARD (the MUSIC ARCHIVE after the words — content/audio/musicArchive).
// None of it is ever needed: missing a night costs nothing.
//
// ROOM LEFT, NOT BUILT: somebody particular visiting, a stranger from
// elsewhere staying a while, more guests as the village grows, who comes
// before and after trouble, a guest moving on — `tonightsGuestTalk` is the
// one place that decides who is in, and can be swapped for one that reads
// the world.

import type { DialogueLine } from '../dialogue/prologue';
import { HERO_SPEAKER } from '../story/sekiryugaArc';

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

/** What a talk is about. */
export type TavernGuestKind = 'CHAT' | 'RUMOR' | 'HINT';

/** What a stranger can do after the words. */
export type TavernGuestRole = 'TALK' | 'TRADE' | 'RARE_TRADE' | 'BARD';

export interface TavernGuest {
  id: TavernGuestId;
  /** What they are called when a talk does not say. */
  label: string;
  /** What this silhouette is for (the order's 4-1…4-5). */
  roles: readonly TavernGuestRole[];
}

export const TAVERN_GUESTS: Readonly<Record<TavernGuestId, TavernGuest>> = {
  tavern_guest_male: { id: 'tavern_guest_male', label: '客', roles: ['TALK', 'TRADE'] },
  tavern_guest_female: { id: 'tavern_guest_female', label: '旅人', roles: ['TALK', 'TRADE'] },
  tavern_guest_bard: { id: 'tavern_guest_bard', label: '吟遊詩人', roles: ['BARD'] },
  // Seldom: worth more for being rare.
  tavern_guest_hooded: { id: 'tavern_guest_hooded', label: '怪しい客', roles: ['RARE_TRADE'] },
  tavern_guest_warrior: { id: 'tavern_guest_warrior', label: '戦士', roles: ['TALK', 'TRADE'] },
};

/** A line of a stranger's talk: theirs, or the hero's answer. */
export type GuestLine = string | { hero: string };

/** One stranger's talk. */
export interface TavernGuestTalk {
  id: string;
  guest: TavernGuestId;
  /** This stranger's label, when not the silhouette's own (客 / 旅人 / 冒険者…). */
  label?: string;
  kind: TavernGuestKind;
  /** What comes after the words. TALK: nothing. */
  role: TavernGuestRole;
  /** The swap, for TRADE and RARE_TRADE (content/economy/tavernTrades). */
  tradeId?: string;
  /** The bard's: the archive of music heard. */
  musicRole?: 'ARCHIVE';
  /** One to three of their own lines (the hero may answer between them). */
  lines: readonly GuestLine[];
}

export const TAVERN_GUEST_TALKS: readonly TavernGuestTalk[] = [
  {
    id: 'GUEST_MALE_FOREST',
    guest: 'tavern_guest_male',
    label: '旅人',
    kind: 'RUMOR',
    role: 'TRADE',
    tradeId: 'TRADE_ORE_FOR_COIN',
    lines: ['森の奥で、妙に光る木の実を見たよ。', '……食えるかどうかは、知らねぇけどな。'],
  },
  {
    id: 'GUEST_MALE_BREAD',
    guest: 'tavern_guest_male',
    kind: 'CHAT',
    role: 'TALK',
    lines: ['この村のパン、うまいな。', { hero: 'パン屋で言え。' }, '恥ずかしい。', { hero: 'なんでだよ。' }],
  },
  {
    id: 'GUEST_MALE_ALE',
    guest: 'tavern_guest_male',
    kind: 'CHAT',
    role: 'TALK',
    lines: ['この村の酒は悪くない。', '……マスターには言うなよ。調子に乗るからな。'],
  },
  {
    id: 'GUEST_MALE_CROWD',
    guest: 'tavern_guest_male',
    kind: 'CHAT',
    role: 'TALK',
    lines: ['この村、前より人が増えた気がするな。', '……いや、俺が来る回数が増えただけか。'],
  },
  {
    id: 'GUEST_FEMALE_BREAD',
    guest: 'tavern_guest_female',
    kind: 'CHAT',
    role: 'TALK',
    lines: ['この村、朝はパンの匂いがするのね。', '旅の途中で寄る村としては、上出来よ。'],
  },
  {
    id: 'GUEST_FEMALE_LIGHTS',
    guest: 'tavern_guest_female',
    label: '客',
    kind: 'RUMOR',
    role: 'TRADE',
    tradeId: 'TRADE_NUTS_FOR_MANA_HERB',
    lines: ['夜の森で、小さな灯りが揺れていたって話よ。', '……ただの見間違いだといいけど。'],
  },
  {
    id: 'GUEST_WARRIOR_HERBS',
    guest: 'tavern_guest_warrior',
    kind: 'RUMOR',
    role: 'TRADE',
    tradeId: 'TRADE_HERBS_FOR_FINE',
    lines: ['よその土地じゃ、魔物の群れが荒れているらしい。', '森の奥へ行くなら、回復は多めに持っとけ。'],
  },
  {
    id: 'GUEST_WARRIOR_GUARD',
    guest: 'tavern_guest_warrior',
    label: '冒険者',
    kind: 'HINT',
    role: 'TRADE',
    tradeId: 'TRADE_SHARDS_FOR_WATER',
    lines: ['手強い相手ほど、大技の前に力を溜める。', 'その時は構えておけ。……生き残るコツだ。'],
  },
  {
    id: 'GUEST_BARD_SONGS',
    guest: 'tavern_guest_bard',
    kind: 'CHAT',
    role: 'BARD',
    musicRole: 'ARCHIVE',
    lines: ['やあ。しがない旅の歌うたいさ。', '君が旅の途中で聞いた曲なら、弾いてみせよう。'],
  },
  {
    id: 'GUEST_BARD_OLD_SONG',
    guest: 'tavern_guest_bard',
    kind: 'HINT',
    role: 'BARD',
    musicRole: 'ARCHIVE',
    lines: ['古い歌がある。森のずっと奥で、眠り続けるものの歌だ。', '続きは……まだ思い出せない。'],
  },
  {
    id: 'GUEST_HOODED_RELICS',
    guest: 'tavern_guest_hooded',
    kind: 'HINT',
    role: 'RARE_TRADE',
    tradeId: 'RARE_RELICS_FOR_SHARD',
    lines: ['……珍しいものを集めている。', '古い時代の、誰にも使い方の分からないものをな。'],
  },
  {
    id: 'GUEST_HOODED_COINS',
    guest: 'tavern_guest_hooded',
    kind: 'HINT',
    role: 'RARE_TRADE',
    tradeId: 'RARE_COINS_FOR_SHARD',
    lines: ['……それ、どこで手に入れた？', 'いや、答えなくていい。'],
  },
];

const talkById = (id: string) => TAVERN_GUEST_TALKS.find((t) => t.id === id)!;

/**
 * 本日の客 — WHO IS IN TONIGHT, by the day. A fortnight's turn: the hooded
 * guest one night in seven (rare on purpose), the bard twice, the warrior
 * and the ordinary guests between. Fixed for now; a version that reads the
 * story or the village can replace this and nothing else.
 */
export const TAVERN_GUEST_NIGHTS: readonly string[] = [
  'GUEST_MALE_FOREST',
  'GUEST_FEMALE_BREAD',
  'GUEST_WARRIOR_HERBS',
  'GUEST_BARD_SONGS',
  'GUEST_MALE_BREAD',
  'GUEST_FEMALE_LIGHTS',
  'GUEST_HOODED_RELICS',
  'GUEST_WARRIOR_GUARD',
  'GUEST_MALE_ALE',
  'GUEST_BARD_OLD_SONG',
  'GUEST_FEMALE_LIGHTS',
  'GUEST_WARRIOR_HERBS',
  'GUEST_MALE_CROWD',
  'GUEST_HOODED_COINS',
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

/** Their own lines, without the hero's answers. */
export function guestOwnLines(talk: TavernGuestTalk): string[] {
  return talk.lines.filter((l): l is string => typeof l === 'string');
}

/** The talk as the box reads it: theirs under their label, the hero's under the hero's. */
export function guestLines(talk: TavernGuestTalk): readonly DialogueLine[] {
  const speaker = guestLabelOf(talk);
  return talk.lines.map((l) => (typeof l === 'string' ? { speaker, text: l } : { speaker: HERO_SPEAKER, text: l.hero }));
}
