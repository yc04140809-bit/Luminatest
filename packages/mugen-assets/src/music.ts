// THE MUSIC, ON ITS OWN.
//
// Split out of manifest.ts, which re-exports all of it. The reason is
// the App: importing the manifest makes the bundler emit every file it
// names, pictures included, and the App's audio player importing the
// manifest for four maps of music took the App build from 13 MB to
// 79 MB of which ~30 MB was artwork no screen of the App draws.
// `@mugen/assets/music` names the music and nothing else.

// THE MUSIC, AS DELIVERED. Byte-for-byte the files that were handed
// over: 48 kHz stereo, about 190 kbps, 16 minutes between them. The
// ordinary build ships exactly these. Only the single-file review
// artifact substitutes anything, and it substitutes SEPARATE copies
// that scripts/review-encode-assets.mjs writes elsewhere — these files
// are never rewritten, resampled or overwritten.
import bgmOpening from '../files/audio/bgm/opening.mp3';
import bgmKaosEvent from '../files/audio/bgm/kaos-event.mp3';
// alden-home.mp3 IS NOT IMPORTED, and stays in the folder. It is the
// same recording as title-main.mp3 — 「MUGEN ZERO タイトル画面」 —
// which was once registered as a village-home piece through a
// misunderstanding of the word "HOME". It belongs to the title. The
// house in Alden has no piece of its own by decision: it plays the
// village's (docs/BGM_MAP.md).
import bgmTitleMain from '../files/audio/bgm/title-main.mp3';
import bgmAldenVillage from '../files/audio/bgm/alden-village.mp3';
import bgmTavern from '../files/audio/bgm/tavern.mp3';
import bgmGreenwoodForest from '../files/audio/bgm/greenwood-forest.mp3';
import bgmNormalBattle from '../files/audio/bgm/normal-battle.mp3';
import bgmBossBattle from '../files/audio/bgm/boss-battle.mp3';

/**
 * THE SIX PIECES OF MUSIC THE GAME IS SCORED FOR.
 *
 * Named after the MOMENT rather than the file, because the mapping
 * from a screen to a piece is a decision about the game and belongs in
 * content/audio/sceneBgm.ts, not in a filename. Renaming a file must
 * never mean touching a screen.
 *
 * Every slot is null while no audio is bundled, and AudioManager
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
  /**
   * TITLE_SCREEN ONLY — the MUGEN ZERO logo and 「はじめる」.
   *
   * 「MUGEN ZERO タイトル画面」, written for that one screen. Not the
   * opening, not the village, not anywhere else: see docs/BGM_MAP.md.
   */
  | 'TITLE_MAIN'
  /** The monologue that opens the game, after the title. */
  | 'OPENING'
  /** Kaos, talking — the prologue introduction and the life choices. */
  | 'KAOS_EVENT'
  /**
   * ALDEN — the house, the village, the map, the shop, and every page
   * read while there (status, bag, book…). One piece for all of it, so
   * moving between them never restarts it.
   */
  | 'ALDEN_VILLAGE'
  /** 月光亭 — the one room in Alden with a different air. */
  | 'TAVERN'
  /** The greenwood, walked. */
  | 'GREENWOOD_FOREST'
  /** An ordinary fight: the forest's, and any other nobody wrote. */
  | 'NORMAL_BATTLE'
  /**
   * THE FIGHTS THAT ARE ABOUT SOMETHING — an event, and a boss.
   *
   * Gald's is the one the story turns on, and it is the only one
   * today. A fight that matters sounds different from a fight that
   * happens, and which fights those are is `FORCED_BATTLE_BGM`.
   */
  | 'BOSS_BATTLE';

export type SeId = 'select' | 'memory' | 'timeshift' | 'reunion';

export const BGM_ASSETS: Record<BgmId, string | null> = {
  TITLE_MAIN: bgmTitleMain,
  OPENING: bgmOpening,
  KAOS_EVENT: bgmKaosEvent,
  ALDEN_VILLAGE: bgmAldenVillage,
  TAVERN: bgmTavern,
  GREENWOOD_FOREST: bgmGreenwoodForest,
  NORMAL_BATTLE: bgmNormalBattle,
  BOSS_BATTLE: bgmBossBattle,
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
  /**
   * 「また、ここで。」 — the same file the OPENING room tone uses, in a
   * second slot on purpose.
   *
   * They are two different things done with one recording. As a BGM it
   * loops under a screen; as THE THEME it plays once, the game waits
   * for it, and there is a SKIP control because a song somebody has
   * already heard is a song they should be able to leave. The channel
   * decides which of the two is happening, not the file.
   */
  OPENING_THEME: bgmOpening,
};

export const SE_ASSETS: Record<SeId, string | null> = {
  select: null,
  memory: null,
  timeshift: null,
  reunion: null,
};
