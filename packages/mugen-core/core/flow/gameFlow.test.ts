import { describe, it, expect } from 'vitest';
import { GameFlow } from './gameFlow';
import type { Screen } from './types';

const HAPPY_PATH: Screen[] = [
  // The first screen is the one before the title now: the song, or
  // straight on. Both answers lead here.
  'TITLE',
  'PROLOGUE',
  'HOME',
  'EXPLORE',
  'GREENWOOD',
  'ENCOUNTER',
  'BATTLE',
  'LIFE_CHOICE',
];

describe('GameFlow', () => {
  it('starts before the title, with no life choice recorded', () => {
    const flow = new GameFlow();
    // THEME_CHOICE, not TITLE. The first screen is the question about
    // the song — which is also the first thing anybody touches, and a
    // phone makes no sound until they have.
    expect(flow.getState().screen).toBe('THEME_CHOICE');
    expect(flow.getState().galdLifeChoice).toBeNull();
  });

  it('leads to the title whichever answer it is given', () => {
    const flow = new GameFlow();
    flow.goTo('TITLE');
    expect(flow.getState().screen).toBe('TITLE');
  });

  it('walks the Phase A happy path THEME_CHOICE -> LIFE_CHOICE', () => {
    const flow = new GameFlow();
    for (const screen of HAPPY_PATH) {
      flow.goTo(screen);
      expect(flow.getState().screen).toBe(screen);
    }
  });

  it('rejects invalid transitions', () => {
    const flow = new GameFlow();
    expect(() => flow.goTo('BATTLE')).toThrow(/Invalid transition/);
    expect(flow.getState().screen).toBe('THEME_CHOICE');
  });

  /**
   * THE ONE THAT TOOK THE APP DOWN.
   *
   * Asking for the screen already showing is not a mistake in the code
   * — it is a second thumb, a StrictMode effect running twice, a timer
   * firing after its screen has moved on. It used to throw, and a throw
   * in a render is a black screen on somebody's phone.
   */
  describe('being asked to go where it already is', () => {
    const STAY: Screen[] = ['THEME_CHOICE', 'TITLE', 'HOME', 'GREENWOOD', 'BATTLE_RESULT'];

    for (const screen of STAY) {
      it(`${screen} -> ${screen} does nothing at all`, () => {
        const flow = new GameFlow();
        // Walk there by a legal route, whatever that is for this one.
        const route: Record<string, Screen[]> = {
          THEME_CHOICE: [],
          TITLE: ['TITLE'],
          HOME: ['TITLE', 'HOME'],
          GREENWOOD: ['TITLE', 'HOME', 'EXPLORE', 'GREENWOOD'],
          BATTLE_RESULT: ['TITLE', 'HOME', 'EXPLORE', 'GREENWOOD', 'BATTLE', 'BATTLE_RESULT'],
        };
        for (const step of route[screen]) flow.goTo(step);
        expect(flow.getState().screen).toBe(screen);

        let calls = 0;
        const unsub = flow.subscribe(() => calls++);
        expect(flow.canGoTo(screen), 'staying put is always allowed').toBe(true);
        expect(() => flow.goTo(screen)).not.toThrow();
        expect(flow.getState().screen, 'still exactly where it was').toBe(screen);
        // NOT A TRANSITION, so nothing redraws. A no-op that still
        // notified would re-render every screen in the app on every
        // stray tap, which is a different bug wearing the first one's
        // clothes.
        expect(calls, 'nobody is told about a move that did not happen').toBe(0);
        unsub();
      });
    }

    it('hammering it changes nothing', () => {
      const flow = new GameFlow();
      flow.goTo('TITLE');
      flow.goTo('HOME');
      for (let i = 0; i < 20; i++) flow.goTo('HOME');
      expect(flow.getState().screen).toBe('HOME');
      // And the world it is in is untouched: the flow still refuses a
      // move the table forbids.
      expect(() => flow.goTo('BATTLE')).toThrow(/Invalid transition/);
    });

    it('does not relax the table for anything else', () => {
      const flow = new GameFlow();
      flow.goTo('TITLE');
      flow.goTo('HOME');
      // Not reachable from HOME, and still not.
      expect(flow.canGoTo('BATTLE')).toBe(false);
      expect(() => flow.goTo('BATTLE')).toThrow(/Invalid transition/);
      expect(() => flow.goTo('LIFE_CHOICE')).toThrow(/Invalid transition/);
      expect(flow.getState().screen).toBe('HOME');
    });

    it('a life choice is still refused off its own screen', () => {
      const flow = new GameFlow();
      flow.goTo('TITLE');
      flow.goTo('TITLE');
      expect(() => flow.chooseGaldLife('KILL')).toThrow();
    });
  });

  it('records the life choice and moves to CHOICE_RESULT', () => {
    const flow = new GameFlow();
    for (const screen of HAPPY_PATH) flow.goTo(screen);
    flow.chooseGaldLife('SPARE');
    expect(flow.getState().screen).toBe('CHOICE_RESULT');
    expect(flow.getState().galdLifeChoice).toBe('SPARE');
    flow.goTo('HOME');
    expect(flow.getState().galdLifeChoice).toBe('SPARE');
  });

  it('refuses a life choice outside the LIFE_CHOICE screen', () => {
    const flow = new GameFlow();
    expect(() => flow.chooseGaldLife('KILL')).toThrow();
  });

  it('notifies subscribers on transition', () => {
    const flow = new GameFlow();
    let calls = 0;
    const unsub = flow.subscribe(() => calls++);
    flow.goTo('TITLE');
    expect(calls).toBe(1);
    unsub();
    flow.goTo('PROLOGUE');
    expect(calls).toBe(1);
  });
});
