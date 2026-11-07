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
const { VOICE_LINES, heroLineVoice, kaosLineVoice, lineVoice, lendVoiceFiles, setVoiceRandom, speaksInFights, voiceGainOf, voicePlan, voiceUrl } = await import('./voice');
const { KAOS_CH1_LINES, KAOS_CH1_SPELLS } = await import('./kaosLines');
const { HERO_CH1_LINES } = await import('./heroLines');
const { ARIA_CH1_LINES, BALDO_CH1_LINES, GALD_CH1_LINES, GRAVE_CH1_LINES, LEVI_CH1_LINES, LINA_CH1_LINES, MIREI_CH1_LINES, RIZEL_CH1_LINES } = await import('./npcLines');

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
  it('each line said by one of them, its files named for them, each file once', () => {
    const files = Object.values(VOICE_LINES).flatMap((l) => l.files);
    expect(new Set(files).size).toBe(files.length);
    for (const [id, line] of Object.entries(VOICE_LINES)) {
      expect(id).toMatch(/^(battle|op|daily|shop|event|talk|ch1)\./);
      const named = {
        KAOS: /^(v_chaos_|v_op_chaos|v_ch1_chaos|kaos_|op\.op_|daily\.)/,
        HERO: /^(v_hero_|hero_|v_ch1_hero)/,
        GALD: /^(v_gard_|v_ch1_gald)/,
        GRAVE: /^(v_grave_|v_ch1_grave)/,
        LEVI: /^(v_levi_|v_ch1_levi)/,
        ARIA: /^(v_aria_|v_ch1_aria)/,
        RIZEL: /^(v_rizel_|v_ch1_rizel)/,
        LINA: /^(v_lina_|v_ch1_lina)/,
        MIREI: /^(v_mirei_|v_ch1_mirei)/,
        BALDO: /^(v_baldo_|v_ch1_baldo)/,
      }[line.who];
      for (const f of line.files) expect(f).toMatch(named);
      // 主人公 is the player's to name: no name of his is written here.
      expect(line.says).not.toMatch(/ノア/);
    }
  });

  it('the delivered forty are all in it, and found: ケイオス 26 (opening 15, the fight 11), 主人公 9, ガルド 5', () => {
    const delivered = Object.values(VOICE_LINES).flatMap((l) => l.files).filter((f) => /^v_/.test(f));
    expect(delivered.filter((f) => f.startsWith('v_op_chaos'))).toHaveLength(15);
    expect(delivered.filter((f) => f.startsWith('v_chaos_'))).toHaveLength(11);
    expect(delivered.filter((f) => f.startsWith('v_hero_'))).toHaveLength(9);
    expect(delivered.filter((f) => f.startsWith('v_gard_'))).toHaveLength(5);
    for (const id of ['battle.gald.start', 'battle.gald.attack', 'battle.gald.hurt', 'battle.gald.pinch', 'battle.gald.down']) expect(voiceUrl(id), id).not.toBeNull();
    for (const id of ['op.op_01_intro_comic', 'battle.kaos.start', 'battle.star_feather', 'battle.soukyoku_rinkai.release', 'battle.hero.down', 'battle.higanbana'])
      expect(voiceUrl(id), id).not.toBeNull();
  });

  it('第4〜9便 too, every file in it and found: リナ 5, ミレイ 6, レヴィ 12, アリア 12, グレイヴ 13, リゼル 11', () => {
    const files = Object.values(VOICE_LINES).flatMap((l) => l.files);
    for (const [prefix, n] of [['v_lina_', 5], ['v_mirei_', 6], ['v_levi_', 12], ['v_aria_', 12], ['v_grave_', 13], ['v_rizel_', 11]] as const)
      expect(files.filter((f) => f.startsWith(prefix)), prefix).toHaveLength(n);
    for (const id of Object.keys(VOICE_LINES).filter((k) => VOICE_LINES[k].files.every((f) => /^v_/.test(f)))) expect(voiceUrl(id), id).not.toBeNull();
    // Who fights with a voice: the three now; レヴィ, アリア, リゼル the moment they join (their lines are here).
    for (const id of ['hero', 'kaos', 'grave', 'levi', 'aria', 'rizel', 'gald']) expect(speaksInFights(id), id).toBe(true);
    expect(speaksInFights('moss_rabbit')).toBe(false);
  });

  it('a shop’s welcome at random, never the same twice running; リゼル’s whispered win and fall made louder (+11dB)', () => {
    let dice = 0;
    setVoiceRandom(() => [0.1, 0.1, 0.9, 0.5][dice++ % 4]);
    const said = Array.from({ length: 8 }, () => src({ src: voicePlan('shop.ALDEN_BAKERY.welcome')[0] }));
    for (let i = 1; i < said.length; i++) expect(said[i]).not.toBe(said[i - 1]);
    expect(new Set(said).size).toBeGreaterThan(1);
    setVoiceRandom(Math.random);
    expect(voiceGainOf(voiceUrl('battle.rizel.win')!)).toBeCloseTo(10 ** (11 / 20), 3);
    expect(voiceGainOf(voiceUrl('battle.rizel.down')!)).toBeCloseTo(10 ** (11 / 20), 3);
    expect(voiceGainOf(voiceUrl('battle.rizel.start')!)).toBe(1);
    expect(voiceGainOf(voiceUrl('event.rizel.daily05')!)).toBeCloseTo(10 ** (9 / 20), 3);
    expect(voiceGainOf(voiceUrl('event.aria.daily02')!)).toBeCloseTo(10 ** (6 / 20), 3);
    expect(voiceGainOf(voiceUrl('event.aria.daily01')!)).toBe(1);
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
    // ボイスパック11: the reaction's two panels in turn; then 「じゃ。」, the send-off and the last card, one a page.
    expect(names('op.op_reaction_comic')).toEqual(['v_op_chaos11.mp3', 'v_op_chaos12.mp3']);
    expect(['op.op_jaa', 'op.op_itterasshai', 'op.op_mata_kokode'].map(names)).toEqual([['v_op_chaos13.mp3'], ['v_op_chaos14.mp3'], ['v_op_chaos15.mp3']]);
    expect(voicePlan('op.op_reaction_comic')).toHaveLength(2);
  });

  it('two takes are said in turn; a page’s lines all, in order', () => {
    const takes = [voicePlan('battle.kaos.attack'), voicePlan('battle.kaos.attack'), voicePlan('battle.kaos.attack')].map((p) => src({ src: p[0] }));
    expect(takes[0]).not.toBe(takes[1]);
    expect(takes[2]).toBe(takes[0]);
    expect(voicePlan('op.op_01_intro_comic')).toHaveLength(3);
  });

  it('a line not in it has none — and asking is not an error; 《瞬断》 is heard now (ボイスパック13)', () => {
    expect(voicePlan('battle.no_such_skill')).toEqual([]);
    expect(voicePlan(undefined)).toEqual([]);
    expect(voicePlan('battle.shundan')).toHaveLength(1);
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

  it('a line that waits, asked in the breath between two of a sequence: after both — none of them dropped (重撃・豪断)', () => {
    lendVoiceFiles({ 'v_ch1_grave074.mp3': 'name.mp3', 'v_grave_finisher01.mp3': 'line.mp3', 'v_grave_finisher02.mp3': 'down.mp3' });
    const manager = ready();
    manager.playVoice('battle.goudan');
    FakeAudio.made[0].finish();
    // The blow lands in the breath after its name.
    manager.playVoice('battle.goudan.release', { wait: true });
    vi.advanceTimersByTime(VOICE_GAP_MS);
    FakeAudio.made[1].finish();
    vi.advanceTimersByTime(VOICE_GAP_MS);
    expect(FakeAudio.made.map(src)).toEqual(['name.mp3', 'line.mp3', 'down.mp3']);
    // Not waiting, it still cuts in at once (and the breath is over).
    manager.playVoice('battle.goudan');
    FakeAudio.made[3].finish();
    manager.playVoice('battle.goudan.release');
    vi.advanceTimersByTime(VOICE_GAP_MS * 3);
    expect(FakeAudio.made.slice(3).map(src)).toEqual(['name.mp3', 'down.mp3']);
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

describe('第1章のケイオス (ボイスパック12): what she says on screen, by its text', () => {
  it('all 156 files delivered and found: 149 lines (ボイスパック23 — 発見の「……薬？」, 時間の使い方の5本 — the last), 5 spells, and the two registered before', () => {
    expect(Object.keys(KAOS_CH1_LINES)).toHaveLength(149);
    expect(Object.keys(KAOS_CH1_SPELLS)).toHaveLength(5);
    const ids = [...Object.values(KAOS_CH1_LINES).map((f) => `ch1.${f}`), ...Object.keys(KAOS_CH1_SPELLS).map((s) => `battle.${s}`)];
    for (const id of ids) expect(voiceUrl(id), id).not.toBeNull();
    expect(new Set(ids.map((id) => VOICE_LINES[id].files[0])).size).toBe(154);
    expect(voiceUrl('op.op_choice_comic.SMILE')).not.toBeNull();
    expect(voiceUrl('daily.LINA_BURNT_BREAD.4')).not.toBeNull();
  });

  it('a line is found by its text wherever it is said; her silences and a line with no take of its own are not', () => {
    expect(kaosLineVoice('ただいまー。')).toBe('ch1.v_ch1_chaos042');
    // One recording for a text said in several scenes (作者 Q5): 「ううん。なんでもない♪」.
    expect(kaosLineVoice('ううん。なんでもない♪')).toBe('ch1.v_ch1_chaos026');
    expect(kaosLineVoice('よろしくね、{HERO}♪')).toBe('ch1.v_ch1_chaos009');
    expect(kaosLineVoice('ずっと、\nあっちを見てる。')).toBe('ch1.v_ch1_chaos113');
    expect(kaosLineVoice('……。')).toBeNull();
    expect(kaosLineVoice('…………。')).toBeNull();
    // 第0話's 「ん？」: the opening's take says 「ん？ どうしたの？」 — not used for it.
    expect(kaosLineVoice('ん？')).toBeNull();
    expect(kaosLineVoice('知らない台詞')).toBeNull();
    expect(VOICE_LINES['battle.starlight_bolt'].says).toBe('星光弾');
  });

  it('主人公 in 第0話 and chapter 1 (ボイスパック13): 112 takes, every one found; his line found by its text', () => {
    expect(Object.keys(HERO_CH1_LINES)).toHaveLength(109);
    const ids = [...Object.values(HERO_CH1_LINES).map((f) => `ch1.${f}`), 'daily.LINA_BURNT_BREAD.6', 'battle.shundan', 'battle.moon_guard'];
    for (const id of ids) expect(voiceUrl(id), id).not.toBeNull();
    const files = new Set(ids.map((id) => VOICE_LINES[id].files[0]));
    expect(files.size).toBe(112);
    for (const f of files) expect(f).toMatch(/^v_ch1_hero\d{3}\.mp3$/);
    for (const id of ids) expect(VOICE_LINES[id].who, id).toBe('HERO');
    expect(heroLineVoice('……この先が、アルデン村か。')).toBe('ch1.v_ch1_hero001');
    // One take for a text said in several scenes: 「どうした？」 (four places).
    expect(heroLineVoice('どうした？')).toBe('ch1.v_ch1_hero022');
    // A written break or not (the tavern's box runs them together): the same take.
    expect(heroLineVoice('そこまで危険なら、\nどうして倒さなかった？')).toBe('ch1.v_ch1_hero070');
    expect(heroLineVoice('そこまで危険なら、どうして倒さなかった？')).toBe('ch1.v_ch1_hero070');
    expect(heroLineVoice('この子、可愛いけど……\nどういう存在なんだ？')).toBe('ch1.v_ch1_hero007');
    // His silences say nothing; 「褒めてる。」 is the daily scene's own id.
    expect(heroLineVoice('……。')).toBeNull();
    expect(heroLineVoice('？')).toBeNull();
    expect(heroLineVoice('褒めてる。')).toBeNull();
    expect(VOICE_LINES['daily.LINA_BURNT_BREAD.6'].files).toEqual(['v_ch1_hero019.mp3']);
    // The result band's answers.
    expect(heroLineVoice('……二人の、な')).toBe('ch1.v_ch1_hero113');
    expect(heroLineVoice('声、震えてたぞ')).toBe('ch1.v_ch1_hero114');
    expect(heroLineVoice('応援してたか？')).toBe('ch1.v_ch1_hero115');
    // His quiet takes, lifted.
    expect(voiceGainOf(voiceUrl(heroLineVoice('……いた。'))!)).toBeCloseTo(10 ** (6 / 20), 3);
    expect(voiceGainOf(voiceUrl(heroLineVoice('どうした？'))!)).toBe(1);
  });

  it('グレイヴ 74, ミレイ 38, リゼル 28 (ボイスパック14〜16): every take found; a line by who says it and what', () => {
    expect(Object.keys(GRAVE_CH1_LINES)).toHaveLength(73);
    expect(Object.keys(MIREI_CH1_LINES)).toHaveLength(38);
    expect(Object.keys(RIZEL_CH1_LINES)).toHaveLength(28);
    for (const [who, lines] of [['GRAVE', GRAVE_CH1_LINES], ['MIREI', MIREI_CH1_LINES], ['RIZEL', RIZEL_CH1_LINES]] as const)
      for (const file of Object.values(lines)) {
        expect(voiceUrl(`ch1.${file}`), file).not.toBeNull();
        expect(VOICE_LINES[`ch1.${file}`].who).toBe(who);
      }
    // 重撃・豪断: its name, then his line for the cut-in.
    expect(VOICE_LINES['battle.goudan'].files).toEqual(['v_ch1_grave074.mp3', 'v_grave_finisher01.mp3']);
    expect(VOICE_LINES['battle.goudan'].play).toBe('SEQUENCE');
    // By who says it: the same words, each in their own voice.
    expect(lineVoice('グレイヴ', 'どうした。')).toBe('ch1.v_ch1_grave008');
    expect(lineVoice('{HERO}', 'どうした。')).toBe('ch1.v_ch1_hero054');
    expect(lineVoice('{HERO}', 'どうした？')).toBe('ch1.v_ch1_hero022');
    // Before he gives his name he is 「マスター」 on screen — still him.
    expect(lineVoice('マスター', 'お、旅人さん。見ない顔だな。')).toBe('ch1.v_ch1_grave001');
    // Written over two lines or run together: the same take.
    expect(lineVoice('グレイヴ', 'あの遺跡で、\nとんでもねぇ奴と戦ったことがある。')).toBe('ch1.v_ch1_grave016');
    expect(lineVoice('グレイヴ', 'あの遺跡で、とんでもねぇ奴と戦ったことがある。')).toBe('ch1.v_ch1_grave016');
    expect(lineVoice('ミレイ', 'いらっしゃい。今日は何を探してるの？')).toBe('ch1.v_ch1_mirei001');
    expect(lineVoice('リゼル', 'リゼル。……覚えなくていい。')).toBe('ch1.v_ch1_rizel001');
    expect(lineVoice('ケイオス', 'ただいまー。')).toBe('ch1.v_ch1_chaos042');
    expect(lineVoice(null, 'どうした。')).toBeNull();
    expect(voiceGainOf(voiceUrl('ch1.v_ch1_grave043')!)).toBeCloseTo(10 ** (6 / 20), 3);
  });

  it('ガルド 11 (発見の「妹だ。病気なんだ」, ボイスパック24, with them), リナ 32, バルド 3, レヴィ 5, アリア 8 (ボイスパック18〜22): every take found, by who says it', () => {
    const tables = [['GALD', GALD_CH1_LINES, 9], ['LINA', LINA_CH1_LINES, 32], ['BALDO', BALDO_CH1_LINES, 3], ['LEVI', LEVI_CH1_LINES, 5], ['ARIA', ARIA_CH1_LINES, 8]] as const;
    for (const [who, lines, n] of tables) {
      expect(Object.keys(lines), who).toHaveLength(n);
      for (const file of Object.values(lines)) {
        expect(voiceUrl(`ch1.${file}`), file).not.toBeNull();
        expect(VOICE_LINES[`ch1.${file}`].who).toBe(who);
      }
    }
    // His word as he changes in the fight: by its phase.
    expect(voiceUrl('battle.gald.phase.SERIOUS')).not.toBeNull();
    expect(voiceUrl('battle.gald.phase.DESPERATE')).not.toBeNull();
    // Shown as 「盗賊 ガルド」 in the forest, 「盗賊」 after the answer: him either way.
    expect(lineVoice('盗賊 ガルド', '……止まれ。')).toBe('ch1.v_ch1_gald001');
    expect(lineVoice('盗賊', '……なんのつもりだ。')).toBe('ch1.v_ch1_gald015');
    // 発見 (ボイスパック23・24): her 「……薬？」 and his answer, both quiet takes played 6 dB up.
    expect(lineVoice('ケイオス', '……薬？')).toBe('ch1.v_ch1_chaos170');
    // 時間の使い方 (ボイスパック23): the five, by their text — 175 the take recorded again (「あなた」).
    expect(lineVoice('ケイオス', 'ねえねえ、時間の使い方、大事なこと言うね')).toBe('ch1.v_ch1_chaos171');
    expect(lineVoice('ケイオス', 'どっちが正解でもないよ。あなたの時間は、あなたが決めて')).toBe('ch1.v_ch1_chaos175');
    expect(lineVoice('盗賊 ガルド', '妹だ。病気なんだ')).toBe('ch1.v_ch1_gald016');
    expect(voiceGainOf(voiceUrl('ch1.v_ch1_chaos170')!)).toBeCloseTo(10 ** (6 / 20), 3);
    expect(voiceGainOf(voiceUrl('ch1.v_ch1_gald016')!)).toBeCloseTo(10 ** (6 / 20), 3);
    expect(lineVoice('リナ', 'まいどあり！')).toBe('ch1.v_ch1_lina013');
    expect(lineVoice('バルド', '……うるさいな。')).toBe('ch1.v_ch1_baldo003');
    expect(lineVoice('レヴィ', 'へいへい。')).toBe('ch1.v_ch1_levi005');
    expect(lineVoice('アリア', '久しぶりね、ケイオス。')).toBe('ch1.v_ch1_aria001');
    expect(voiceGainOf(voiceUrl('ch1.v_ch1_lina035')!)).toBeCloseTo(10 ** (12 / 20), 3);
  });

  it('バルド’s four recorded before (ボイスパック17): in the table, found — and he is not one of those who fight', () => {
    for (const id of ['battle.baldo.attack', 'battle.baldo.hurt', 'event.baldo.daily01', 'event.baldo.daily02']) {
      expect(VOICE_LINES[id].who, id).toBe('BALDO');
      expect(voiceUrl(id), id).not.toBeNull();
    }
    expect(VOICE_LINES['event.baldo.daily02'].says).toBe('わ、悪い、後でいいか……いや、今やる');
    expect(speaksInFights('baldo')).toBe(false);
  });

  it('the whispered takes played louder (+6dB); the rest as recorded', () => {
    expect(voiceGainOf(voiceUrl(kaosLineVoice('奥。'))!)).toBeCloseTo(10 ** (6 / 20), 3);
    expect(voiceGainOf(voiceUrl(kaosLineVoice('……え。'))!)).toBeCloseTo(10 ** (6 / 20), 3);
    expect(voiceGainOf(voiceUrl(kaosLineVoice('ただいまー。'))!)).toBe(1);
  });
});
