import { describe, expect, it } from 'vitest';
import {
  KAOS_ARCANA_CAST,
  KAOS_PORTRAIT_STATES,
  kaosBattleMode,
  kaosPortraitState,
  kaosTalkMode,
  type KaosPortraitMode,
} from './kaosPortraits';
import { KAOS_ART } from '../art/partyArt';
import { PARTY_FALLBACK, TALK_FALLBACK } from '../../core/art/artStates';

const ROLES: KaosPortraitMode[] = [
  'menu',
  'talk_default',
  'talk_rinsen',
  'battle_default',
  'cast',
  'awaken',
];

describe('the six roles', () => {
  it('each has a picture of its own, and no two share one', () => {
    const sources = ROLES.map((role) => {
      const asset = KAOS_ART.states[kaosPortraitState(role)];
      expect(asset, `${role} has a drawing`).toBeDefined();
      return asset!.src;
    });
    expect(new Set(sources).size, 'six roles, six drawings').toBe(ROLES.length);
  });

  /**
   * Without one the art layer crops the top third, and the top third of
   * every one of these is wing — a beautiful crop of nobody.
   */
  it('each knows where her face is in its own file', () => {
    for (const role of ROLES) {
      const asset = KAOS_ART.states[kaosPortraitState(role)]!;
      expect(asset.face, `${role} has a measured face box`).toBeDefined();
      const face = asset.face!;
      expect(face.x + face.width, role).toBeLessThanOrEqual(face.fileW);
      expect(face.y + face.height, role).toBeLessThanOrEqual(face.fileH);
    }
  });

  /**
   * Her white wing is on HER right and her black on HER left; her right
   * eye is gold and her left blue. A mirrored drawing swaps all four,
   * and the wings are canon.
   */
  it('is never mirrored', () => {
    for (const role of ROLES) {
      expect(KAOS_ART.states[kaosPortraitState(role)]!.facing, role).toBe('left');
    }
  });

  it('maps every role to a distinct art state', () => {
    const states = ROLES.map(kaosPortraitState);
    expect(new Set(states).size).toBe(ROLES.length);
  });

  it('says an arcana is cast the same way a spell is', () => {
    expect(KAOS_ARCANA_CAST).toBe<KaosPortraitMode>('cast');
    expect(KAOS_PORTRAIT_STATES[KAOS_ARCANA_CAST]).toBe(KAOS_PORTRAIT_STATES.cast);
  });
});

describe('which Kaos is talking', () => {
  it('is the ordinary one by default — and so the opening is', () => {
    expect(kaosTalkMode()).toBe('talk_default');
    expect(kaosTalkMode(false)).toBe('talk_default');
  });

  it('is the 臨戦 one when the air is tight', () => {
    expect(kaosTalkMode(true)).toBe('talk_rinsen');
  });
});

describe('which Kaos is fighting', () => {
  it('is the ordinary battle one, between actions', () => {
    expect(kaosBattleMode()).toBe('battle_default');
    expect(kaosBattleMode({})).toBe('battle_default');
  });

  it('is the casting one for the length of a spell', () => {
    expect(kaosBattleMode({ casting: true })).toBe('cast');
  });

  /**
   * A higher form does not stop being one mid-spell. This is the
   * brief's 「覚醒フラグが立った状態では awaken を優先」, as an order.
   */
  it('is the awakened one whatever else is happening', () => {
    expect(kaosBattleMode({ awakened: true })).toBe('awaken');
    expect(kaosBattleMode({ awakened: true, casting: true })).toBe('awaken');
  });
});

/**
 * THE RULE THIS WHOLE ROUND EXISTS FOR.
 *
 * Her star dress was the only battle drawing she had, so it was in the
 * `battle_idle` slot and every moss rabbit in Greenwood was fought by
 * her awakened form. It can only be reached deliberately now.
 */
describe('the awakened drawing', () => {
  it('is nobody’s fallback, on either chain', () => {
    expect(PARTY_FALLBACK).not.toContain('awakened');
    expect(TALK_FALLBACK).not.toContain('awakened');
  });

  it('is not what an ordinary fight asks for', () => {
    expect(kaosPortraitState(kaosBattleMode())).not.toBe(kaosPortraitState('awaken'));
    expect(kaosPortraitState(kaosBattleMode({ casting: true }))).not.toBe(
      kaosPortraitState('awaken'),
    );
  });
});
