// CHARACTER ART — one place that answers "which picture of this one?".
//
// Every drawn character in MUGEN ZERO is going to arrive as a growing
// pile of files: standing, attacking, hurt, lying down, a portrait for
// the book, a sheet for the field. Screens must not know any of those
// filenames. They ask for a character and a state, and get back either
// the right picture, the nearest one that exists, or an honest "there
// is nothing here yet" — never a broken image and never a guess drawn
// in CSS.
//
// The layer is deliberately thin. It resolves; it does not animate, it
// does not preload, and it holds no state. Everything about WHEN a
// creature is in its attack pose belongs to the battle, not here.

/**
 * Where the drawing actually is inside its file.
 *
 * Official art arrives with whatever transparent margin it was exported
 * with, and the game must not repaint a pixel of it — so instead of
 * trimming the file, each entry says which box of it is the character.
 * Absent means the whole file is the drawing.
 */
export interface ArtBox {
  fileW: number;
  fileH: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArtAsset {
  src: string;
  box?: ArtBox;
  /**
   * And which box of it is their FACE, for somewhere that wants a head
   * rather than a person: a turn order, a party card, a talking plate.
   *
   * Optional, and its absence is handled rather than a gap: a drawing
   * with no face box is cropped to its top third by the rule in the art
   * layer, which is nearly right for a standing figure and visibly
   * approximate for anything else. Writing one down is what turns a
   * head-and-shoulders guess into a portrait, and it costs six numbers.
   */
  face?: ArtBox;
  /**
   * Which way the drawing faces in the file.
   *
   * The battlefield faces enemies right (they look at the party) and the
   * party left (they look at the enemy). A drawing that already faces
   * the other way is flipped when it is drawn — the file is never
   * edited, and nothing else in the game has to remember which of the
   * two it was.
   */
  facing?: 'left' | 'right';
}

/**
 * The states an enemy can be seen in.
 *
 * Ten, taken as given rather than designed here: the point of the list
 * is that it is fixed, so a new creature's folder has known names and
 * adding one is filling in a form rather than inventing a scheme.
 */
export type EnemyArtState =
  | 'front'
  | 'side'
  | 'back'
  | 'idle'
  | 'attack'
  | 'run'
  | 'damage'
  | 'down'
  | 'portrait'
  | 'sheet';

/**
 * The same, for anybody who is drawn as a person: the party, and the
 * people the party meets and sometimes fights.
 *
 * There is no separate list for "the Gald you fight" and "the Gald you
 * talk to". A close-up in a conversation is a WAY OF SHOWING a picture,
 * not a category of picture, and the moment those become two characters
 * they need keeping in step forever.
 */
export type PartyArtState =
  | 'battle_idle'
  | 'battle_attack'
  | 'battle_damage'
  | 'battle_skill_1'
  | 'battle_skill_2'
  | 'battle_down'
  | 'talk'
  | 'portrait'
  | 'fullbody'
  | 'cutin'
  | 'sheet';

/**
 * What to show instead, when the asked-for state has not been drawn.
 *
 * Ordered worst-last: something standing still is a better stand-in for
 * something attacking than a portrait is, and a sheet is better than
 * nothing. The asked-for state is always tried first and is not
 * repeated, so these are only ever the alternatives.
 */
export const ENEMY_FALLBACK: readonly EnemyArtState[] = ['idle', 'side', 'front', 'sheet'];
export const PARTY_FALLBACK: readonly PartyArtState[] = ['battle_idle', 'fullbody', 'portrait'];

/**
 * What to show in a conversation when there is no talking picture.
 *
 * A different chain from the battlefield's, and that is the point: a
 * mid-swing battle pose is a bad stand-in for somebody speaking to you,
 * and a portrait is a bad stand-in for somebody standing on a
 * battlefield. Falling back to a whole figure and showing the top of it
 * is what "a close-up is a way of showing, not a kind of picture" means
 * in practice.
 */
export const TALK_FALLBACK: readonly PartyArtState[] = ['fullbody', 'portrait', 'battle_idle'];

/** Which chain a request belongs to. */
export function partyChainFor(state: PartyArtState): readonly PartyArtState[] {
  return state === 'talk' || state === 'portrait' || state === 'cutin'
    ? TALK_FALLBACK
    : PARTY_FALLBACK;
}

/** One character's pictures. Every state is optional, on purpose. */
export interface ArtSet<S extends string> {
  id: string;
  /** For the report that says what is still missing. */
  label: string;
  states: Partial<Record<S, ArtAsset>>;
}

/**
 * The answer to "which picture?".
 *
 * It always says what actually happened, because a screen that quietly
 * draws a standing creature where an attacking one was asked for is a
 * screen nobody can tell is missing art.
 */
export interface ResolvedArt<S extends string> {
  /** Null only when the character has no pictures at all. */
  asset: ArtAsset | null;
  /** The state that was found. Null when nothing was. */
  state: S | null;
  /** True when the state asked for was not the state found. */
  substituted: boolean;
  /** True when nothing was found and a placeholder belongs there. */
  placeholder: boolean;
}

/**
 * The order this request will look in: the state asked for, then the
 * chain, with the asked-for state never tried twice.
 */
export function lookupOrder<S extends string>(wanted: S, chain: readonly S[]): S[] {
  return [wanted, ...chain.filter((s) => s !== wanted)];
}

/** The general resolver. The two below are what callers actually use. */
export function resolveArt<S extends string>(
  set: ArtSet<S> | undefined,
  wanted: S,
  chain: readonly S[],
): ResolvedArt<S> {
  const missing: ResolvedArt<S> = {
    asset: null,
    state: null,
    substituted: false,
    placeholder: true,
  };
  if (!set) return missing;
  for (const state of lookupOrder(wanted, chain)) {
    const asset = set.states[state];
    if (asset) {
      return { asset, state, substituted: state !== wanted, placeholder: false };
    }
  }
  return missing;
}

/** Which of a set's states have actually been drawn, in list order. */
export function statesPresent<S extends string>(set: ArtSet<S>, all: readonly S[]): S[] {
  return all.filter((state) => set.states[state] !== undefined);
}

/** And which have not — the list a report of missing art is built from. */
export function statesMissing<S extends string>(set: ArtSet<S>, all: readonly S[]): S[] {
  return all.filter((state) => set.states[state] === undefined);
}
