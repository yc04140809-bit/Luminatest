import { describe, expect, it } from 'vitest';
import { SFX_ASSETS, SFX_GAIN, SFX_RETRIGGER_MS, type SfxId } from './sfx';

/**
 * THE SOUNDS, AS A LIST.
 *
 * Every slot is empty and that is the shipping state: a null slot is
 * SILENCE, never an error and never a placeholder. The asking is real
 * from the first day, so the day the files arrive nothing but the map
 * changes — and nothing here may quietly start depending on a sound
 * actually existing.
 */
describe('the sounds a moment can make', () => {
  it('covers every category the brief asks for', () => {
    const ids = Object.keys(SFX_ASSETS) as SfxId[];
    // One from each group, named rather than counted: a count passes
    // when somebody deletes a sound and adds a different one.
    for (const id of [
      'ui_confirm',
      'ui_cancel',
      'ui_menu_open',
      'ui_tap',
      'ui_memory_open',
      'explore_found',
      'explore_encounter',
      'battle_start',
      'battle_swing',
      'battle_slash_hit',
      'battle_magic_cast',
      'battle_magic_hit',
      'battle_hurt',
      'battle_heal',
      'battle_buff',
      'battle_debuff',
      'battle_critical',
      'battle_victory',
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
    for (const id of Object.keys(SFX_ASSETS)) {
      expect(id, `${id} says where it happens`).toMatch(
        /^(ui|explore|battle|story)_[a-z_]+$/,
      );
      expect(id).not.toMatch(/\d/);
    }
  });

  /**
   * Silence today, and that is correct. A stand-in beep would be worse
   * than nothing: nobody can tell a placeholder from a choice.
   */
  it('is silent until somebody delivers a sound', () => {
    for (const [id, src] of Object.entries(SFX_ASSETS)) {
      expect(src, `${id} has no stand-in`).toBeNull();
    }
  });

  it('never turns a sound up, only down', () => {
    for (const [id, gain] of Object.entries(SFX_GAIN)) {
      expect(gain, `${id} is trimmed, not boosted`).toBeGreaterThan(0);
      expect(gain, `${id} is trimmed, not boosted`).toBeLessThanOrEqual(1);
      expect(id in SFX_ASSETS, `${id} is a real sound`).toBe(true);
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
