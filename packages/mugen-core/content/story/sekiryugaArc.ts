// ガルド戦後 → アルデン村 → 古代遺跡 → セキリュウガ — THE WORDS OF THE FIRST BOSS ROUTE.
//
// Everything said along the route, in the order it is met, as data: the
// three rumours, the tavern master's story, the approach to the sealed
// place, the boss's entrance and what is seen after it stops. Replacing a
// line is replacing it here; no screen reads what a line SAYS.
//
// WHAT THIS DECIDES, AND NOTHING MORE (the brief's §5 / §17):
//
//   decided   the tavern's master (グレイヴ) was an adventurer, in a strong
//             party; about twenty years ago they fought セキリュウガ at the
//             ruins and SEALED it rather than killing it; that party is
//             not all here any more; the same seal cannot be made again.
//   NOT       the party's names, how many, who lives; why it turned on
//             them; what it guards; what lies deepest in the ruins. Nobody
//             here answers those, and no line hints at an answer to them.
//
// セキリュウガ IS FORGE'S MON-000007 and FORGE keeps it: these lines say
// what it does, never what it looks like, how big it is, or what it is
// protecting (FORGE's canon has a young one in its care — kept back from
// the player on purpose, for later). Its name is said first by the master,
// never by a rumour.
//
// FOR EVERY ONE OF THE FOUR ANSWERS. Nothing here mentions Gald, Lina, the
// bakery's future or which answer was given: the route begins after the
// look ahead, whatever was decided, and leaves Gald's life to WORLD MEMORY.

import type { DialogueLine } from '../dialogue/prologue';
import { BAKERY_OWNER } from '../characters/bakeryOwner';
import { SEKIRYUGA_NAME } from '../enemies/sekiryugaBattle';

/**
 * THE HERO SPEAKING — a placeholder the screen replaces with the name the
 * player chose (the same as `world.getHeroName()`). Never shown as is.
 */
export const HERO_SPEAKER = '{HERO}';

const MASTER = 'グレイヴ';
const KAOS = 'ケイオス';
const HERO = HERO_SPEAKER;

/** Fixed about the master by this route (§5). Data only — nothing reads it to decide. */
export const GRAVE_PAST = {
  formerAdventurer: true,
  strongParty: true,
  foughtSekiryugaYearsAgo: 20,
  sealedNotKilled: true,
  partyAllHere: false,
  sameSealPossible: false,
} as const;

// ---- 噂 — three people, one each (§3) ----------------------------------

/** Where a rumour is heard: three of the village's existing places, one each. */
export type RumorSource = 'BAKERY' | 'SHOP' | 'TAVERN';

/**
 * THE RUMOURS. Each says something is wrong at the ruins and no more: not
 * the name セキリュウガ, not that the master sealed anything, not that a
 * seal is weakening.
 */
export const SEKIRYUGA_RUMORS: Record<RumorSource, DialogueLine> = {
  BAKERY: {
    speaker: BAKERY_OWNER.name,
    text: 'この頃、遺跡の方で妙な音を聞いたって人がいるんだ。\n昔も、あの辺りで何かあったらしいけど……。',
  },
  SHOP: {
    speaker: '道具屋',
    text: '遺跡へ行くなら気をつけな。\n最近、あっちから戻ってきた奴が“地面が揺れた”って言ってたぞ。',
  },
  TAVERN: {
    speaker: MASTER,
    text: '……遺跡の噂か。\n昔話で済めばいいんだがな。',
  },
};

// ---- 酒場マスターイベント (§4) -------------------------------------------

/**
 * THE MASTER'S STORY, read once — on walking into the tavern after any
 * rumour, or straight after his own. The brief's §4 as written, with
 * three lines added for what the route has to reveal that §4 does not
 * say outright: that he was an adventurer in a strong party, that it was
 * about twenty years ago, and that the village is in danger if the seal
 * fully goes. The last line is the ruins opening.
 */
