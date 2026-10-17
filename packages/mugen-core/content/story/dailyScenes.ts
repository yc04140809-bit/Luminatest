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
import type { LifeChoiceId } from '../../core/flow/types';
import type { MemoryEventType } from '../../core/memory/types';
import { ALDEN_EXPERIENCE_EVENTS } from '../experience/aldenExperience';
import { HERO_SPEAKER } from './sekiryugaArc';

/** Where one happens: the village as they come back, or in place of someone's ordinary word. */
export type DailyScenePlace = 'VILLAGE' | 'BAKERY_LINA' | 'BAKERY_OWNER' | 'TAVERN' | 'SHOP';

export interface DailySceneLine extends DialogueLine {
  /** The speaker's face on this line (ミレイ in the shop; リゼル, バルド in the village); absent, their ordinary one. */
  face?: NpcExpression;
}

export type DailySceneId =
  | 'KAOS_DETOUR'
  | 'LINA_BURNT_BREAD'
  | 'OWNER_KILN'
  | 'GRAVE_GREATSWORD'
  | 'MIREI_TRAVELERS'
  | 'KAOS_SKY'
  | 'BALDO_FIRST_MEETING'
  | 'RIZEL_WOODEN_SWORD'
  | 'RIZEL_FIRST_AID'
  | 'RIZEL_ON_GALD_KILL'
  | 'RIZEL_ON_GALD_SPARE'
  | 'RIZEL_ON_GALD_HELP'
  | 'RIZEL_ON_GALD_CAPTURE'
  | 'FUUMIMI_AFTER_KILL'
  | 'FUUMIMI_AFTER_SPARE'
  | 'FUUMIMI_AFTER_HELP'
  | 'FUUMIMI_AFTER_CAPTURE'
  | 'LINA_AFTER_THE_FOREST_EDGE'
  | 'RIZEL_SAW_THE_FOREST_EDGE'
  | 'OWNER_ON_THE_NEW_HAND'
  | 'LINA_LETTER_TO_ELNA';

export interface DailyScene {
  id: DailySceneId;
  place: DailyScenePlace;
  /** ALDEN INCIDENT's phase it waits for (0: from the start of the everyday after セキリュウガ). */
  from: IncidentPhase;
  lines: readonly DailySceneLine[];
  /** The talk-spot event it is taken from, when it is not new. */
  takenFrom?: string;
  /** Only once this one has been seen (someone met before they speak again). */
  after?: DailySceneId;
  /** Only in a world where Gald was answered this way. */
  gald?: LifeChoiceId;
  /** Only once フウミミ was answered this way — and not on the day it was. */
  fuumimi?: LifeChoiceId;
  /**
   * Only once this has happened in the world (WORLD TRUTH) — somebody telling
   * the player about something that happened where they were not
   * (OFF-SCREEN LIFE, content/events/offScreenLife.ts).
   */
  truth?: MemoryEventType;
  /** What the player comes to know from it, read to its end (PLAYER KNOWLEDGE fact ids). */
  reveals?: readonly string[];
}

