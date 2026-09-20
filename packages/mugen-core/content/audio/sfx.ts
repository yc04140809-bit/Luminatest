// THE SOUNDS A MOMENT MAKES.
//
// Named after the MOMENT, never after the file or the waveform —
// 'ui_confirm' rather than 'beep2' — for the same reason the music is:
// which sound belongs to a moment is a decision about the game, and a
// screen that says `playSfx('ui_confirm')` keeps saying the right thing
// after somebody replaces the file.
//
// NO SOUND IS BUNDLED YET, and that is the shipping state until they
// are delivered. A missing sound is SILENCE, never an error and never
// a placeholder: the asking is real from the first day, so the day the
// files arrive NOTHING IN THE PROJECT CHANGES AT ALL. A stand-in beep
// would be worse than silence — nobody can tell a placeholder from a
// choice.
//
// WHERE A SOUND GOES: packages/mugen-assets/files/audio/se/<id>.mp3,
// named after the id below and nothing else. The assets package reads
// that folder itself, so a delivered file is wired by being put there.
// This file holds the VOCABULARY — which moments the game can make a
// noise about — and never a path.

/**
 * Every sound the game can ask for.
 *
 * Grouped by where it happens, because that is how they are
 * commissioned and how a missing one is noticed.
 */
/**
 * Every sound the game can ask for — ONE LIST, and the type is read
 * from it rather than written twice.
 *
 * Grouped by where it happens, because that is how they are
 * commissioned and how a missing one is noticed. A list rather than a
 * bare union because the tests, and the assets package's check that no
 * delivered file is misnamed, both need to READ the vocabulary at
 * runtime; a union exists only at compile time and cannot be read.
 */
export const SFX_IDS = [
  // ---- UI: things the player does to the game itself ----
  'ui_decide',
  'ui_cancel',
  'ui_menu_open',
  'ui_menu_close',
  'ui_tap',
  'ui_memory_open',
  // ---- EXPLORATION: the forest answering back ----
  'explore_found',
  'explore_event_start',
  'explore_encounter',
  'explore_marker',
  // ---- BATTLE ----
  'battle_start',
  // ONE PER WEAPON, not one per character. Two people holding long
  // swords share a swing; which of these a turn asks for is decided by
  // what is in the attacker's hands — see content/audio/weaponSfx.ts.
  'battle_attack_slash',
  'battle_attack_dagger',
  'battle_attack_thrust',
  'battle_attack_bow',
  'battle_hit',
  'magic_cast',
  'battle_magic_hit',
  'battle_damage',
  'battle_guard',
  'battle_heal',
  'battle_buff',
  'battle_debuff',
  'battle_critical',
  'battle_win',
  // ---- STORY: the moments the game is actually about ----
  'story_choice',
  'story_event',
  'story_memory_written',
] as const;

export type SfxId = (typeof SFX_IDS)[number];

/**
 * WHICH SOUNDS ARE PRIMED BEFORE THE FIRST ONE IS NEEDED.
 *
 * A fight is the one place where a sound arriving late is worse than
 * no sound: the swing is drawn on the frame the noise belongs to, and
 * a first-play decode lands it after the blow. These are built and
 * loaded on the player's first touch, while nothing is happening yet,
 * so the first swing of the first fight is as prompt as the tenth.
 *
 * Deliberately NOT everything. Priming a sound is holding a decoded
 * buffer for a moment that may never come, and the UI's own noises are
 * short, rare, and nobody notices ten milliseconds on a menu.
 */
export const SFX_PRELOAD: readonly SfxId[] = [
  'battle_attack_slash',
  'battle_hit',
  'battle_damage',
  'battle_guard',
  'magic_cast',
];

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
  battle_attack_slash: 0.7,
  // A pair of daggers is two strikes where a sword is one, so the same
  // slider leaves it louder than the swing it replaces.
  battle_attack_dagger: 0.6,
  battle_attack_thrust: 0.7,
  battle_attack_bow: 0.7,
  ui_tap: 0.6,
};
