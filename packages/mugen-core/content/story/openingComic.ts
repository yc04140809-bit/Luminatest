// 触る漫画形式のオープニング — THE OPENING, PAGE BY PAGE (作者指示 2026-10-16,
// 「MUGEN ZERO PROJECT／オープニング実装指示書」).
//
// Not a film: still pictures, one TAP one page, with only the noise, the
// power going off and the glimpse of who that was running by themselves.
//
//   comic → something wrong → fear and loss → dark → comic again → a man,
//   only seen → out into Alden — 「また、ここで。」
//
// THE WORDS ARE IN THE PICTURES. Every page's lines are drawn into its
// image (as delivered), so the screen shows no words of its own; `lines`
// below is the record of what each page says, for the tests and for
// whoever changes a picture. Nothing explains: not her past, not the
// machine angel, not whose hand that was, not the man. Pages, order and
// words are the author's; change them only on the author's word.
//
// Each step names its picture by key; the files are the App's
// (mugen-app/src/assets/openingArt.ts → mugen-assets/files/opening/), so a
// picture is replaced by replacing its file.

/** How a step behaves. */
export type OpeningKind =
  /** A page: waits for a TAP. */
  | 'PAGE'
  /** A burst of noise: shown for `ms`, then on by itself (never waits). */
  | 'NOISE'
  /** A page held for `minMs` before a TAP takes it on (the last despair). */
  | 'HOLD'
  /** The set switching off: a white line across black, gone; then silence for `ms`. */
  | 'POWER_OFF'
  /** The page with the three answers drawn in: a TAP on one of them. */
  | 'CHOICE'
  /** A glimpse: shown for `ms` on black, then on by itself. */
  | 'GLIMPSE';

/** What the music does from this step on. */
export type OpeningMusic =
  /** Her piece, as it opens. */
  | 'PLAY'
  /** Turned down (the flashes; 「じゃ。」). */
  | 'DIM'
  /** Gone — the power off; quiet until RESUME. */
  | 'STOP'
  /** Back, full (the funny face; Alden). */
  | 'RESUME';

/** A sound on entering a step. */
export type OpeningSound = 'NOISE' | 'POWER_OFF';

export const OPENING_IMAGES = [
  'op_01_intro_comic',
  'op_02_warning_comic',
  'op_03_sorejaa',
  'op_04_noise',
  'op_05a_hatena',
  'op_05_doushitano',
  'op_06_jitsuwane',
  'op_06_noise',
  'op_flash_01_smile',
  'op_flash_01b_doushitano',
  'op_flash_01b_noise',
  'op_flash_02_hold_hand',
  'op_flash_02_noise',
  'op_flash_03_release_hand',
  'op_flash_03_noise',
  'op_flash_04_ruins',
  'op_flash_04_noise',
  'op_flash_05_machine_angel',
  'op_flash_06_stand',
  'op_flash_06_noise',
  'op_flash_07_cry',
  'op_flash_07_cry_closeup',
  'op_poweroff_black',
  'op_funny_face',
  'op_reaction_comic',
  'op_choice_comic',
  'op_jaa',
  'op_gardo_preview',
  'op_itterasshai',
  'op_mata_kokode',
] as const;
export type OpeningImage = (typeof OPENING_IMAGES)[number];

/** A rectangle on a picture, as shares of its width and height. */
export interface OpeningArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OpeningStep {
  /** The scene of the author's script it belongs to. */
  scene: string;
  kind: OpeningKind;
  image: OpeningImage;
  /** The picture's own size (it is drawn whole, its own shape). */
  size: { w: number; h: number };
  /** NOISE / GLIMPSE / POWER_OFF: how long before it goes on. HOLD: how long before a TAP is taken. */
  ms?: number;
  /** Drawn into the picture — the record, not shown by the screen. */
  lines: readonly string[];
  music?: OpeningMusic;
  sound?: OpeningSound;
  /** 「TAP」 at the foot of the page (off where the moment should be clear of it). */
  tapHint?: boolean;
}

/** The three answers on the choice page, where each is drawn (op_choice_comic, 1672×941). */
export const OPENING_CHOICES: readonly { id: 'WHAT' | 'CRYING' | 'FACE'; label: string; area: OpeningArea }[] = [
  { id: 'WHAT', label: '今のなに？', area: { x: 0.048, y: 0.63, w: 0.3, h: 0.09 } },
  { id: 'CRYING', label: '泣いてた？', area: { x: 0.048, y: 0.725, w: 0.3, h: 0.089 } },
  { id: 'FACE', label: '変顔すごいね', area: { x: 0.048, y: 0.816, w: 0.3, h: 0.089 } },
];

/**
 * The choice page's two right-hand panels — SCENE12 (the straight face,
 * 「…………。」) and SCENE13 (「……なんてね♪」) — kept dark until an answer is
 * given, then shown one after the other (the first for `OPENING_STRAIGHT_FACE_MS`).
 */
export const OPENING_CHOICE_PANELS: readonly OpeningArea[] = [
  { x: 0.573, y: 0, w: 0.427, h: 0.527 },
  { x: 0.573, y: 0.527, w: 0.427, h: 0.473 },
];
export const OPENING_STRAIGHT_FACE_MS = 600;

/** One TAP, one step: taps closer together than this are not taken. */
export const OPENING_TAP_LOCK_MS = 200;