export const SEKIRYUGA_TAVERN_EVENT: readonly DialogueLine[] = [
  { speaker: null, text: 'グラスを拭いていたグレイヴの手が、止まった。' },
  { speaker: HERO, text: '遺跡の方で、何か起きてるらしい。' },
  { speaker: MASTER, text: '……遺跡だと？' },
  { speaker: HERO, text: '知ってるのか？' },
  { speaker: MASTER, text: 'まぁな。' },
  { speaker: MASTER, text: 'ずいぶん昔の話だ。' },
  { speaker: MASTER, text: 'もう、二十年になるか。' },
  { speaker: MASTER, text: '昔は、腕の立つ連中と組んで冒険者をやっててな。' },
  { speaker: MASTER, text: 'あの遺跡で、\nとんでもねぇ奴と戦ったことがある。' },
  { speaker: HERO, text: '魔物？' },
  { speaker: MASTER, text: `${SEKIRYUGA_NAME}。` },
  { speaker: MASTER, text: 'あの辺りじゃ、\n昔からそう呼ばれてた。' },
  { speaker: HERO, text: '倒したのか？' },
  { speaker: MASTER, text: '……いや。' },
  { speaker: HERO, text: '？' },
  { speaker: MASTER, text: '封印した。' },
  { speaker: HERO, text: 'そこまで危険なら、\nどうして倒さなかった？' },
  { speaker: null, text: '少し、間があった。' },
  { speaker: MASTER, text: '殺せなかったんじゃねぇ。' },
  { speaker: MASTER, text: '殺さなかった。' },
  { speaker: HERO, text: 'どういう意味だ？' },
  { speaker: MASTER, text: 'あいつはな。' },
  { speaker: MASTER, text: '俺たちと戦うまで、\n誰も殺してなかった。' },
  { speaker: HERO, text: 'じゃあ、なぜ戦った？' },
  { speaker: MASTER, text: '……それはまだいい。' },
  { speaker: MASTER, text: '問題は今だ。' },
  { speaker: MASTER, text: '最近の地鳴り。' },
  { speaker: MASTER, text: '山から下りてくる獣。' },
  { speaker: MASTER, text: '遺跡の石まで崩れ始めた。' },
  { speaker: MASTER, text: '嫌な感じがする。' },
  { speaker: HERO, text: '封印が？' },
  { speaker: MASTER, text: '解けかけてる可能性がある。' },
  { speaker: MASTER, text: '完全に解けりゃ、\nこの村だって無事じゃ済まねぇ。' },
  { speaker: HERO, text: 'もう一度封印すればいい。' },
  { speaker: MASTER, text: '昔と同じことはできねぇ。' },
  { speaker: HERO, text: 'なぜ？' },
  { speaker: MASTER, text: '当時の仲間は、\nもう全員ここにはいねぇ。' },
  { speaker: MASTER, text: '同じ術も使えねぇ。' },
  { speaker: MASTER, text: 'だからまず、\n本当に目覚めてるのか確認してきてくれ。' },
  { speaker: HERO, text: '俺たちが？' },
  { speaker: MASTER, text: '無理なら逃げろ。' },
  { speaker: MASTER, text: '死んで確かめる必要なんざねぇ。' },
  { speaker: MASTER, text: '……もし本当に目覚めてたら。' },
  { speaker: MASTER, text: 'その時はまた考える。' },
  { speaker: null, text: '古代遺跡へ行けるようになった。' },
];

/**
 * His ordinary talk while the ruins are open and the seal not yet looked
 * at: the greeting's last line ("nothing worth hearing tonight") would
 * contradict what he has just told — so, in the App only, it is this.
 */
export const TAVERN_AFTER_TOLD_LINE: DialogueLine = { speaker: MASTER, text: '遺跡のこと、無理はするなよ。' };

/**
 * THE TAVERN'S VISUAL HINT (§6) — a slot only. Something in the room
 * that says "he was not always only a barkeeper". No picture exists, so
 * `art` is null and nothing is drawn; the day one is delivered, filling
 * `art` is the whole change.
 */
