import { describe, it, expect, vi } from 'vitest';
import { AudioManager } from './audio';

describe('AudioManager', () => {
  it('stays silent (and never throws) when a slot has no asset', () => {
    const manager = new AudioManager();
    manager.unlock();
    expect(() => manager.playBgm('title')).not.toThrow();
    expect(() => manager.playSe('memory')).not.toThrow();
  });

  it('does not construct audio before a user gesture unlocks it', () => {
    const AudioCtor = vi.fn();
    vi.stubGlobal('Audio', AudioCtor);
    const manager = new AudioManager();
    manager.playBgm('title'); // no unlock yet
    expect(AudioCtor).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('accepts volume changes and stop with no audio loaded', () => {
    const manager = new AudioManager();
    expect(() => manager.setVolumes(0.3, 0.9)).not.toThrow();
    expect(() => manager.stopBgm()).not.toThrow();
  });
});
