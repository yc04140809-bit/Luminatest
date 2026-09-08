// Asset manifest. Official art is imported so Vite fingerprints and
// caches it; everything not yet drawn or recorded stays null, and the UI
// falls back to a placeholder rather than breaking.

import kaosNormal from './characters/kaos/kaos-normal.webp';
import kaosSmile from './characters/kaos/kaos-smile.webp';
import galdReady from './characters/gald/gald-ready.png';
import galdDefeated from './characters/gald/gald-defeated.png';
import galdBaker from './characters/gald/gald-baker.webp';
import galdHealer from './characters/gald/gald-healer.webp';
import galdWorker from './characters/gald/gald-worker.webp';
import galdBattleDamage from './characters/gald/gald-battle-damage.png';
import galdBattleDown from './characters/gald/gald-battle-down.png';
import galdBattleIdle from './characters/gald/gald-battle-idle.png';
import heroBattleIdle from './characters/hero/hero-battle-idle.png';
import kaosBattleIdle from './characters/kaos/kaos-battle-idle.png';
import galdGrave from './events/event-gald-grave.webp';
import greenwoodForest from './backgrounds/location-greenwood-forest.webp';
import greenwoodField from './backgrounds/field-greenwood.png';
import aldenVillage from './backgrounds/location-alden-village.webp';
import aldenTavern from './backgrounds/location-alden-tavern.webp';
import titleKaosKeyVisual from './backgrounds/title-kaos-keyvisual.webp';

export type KaosExpression = 'normal' | 'smile';

/** Official Kaos portraits (from the project's own art). */
export const KAOS_PORTRAITS: Record<KaosExpression, string | null> = {
  normal: kaosNormal,
  smile: kaosSmile,
};

export function kaosPortrait(expression: KaosExpression = 'normal'): string | null {
  return KAOS_PORTRAITS[expression] ?? null;
}

/**
 * GALD, IN ONE PLACE — the checklist for redrawing him.
 *
 * Every picture of him the game can show, and what each one is for. He
 * is the character most likely to be redrawn as a set, and until this
 * table existed his files were named in three separate exports below,
 * so "replace Gald" meant finding all three and hoping.
 *
 * Replacing his design is: drop files with these names into
 * assets/characters/gald/ (and events/ for the last one). Nothing else
 * in the game names any of them — content/art/partyArt.ts maps these
 * onto art states, and every screen asks the art layer.
 *
 *   ready        gald-ready.png          standing, before the fight —
 *                                        his encounter / talk picture.
 *                                        TRANSPARENT
 *   defeated     gald-defeated.png       beaten, on one knee, still
 *                                        looking at you. The framed
 *                                        card the four answers are
 *                                        asked over. OPAQUE, on black,
 *                                        and meant to be
 *   battleDamage gald-battle-damage.png  the same moment, cut out, for
 *                                        the battlefield. TRANSPARENT
 *   battleIdle   gald-battle-idle.png    his fighting pose on the
 *                                        battlefield. TRANSPARENT, and
 *                                        used exactly as delivered
 *   battleDown   gald-battle-down.png    face down where the fight left
 *                                        him. TRANSPARENT. STILL THE
 *                                        OLD DESIGN — no replacement
 *                                        has been drawn for it yet
 *   baker        gald-baker.webp     ┐
 *   healer       gald-healer.webp    ├   three years on, one per
 *   worker       gald-worker.webp    ┘   surviving route
 *   graveEventCg event-gald-grave.webp    the KILL route, where there
 *                                        is no Gald left to draw
 *
 * WHICH OF THEM ARE CUT OUT, and why it matters: a battlefield figure
 * with a background baked into it cannot stand on the forest floor.
 * `battleIdle`, `ready` and `battleDown` are transparent and are the
 * ones drawn over the field and over a backdrop.
 *
 * `defeated` is NOT — deliberately. It is the framed card, where the
 * black it is drawn on IS the frame, and it is the best-looking of the
 * set there. The same moment cut out for the field is `battleDamage`,
 * a separate file, because a figure standing on ground has to be cut
 * out and a card does not. Two mattes of one drawing, each where it
 * belongs.
 *
 * WHAT IS STILL THE OLD MAN: `battleDown`, and the three lives —
 * baker, healer, worker. He was redesigned from the ground up, so those
 * four are a different person until they are redrawn.
 */
const GALD_FILES = {
  ready: galdReady,
  defeated: galdDefeated,
  baker: galdBaker,
  healer: galdHealer,
  worker: galdWorker,
  battleIdle: galdBattleIdle,
  battleDamage: galdBattleDamage,
  battleDown: galdBattleDown,
  graveEventCg: galdGrave,
} as const;