export const TAVERN_PAST_HINT: { id: string; label: string; art: string | null } = {
  id: 'OLD_GREATSWORD',
  label: '古びた大剣',
  art: null,
};

// ---- 封印地点への接近 (§12) ----------------------------------------------

/**
 * ON THE WAY IN: something wrong, a little more each step, before anything
 * is seen. 「爪痕」 — not 「巨大な爪痕」: FORGE's canon makes it smallish,
 * and its menace is in what it does, not its size.
 */
export const SEKIRYUGA_APPROACH_SIGNS: readonly DialogueLine[] = [
  { speaker: null, text: '空気が少し重い。' },
  { speaker: null, text: '地面が、小さく震えた。' },
  { speaker: null, text: '奥から、何かが擦れる音がする。' },
  { speaker: null, text: '爪痕が石床に残っている。' },
];

/** Then she stops them. After these lines: a few seconds of quiet, and the low rumble. */
export const SEKIRYUGA_APPROACH_KAOS: readonly DialogueLine[] = [
  { speaker: KAOS, text: '……止まって。' },
  { speaker: HERO, text: 'どうした？' },
  { speaker: KAOS, text: 'いる。' },
  { speaker: HERO, text: `${SEKIRYUGA_NAME}？` },
  { speaker: KAOS, text: 'たぶん。' },
];

/** The entrance, under the name card. */
export const SEKIRYUGA_ENTRANCE_LINE = `${SEKIRYUGA_NAME}が、姿を現した。`;

// ---- 撃破後 (§16) ---------------------------------------------------------

/**
 * WHAT IS SEEN WHEN IT STOPS. Not a death: at nought it goes down on its
 * knees and stops — and then is not looking at them at all. Nothing is
 * explained, and it ends on the hero saying nothing.
 */
export const SEKIRYUGA_AFTERMATH: readonly DialogueLine[] = [
  { speaker: null, text: `${SEKIRYUGA_NAME}は膝をつき、動きを止めた。` },
  { speaker: HERO, text: '……終わった？' },
  { speaker: null, text: `${SEKIRYUGA_NAME}が、ふたたび身を起こした。` },
  { speaker: HERO, text: 'まだ来る！' },
  { speaker: null, text: `だが、${SEKIRYUGA_NAME}はこちらを見ていない。` },
  { speaker: null, text: '遺跡の、さらに奥を見ている。' },
  { speaker: KAOS, text: '……待って。' },
  { speaker: HERO, text: '？' },
  { speaker: KAOS, text: 'この子。' },
  { speaker: KAOS, text: '私たちを見てない。' },
  { speaker: HERO, text: 'じゃあ……何を？' },
  { speaker: KAOS, text: '奥。' },
  { speaker: null, text: '少しの間。' },
  { speaker: KAOS, text: 'ずっと、\nあっちを見てる。' },
  { speaker: HERO, text: '……。' },
];

// ---- 古代遺跡の「昔ここで誰かが戦った」痕跡 (§10) -------------------------

/**
 * Finds in the ruins that feel like a fight happened here once. Mixed in
 * with the ruins' ordinary finds; nobody is named — least of all the
 * tavern's master.
 */
export const RUINS_PAST_BATTLE_TRACES = [
  { id: 'SWORD_SCAR', label: '石柱の剣傷', text: '石柱に、深い剣傷が残っている。' },
  { id: 'OLD_METAL_SHARD', label: '古い金属片', text: '砕けた石のそばに、\n古い金属片が落ちている。' },
  { id: 'SCORCH_MARK', label: '焦げた跡', text: '壁に焦げた跡が残っている。' },
  { id: 'RUBBED_STONE', label: '擦れた平石', text: '誰かが座っていたように、\n平らな石だけが妙に擦れている。' },
  { id: 'BOOT_DENTS', label: '靴跡のような窪み', text: '古い靴跡のような窪みがある。' },
] as const;
