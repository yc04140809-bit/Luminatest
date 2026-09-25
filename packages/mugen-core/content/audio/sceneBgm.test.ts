import { describe, expect, it } from 'vitest';
import { bgmForScene, type SceneCue } from './sceneBgm';
import { BGM_ASSETS } from '@mugen/assets';
import type { Screen } from '../../core/flow/types';
import { DEFAULT_BATTLE_BGM } from './battleBgm';

const at = (screen: Screen, rest: Partial<SceneCue> = {}): SceneCue => ({
  screen,
  locationId: null,
  ...rest,
});

/**
 * WHAT IS PLAYING, AND WHY.
 *
 * The music is the one part of the game a player cannot look at to
 * check. A screen with the wrong picture is reported in a minute; a
 * screen with the wrong music is felt as "something is off about this
 * game" and never named. So the mapping is a pure function and this is
 * what holds it to what was actually asked for.
 */
describe('the seven scenes, by name', () => {
  /**
   * SILENT BEFORE THE TITLE, AND ITS OWN PIECE ON IT.
   *
   * The screen that ASKS about the song stays silent — its whole
   * subject is a song that has not started. TITLE_SCREEN, the logo
   * and 「はじめる」, plays TITLE_MAIN: the piece written for it.
   */
  it('says nothing before the title, and the title piece on it', () => {
    expect(bgmForScene(at('THEME_CHOICE'))).toBeNull();
    expect(bgmForScene(at('TITLE'))).toBe('TITLE_MAIN');
  });

  /**
   * TITLE_MAIN BELONGS TO THE TITLE AND NOWHERE ELSE — the confusion
   * this pins down is the title's piece turning up in the house.
   */
  it('plays the title piece on the title only', () => {
    const screens: Screen[] = [
      'THEME_CHOICE', 'TITLE', 'PROLOGUE', 'LIFE_CHOICE', 'CREATURE_LIFE_CHOICE',
      'CHOICE_RESULT', 'BATTLE', 'BATTLE_UI_PROTOTYPE', 'BATTLE_RESULT', 'GREENWOOD',
      'ENCOUNTER', 'TALK_SPOT', 'FUTURE_SITE', 'HOME', 'WORLD_NEWS', 'WORLD_MEMORY',
      'ARCHIVE', 'ARCANA', 'STATUS', 'BAG', 'SETTINGS', 'EXPLORE', 'ITEM_SHOP',
      'TIME_SHIFT', 'ENDING', 'PLAYTEST_SURVEY', 'DEV_LOCK', 'DEV_ADMIN', 'CINEMATIC_PREVIEW',
    ];
    const withTitle = screens.filter(
      (screen) =>
        bgmForScene(at(screen)) === 'TITLE_MAIN' ||
        bgmForScene(at(screen, { kaosSpeaking: true })) === 'TITLE_MAIN',
    );
    expect(withTitle).toEqual(['TITLE']);
  });

  /** And neither the opening theme nor the house. */
  it('is not the opening, and not the house', () => {
    expect(bgmForScene(at('TITLE'))).not.toBe('OPENING');
    expect(bgmForScene(at('TITLE'))).not.toBe('ALDEN_HOME');
  });

  it('finds its voice when the game itself starts', () => {
    expect(bgmForScene(at('PROLOGUE'))).toBe('OPENING');
  });

  it('hands over to her the moment she is the one talking', () => {
    // One screen, two scenes. A man alone with his thoughts, and then
    // her — and they are not the same piece of music.
    expect(bgmForScene(at('PROLOGUE', { kaosSpeaking: true }))).toBe('KAOS_EVENT');
  });

  /**
   * THE WHOLE POINT OF THE SECOND VILLAGE PIECE.
   *
   * HOME and every page read from it are ONE id, so that opening the
   * bag or the book hands `playBgm` what is already playing and it
   * refuses. If any of these ever answered differently, a thumb on a
   * menu would stop the music and start it again.
   */
  it('is the home piece at home, and on every page read from there', () => {
    for (const screen of [
      'HOME',
      'WORLD_NEWS',
      'WORLD_MEMORY',
      'ARCHIVE',
      'ARCANA',
      'BAG',
      'SETTINGS',
    ] as const) {
      expect(bgmForScene(at(screen)), screen).toBe('ALDEN_HOME');
    }
  });

  /** And walking out of it is a change of activity, so a change of piece. */
  it('is the walking piece on the map and in the shop', () => {
    for (const screen of ['EXPLORE', 'ITEM_SHOP', 'TIME_SHIFT'] as const) {
      expect(bgmForScene(at(screen)), screen).toBe('ALDEN_VILLAGE');
    }
  });

  it('is the tavern in the tavern, and the street everywhere else in Alden', () => {
    expect(bgmForScene(at('TALK_SPOT', { locationId: 'MOONLIGHT_TAVERN' }))).toBe('TAVERN');
    expect(bgmForScene(at('TALK_SPOT', { locationId: 'ALDEN_VILLAGE' }))).toBe('ALDEN_VILLAGE');
    expect(bgmForScene(at('FUTURE_SITE', { locationId: 'ALDEN_BAKERY' }))).toBe('ALDEN_VILLAGE');
  });

  it('is the forest in the forest, wherever in it the player is standing', () => {
    expect(bgmForScene(at('GREENWOOD'))).toBe('GREENWOOD_FOREST');
    expect(bgmForScene(at('FUTURE_SITE', { locationId: 'GREENWOOD_GRAVE' }))).toBe(
      'GREENWOOD_FOREST',
    );
    expect(bgmForScene(at('TALK_SPOT', { locationId: 'GREENWOOD_WAYSTATION' }))).toBe(
      'GREENWOOD_FOREST',
    );
  });

  /**
   * The man standing in the road is still the forest. The encounter is
   * the last quiet moment before a fight and scoring it as the fight
   * spends the change early — the music would announce the battle
   * before the player has decided anything.
   */
  it('stays in the forest for the man standing in the road', () => {
    expect(bgmForScene(at('ENCOUNTER'))).toBe('GREENWOOD_FOREST');
  });

  it('is the battle music for every fight, the story’s and the forest’s', () => {
    expect(bgmForScene(at('BATTLE'))).toBe('NORMAL_BATTLE');
    // The developer's door into the same fight, so that what is heard
    // while judging the screen is what a player will hear.
    expect(bgmForScene(at('BATTLE_UI_PROTOTYPE'))).toBe('NORMAL_BATTLE');
  });

  it('is her music while a life is being decided', () => {
    expect(bgmForScene(at('LIFE_CHOICE'))).toBe('KAOS_EVENT');
    expect(bgmForScene(at('CREATURE_LIFE_CHOICE'))).toBe('KAOS_EVENT');
    expect(bgmForScene(at('CHOICE_RESULT'))).toBe('KAOS_EVENT');
  });

  /**
   * Silence is a real answer. Music that changed because somebody
   * opened a debug panel would be telling the player something about a
   * place they are not in.
   */
  it('says nothing at all for the screens that are not the game', () => {
    for (const screen of ['DEV_LOCK', 'DEV_ADMIN', 'CINEMATIC_PREVIEW', 'PLAYTEST_SURVEY'] as const) {
      expect(bgmForScene(at(screen)), screen).toBeNull();
    }
  });
});

