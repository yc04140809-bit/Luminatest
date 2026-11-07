import { describe, it, expect } from 'vitest';
import { RIZEL_SCENE_VOICES, rizelDailyUnlocked, rizelSceneVoice } from './rizelVoices';
import { VOICE_LINES } from '../../platform/voice';

describe('リゼル’s everyday voice: hers only after the four answers about Gald (作者 2026-10-31)', () => {
  it('before the answers, nothing of it — whatever the scene', () => {
    expect(rizelDailyUnlocked(null)).toBe(false);
    expect(rizelSceneVoice('RIZEL_FIRST_AID', 0, null)).toBeNull();
  });

  it('after any of the four: her 「怪我してない？ ちゃんと見せて」 as she kneels to tend the child — on that line only', () => {
    for (const choice of ['KILL', 'SPARE', 'HELP', 'CAPTURE'] as const) {
      expect(rizelSceneVoice('RIZEL_FIRST_AID', 0, choice)).toBe('event.rizel.daily03');
      expect(rizelSceneVoice('RIZEL_FIRST_AID', 1, choice)).toBeNull();
    }
    expect(rizelSceneVoice('RIZEL_WOODEN_SWORD', 0, 'SPARE')).toBeNull();
  });

  it('every line it names is one of her recorded five', () => {
    for (const { id } of Object.values(RIZEL_SCENE_VOICES)) {
      expect(id).toMatch(/^event\.rizel\.daily0[1-5]$/);
      expect(VOICE_LINES[id].who).toBe('RIZEL');
    }
  });
});
