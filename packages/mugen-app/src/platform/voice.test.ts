import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * THEIR VOICES (2026-10-30 タスクD): a line by its id, from the table to its file, at the voice's own volume —
 * and silence, never an error, for a line with no file or no line at all.
 */
vi.mock('@mugen/assets/music', () => ({ BGM_ASSETS: {}, MUSIC_ASSETS: { OPENING_THEME: null }, SE_ASSETS: {} }));
vi.mock('@mugen/assets/appMusic', () => ({ APP_BGM_ASSETS: {}, APP_BGM_FALLBACK: {} }));
vi.mock('@mugen/assets/sfx', () => ({ SFX_FILES: {} }));

const { AudioManager } = await import('./audio');
const { VOICE_LINES, lendVoiceFiles, voiceUrl } = await import('./voice');

class FakeAudio {
  static made: FakeAudio[] = [];
  src: string;
  volume = 1;
  paused = true;
  constructor(src: string) {
    this.src = src;
    FakeAudio.made.push(this);
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  load() {}
  addEventListener() {}
}

beforeEach(() => {
  FakeAudio.made = [];
  vi.stubGlobal('Audio', FakeAudio);
});
afterEach(() => vi.unstubAllGlobals());

describe('the table', () => {
  it('names a file for every line, each said by ケイオス or the hero, each file once', () => {
    const files = Object.values(VOICE_LINES).map((l) => l.file);
    expect(new Set(files).size).toBe(files.length);
    for (const [id, line] of Object.entries(VOICE_LINES)) {
      expect(id).toMatch(/^(battle|op|daily)\./);
      expect(['KAOS', 'HERO']).toContain(line.who);
      expect(line.file).toMatch(/^(kaos|hero)_[a-z0-9_]+\.(mp3|ogg|m4a|wav)$/);
      expect(line.file.startsWith(line.who.toLowerCase())).toBe(true);
    }
  });

  it('a line not in it, or one whose file is not delivered, has no file — and asking is not an error', () => {
    expect(voiceUrl('battle.no_such_skill')).toBeNull();
    expect(voiceUrl(undefined)).toBeNull();
    expect(voiceUrl('battle.higanbana')).toBeNull();
  });
});

describe('a line spoken', () => {
  function ready(voice = 0.6) {
    const manager = new AudioManager();
    manager.setVolumes(0.35, 0.8, 1, voice);
    manager.unlock();
    FakeAudio.made = [];
    return manager;
  }

  it('plays its file at the voice volume — not the music’s, not the sounds’', () => {
    lendVoiceFiles({ [VOICE_LINES['battle.soukyoku_rinkai'].file]: 'kaos-shout.mp3' });
    const manager = ready(0.6);
    manager.playVoice('battle.soukyoku_rinkai');
    expect(FakeAudio.made.map((a) => [a.src, a.volume, a.paused])).toEqual([['kaos-shout.mp3', 0.6, false]]);
    expect(manager.speaking()).toBe('kaos-shout.mp3');
  });

  it('one at a time: the next line stops the one before', () => {
    lendVoiceFiles({ [VOICE_LINES['battle.soukyoku_rinkai'].file]: 'a.mp3', [VOICE_LINES['op.SCENE11.SMILE'].file]: 'b.mp3' });
    const manager = ready();
    manager.playVoice('battle.soukyoku_rinkai');
    manager.playVoice('op.SCENE11.SMILE');
    expect(FakeAudio.made.map((a) => [a.src, a.paused])).toEqual([
      ['a.mp3', true],
      ['b.mp3', false],
    ]);
    manager.stopVoice();
    expect(FakeAudio.made.every((a) => a.paused)).toBe(true);
  });

  it('silent, and nothing made, for an id with no file, before the first touch, or with the voice turned down', () => {
    lendVoiceFiles({ [VOICE_LINES['battle.soukyoku_rinkai'].file]: 'a.mp3' });
    ready().playVoice('daily.NO_SUCH_SCENE.1');
    ready(0).playVoice('battle.soukyoku_rinkai');
    const untouched = new AudioManager();
    untouched.playVoice('battle.soukyoku_rinkai');
    expect(FakeAudio.made).toHaveLength(0);
  });
});