const KAOS = 'ケイオス';
const LINA = 'リナ';
const OWNER = '主人';
const MIREI = 'ミレイ';
const RIZEL = 'リゼル';
const BALDO = 'バルド';

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
  // ---- フウミミ (FORGE MON-000002 / IND-43452DFD): what follows each answer ----
  // News brought back by the hunter, a day or more after. Each answer is
  // followed by something different — what became of the small one, where
  // they are, whether it fears people — and none says which was right.
  ...(
    [
      [
        'KILL',
        [
          { speaker: '猟師', text: '森の入口でな、翅のある小さいのが、ひとりでうろついてた。' },
          { speaker: '猟師', text: '親とはぐれたのかね。……ああいうのは、長くはもたねぇ。' },
          { speaker: KAOS, text: '……。' },
        ],
      ],
      [
        'SPARE',
        [
          { speaker: '猟師', text: '森の奥で、翅のある生き物を二匹見たぞ。' },
          { speaker: '猟師', text: 'こっちに気づいたら、小さい方を隠すようにして、もっと奥へ行っちまった。' },
          { speaker: KAOS, text: '……ちゃんと、隠してるんだね。' },
        ],
      ],
      [
        'HELP',
        [
          { speaker: '猟師', text: '森の入口に、変わった生き物が居ついてるらしい。' },
          { speaker: '猟師', text: '人を見ても逃げねぇんだと。妙な話だ。' },
          { speaker: KAOS, text: '……人を、怖がってないのかな。' },
        ],
      ],
      [
        'CAPTURE',
        [
          { speaker: '猟師', text: 'この前の生き物な、街から来た商人が買っていったよ。' },
          { speaker: '猟師', text: '都市の方じゃ、ああいうのが高く売れるらしい。もとはそっちの生き物だとさ。' },
          { speaker: KAOS, text: '……小さい方は？' },
          { speaker: '猟師', text: 'さあな。森に残ったんじゃねぇか。' },
        ],
      ],
    ] as const
  ).map(
    ([choice, said]): DailyScene => ({
      id: `FUUMIMI_AFTER_${choice}`,
      place: 'VILLAGE',
      from: 0,
      fuumimi: choice,
      lines: [
        { speaker: null, text: '森から戻った猟師が、井戸のそばで足を止めた。' },
        ...said,
        { speaker: null, text: '猟師はそれだけ言うと、獲物を担ぎ直して家の方へ歩いていった。' },
      ],
    }),
  ),
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
  // ---- リゼル（FORGE HUM-000001, 2026-10-10 作者判断）----
  // A young woman of the village who wants to be someone who can protect
  // people, and swings a wooden sword badly. Two ordinary scenes, and one
  // that answers what was done about Gald — from her own values (she will
  // not forgive a crime; she forgives people quickly; she distrusts those
  // in power), never as the right answer. Nothing here tells her of the
  // magic and healing she has in her and does not know about.
  {
    id: 'RIZEL_WOODEN_SWORD',
    place: 'VILLAGE',
    from: 0,
    lines: [
      { speaker: null, text: '村はずれで、誰かが木剣を振っている。' },
      { speaker: null, text: '振るたびに、剣先が少しずつぶれていく。' },
      { speaker: '？？？', text: '……。' },
      { speaker: '？？？', text: '……笑わないでよ。' },
      { speaker: HERO_SPEAKER, text: '笑ってない。' },
      { speaker: '？？？', text: '私だって、誰かを守れるくらいにはなりたいの。' },
      { speaker: HERO_SPEAKER, text: '……名前は？' },
      { speaker: RIZEL, text: 'リゼル。……覚えなくていい。' },
      { speaker: KAOS, text: '……ねえ、その手――' },
      { speaker: KAOS, text: 'ううん。なんでもない♪' },
    ],
  },
  ...(
    [
      [
        'KILL',
        [
          { speaker: RIZEL, text: '森の盗賊……もういないんだって。' },
          { speaker: RIZEL, text: '許せない人だった。それは、変わらない。' },
          { speaker: RIZEL, text: '……なのに、すっきりしないの。どうしてだろ。', face: 'SAD' },
        ],
      ],
      [
        'SPARE',
        [
          { speaker: RIZEL, text: '森の盗賊、見逃したって聞いた。' },
          { speaker: RIZEL, text: '私は、ああいうのは許せない。どこかで誰かが泣いてるはずだから。' },
          { speaker: RIZEL, text: '……でも、あなたがそうしたなら、何か理由があったんでしょ。' },
        ],
      ],
      [
        'HELP',
        [
          { speaker: RIZEL, text: '盗賊の手当てをしたって、本当？', face: 'AMAZED' },
          { speaker: RIZEL, text: '私なら、しない。……たぶん。' },
          { speaker: RIZEL, text: '怪我してる人を見たら体が動いちゃうのは、分からなくもないけど。' },
        ],
      ],
      [
        'CAPTURE',
        [
          { speaker: RIZEL, text: '盗賊、衛兵に引き渡したんだ。' },
          { speaker: RIZEL, text: '罪は、償うべきだと思う。' },
          { speaker: RIZEL, text: 'でも……あの人たちがちゃんと裁くかは、分からない。偉い人って、そういうところがあるから。', face: 'SAD' },
        ],
      ],
    ] as const
  ).map(
    ([choice, said]): DailyScene => ({
      id: `RIZEL_ON_GALD_${choice}`,
      place: 'VILLAGE',
      from: 0,
      after: 'RIZEL_WOODEN_SWORD',
      gald: choice,
      lines: [
        { speaker: null, text: '井戸のそばで、リゼルが水桶を下ろした。' },
        ...said,
        { speaker: null, text: 'リゼルはそれ以上何も言わずに、桶を担ぎ直して行った。' },
      ],
    }),
  ),
  {
    id: 'RIZEL_FIRST_AID',
    place: 'VILLAGE',
    from: 1,
    after: 'RIZEL_WOODEN_SWORD',
    lines: [
      { speaker: null, text: '坂の下で、子どもが膝をすりむいて泣いている。' },
      { speaker: null, text: 'リゼルが黙ってしゃがみ、布を巻いていく。' },
      { speaker: '子ども', text: '……リゼル姉ちゃん、手当てだけは上手いよな。' },
      { speaker: RIZEL, text: 'だけ、は余計。', face: 'HAPPY' },
      { speaker: null, text: '巻き終えた布は、驚くほどきれいだった。' },
    ],
  },
  // ---- 第1章終盤の伏線（2026-10-12）— ケイオスが一度だけ空を見る ----
  // アリアとレヴィのことを、名前を出さずに。予兆が明確になってから、リゼル
  // の場面のあと。説明はしない。
  {
    id: 'KAOS_SKY',
    place: 'VILLAGE',
    from: 2,
    after: 'RIZEL_FIRST_AID',
    lines: [
      { speaker: null, text: 'ケイオスが、足を止めて空を見ている。' },
      { speaker: '{HERO}', text: 'どうした？' },
      { speaker: KAOS, text: '……あの子たち、元気かな。', kaosFace: 'TROUBLED' },
      { speaker: '{HERO}', text: 'あの子たち？' },
      { speaker: KAOS, text: 'ううん。なんでもない♪', kaosFace: 'SMILE' },
    ],
  },
  // ---- バルド（作者 NPC CHARACTER PROFILE Ver.1.0, 2026-10-16; docs/BALDO.md）----
  // The merchant house's son, リゼル's classmate: light words over the
  // feeling of having no gift for the trade he is to inherit, and envy of
  // someone who has a thing to be lost in. First met teasing her practice,
  // once リゼル is known. LAST in the list on purpose: it takes a day no
  // other village scene wants, so nothing already here moves.
  // NOT YET (作者判断 2026-10-16): his gift for the sword (HIDDEN SEED) —
  // nobody here sees it or hints at it — エルナ, the raid.
  {
    id: 'BALDO_FIRST_MEETING',
    place: 'VILLAGE',
    from: 0,
    after: 'RIZEL_WOODEN_SWORD',
    lines: [
      { speaker: null, text: '村はずれでリゼルが木剣を振っていると、仕立てのいい服の青年が通りかかった。' },
      { speaker: '？？？', text: 'おやおや。夜中だけじゃなく、昼間もやってるのか。' },
      { speaker: RIZEL, text: '……バルド。見物なら、よそでやって。' },
      { speaker: BALDO, text: 'まさか。剣じゃ腹はふくれないぞって、親切に教えてやってるんだ。', face: 'SMILE_EYES_CLOSED' },
      { speaker: BALDO, text: '……で、そっちは？ 商会のバルドだ。用があるなら、親父に言ってくれ。' },
      { speaker: RIZEL, text: '跡取りでしょ。自分で売ればいいのに。' },
      { speaker: BALDO, text: '……うるさいな。', face: 'ANGRY' },
      { speaker: null, text: 'バルドは肩をすくめて戻っていった。一度だけ、リゼルの木剣を振り返って。' },
      { speaker: KAOS, text: '……素直じゃないね、あの人。' },
      { speaker: RIZEL, text: '昔からああなの。……気にしないで。' },
    ],
  },
  // ---- パン屋ルート — what happened while the player was elsewhere ----
  // (OFF-SCREEN LIFE PoC, 作者 2026-10-17; content/events/offScreenLife.ts)
  // The player was not at the forest edge, nor at the bakery's table. These
  // are people telling them afterwards, each only in a world where it really
  // happened (`truth`), and only in one where Gald was bandaged (`gald`).
  // THE ONE EXCEPTION TO リナ'S RULE (docs/GALD_FIVE_ROUTES.md 実装方針): her
  // ordinary scenes above never touch Gald; these two are separate scenes,
  // only on this route, and neither says what she will become. バルド is in
  // none of them. LAST in the list, so nothing already here moves.
  {
    id: 'LINA_AFTER_THE_FOREST_EDGE',
    place: 'BAKERY_LINA',
    from: 0,
    gald: 'HELP',
    truth: 'GALD_SAVES_LINA',
    reveals: ['GALD_SAVED_LINA'],
    lines: [
      { speaker: null, text: 'リナの腕に、白い布が巻かれている。' },
      { speaker: LINA, text: 'あ……これ？ たいしたことないの。' },
      { speaker: LINA, text: 'この前の夕方ね、お父さんに頼まれて、森の入口までコケモモを摘みに行ったの。' },
      { speaker: LINA, text: 'そしたら茂みから魔物が出てきて……もう駄目だって思った。' },
      { speaker: LINA, text: 'でも、知らない男の人が前に立ってくれたの。体じゅう包帯だらけだったのに。' },
      { speaker: HERO_SPEAKER, text: '……包帯だらけ？' },
      { speaker: LINA, text: 'うん。その人の方がずっとひどい怪我だったのに、「下がってろ」って。' },
      { speaker: KAOS, text: '……包帯、ね。' },
      { speaker: LINA, text: 'ちゃんとお礼、言えてないんだ。……言いたいな。' },
    ],
  },
  {
    id: 'RIZEL_SAW_THE_FOREST_EDGE',
    place: 'VILLAGE',
    from: 0,
    gald: 'HELP',
    after: 'RIZEL_ON_GALD_HELP',
    truth: 'RIZEL_TENDS_GALD',
    reveals: ['GALD_SAVED_LINA', 'RIZEL_TENDED_GALD'],
    lines: [
      { speaker: null, text: '井戸のそばで、リゼルが自分の手のひらを見ている。' },
      { speaker: RIZEL, text: '……ねえ。森の盗賊。あなたが手当てした人。' },
      { speaker: RIZEL, text: 'あの人、まだこの辺りにいたの。森の入口でリナが魔物に襲われたとき――' },
      { speaker: RIZEL, text: '傷だらけのまま、リナの前に立ってた。私、薬草を採りに行ってて……全部、見てたの。' },
      { speaker: RIZEL, text: '開いた傷、私が縛った。……盗賊の手当てなんてしないって、言ったのにね。', face: 'SAD' },
      { speaker: RIZEL, text: '許したわけじゃない。でも……私、あの人の何を知ってたんだろう。' },
      { speaker: null, text: 'リゼルは桶を持ち上げかけて、もう一度だけ森の方を見た。' },
    ],
  },
  {
    id: 'OWNER_ON_THE_NEW_HAND',
    place: 'BAKERY_OWNER',
    from: 0,
    gald: 'HELP',
    truth: 'GALD_TAKES_BAKERY_WORK',
    reveals: ['GALD_STOLE_FOR_ELNA', 'GALD_WORKS_AT_BAKERY'],
    lines: [
      { speaker: null, text: '店の奥で、大柄な男が黙々と粉袋を運んでいる。主人が、それを顎で示した。' },
      { speaker: OWNER, text: '……あいつか。娘の恩人だ。' },
      { speaker: OWNER, text: '妹がいるんだとさ。エルナっていう、リナと同い年の。重い病で、薬代がいる。' },
      { speaker: OWNER, text: 'それで森で、人の物を盗んでた。……本人がそう言った。言い訳はしなかったよ。' },
      { speaker: OWNER, text: '治療費を全部出してやれるほど、うちは裕福じゃねぇ。だが、ここで働くなら給金は多めに出す。そう言ったら――' },
      { speaker: OWNER, text: '少し黙って、それから「やる」とだけ言った。' },
      { speaker: KAOS, text: '……自分で、決めたんだね。' },
      { speaker: OWNER, text: '村の連中の目は、まだ冷てぇがな。それは、あいつが自分で背負うもんだ。' },
    ],
  },
  {
    id: 'LINA_LETTER_TO_ELNA',
    place: 'BAKERY_LINA',
    from: 0,
    gald: 'HELP',
    after: 'LINA_AFTER_THE_FOREST_EDGE',
    truth: 'LINA_WRITES_TO_ELNA',
    reveals: ['LINA_WROTE_TO_ELNA'],
    lines: [
      { speaker: null, text: 'リナが、封をした手紙を胸に抱えている。' },
      { speaker: LINA, text: 'これね、エルナって子に書いたの。会ったこと、ないんだけど。' },
      { speaker: LINA, text: '店の奥の人の妹さん。私と同い年なんだって。' },
      { speaker: LINA, text: 'ずっと寝てるって聞いたから……少しでも、楽しいこと書けたらなって。' },
      { speaker: HERO_SPEAKER, text: '何を書いたんだ？' },
      { speaker: LINA, text: 'ないしょ！ ……パンの話とか、村の話とか。' },
      { speaker: LINA, text: '返事、来るといいな。' },
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
  /** What was decided about Gald (null: nothing yet). */
  galdChoice?: LifeChoiceId | null;
  /** What was decided about フウミミ, and on which day (absolute), if anything. */
  fuumimi?: { choice: LifeChoiceId; day: number } | null;
  /** Whether this has happened in the world (WORLD TRUTH); absent, nothing off screen has. */
  isTrue?: (type: MemoryEventType) => boolean;
}

/** The scene that happens here now, if any: after セキリュウガ, one a day, each once. */
export function dailySceneAt(place: DailyScenePlace, facts: DailySceneFacts): DailyScene | null {
  if (facts.stage !== 'SETTLED') return null;
  if (facts.lastDay === facts.day) return null;
  return (
    DAILY_SCENES.find(
      (s) =>
        s.place === place &&
        s.from <= facts.phase &&
        !facts.isRead(dailySceneMark(s.id)) &&
        (!s.after || facts.isRead(dailySceneMark(s.after))) &&
        (!s.gald || s.gald === (facts.galdChoice ?? null)) &&
        (!s.fuumimi || (facts.fuumimi?.choice === s.fuumimi && facts.day > facts.fuumimi.day)) &&
        (!s.truth || facts.isTrue?.(s.truth) === true),
    ) ?? null
  );
}
