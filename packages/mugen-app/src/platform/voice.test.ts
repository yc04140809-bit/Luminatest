import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * THEIR VOICES (2026-10-30 タスクD; ケイオス 21本・主人公 9本): a line by its id, from the table to its files, at the
 * voice's own volume — a page's lines one after another, takes in turn — and silence, never an error, for a line
 * with no file or no line at all.
 */
vi.mock('@mugen/assets/music', () => ({ BGM_ASSETS: {}, MUSIC_ASSETS: { OPENING_THEME: null }, SE_ASSETS: {} }));
vi.mock('@mugen/assets/appMusic', () => ({ APP_BGM_ASSETS: {}, APP_BGM_FALLBACK: {} }));
vi.mock('@mugen/assets/sfx', () => ({ SFX_FILES: {} }));

const { AudioManager, VOICE_GAP_MS } = await import('./audio');
const { VOICE_LINES, lendVoiceFiles, voicePlan, voiceUrl } = await import('./voice');

class FakeAudio {
  static made: FakeAudio[] = [];
  src: string;
  volume = 1;
  paused = true;
  ended: (() => void)[] = [];
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
  addEventListener(type: string, f: () => void) {
    if (type === 'ended') this.ended.push(f);
  }
  /** As if it had played to its end. */
  finish() {
    this.paused = true;
    this.ended.forEach((f) => f());
  }
}

