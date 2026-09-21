// HOW SOMEBODY LOOKS — kept apart from what they are and what they can do.
//
// TWO THINGS WITH DIFFERENT LIFETIMES, and that is the whole reason
// this file exists rather than four more fields on `BattleProfile`.
//
//   CharacterData      who they are and how they fight. Canon. Changes
//                      when the story changes, which is almost never.
//   CharacterAppearance which picture is drawn for them right now.
//                      Changes when there are clothes to change into,
//                      and — one day — when a player chooses.
//
// A screen redesign must not force an art change, and an art change
// must not force a screen redesign. Fold them together and every new
// outfit is a migration through every screen that draws a person.
//
// NOTHING HERE IS SAVED. `selectedSkinId` is the one field that would
// ever belong in a save, and it is `null` for everybody because
// choosing is not implemented and the SAVE schema is deliberately
// untouched. See `docs/STATUS_SCREEN.md` for the migration sketch.

/**
 * Every picture a skin can supply. A key, never a path.
 *
 * TWO KINDS OF PICTURE OF THE SAME PERSON, and they are not
 * interchangeable:
 *
 *   statusVisual    A FINISHED RECTANGLE. Background painted in, no
 *                   transparency needed, made for the status screen and
 *                   for nothing else. This is where the screen's
 *                   richness comes from — the scene behind them is art,
 *                   not CSS pretending to be art.
 *   statusPortrait  A CUT-OUT MASTER. Transparent, one shared canvas,
 *                   one shared baseline (docs/PORTRAIT_MASTER.md). This
 *                   is where reuse comes from: skins, expressions, and
 *                   whatever screen wants a figure next.
 *
 * A character may have either, both, or only a master. The screen
 * prefers the finished rectangle and falls back to the cut-out, so
 * neither kind blocks the other from arriving.
 */
export interface SkinAssetRefs {
  /** The finished rectangle for the status screen. Background included. */
  statusVisual?: string;
  /** The transparent standing master. See PORTRAIT_MASTER.md. */
  statusPortrait: string;
  /** Face differences. Only what exists is listed in a definition. */
  normal?: string;
  angry?: string;
  sad?: string;
  /** In a fight, casting, and the one big flourish. */
  battle?: string;
  skill?: string;
  cutIn?: string;
}

/**
 * What a skin IS. Lives in the build, never in a save.
 *
 * NO NUMBERS. Not one field here affects HP, attack, the weapon type
 * or anything else that decides a fight: the moment a skin can carry a
 * stat, changing clothes becomes a way to get stronger, and the game
 * stops being the one we are making. A skin changes the picture and
 * nothing else.
 */
export interface SkinDefinition {
  skinId: string;
  characterId: string;
  displayName: string;
  assetRefs: SkinAssetRefs;
  /** What kind of thing it is for distribution — NOT whether it is owned. */
  availability: 'DEFAULT' | 'UNRELEASED';
  /** Bumped when the art behind an unchanged id is replaced. */
  version: number;
}

/**
 * Which skin a character is wearing.
 *
 * `defaultSkinId` is the build's answer and `selectedSkinId` is the
 * player's. Null means they have not chosen, which is everybody today.
 */
export interface CharacterAppearance {
  characterId: string;
  defaultSkinId: string;
  selectedSkinId: string | null;
}

export const SKIN_DEFINITIONS: Record<string, SkinDefinition> = {
  'hero/default': {
    skinId: 'hero/default',
    characterId: 'hero',
    displayName: '既定',
    assetRefs: { statusPortrait: 'hero' },
    availability: 'DEFAULT',
    version: 1,
  },
  'kaos/default': {
    skinId: 'kaos/default',
    characterId: 'kaos',
    displayName: '既定',
    assetRefs: { statusVisual: 'kaos', statusPortrait: 'kaos' },
    availability: 'DEFAULT',
    version: 1,
  },
};

export const CHARACTER_APPEARANCES: Record<string, CharacterAppearance> = {
  hero: { characterId: 'hero', defaultSkinId: 'hero/default', selectedSkinId: null },
  kaos: { characterId: 'kaos', defaultSkinId: 'kaos/default', selectedSkinId: null },
};

export function appearanceOf(characterId: string): CharacterAppearance | null {
  return CHARACTER_APPEARANCES[characterId] ?? null;
}

/**
 * The skin actually in force: what was chosen, else the default.
 *
 * A CHOSEN SKIN THAT NO LONGER EXISTS FALLS BACK rather than throwing.
 * A build that dropped an outfit must not cost somebody the screen —
 * and because the choice is only read here, it survives in the save
 * and comes back if the skin does.
 */
export function skinOf(characterId: string): SkinDefinition | null {
  const appearance = appearanceOf(characterId);
  if (!appearance) return null;
  const chosen = appearance.selectedSkinId
    ? SKIN_DEFINITIONS[appearance.selectedSkinId]
    : undefined;
  return chosen ?? SKIN_DEFINITIONS[appearance.defaultSkinId] ?? null;
}

/** The transparent standing master for somebody, or null. */
export function statusPortraitKeyOf(characterId: string): string | null {
  return skinOf(characterId)?.assetRefs.statusPortrait ?? null;
}

/** The finished status-screen rectangle for somebody, or null. */
export function statusVisualKeyOf(characterId: string): string | null {
  return skinOf(characterId)?.assetRefs.statusVisual ?? null;
}

/**
 * What the status screen should actually draw, and which kind it is.
 *
 * The finished rectangle when there is one, the cut-out master
 * otherwise. The KIND matters to the screen, because a rectangle with
 * its own background is framed as a picture and a cut-out figure is
 * stood on the floor — so the answer says which, rather than leaving
 * the screen to guess from the file.
 */
export function statusArtOf(
  characterId: string,
): { key: string; kind: 'VISUAL' | 'PORTRAIT' } | null {
  const visual = statusVisualKeyOf(characterId);
  if (visual) return { key: visual, kind: 'VISUAL' };
  const portrait = statusPortraitKeyOf(characterId);
  return portrait ? { key: portrait, kind: 'PORTRAIT' } : null;
}