describe('the mapping as a whole', () => {
  /**
   * Every screen in the game answers. TypeScript's exhaustive switch
   * already refuses a missing case at compile time; this says the same
   * thing at run time, which is what catches a case added with a
   * `return undefined` in it.
   */
  it('has an answer for every screen, and never an accidental one', () => {
    const screens: Screen[] = [
      'THEME_CHOICE',
      'TITLE', 'PROLOGUE', 'HOME', 'EXPLORE', 'GREENWOOD', 'ENCOUNTER', 'BATTLE',
      'LIFE_CHOICE', 'CREATURE_LIFE_CHOICE', 'CHOICE_RESULT', 'WORLD_MEMORY', 'WORLD_NEWS',
      'TIME_SHIFT', 'FUTURE_SITE', 'TALK_SPOT', 'ARCHIVE', 'ARCANA', 'SETTINGS', 'ENDING',
      'PLAYTEST_SURVEY', 'DEV_LOCK', 'DEV_ADMIN', 'CINEMATIC_PREVIEW', 'BATTLE_UI_PROTOTYPE',
    ];
    for (const screen of screens) {
      const answer = bgmForScene(at(screen));
      expect(answer === null || answer in BGM_ASSETS, screen).toBe(true);
    }
  });

  /** Asked twice about the same moment, it says the same thing. */
  it('is a decision rather than a mood', () => {
    const cue = at('TALK_SPOT', { locationId: 'MOONLIGHT_TAVERN' });
    expect(bgmForScene(cue)).toBe(bgmForScene(cue));
  });

  /** Every one of the seven is reachable; none is a name with no scene. */
  /**
   * EVERY PIECE IS USED, and the ones a SCENE cannot reach are named
   * rather than left as a gap.
   *
   * A scene answers "where are you", and that decides every piece but
   * one: the boss music is chosen by WHO YOU ARE FIGHTING, which a
   * screen position cannot know. So it is excluded here deliberately,
   * and `battleBgm.test.ts` is where it is held to account — a piece
   * that no scene reaches and no fight either would be a file nobody
   * plays, and this pair of tests is what would catch that.
   */
  it('uses every piece a scene can reach', () => {
    const chosenByTheFight = new Set(['BOSS_BATTLE']);
    const reached = new Set(
      [
        at('TITLE'),
        at('PROLOGUE'),
        at('PROLOGUE', { kaosSpeaking: true }),
        at('HOME'),
        at('EXPLORE'),
        at('TALK_SPOT', { locationId: 'MOONLIGHT_TAVERN' }),
        at('GREENWOOD'),
        at('BATTLE'),
      ].map(bgmForScene),
    );
    const sceneReachable = Object.keys(BGM_ASSETS).filter((id) => !chosenByTheFight.has(id));
    expect(reached).toEqual(new Set(sceneReachable));
  });

  /**
   * ALDEN_HOME IS ASKED FOR AND HAS NOTHING YET — on purpose, and
   * pinned so that "pending" cannot quietly become "borrowed". When its
   * own recording arrives this is the test that changes.
   */
  it('has no piece for the house yet, rather than somebody else\'s', () => {
    expect(BGM_ASSETS.ALDEN_HOME).toBeNull();
    expect(BGM_ASSETS.TITLE_MAIN).not.toBeNull();
  });
});

