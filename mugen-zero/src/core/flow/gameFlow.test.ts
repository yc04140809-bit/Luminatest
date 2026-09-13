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