beforeEach(() => {
  FakeAudio.made = [];
  vi.useFakeTimers();
  vi.stubGlobal('Audio', FakeAudio);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const src = (a: { src: string }) => a.src.slice(a.src.lastIndexOf('/') + 1).replace(/\?.*$/, '');

describe('the table', () => {
  it('each line said by ケイオス or 主人公, its files named for them, each file once', () => {
    const files = Object.values(VOICE_LINES).flatMap((l) => l.files);
    expect(new Set(files).size).toBe(files.length);
    for (const [id, line] of Object.entries(VOICE_LINES)) {
      expect(id).toMatch(/^(battle|op|daily)\./);
      const named = { KAOS: /^(v_chaos_|v_op_chaos|kaos_)/, HERO: /^(v_hero_|hero_)/, GALD: /^v_gard_/ }[line.who];
      for (const f of line.files) expect(f).toMatch(named);
      // 主人公 is the player's to name: no name of his is written here.
      expect(line.says).not.toMatch(/ノア/);
    }
  });

  it('the delivered thirty-five are all in it, and found: ケイオス 21 (opening 10, the fight 11), 主人公 9, ガルド 5', () => {
    const delivered = Object.values(VOICE_LINES).flatMap((l) => l.files).filter((f) => /^v_/.test(f));
    expect(delivered.filter((f) => f.startsWith('v_op_chaos'))).toHaveLength(10);
    expect(delivered.filter((f) => f.startsWith('v_chaos_'))).toHaveLength(11);
    expect(delivered.filter((f) => f.startsWith('v_hero_'))).toHaveLength(9);
    expect(delivered.filter((f) => f.startsWith('v_gard_'))).toHaveLength(5);
    for (const id of ['battle.gald.start', 'battle.gald.attack', 'battle.gald.hurt', 'battle.gald.pinch', 'battle.gald.down']) expect(voiceUrl(id), id).not.toBeNull();
    for (const id of ['op.op_01_intro_comic', 'battle.kaos.start', 'battle.star_feather', 'battle.soukyoku_rinkai.release', 'battle.hero.down', 'battle.higanbana'])
      expect(voiceUrl(id), id).not.toBeNull();
  });

  it('the opening in the order of its panels: three on the first page, three on the second, then one a page', () => {
    const names = (id: string) => VOICE_LINES[id].files;
    expect(names('op.op_01_intro_comic')).toEqual(['v_op_chaos01.mp3', 'v_op_chaos02.mp3', 'v_op_chaos03.mp3']);
    expect(names('op.op_02_warning_comic')).toEqual(['v_op_chaos04.mp3', 'v_op_chaos05.mp3', 'v_op_chaos06.mp3']);
    expect(['op.op_03_sorejaa', 'op.op_05_doushitano', 'op.op_06_jitsuwane', 'op.op_flash_01b_doushitano'].map(names)).toEqual([
      ['v_op_chaos07.mp3'],
      ['v_op_chaos08.mp3'],
      ['v_op_chaos09.mp3'],
      ['v_op_chaos10.mp3'],
    ]);
  });

  it('two takes are said in turn; a page’s lines all, in order', () => {
    const takes = [voicePlan('battle.kaos.attack'), voicePlan('battle.kaos.attack'), voicePlan('battle.kaos.attack')].map((p) => src({ src: p[0] }));
    expect(takes[0]).not.toBe(takes[1]);
    expect(takes[2]).toBe(takes[0]);
    expect(voicePlan('op.op_01_intro_comic')).toHaveLength(3);
  });

  it('a line not in it, or one whose file is not delivered, has none — and asking is not an error', () => {
    expect(voicePlan('battle.no_such_skill')).toEqual([]);
    expect(voicePlan(undefined)).toEqual([]);
    expect(voicePlan('battle.shundan')).toEqual([]);
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

  it('plays at the voice volume — not the music’s, not the sounds’', () => {
    lendVoiceFiles({ [VOICE_LINES['battle.soukyoku_rinkai'].files[0]]: 'kaos-shout.mp3' });
    const manager = ready(0.6);
    manager.playVoice('battle.soukyoku_rinkai');
    expect(FakeAudio.made.map((a) => [a.src, a.volume, a.paused])).toEqual([['kaos-shout.mp3', 0.6, false]]);
    expect(manager.speaking()).toBe('kaos-shout.mp3');
  });

  it('a page’s lines one after another, a breath between; his word then hers', () => {
    lendVoiceFiles({ 'v_op_chaos01.mp3': '1.mp3', 'v_op_chaos02.mp3': '2.mp3', 'v_op_chaos03.mp3': '3.mp3' });
    const manager = ready();
    manager.playVoice('op.op_01_intro_comic');
    expect(FakeAudio.made.map(src)).toEqual(['1.mp3']);
    FakeAudio.made[0].finish();
    expect(FakeAudio.made).toHaveLength(1);
    vi.advanceTimersByTime(VOICE_GAP_MS);
    FakeAudio.made[1].finish();
    vi.advanceTimersByTime(VOICE_GAP_MS);
    expect(FakeAudio.made.map(src)).toEqual(['1.mp3', '2.mp3', '3.mp3']);
    lendVoiceFiles({ 'v_hero_start01.mp3': 'h.mp3', 'v_chaos_start01.mp3': 'k.mp3' });
    FakeAudio.made = [];
    manager.playVoice(['battle.hero.start', 'battle.kaos.start']);
    FakeAudio.made[0].finish();
    vi.advanceTimersByTime(VOICE_GAP_MS);
    expect(FakeAudio.made.map(src)).toEqual(['h.mp3', 'k.mp3']);
  });

  it('one at a time: the next line stops the one before — and what was to follow it', () => {
    lendVoiceFiles({ 'v_op_chaos01.mp3': '1.mp3', 'v_op_chaos02.mp3': '2.mp3', 'v_op_chaos03.mp3': '3.mp3', [VOICE_LINES['battle.soukyoku_rinkai'].files[0]]: 'b.mp3' });
    const manager = ready();
    manager.playVoice('op.op_01_intro_comic');
    manager.playVoice('battle.soukyoku_rinkai');
    expect(FakeAudio.made.map((a) => [src(a), a.paused])).toEqual([
      ['1.mp3', true],
      ['b.mp3', false],
    ]);
    // The first page's other two never come.
    FakeAudio.made[0].finish();
    vi.advanceTimersByTime(VOICE_GAP_MS * 3);
    expect(FakeAudio.made).toHaveLength(2);
    manager.stopVoice();
    expect(FakeAudio.made.every((a) => a.paused)).toBe(true);
  });

  it('a line that waits is said after the one being said — not over it', () => {
    lendVoiceFiles({ 'v_chaos_finisher02.mp3': 'f.mp3', 'v_hero_win01.mp3': 'w.mp3' });
    const manager = ready();
    manager.playVoice('battle.soukyoku_rinkai.release');
    manager.playVoice('battle.hero.win', { wait: true });
    expect(FakeAudio.made.map((a) => [src(a), a.paused])).toEqual([['f.mp3', false]]);
    FakeAudio.made[0].finish();
    vi.advanceTimersByTime(VOICE_GAP_MS);
    expect(FakeAudio.made.map(src)).toEqual(['f.mp3', 'w.mp3']);
  });

  it('two sides heard together; but the party never twice at once — their line lets go of theirs in the foe’s exchange', () => {
    lendVoiceFiles({ 'v_gard_start01.mp3': 'g.mp3', 'v_hero_start01.mp3': 'h.mp3', 'v_hero_atk01.mp3': 'a.mp3', 'v_hero_atk02.mp3': 'a.mp3', 'v_gard_dmg01.mp3': 'd.mp3' });
    const manager = ready();
    manager.playVoice(['battle.gald.start', 'battle.hero.start'], { mouth: 'foe' });
    manager.playVoice('battle.hero.attack');
    // His taunt goes on under the hero's blow.
    expect(FakeAudio.made.map((a) => [src(a), a.paused])).toEqual([
      ['g.mp3', false],
      ['a.mp3', false],
    ]);
    FakeAudio.made[0].finish();
    vi.advanceTimersByTime(VOICE_GAP_MS);
    expect(FakeAudio.made.map(src)).toEqual(['g.mp3', 'a.mp3', 'h.mp3']);
    // Now the exchange is the hero's own word: his next blow lets it go.
    manager.playVoice('battle.hero.attack');
    expect(FakeAudio.made[2].paused).toBe(true);
    manager.playVoice('battle.gald.hurt', { mouth: 'foe' });
    expect(manager.speaking('foe')).toBe('d.mp3');
  });

  it('silent, and nothing made, for an id with no file, before the first touch, or with the voice turned down', () => {
    ready().playVoice('daily.NO_SUCH_SCENE.1');
    ready().playVoice('battle.shundan');
    ready(0).playVoice('battle.kaos.start');
    new AudioManager().playVoice('battle.kaos.start');
    expect(FakeAudio.made).toHaveLength(0);
  });
});