/**
 * COMING BACK OUT OF A FIGHT.
 *
 * 「戦闘終了後は直前の探索／村／酒場BGMへ復帰」 — and the reason this
 * needs no machinery at all is worth writing down, because the obvious
 * implementation of it (remember what was playing, restore it) is a
 * second source of truth that can disagree with the first. The music
 * is a function of where the player IS. Coming out of a fight puts
 * them back where they were, so the music that belongs there is the
 * music that was there. Nothing is remembered because nothing needs
 * to be.
 */
describe('what is playing after a fight', () => {
  it('is the forest again, for a fight in the forest', () => {
    const walking = at('GREENWOOD');
    expect(bgmForScene(walking)).toBe('GREENWOOD_FOREST');
    expect(bgmForScene(at('BATTLE'))).toBe('NORMAL_BATTLE');
    // Won, and back on the path they were walking.
    expect(bgmForScene(walking)).toBe('GREENWOOD_FOREST');
  });

  it('is the village again, for a fight walked out of into the village', () => {
    expect(bgmForScene(at('BATTLE'))).toBe('NORMAL_BATTLE');
    expect(bgmForScene(at('HOME'))).toBe('ALDEN_HOME');
  });

  it('is the tavern again, for somebody who was in the tavern', () => {
    const inTheTavern = at('TALK_SPOT', { locationId: 'MOONLIGHT_TAVERN' });
    expect(bgmForScene(inTheTavern)).toBe('TAVERN');
    expect(bgmForScene(at('BATTLE'))).toBe('NORMAL_BATTLE');
    expect(bgmForScene(inTheTavern)).toBe('TAVERN');
  });

  /** The same rule, for her scenes: after them, wherever the player is. */
  it('is whatever the room is, after one of her scenes', () => {
    expect(bgmForScene(at('LIFE_CHOICE'))).toBe('KAOS_EVENT');
    expect(bgmForScene(at('CHOICE_RESULT'))).toBe('KAOS_EVENT');
    expect(bgmForScene(at('HOME'))).toBe('ALDEN_HOME');
    expect(bgmForScene(at('GREENWOOD'))).toBe('GREENWOOD_FOREST');
  });
});

/**
 * WHICH FIGHT MUSIC — the ♪ control, from the map's side.
 */
describe('the piece a fight is fought to', () => {
  it('is whichever the player last chose', () => {
    expect(bgmForScene(at('BATTLE', { battleBgmId: DEFAULT_BATTLE_BGM }))).toBe(DEFAULT_BATTLE_BGM);
  });

  it('is the default for a save that has never chosen', () => {
    expect(bgmForScene(at('BATTLE'))).toBe(DEFAULT_BATTLE_BGM);
    expect(bgmForScene(at('BATTLE', { battleBgmId: null }))).toBe(DEFAULT_BATTLE_BGM);
  });

  /**
   * A choice naming something that is not fighting music — a stale
   * save, a hand-edited key — plays the default rather than putting
   * the village theme over a battle.
   */
  it('refuses a choice that is not a piece of fighting music', () => {
    expect(bgmForScene(at('BATTLE', { battleBgmId: 'ALDEN_VILLAGE' }))).toBe(DEFAULT_BATTLE_BGM);
  });

  it('changes nothing outside a fight', () => {
    const chosen = { battleBgmId: DEFAULT_BATTLE_BGM } as const;
    expect(bgmForScene(at('GREENWOOD', chosen))).toBe('GREENWOOD_FOREST');
    expect(bgmForScene(at('HOME', chosen))).toBe('ALDEN_HOME');
    expect(bgmForScene(at('TALK_SPOT', { ...chosen, locationId: 'MOONLIGHT_TAVERN' }))).toBe(
      'TAVERN',
    );
  });
});
