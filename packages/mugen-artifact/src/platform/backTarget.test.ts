import { describe, it, expect } from 'vitest';
import { backTargetFor, type BackAction } from './backTarget';
import type { Screen } from '@mugen/core/flow/types';

/**
 * THE BACK BUTTON IS A CANON QUESTION, NOT A UI ONE.
 *
 * MUGEN ZERO's rules are that the four answers cannot be taken again,
 * that a scene which records something is not half-left, and that
 * nothing re-fires by being navigated away from. A hardware button
 * that walks backwards through screens is the most obvious way to
 * break all three, so what it may and may not do is pinned here.
 */

const answer = (screen: Screen): BackAction => backTargetFor(screen);

describe('the Android back button', () => {
  it('offers to leave the game only at the title', () => {
    expect(answer('TITLE')).toBe('EXIT');
    const everywhereElse: Screen[] = [
      'HOME',
      'EXPLORE',
      'GREENWOOD',
      'BATTLE',
      'ARCHIVE',
      'SETTINGS',
      'DEV_ADMIN',
    ];
    for (const screen of everywhereElse) {
      expect(answer(screen), `${screen} must not offer to close the app`).not.toBe('EXIT');
    }
  });

  it('closes what the player opened, the way the screen does', () => {
    expect(answer('WORLD_MEMORY')).toBe('HOME');
    expect(answer('WORLD_NEWS')).toBe('HOME');
    expect(answer('ARCHIVE')).toBe('HOME');
    expect(answer('ARCANA')).toBe('HOME');
    expect(answer('BAG')).toBe('HOME');
    expect(answer('SETTINGS')).toBe('HOME');
    expect(answer('EXPLORE')).toBe('HOME');
    expect(answer('GREENWOOD')).toBe('EXPLORE');
    expect(answer('ITEM_SHOP')).toBe('EXPLORE');
  });

  /**
   * THE ONE THE WHOLE FILE EXISTS FOR.
   *
   * 「ガルドの選択はやり直せない」 is canon. A back press out of the
   * result screen would put the player back in front of the question.
   */
  it('cannot be used to take the four answers again', () => {
    expect(answer('LIFE_CHOICE')).toBeNull();
    expect(answer('CHOICE_RESULT')).toBeNull();
    expect(answer('CREATURE_LIFE_CHOICE')).toBeNull();
  });

  it('never walks out of a fight', () => {
    expect(answer('ENCOUNTER')).toBeNull();
    expect(answer('BATTLE')).toBeNull();
    expect(answer('BATTLE_RESULT')).toBeNull();
  });

  it('never leaves a scene that records something halfway', () => {
    // The reunion writes the discovery; the talk writes that it was
    // heard. Both have a もどる of their own, and that is the way out.
    expect(answer('FUTURE_SITE')).toBeNull();
    expect(answer('TALK_SPOT')).toBeNull();
    expect(answer('PROLOGUE')).toBeNull();
    expect(answer('ENDING')).toBeNull();
    expect(answer('PLAYTEST_SURVEY')).toBeNull();
  });

  /** A commit in flight is not something to interrupt with a reflex. */
  it('is swallowed on the developer TIME SHIFT', () => {
    expect(answer('TIME_SHIFT')).toBeNull();
  });

  /**
   * A back target the flow table refuses is not a navigation bug, it is
   * a CRASH: `goTo` throws on a move the table does not allow. So every
   * screen that has a target is walked to and asked whether it may
   * actually take the step out.
   */
  it('never points at a screen the flow would refuse', async () => {
    const { GameFlow } = await import('@mugen/core/flow/gameFlow');
    const routes: Partial<Record<Screen, Screen[]>> = {
      EXPLORE: ['EXPLORE'],
      GREENWOOD: ['EXPLORE', 'GREENWOOD'],
      ITEM_SHOP: ['EXPLORE', 'ITEM_SHOP'],
      WORLD_MEMORY: ['WORLD_MEMORY'],
      WORLD_NEWS: ['WORLD_NEWS'],
      ARCHIVE: ['ARCHIVE'],
      ARCANA: ['ARCANA'],
      BAG: ['BAG'],
      SETTINGS: ['SETTINGS'],
      DEV_LOCK: ['DEV_LOCK'],
      DEV_ADMIN: ['DEV_ADMIN'],
      CINEMATIC_PREVIEW: ['DEV_ADMIN', 'CINEMATIC_PREVIEW'],
      BATTLE_UI_PROTOTYPE: ['DEV_ADMIN', 'BATTLE_UI_PROTOTYPE'],
    };

    for (const [screen, route] of Object.entries(routes) as [Screen, Screen[]][]) {
      const target = answer(screen);
      expect(target, `${screen} should have a way back`).not.toBeNull();
      expect(target, `${screen} must not close the app`).not.toBe('EXIT');

      const flow = new GameFlow();
      flow.goTo('TITLE');
      flow.goTo('HOME');
      for (const step of route) flow.goTo(step);
      expect(flow.getState().screen, `${screen} route is wrong`).toBe(screen);
      expect(
        flow.canGoTo(target as Screen),
        `back from ${screen} to ${target} would throw`,
      ).toBe(true);
    }
  });
});
