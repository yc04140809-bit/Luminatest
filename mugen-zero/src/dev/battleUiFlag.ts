// Which battle screen a fight in the forest uses.
//
// PREVIEW ROUTING, not adoption. The prototype is what a forest fight
// shows by default right now, so that it can be judged on a phone — the
// only way to answer "is this the right direction" is to hold it. The
// old screen is untouched, still built, and still one line from being
// the default again: change PREVIEW_DEFAULT below, or choose it in DEV
// ADMIN where that is available.
//
// Nothing else routes through this. The story's own fight never asks.

import { DEV_ADMIN_ENABLED } from './devMode';

const UI_KEY = 'mugen-battle-ui';
const FINISHABLE_KEY = 'mugen-battle-start-finishable';

export type BattleUiChoice = 'OLD' | 'PROTOTYPE';

/**
 * What a forest fight shows when nobody has chosen otherwise.
 *
 * This one constant is the whole of the preview: setting it back to
 * 'OLD' returns every build to the screen that shipped before, with no
 * other change anywhere.
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
