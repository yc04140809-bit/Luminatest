// THE SOUNDS A MOMENT MAKES.
//
// Named after the MOMENT, never after the file or the waveform —
// 'ui_confirm' rather than 'beep2' — for the same reason the music is:
// which sound belongs to a moment is a decision about the game, and a
// screen that says `playSfx('ui_confirm')` keeps saying the right thing
// after somebody replaces the file.
//
// EVERY SLOT IS EMPTY, and that is the shipping state until sounds are
// delivered. A null slot is SILENCE, never an error and never a
// placeholder: the asking is real from the first day, so the day the
// files arrive nothing but this map changes. A stand-in beep would be
// worse than silence — nobody can tell a placeholder from a choice.

/**
 * Every sound the game can ask for.
 *
 * Grouped by where it happens, because that is how they are
 * commissioned and how a missing one is noticed.
 */
export type SfxId =
  // ---- UI: things the player does to the game itself ----
  | 'ui_confirm'
  | 'ui_cancel'
  | 'ui_menu_open'
  | 'ui_menu_close'
  | 'ui_tap'
  | 'ui_memory_open'
  // ---- EXPLORATION: the forest answering back ----
  | 'explore_found'
  | 'explore_event_start'
  | 'explore_encounter'
  | 'explore_marker'
  // ---- BATTLE ----
  | 'battle_start'
  | 'battle_swing'
  | 'battle_slash_hit'
  | 'battle_magic_cast'
  | 'battle_magic_hit'
  | 'battle_hurt'
  | 'battle_heal'
  | 'battle_buff'
  | 'battle_debuff'
  | 'battle_critical'
  | 'battle_victory'
  // ---- STORY: the moments the game is actually about ----
  | 'story_choice'
  | 'story_event'
  | 'story_memory_written';

/**
 * The file for each, or null while nobody has drawn that sound yet.
 *
 * Adding one is: put the file in src/assets/audio/sfx, import it at
 * the top of assets/manifest.ts, and name it here. Nothing else in the
 * project changes — no screen, no manager, no test.
 */
export const SFX_ASSETS: Record<SfxId, string | null> = {
  ui_confirm: null,
  ui_cancel: null,
  ui_menu_open: null,
  ui_menu_close: null,
  ui_tap: null,
  ui_memory_open: null,
  explore_found: null,
  explore_event_start: null,
  explore_encounter: null,
  explore_marker: null,
  battle_start: null,
  battle_swing: null,
  battle_slash_hit: null,
  battle_magic_cast: null,
  battle_magic_hit: null,
  battle_hurt: null,
  battle_heal: null,
  battle_buff: null,
  battle_debuff: null,
  battle_critical: null,
  battle_victory: null,
  story_choice: null,
  story_event: null,
  story_memory_written: null,
};

/**
 * The shortest gap between two of the same sound.
 *
 * A fight at twice speed asks for the same blow twice as often, and an
 * effect fired on every one of them is a machine-gun rather than a
 * sword. This is not a queue and not a fade: the second one inside the
 * window simply does not play, which is what the ear wants — it heard
 * the first one.
 */
export const SFX_RETRIGGER_MS = 60;

/**
 * How loud each one is, relative to the SFX slider.
 *
 * Here rather than baked into the files, so a sound that comes back
 * from its author two decibels hot is a number in this table and not a
 * re-export. Anything not named is 1.
 */
export const SFX_GAIN: Partial<Record<SfxId, number>> = {
  // The two that fire most often in a fight, and the two that would
  // wear a player out first.
  battle_swing: 0.7,
  ui_tap: 0.6,
};
