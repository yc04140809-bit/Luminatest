import { describe, it, expect } from 'vitest';
import { enemyPose, heroPose, kaosPose } from './battleArtState';
import { enemyArtFor } from '../../content/art';

describe('which pose belongs to this moment', () => {
  it('stands still when nothing is happening', () => {
    expect(enemyPose({ beat: 'NONE', downed: false })).toBe('idle');
    expect(heroPose({ beat: 'NONE', downed: false })).toBe('battle_idle');
  });

  it('puts the creature in its attack pose when it attacks', () => {
    expect(enemyPose({ beat: 'TACKLE', downed: false })).toBe('attack');
  });

  it('puts the creature in its hurt pose when the player lands a blow', () => {
    expect(enemyPose({ beat: 'STRIKE', downed: false })).toBe('damage');
    // And the same blow is the player's attack.
    expect(heroPose({ beat: 'STRIKE', downed: false })).toBe('battle_attack');
  });

  it('lets the party flinch when the party is hit', () => {
    expect(heroPose({ beat: 'HURT', downed: false })).toBe('battle_damage');
    expect(kaosPose({ beat: 'HURT', downed: false })).toBe('battle_damage');
  });

  it('keeps a beaten creature down whatever just happened', () => {
    for (const beat of ['NONE', 'STRIKE', 'TACKLE', 'HIDE', 'HURT']) {
      expect(enemyPose({ beat, downed: true })).toBe('down');
    }
  });

  it('invents no state for a move only one creature has', () => {
    // 苔かくれ is drawn as an effect over the creature, not as a pose:
    // a state that means "hiding" would belong to the moss rabbit and
    // to nothing else, and the ten states are meant to be shared.
    expect(enemyPose({ beat: 'HIDE', downed: false })).toBe('idle');
  });
});

describe('what the moss rabbit actually has drawn', () => {
  it('has its standing and its beaten pictures', () => {
    expect(enemyArtFor('moss_rabbit', 'front').substituted).toBe(false);
    expect(enemyArtFor('moss_rabbit', 'down').substituted).toBe(false);
  });

  it('stands in for the poses that are not drawn yet, and says so', () => {
    for (const pose of ['idle', 'attack', 'damage'] as const) {
      const art = enemyArtFor('moss_rabbit', pose);
      expect(art.placeholder, `${pose} should find something`).toBe(false);
      expect(art.state, `${pose} falls back to the standing picture`).toBe('front');
      expect(art.substituted).toBe(true);
    }
  });

  it('never needs a placeholder for a pose the battle can ask for', () => {
    for (const view of [
      { beat: 'NONE', downed: false },
      { beat: 'STRIKE', downed: false },
      { beat: 'TACKLE', downed: false },
      { beat: 'HIDE', downed: false },
      { beat: 'NONE', downed: true },
    ]) {
      expect(enemyArtFor('moss_rabbit', enemyPose(view)).placeholder).toBe(false);
    }
  });
});

/**
 * KAOS ON THE FIELD — which of her six the fight is looking at.
 *
 * The order is the whole rule, and it is here rather than in a
 * screenshot: awakening outranks a cast, a cast outranks being hit, and
 * being hit outranks standing.
 */
describe('Kaos, and which drawing the fight asks for', () => {
  const at = (over: Partial<Parameters<typeof kaosPose>[0]> = {}) =>
    kaosPose({ beat: 'NONE', downed: false, ...over });

  it('stands between actions', () => {
    expect(at()).toBe('battle_idle');
  });

  it('has a drawing of her own for a spell, an arcana or a skill', () => {
    expect(at({ casting: true })).toBe('battle_cast');
  });

  it('flinches when the party is hit', () => {
    expect(at({ beat: 'HURT' })).toBe('battle_damage');
  });

  /** A higher form does not stop being one mid-spell, or mid-flinch. */
  it('stays in her higher form whatever else is happening', () => {
    expect(at({ awakened: true })).toBe('awakened');
    expect(at({ awakened: true, casting: true })).toBe('awakened');
    expect(at({ awakened: true, beat: 'HURT' })).toBe('awakened');
  });

  /**
   * THE BUG THIS ROUND WAS ABOUT. Her star dress was the only battle
   * drawing she had, so an ordinary rabbit was fought by her awakened
   * form. Nothing but the flag may reach it.
   */
  it('never reaches the awakened drawing by accident', () => {
    for (const beat of ['NONE', 'STRIKE', 'TACKLE', 'HIDE', 'HURT', 'MAGIC']) {
      expect(at({ beat }), beat).not.toBe('awakened');
      expect(at({ beat, casting: true }), `${beat} casting`).not.toBe('awakened');
    }
  });
});
