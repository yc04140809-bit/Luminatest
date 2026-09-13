import { describe, expect, it } from 'vitest';
import { bgmForScene, type SceneCue } from './sceneBgm';
import { BGM_ASSETS } from '../../assets/manifest';
import type { Screen } from '../../core/flow/types';

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
describe('the six scenes, by name', () => {
  it('opens on the opening, title and monologue alike', () => {
    expect(bgmForScene(at('TITLE'))).toBe('OPENING');
    expect(bgmForScene(at('PROLOGUE'))).toBe('OPENING');
  });

  it('hands over to her the moment she is the one talking', () => {
    // One screen, two scenes. A man alone with his thoughts, and then
    // her — and they are not the same piece of music.
    expect(bgmForScene(at('PROLOGUE', { kaosSpeaking: true }))).toBe('KAOS_EVENT');
  });

  it('is the village at home, and in every room off it', () => {
    for (const screen of [
      'HOME',
      'EXPLORE',
      'WORLD_NEWS',
      'WORLD_MEMORY',
      'TIME_SHIFT',
      'ARCHIVE',
      'ARCANA',
      'SETTINGS',
    ] as const) {
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

  /** Every one of the six is reachable; none is a name with no scene. */
  it('uses all six pieces', () => {
    const reached = new Set(
      [
        at('TITLE'),
        at('PROLOGUE', { kaosSpeaking: true }),
        at('HOME'),
        at('TALK_SPOT', { locationId: 'MOONLIGHT_TAVERN' }),
        at('GREENWOOD'),
        at('BATTLE'),
      ].map(bgmForScene),
    );
    expect(reached).toEqual(new Set(Object.keys(BGM_ASSETS)));
  });
});
