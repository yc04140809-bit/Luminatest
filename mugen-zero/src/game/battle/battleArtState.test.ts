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
