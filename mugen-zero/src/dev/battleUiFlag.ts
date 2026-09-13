// Which battle screen a fight in the forest uses.
//
// A FALLBACK, and no longer a preview. It used to route the one fight
// that had been allowed to try the new screen; the new screen is now
// the game's battle screen, the story's own fight is on it, and this
// decides only whether a FOREST fight is drawn the older way instead.
//
// That door is worth keeping for a while — the old screen is the thing
// the new one is judged against, and a comparison needs both halves —
// but it is a developer's door and nothing in the game opens it. The
// story's fight does not ask: there is nothing on the other side of
// this flag for it to be, because the branches that knew who Gald was
// left BattleScreen when he did.

import { DEV_ADMIN_ENABLED } from './devMode';

const UI_KEY = 'mugen-battle-ui';
const FINISHABLE_KEY = 'mugen-battle-start-finishable';

export type BattleUiChoice = 'OLD' | 'PROTOTYPE';

/**
 * What a forest fight shows when nobody has chosen otherwise.
 *
 * No longer the whole story — setting this to 'OLD' now returns only
 * the FOREST fight to the older screen, because the story's fight has
 * no such branch any more. It is here so a developer comparing the two
 * does not have to reach for DEV ADMIN on every reload.
 */
const PREVIEW_DEFAULT: BattleUiChoice = 'PROTOTYPE';

/** Which battle UI the forest fight should use. */
export function battleUi(): BattleUiChoice {
  try {
    const stored = localStorage.getItem(UI_KEY);
    if (stored === 'OLD' || stored === 'PROTOTYPE') return stored;
  } catch {
    /* blocked storage: the default stands */
  }
  return PREVIEW_DEFAULT;
}

/** Both choices are stored, so 'OLD' is a decision rather than an absence. */
export function setBattleUi(choice: BattleUiChoice): void {
  write(UI_KEY, choice);
}

/**
 * Start the fight with the creature already beatable, so the moment the
 * commands turn into the four answers can be looked at without playing
 * a whole battle first. A debug aid, so it stays behind the dev gate.
 */
export function startFinishable(): boolean {
  if (!DEV_ADMIN_ENABLED) return false;
  try {
    return localStorage.getItem(FINISHABLE_KEY) === 'ON';
  } catch {
    return false;
  }
}

export function setStartFinishable(on: boolean): void {
  write(FINISHABLE_KEY, on ? 'ON' : null);
}

function write(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* blocked storage: the choice simply does not persist */
  }
}

const OPPONENT_KEY = 'mugen-battle-preview-opponent';

/** Who the DEV ADMIN battle preview puts on the other side of the field. */
export type PreviewOpponent = 'MOSS_RABBIT' | 'GALD';

/**
 * Which of them the preview shows.
 *
 * The forest fight is always the creature; this is the battle PREVIEW
 * only, and it exists because the fight the whole slice is built to
 * arrive at is against a man. A battle screen judged only against a
 * rabbit has not been judged: he is twice the height, he is drawn
 * facing across the field, and his plate has to hold 「盗賊 ガルド」
 * rather than four kana.
 */
export function previewOpponent(): PreviewOpponent {
  if (!DEV_ADMIN_ENABLED) return 'MOSS_RABBIT';
  try {
    return localStorage.getItem(OPPONENT_KEY) === 'GALD' ? 'GALD' : 'MOSS_RABBIT';
  } catch {
    return 'MOSS_RABBIT';
  }
}

export function setPreviewOpponent(who: PreviewOpponent): void {
  write(OPPONENT_KEY, who === 'GALD' ? 'GALD' : null);
}
