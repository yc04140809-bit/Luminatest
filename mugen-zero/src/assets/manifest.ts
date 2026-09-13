// Asset manifest. Official art is imported so Vite fingerprints and
// caches it; everything not yet drawn or recorded stays null, and the UI
// falls back to a placeholder rather than breaking.

import kaosNormal from './characters/kaos/kaos-normal.webp';
import kaosSmile from './characters/kaos/kaos-smile.webp';
import galdReady from './characters/gald/gald-ready.png';
import galdDefeated from './characters/gald/gald-defeated.png';
import galdBaker from './characters/gald/gald-baker.png';
import galdHealer from './characters/gald/gald-healer.png';
import galdWorker from './characters/gald/gald-worker.png';
import galdBattleDamage from './characters/gald/gald-battle-damage.png';
import galdBattleDown from './characters/gald/gald-battle-down.png';
import galdBattleIdle from './characters/gald/gald-battle-idle.png';
import linaFullbody from './characters/lina/lina-fullbody.png';
import bakeryOwnerFullbody from './characters/bakery-owner/bakery-owner-fullbody.png';
import heroBattleIdle from './characters/hero/hero-battle-idle.png';
import kaosBattleIdle from './characters/kaos/kaos-battle-idle.png';
import galdGrave from './events/event-gald-grave.webp';
import greenwoodForest from './backgrounds/location-greenwood-forest.webp';
import greenwoodField from './backgrounds/field-greenwood.png';
import aldenVillage from './backgrounds/location-alden-village.webp';
import aldenTavern from './backgrounds/location-alden-tavern.webp';
import titleKaosKeyVisual from './backgrounds/title-kaos-keyvisual.webp';
import battleUiAutoOn from './ui/battle/chip-auto-on.png';
import battleUiAutoOff from './ui/battle/chip-auto-off.png';
import battleUiSpeedOn from './ui/battle/chip-x2-on.png';
import battleUiSpeedOff from './ui/battle/chip-x2-off.png';
import battleUiEscapeOn from './ui/battle/chip-escape-on.png';
import battleUiEscapeOff from './ui/battle/chip-escape-off.png';
import battleUiCommandDiamond from './ui/battle/command-diamond.png';
import battleUiTurnSlot from './ui/battle/turn-slot.png';
import battleUiTurnNext from './ui/battle/turn-next.png';
import battleUiPartyCard from './ui/battle/party-card.png';
import battleUiEnemyPlate from './ui/battle/enemy-plate.png';
import battleUiMessageWindow from './ui/battle/message-window.png';
import battleUiMemoryPanel from './ui/battle/memory-panel.png';
import battleUiMemoryStar from './ui/battle/memory-star.png';
import battleUiBarRail from './ui/battle/bar-rail.png';
import battleUiBarHp from './ui/battle/bar-hp.png';
import battleUiBarMp from './ui/battle/bar-mp.png';
import battleUiBarAlt from './ui/battle/bar-alt.png';

/**
 * THE PEOPLE OF ALDEN, as delivered.
 *
 * One standing figure each, transparent, used exactly as it came — no
 * crop, no recolour, no regeneration. Both were delivered alongside
 * reference sheets, and the sheets are NOT here on purpose: a reference
 * sheet is for checking that a later drawing is still the same person,
 * and anything written on one (ages, dreams, lines of dialogue) is the
 * image generator talking, not canon. What is canon is in
 * `src/content/characters/`.
 */
export const ALDEN_FIGURES = {
  /** リナ — the baker's daughter, with the morning's basket. */
  lina: linaFullbody,
  /** パン屋の主人 — her father, in his apron. */
  bakeryOwner: bakeryOwnerFullbody,
} as const;

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
 *   baker        gald-baker.png      ┐   three years on, one per
 *   healer       gald-healer.png     ├   surviving route. Event CGs:
 *   worker       gald-worker.png     ┘   whole scenes with their own
 *                                        light and their own signage,
 *                                        so opaque is right for them
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
 * WHAT IS STILL THE OLD MAN: `battleDown` alone. Everything else here
 * is the redesign — met, fought, beaten, and living each of the three
 * lives the player can leave him in.
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
 * THE SIX PIECES OF MUSIC THE GAME IS SCORED FOR.
 *
 * Named after the MOMENT rather than the file, because the mapping
 * from a screen to a piece is a decision about the game and belongs in
 * content/audio/sceneBgm.ts, not in a filename. Renaming a file must
 * never mean touching a screen.
 *
 * All six slots are null while no audio is bundled, and AudioManager
 * treats a null slot as SILENCE rather than as an error: every screen
 * asks for its music exactly as it will when the files are here, the
 * asking is real, and the game is simply quiet. Dropping the finished
 * music in is, per track:
 *
 *   1. put the file at src/assets/audio/bgm/<name>.mp3
 *   2. import it at the top of this file
 *   3. put it in the map below
 *
 * and nothing else in the project changes — not a screen, not the
 * player, not a test.
 */
export type BgmId =
  /** Title, and the monologue that opens the game. */
  | 'OPENING'
  /** Kaos, talking — the prologue introduction and the life choices. */
  | 'KAOS_EVENT'
  /** Alden, and every room of it the player reads in. */
  | 'ALDEN_VILLAGE'
  /** 月光亭 — the one room in Alden with a different air. */
  | 'TAVERN'
  /** The greenwood, walked. */
  | 'GREENWOOD_FOREST'
  /** A fight. Every fight: the story's and the forest's alike. */
  | 'NORMAL_BATTLE';

export type SeId = 'select' | 'memory' | 'timeshift' | 'reunion';

export const BGM_ASSETS: Record<BgmId, string | null> = {
  OPENING: null,
  KAOS_EVENT: null,
  ALDEN_VILLAGE: null,
  TAVERN: null,
  GREENWOOD_FOREST: null,
  NORMAL_BATTLE: null,
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

/**
 * THE BATTLE UI, as delivered.
 *
 * Cut from the BATTLE UI ASSET PACK v0.1 sheets. Each entry is one
 * piece of that pack lifted out at its own aspect ratio and scaled
 * down — nothing is redrawn, recoloured or recomposed, and nothing is
 * stretched out of shape at the point of use: frames are nine-sliced so
 * their ornaments keep their proportions, and meters are REVEALED
 * rather than squashed.
 *
 * Provenance is in src/assets/ui/battle/README.md, with the source
 * sheet and the exact rectangle each piece came from.
 */
export const BATTLE_UI = {
  /** AUTO / ×2 / 逃走, in the two states the pack draws them in. */
  autoOn: battleUiAutoOn,
  autoOff: battleUiAutoOff,
  speedOn: battleUiSpeedOn,
  speedOff: battleUiSpeedOff,
  escapeOn: battleUiEscapeOn,
  escapeOff: battleUiEscapeOff,
  /** The command plate — one diamond, the label goes on top. */
  commandDiamond: battleUiCommandDiamond,
  /** A turn order portrait frame, and the mark that points at the next. */
  turnSlot: battleUiTurnSlot,
  turnNext: battleUiTurnNext,
  /** The three frames: a party member, the creature, and what is said. */
  partyCard: battleUiPartyCard,
  enemyPlate: battleUiEnemyPlate,
  messageWindow: battleUiMessageWindow,
  /** WORLD MEMORY's own panel, and the star it is headed with. */
  memoryPanel: battleUiMemoryPanel,
  memoryStar: battleUiMemoryStar,
  /** And the meters, cap to cap. */
  barRail: battleUiBarRail,
  barHp: battleUiBarHp,
  barMp: battleUiBarMp,
  barAlt: battleUiBarAlt,
} as const;
