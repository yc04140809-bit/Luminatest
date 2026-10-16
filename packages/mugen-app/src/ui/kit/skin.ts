/**
 * UI 素材の受け皿 — WHERE A DELIVERED LOOK GOES (作者 2026-10-16).
 *
 * The look of the shared parts is not designed here: it is delivered as
 * images (ChatGPT 側で確定デザイン準拠の素材を用意) and dropped into
 * mugen-assets/files/ui/skin/ as `<part>.<state>.png`. Each is drawn as a
 * 9-slice frame (corners kept, edges and middle stretched), so a part
 * grows with its words — never the words cut to fit the part.
 *
 * Until a part's images arrive it is drawn with a plain stand-in (kit.css),
 * deliberately unfinished: nothing here is the final look.
 *
 * WHAT A PART KNOWS: how much of its picture's edge must not stretch
 * (`slice`, in the picture's pixels), how wide that edge is drawn on
 * screen (`edge`, CSS px), the room between the edge and the words
 * (`padX`, `padY`) and its least height. Set these when the images come.
 */

export const KIT_PARTS_LIST = [
  'menuButton',
  'placeLabel',
  'talkPanelHead',
  'talkPanel',
  'objective',
  'panel',
  'listRow',
  'backButton',
  'confirmButton',
] as const;
export type KitPart = (typeof KIT_PARTS_LIST)[number];

export const KIT_STATES = ['normal', 'hover', 'active', 'disabled', 'selected'] as const;
export type KitState = (typeof KIT_STATES)[number];

export interface KitInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface KitPartSpec {
  /** The picture's corners/edges that keep their size (its pixels). */
  slice: KitInsets;
  /** How wide that edge is drawn (CSS px). Defaults to `slice` × `scale`. */
  edge?: KitInsets;
  /** Picture pixels → CSS px for the edge (default 0.5: pictures made at 2×). */
  scale?: number;
  /** The words' colour on this part (a light picture wants dark words); selected may differ. */
  fg?: string;
  fgSelected?: string;
  /**
   * A band the picture draws along its foot (talkPanelHead: the name plate), its height in the
   * picture's pixels — kept whole as the slice's bottom; a name goes in it.
   */
  band?: number;
  /** Room between the edge and the words. */
  padX: number;
  padY: number;
  /** The least height (CSS px) — a tap target, never a cap on the words. */
  minHeight: number;
}

const ins = (top: number, side: number): KitInsets => ({ top, right: side, bottom: top, left: side });

/**
 * Per part, set from the delivered sheet (ui-sheet-v1, 2026-10-16: mugen-assets/files/ui/skin/source/):
 * `slice` is how much of each cut picture's edge is its frame (kept), `scale` how large that frame is
 * drawn. A part with no picture yet falls back to the plain stand-in with the same room and height.
 */
export const KIT_PARTS: Readonly<Record<KitPart, KitPartSpec>> = {
  menuButton: { slice: ins(48, 76), scale: 0.22, padX: 2, padY: 2, minHeight: 46 },
  placeLabel: { slice: ins(26, 62), scale: 0.24, padX: 2, padY: 0, minHeight: 24 },
  // 左会話パネル, in two (作者 2026-10-16: 人物と文章で半々): the head — the picture's top with its
  // light area stretched for the person and its band kept for the name — and the body under it.
  talkPanelHead: { slice: { top: 90, right: 60, bottom: 77, left: 60 }, scale: 0.42, padX: 0, padY: 0, minHeight: 90, band: 77 },
  talkPanel: { slice: { top: 8, right: 60, bottom: 90, left: 60 }, scale: 0.42, padX: 6, padY: 4, minHeight: 80, fg: '#1d2448' },
  objective: { slice: ins(40, 50), scale: 0.3, padX: 6, padY: 2, minHeight: 36 },
  panel: { slice: ins(44, 70), scale: 0.3, padX: 6, padY: 2, minHeight: 40 },
  listRow: { slice: ins(20, 44), scale: 0.45, padX: 4, padY: 4, minHeight: 40, fg: '#1d2448', fgSelected: '#ffffff' },
  backButton: { slice: ins(32, 64), scale: 0.35, padX: 4, padY: 2, minHeight: 36 },
  confirmButton: { slice: ins(32, 64), scale: 0.35, padX: 4, padY: 2, minHeight: 40 },
};

/** The delivered pictures: part → state → URL. */
export type KitImages = Partial<Record<KitPart, Partial<Record<KitState, string>>>>;

/** `menuButton.hover.png` → ['menuButton', 'hover']; anything else → null (ignored, as the sound folder does). */
export function kitFileKey(fileName: string): [KitPart, KitState] | null {
  const m = /^([A-Za-z]+)\.([a-z]+)\.(png|webp)$/.exec(fileName);
  if (!m) return null;
  const part = m[1] as KitPart;
  const state = m[2] as KitState;
  if (!KIT_PARTS_LIST.includes(part) || !KIT_STATES.includes(state)) return null;
  return [part, state];
}

/** Files (path → URL) as a folder read gives them → the pictures by part and state. */
export function kitImagesFrom(files: Record<string, string>): KitImages {
  const out: KitImages = {};
  for (const [path, url] of Object.entries(files)) {
    const key = kitFileKey(path.split('/').pop() ?? '');
    if (!key) continue;
    (out[key[0]] ??= {})[key[1]] = url;
  }
  return out;
}

const px = (n: number) => `${n}px`;
const insetsPx = (i: KitInsets) => `${px(i.top)} ${px(i.right)} ${px(i.bottom)} ${px(i.left)}`;

/**
 * What a part's element carries for kit.css: its pictures (one per state,
 * each falling back to `normal`) and its measures, as CSS variables.
 * `skinned` is whether it has a picture at all (else the stand-in is drawn).
 */
export function kitStyle(part: KitPart, images: KitImages): { skinned: boolean; vars: Record<string, string> } {
  const spec = KIT_PARTS[part];
  const pics = images[part] ?? {};
  const k = spec.scale ?? 0.5;
  const edge = spec.edge ?? {
    top: Math.round(spec.slice.top * k),
    right: Math.round(spec.slice.right * k),
    bottom: Math.round(spec.slice.bottom * k),
    left: Math.round(spec.slice.left * k),
  };
  const vars: Record<string, string> = {
    '--kit-pad-x': px(spec.padX),
    '--kit-pad-y': px(spec.padY),
    '--kit-min-h': px(spec.minHeight),
  };
  const normal = pics.normal;
  if (normal) {
    vars['--kit-slice'] = `${spec.slice.top} ${spec.slice.right} ${spec.slice.bottom} ${spec.slice.left}`;
    vars['--kit-edge'] = insetsPx(edge);
    if (spec.fg) vars['--kit-fg'] = spec.fg;
    if (spec.band) vars['--kit-band-h'] = px(Math.round(spec.band * k));
    vars['--kit-edge-t'] = px(edge.top);
    vars['--kit-edge-r'] = px(edge.right);
    vars['--kit-edge-l'] = px(edge.left);
    if (spec.fgSelected) vars['--kit-fg-selected'] = spec.fgSelected;
    for (const state of KIT_STATES) vars[`--kit-img-${state}`] = `url("${pics[state] ?? normal}")`;
  }
  // Disabled with no picture of its own: the usual one, dimmed.
  vars['--kit-disabled-opacity'] = pics.disabled ? '1' : '0.5';
  return { skinned: !!normal, vars };
}