/**
 * Gald, the same man at several points of one life. 'defeated' means
 * beaten, NOT dead — whether he lives is the player's choice; the last
 * three are where each surviving route leaves him three years on. Same
 * CHARACTER, same id in the DB: only the visual state differs, and the
 * DB decides which one is true.
 */
export type GaldState = 'ready' | 'defeated' | 'baker' | 'healer' | 'worker';

export const GALD_PORTRAITS: Record<GaldState, string | null> = {
  ready: GALD_FILES.ready,
  defeated: GALD_FILES.defeated,
  baker: GALD_FILES.baker,
  healer: GALD_FILES.healer,
  worker: GALD_FILES.worker,
};

/**
 * Face down where the fight left him.
 *
 * A battlefield state rather than a stage of his life, so it is not one
 * of GALD_PORTRAITS above: 'defeated' is beaten and looking at you with
 * the question still open, and this is the moment before that.
 */
export const GALD_BATTLE_DOWN: string = GALD_FILES.battleDown;

/** The same man on one knee, cut out, for the field rather than a card. */
export const GALD_BATTLE_DAMAGE: string = GALD_FILES.battleDamage;

/**
 * THE THREE BATTLE FIGURES.
 *
 * Delivered as transparent PNGs, used exactly as delivered. Each one is
 * a whole person on a clear background, which is what a battlefield
 * needs and what the exploration sprites were standing in for until
 * these arrived.
 */
export const BATTLE_FIGURES = {
  hero: heroBattleIdle,
  kaos: kaosBattleIdle,
  gald: GALD_FILES.battleIdle,
} as const;

export function galdPortrait(state: GaldState): string | null {
  return GALD_PORTRAITS[state] ?? null;
}

/**
 * EVENT CG — art for a moment rather than for a person.
 *
 * The grave is the only one so far: on the KILL route there is no Gald to
 * draw, so the picture is of what the world kept. Adding a rare or
 * hand-drawn event later means one more entry here and one field on the
 * event's own definition — no new system.
 */
export const EVENT_CG = {
  GALD_GRAVE: GALD_FILES.graveEventCg,
} as const;

/**
 * Location backdrops, keyed by location id. content/locations/
 * locationVisuals.ts maps these onto places; screens go through that map
 * instead of importing an image directly.
 */
export const BACKGROUNDS = {
  ALDEN_VILLAGE: aldenVillage,
  ALDEN_TAVERN: aldenTavern,
  GREENWOOD_FOREST: greenwoodForest,
} as const;

/**
 * The forest as a field to walk across, rather than as a backdrop.
 *
 * A landscape painting of the same place with a clearing floor along
 * the bottom: the ground band in walkable.ts is measured against this,
 * which is why it is a separate entry and not a second use of the
 * backdrop above. The battle screen is unchanged and still uses
 * BACKGROUNDS.GREENWOOD_FOREST.
 */
export const FIELD_ART = {
  GREENWOOD_FOREST: greenwoodField,
} as const;

/** The Kaos key visual behind the title. Not a place: a cover image. */
export const TITLE_KEY_VISUAL: string = titleKaosKeyVisual;

/**
 * Audio slots. All null for now — no third-party audio is bundled.
 * AudioManager treats a null slot as silence, never as an error, so
 * dropping real files in later needs no code change beyond this map.
 */
export type BgmId = 'title' | 'forest' | 'battle' | 'bakery';
export type SeId = 'select' | 'memory' | 'timeshift' | 'reunion';

export const BGM_ASSETS: Record<BgmId, string | null> = {
  title: null,
  forest: null,
  battle: null,
  bakery: null,
};

/**
 * MUSIC — the pieces that are not room tone.
 *
 * The opening theme is not a BGM: it plays once, it does not loop, and
 * the game waits for it rather than the other way round. It gets its
 * own slot for that reason, and this line is the ONLY place its file
 * is named. Dropping the finished song in is:
 *
 *   1. put the file at src/assets/audio/music/opening-theme.mp3
 *   2. import it here and put it in this map
 *
 * and nothing else in the project changes — not the title screen, not
 * the player, not a test.
 */
export type MusicId = 'OPENING_THEME';

export const MUSIC_ASSETS: Record<MusicId, string | null> = {
  // No song yet. A null slot is silence, never an error: the opening
  // simply does not play and the game starts as it always has.
  OPENING_THEME: null,
};

export const SE_ASSETS: Record<SeId, string | null> = {
  select: null,
  memory: null,
  timeshift: null,
  reunion: null,
};
