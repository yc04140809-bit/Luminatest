import { describe, expect, it } from 'vitest';
import { SFX_GAIN, SFX_IDS, SFX_PRELOAD, SFX_RETRIGGER_MS } from './sfx';

/**
 * THE SOUNDS, AS A LIST.
 *
 * No sound is bundled and that is the shipping state: a sound with no
 * file is SILENCE, never an error and never a placeholder. The asking
 * is real from the first day, so the day the files arrive NOTHING IN
 * THE PROJECT CHANGES — the assets package reads the folder. Nothing
 * here may quietly start depending on a sound actually existing.
 */
describe('the sounds a moment can make', () => {
  it('covers every category the brief asks for', () => {
    const ids = SFX_IDS;
    // One from each group, named rather than counted: a count passes
    // when somebody deletes a sound and adds a different one.
    for (const id of [
      'ui_decide',
      'ui_cancel',
      'ui_menu_open',
      'ui_tap',
      'ui_memory_open',
      'explore_found',
      'explore_encounter',
      'battle_start',
      'battle_attack_slash',
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
      'story_choice',
      'story_event',
      'story_memory_written',
    ] as const) {
      expect(ids, `${id} is named`).toContain(id);
    }
  });

  it('is named after the moment, never after the sound', () => {
    // 'beep2' survives a change of file; 'ui_confirm' survives a change
    // of composer. Nothing here may be a waveform or a number.
    for (const id of SFX_IDS) {
      expect(id, `${id} says where it happens`).toMatch(
        /^(ui|explore|battle|story|magic)_[a-z_]+$/,
      );
      expect(id).not.toMatch(/\d/);
    }
  });

  it('names each sound exactly once', () => {
    expect(new Set(SFX_IDS).size, 'no id is listed twice').toBe(SFX_IDS.length);
  });

  /**
   * PRIMED MEANS REAL. A sound fetched on the first touch that no
   * moment ever asks for is a download nobody hears, and one named
   * here but nowhere in the list is a silent typo.
   */
  it('primes only sounds that exist, and only a fight’s', () => {
    for (const id of SFX_PRELOAD) {
      expect(SFX_IDS, `${id} is a real sound`).toContain(id);
      expect(id, `${id} belongs to a fight`).toMatch(/^(battle|magic)_/);
    }
  });

  it('never turns a sound up, only down', () => {
    for (const [id, gain] of Object.entries(SFX_GAIN)) {
      expect(gain, `${id} is trimmed, not boosted`).toBeGreaterThan(0);
      expect(gain, `${id} is trimmed, not boosted`).toBeLessThanOrEqual(1);
      expect(SFX_IDS, `${id} is a real sound`).toContain(id);
    }
  });

  /**
   * A fight at twice speed asks for the same blow twice as often. The
   * window has to be short enough that two real blows are two sounds
   * and long enough that one blow is not two.
   */
  it('holds back a repeat of the same sound, briefly', () => {
    expect(SFX_RETRIGGER_MS).toBeGreaterThan(20);
    expect(SFX_RETRIGGER_MS).toBeLessThan(150);
  });
});