const WIDE = { w: 1672, h: 941 } as const;
const page = (scene: string, image: OpeningImage, lines: readonly string[] = [], more: Partial<OpeningStep> = {}): OpeningStep => ({
  scene,
  kind: 'PAGE',
  image,
  size: WIDE,
  lines,
  tapHint: true,
  ...more,
});
const noise = (scene: string, image: OpeningImage, more: Partial<OpeningStep> = {}): OpeningStep => ({
  scene,
  kind: 'NOISE',
  image,
  size: WIDE,
  ms: 160,
  lines: [],
  sound: 'NOISE',
  ...more,
});
/** A memory in the rush: a page, its TAP not prompted. */
const flash = (scene: string, image: OpeningImage): OpeningStep => page(scene, image, [], { tapHint: false });

/** THE OPENING, in order (the author's 正本). */
export const OPENING_STEPS: readonly OpeningStep[] = [
  // SCENE 01 — the first Kaos (three panels).
  page('SCENE01', 'op_01_intro_comic', ['……あ！', '起きた？', '遅いぞ〜？'], { size: { w: 1933, h: 814 }, music: 'PLAY' }),
  // SCENE 02 — a warning, taken as a joke (it is not).
  page('SCENE02', 'op_02_warning_comic', ['あ、そうそう。', '連打は後悔するよ？', 'たぶん♪'], { size: { w: 1671, h: 941 } }),
  // SCENE 03.
  page('SCENE03', 'op_03_sorejaa', ['それじゃあ…']),
  // SCENE 04 — the first wrongness: noise, on by itself.
  noise('SCENE04', 'op_04_noise'),
  // SCENE 05 — as if nothing happened (does she know?).
  page('SCENE05', 'op_05a_hatena', [], { size: { w: 1670, h: 941 } }),
  page('SCENE05', 'op_05_doushitano', ['ん？', 'どうしたの？'], { size: { w: 1671, h: 941 } }),
  // SCENE 06 — she goes on.
  page('SCENE06', 'op_06_jitsuwane', ['じつはね…']),
  // SCENE 07 — the rush: noise, a memory, noise, the next… (the music thins).
  noise('SCENE07', 'op_06_noise', { size: { w: 1670, h: 941 }, music: 'DIM' }),
  flash('FLASH01', 'op_flash_01_smile'),
  page('SCENE07', 'op_flash_01b_doushitano', ['どうしたの？'], { tapHint: false }),
  noise('SCENE07', 'op_flash_01b_noise'),
  flash('FLASH02', 'op_flash_02_hold_hand'),
  noise('FLASH02', 'op_flash_02_noise'),
  flash('FLASH03', 'op_flash_03_release_hand'),
  noise('FLASH03', 'op_flash_03_noise'),
  flash('FLASH04', 'op_flash_04_ruins'),
  noise('FLASH04', 'op_flash_04_noise'),
  flash('FLASH05', 'op_flash_05_machine_angel'),
  flash('FLASH06', 'op_flash_06_stand'),
  noise('FLASH06', 'op_flash_06_noise'),
  // FLASH 07 — the last despair, held longer than the rest.
  flash('FLASH07', 'op_flash_07_cry'),
  { scene: 'FLASH07', kind: 'HOLD', image: 'op_flash_07_cry_closeup', size: WIDE, ms: 1500, lines: [] },
  // SCENE 08 — プツン: the set switches off; black; silence.
  { scene: 'SCENE08', kind: 'POWER_OFF', image: 'op_poweroff_black', size: WIDE, ms: 800, lines: [], music: 'STOP', sound: 'POWER_OFF' },
  // SCENE 09 — out of the dark, a face pulled at you.
  page('SCENE09', 'op_funny_face', [], { music: 'RESUME' }),
  // SCENE 10 — her reaction to yours (three panels).
  page('SCENE10', 'op_reaction_comic', ['…………。', 'つまんない反応だな〜', 'もうちょっと驚いてくれてもいいのに。']),
  // SCENE 11–13 — the player answers; a straight face for a moment; 「……なんてね♪」.
  { scene: 'SCENE11', kind: 'CHOICE', image: 'op_choice_comic', size: WIDE, lines: ['今のなに？', '泣いてた？', '変顔すごいね', '…………。', '……なんてね♪'] },
  // SCENE 14 — 「じゃ。」 on black (the music let down a moment).
  page('SCENE14', 'op_jaa', ['じゃ。'], { music: 'DIM', tapHint: false }),
  // SCENE 15 — a man. No name, no word. On by himself.
  { scene: 'SCENE15', kind: 'GLIMPSE', image: 'op_gardo_preview', size: { w: 1122, h: 1402 }, ms: 1000, lines: [] },
  // SCENE 16 — Alden, bright; she sends you off.
  page('SCENE16', 'op_itterasshai', ['行ってらっしゃい♪'], { music: 'RESUME', size: { w: 1672, h: 941 } }),
  // SCENE 17 — and the last word, which the theme song is named for.
  page('SCENE17', 'op_mata_kokode', ['また、ここで。'], { size: { w: 1671, h: 941 } }),
];

/** Kept once the opening has been seen to its end (readMarks; no new save field). */
export const OPENING_COMIC_MARK = 'event:OPENING_COMIC';
