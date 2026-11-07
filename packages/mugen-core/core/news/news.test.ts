// WHAT THE VILLAGE SAYS, AND WHAT IT NEVER SAYS.
//
// Two things are under test and only one of them is the mixing ratio.
// The other is the guarantee the whole feature rests on: that a line
// about a chicken is a line about a chicken, permanently, and that
// nothing internal ever crosses to a screen.

import { describe, it, expect } from 'vitest';
import { INITIAL_CLOCK, addDays, toAbsoluteDay } from '../time/calendar';
import type { MemoryEvent } from '../memory/types';
import { canonAsWorldMemories } from '../life/canonBridge';
import {
  advanceTime,
  emptyWorld,
  observe,
  replayCanon,
  settle,
  type WorldLifeRules,
} from '../life/engine';
import type { WorldLifeState } from '../life/types';
import {
  GALD,
  LINA,
  MUGEN_WORLD_RULES,
  PLAYER_ACTOR,
} from '../../content/world/mugenWorld';
import { GREENWOOD_PRELUDE } from '../../content/world/galdLife';
import { ALDEN_NOISE, ALDEN_SIGNALS, ALDEN_NEWS_PER_DAY } from '../../content/news/aldenNews';
import {
  availableSignals,
  newsday,
  newsReport,
  playerNewsday,
  signalHolds,
  SIGNAL_SHARE,
  type NewsSignalDef,
} from './news';
import { forPlayer, NOISE_IMPORTANCE, type NewsItem } from './types';

const RULES: WorldLifeRules = MUGEN_WORLD_RULES;
const HER = LINA.npcId;

function canon(type: MemoryEvent['type'], day: number, actors: string[], at: string): MemoryEvent {
  const when = addDays(INITIAL_CLOCK, day);
  return {
    id: `evt_${type}_${day}`,
    type,
    worldYear: when.worldYear,
    worldDay: when.worldDay,
    location: at,
    actors,
    importance: 'MAJOR',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

/** A world where nothing has happened to anybody. */
const quietVillage = () => settle(emptyWorld(INITIAL_CLOCK), RULES);

/** The HELP world, grown, where the village has things to say. */
function livingVillage(days = 1500): WorldLifeState {
  let world = emptyWorld(INITIAL_CLOCK);
  for (const fact of GREENWOOD_PRELUDE) {
    world = observe(world, { ...fact, witnesses: [...fact.witnesses] }, RULES).state;
  }
  for (let i = 0; i < 5; i++) {
    if (i > 0) world = advanceTime(world, 150, 'STORY_TIME_ADVANCE');
    world = observe(
      world,
      {
        action: 'SHOW_MAGIC',
        actor: 'KAOS',
        target: HER,
        location: 'ALDEN_VILLAGE',
        witnesses: ['alden_marta'],
      },
      RULES,
    ).state;
  }
  world = replayCanon(
    world,
    canonAsWorldMemories([
      canon('PLAYER_HELPED_GALD', 1, [PLAYER_ACTOR, GALD], 'ALDEN_FOREST'),
      canon('GALD_WALKS_THE_ROAD', 5, [GALD], 'GREENWOOD_FOREST'),
      canon('GALD_BECOMES_HEALER', 125, [GALD], 'GREENWOOD_WAYSTATION'),
    ]),
    RULES,
  );
  while (toAbsoluteDay(world.now) - 1 < days) {
    const step = Math.min(180, days - (toAbsoluteDay(world.now) - 1));
    world = settle(advanceTime(world, step, 'STORY_TIME_ADVANCE'), RULES);
  }
  return settle(world, RULES);
}

const aDay = (state: WorldLifeState, day: number, count = ALDEN_NEWS_PER_DAY) =>
  newsday({ state, kinds: RULES.kinds, signals: ALDEN_SIGNALS, noise: ALDEN_NOISE, count, day });

describe('本当に無意味な日常が存在する', () => {
  it('has nowhere to put a consequence, so a chicken cannot become a clue', () => {
    // The guarantee, checked at the type level by construction and here
    // by inspection: every noise item's entire content is its text.
    for (const item of ALDEN_NOISE) {
      expect(Object.keys(item).sort(), item.id).toEqual(['id', 'kind', 'text']);
      expect(item.kind).toBe('NOISE');
    }
    expect(NOISE_IMPORTANCE).toBe('NOISE');
  });

  it('never mentions anybody the world is growing a life for', () => {
    // A chicken that names Lina is a chicken somebody will read as a
    // clue whatever the type system says.
    const people = RULES.cores.map((core) => core.npcId);
    const seeds = RULES.kinds.map((kind) => kind.type);
    for (const item of ALDEN_NOISE) {
      for (const id of [...people, ...seeds]) {
        expect(item.text, `${item.id} / ${id}`).not.toContain(id);
      }
    }
  });

  it('fills a whole day on its own in a world where nothing has happened', () => {
    const day = aDay(quietVillage(), 1);
    expect(day).toHaveLength(ALDEN_NEWS_PER_DAY);
    expect(day.every((item) => item.kind === 'NOISE')).toBe(true);
  });

  it('gets through its whole list rather than repeating the first two forever', () => {
    const said = new Set<string>();
    for (let day = 1; day <= 30; day++) {
      for (const item of aDay(quietVillage(), day)) said.add(item.id);
    }
    expect(said.size).toBe(ALDEN_NOISE.length);
  });
});

describe('約8割が日常、約2割がSEED/VINE/BLOOM', () => {
  it('never lets more than a fifth of a day be about something', () => {
    const world = livingVillage();
    // The village has plenty to say on this day; the player still gets
    // a village rather than a briefing.
    expect(availableSignals(ALDEN_SIGNALS, world, RULES.kinds).length).toBeGreaterThan(2);
    for (let day = 1; day <= 40; day++) {
      const items = aDay(world, day);
      const signals = items.filter((item) => item.kind === 'SIGNAL');
      expect(signals.length / items.length, `day ${day}`).toBeLessThanOrEqual(SIGNAL_SHARE);
    }
  });

  it('says something on most days, once the world has something to say', () => {
    const world = livingVillage();
    let spoke = 0;
    for (let day = 1; day <= 40; day++) {
      if (aDay(world, day).some((item) => item.kind === 'SIGNAL')) spoke += 1;
    }
    expect(spoke).toBeGreaterThan(30);
  });

  it('never invents a rumour to fill the quota', () => {
    // A quiet world stays quiet. The share is a ceiling, not a target.
    for (let day = 1; day <= 20; day++) {
      expect(aDay(quietVillage(), day).some((item) => item.kind === 'SIGNAL')).toBe(false);
    }
  });

  it('does not put the interesting one in the same place every day', () => {
    // A player who learns 「本物はいつも3番目」 has been handed the
    // importance field after all.
    const world = livingVillage();
    const positions = new Set<number>();
    for (let day = 1; day <= 40; day++) {
      const at = aDay(world, day).findIndex((item) => item.kind === 'SIGNAL');
      if (at >= 0) positions.add(at);
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('says the same thing when the same day is read twice', () => {
    const world = livingVillage();
    expect(aDay(world, 12).map((i) => i.id)).toEqual(aDay(world, 12).map((i) => i.id));
  });
});

describe('内部重要度はプレイヤーへ渡らない', () => {
  it('hands a screen a sentence and an id, and nothing else', () => {
    const world = livingVillage();
    const shown = playerNewsday({
      state: world,
      kinds: RULES.kinds,
      signals: ALDEN_SIGNALS,
      noise: ALDEN_NOISE,
      count: ALDEN_NEWS_PER_DAY,
      day: 9,
    });
    expect(shown).toHaveLength(ALDEN_NEWS_PER_DAY);
    for (const item of shown) {
      expect(Object.keys(item).sort()).toEqual(['id', 'text']);
    }
  });

  it('strips importance, seed and vine from a signal on its way out', () => {
    const signal = availableSignals(ALDEN_SIGNALS, livingVillage(), RULES.kinds)[0];
    expect(signal.importance).toBeTruthy();
    const shown = forPlayer(signal);
    expect('importance' in shown).toBe(false);
    expect('seedEffect' in shown).toBe(false);
    expect('vineEffect' in shown).toBe(false);
    expect('propagationPotential' in shown).toBe(false);
  });

  it('never names a mechanism in anything a player reads', () => {
    const world = livingVillage();
    const words = [
      'SEED',
      'VINE',
      'BLOOM',
      'ROOTED',
      'GROWING',
      'DORMANT',
      'FADED',
      '強度',
      '重要度',
    ];
    const said = [
      ...ALDEN_NOISE.map((item) => item.text),
      ...ALDEN_SIGNALS.map((def) => def.text),
      ...playerNewsday({
        state: world,
        kinds: RULES.kinds,
        signals: ALDEN_SIGNALS,
        noise: ALDEN_NOISE,
        count: 20,
        day: 3,
      }).map((item) => item.text),
    ].join('\n');
    for (const word of words) expect(said).not.toContain(word);
    // Nor anybody's id: the village talks about 「村の娘」, not about LINA.
    for (const core of RULES.cores) expect(said).not.toContain(core.npcId);
  });

  it('does not sort what is shown by how much it matters', () => {
    // If the order ever tracked importance, the field would be visible
    // without ever being rendered — a player would learn to read the
    // last line first.
    //
    // Checked across many days rather than on one, because with one
    // signal among four chickens a single day lands in sorted order one
    // time in five by coincidence, and a test that calls that evidence
    // is a test that will one day call a real regression a fluke.
    const world = livingVillage();
    let signalCameFirst = 0;
    for (let day = 1; day <= 40; day++) {
      const kinds = aDay(world, day).map((item) => item.kind);
      const signalAt = kinds.indexOf('SIGNAL');
      const noiseAt = kinds.indexOf('NOISE');
      if (signalAt >= 0 && noiseAt >= 0 && signalAt < noiseAt) signalCameFirst += 1;
    }
    expect(signalCameFirst).toBeGreaterThan(0);
  });
});

describe('a line is only sayable when it is true', () => {
  it('will not say a girl practises before anybody showed her anything', () => {
    const def = ALDEN_SIGNALS.find((d) => d.id === 'signal_lina_practising')!;
    expect(signalHolds(def, quietVillage(), RULES.kinds)).toBe(false);
    expect(signalHolds(def, livingVillage(), RULES.kinds)).toBe(true);
  });

  it('will not say the two of them drink together before the guard let go', () => {
    const def = ALDEN_SIGNALS.find((d) => d.id === 'signal_gald_and_guard')!;
    expect(signalHolds(def, livingVillage(400), RULES.kinds)).toBe(false);
    expect(signalHolds(def, livingVillage(1500), RULES.kinds)).toBe(true);
  });

  it('stops saying a thing that has stopped being true', () => {
    // She gave up. The village notices that instead.
    const practising = ALDEN_SIGNALS.find((d) => d.id === 'signal_lina_practising')!;
    const gaveUp = ALDEN_SIGNALS.find((d) => d.id === 'signal_lina_gave_up')!;
    let lonely = observe(
      emptyWorld(INITIAL_CLOCK),
      { action: 'SHOW_MAGIC', actor: 'KAOS', target: HER, location: 'ALDEN_VILLAGE' },
      RULES,
    ).state;
    lonely = settle(advanceTime(lonely, 1600, 'STORY_TIME_ADVANCE'), RULES);
    expect(signalHolds(practising, lonely, RULES.kinds)).toBe(false);
    expect(signalHolds(gaveUp, lonely, RULES.kinds)).toBe(true);
  });

  it('says nothing about a girl nobody ever showed anything to', () => {
    // 'FADED at most' must not be satisfied by never having had it.
    const gaveUp = ALDEN_SIGNALS.find((d) => d.id === 'signal_lina_gave_up')!;
    expect(signalHolds(gaveUp, quietVillage(), RULES.kinds)).toBe(false);
  });
});

describe('what the author can ask that the player cannot', () => {
  it('reports what the village could say and what it is still silent about', () => {
    const report = newsReport(ALDEN_SIGNALS, livingVillage(), RULES.kinds);
    expect(report.available.length + report.silent.length).toBe(ALDEN_SIGNALS.length);
    expect(report.available.some((s) => s.id === 'signal_gald_and_guard')).toBe(true);
    expect(report.silent).toContain('signal_lina_gave_up');
  });

  it('keeps the internal fields where an author can read them', () => {
    const loud = availableSignals(ALDEN_SIGNALS, livingVillage(), RULES.kinds).find(
      (s) => s.id === 'signal_gald_and_guard',
    )!;
    expect(loud.importance).toBe('TALK');
    expect(loud.vineEffect).toEqual({ source: 'ALDEN_GUARD', target: GALD });
    expect(loud.propagationPotential).toBeGreaterThan(0.5);
  });

  it('asks about only the entries somebody wrote', () => {
    // No pass generates a sentence per seed per person.
    const asked = newsReport(ALDEN_SIGNALS, livingVillage(), RULES.kinds);
    expect(asked.available.length + asked.silent.length).toBe(ALDEN_SIGNALS.length);
    expect(ALDEN_SIGNALS.length).toBeLessThan(RULES.cores.length * RULES.kinds.length);
  });
});

describe('a day with no room in it', () => {
  it('says nothing when asked for nothing', () => {
    expect(aDay(livingVillage(), 1, 0)).toEqual([]);
  });

  it('gives a one-line day a chicken rather than a briefing', () => {
    // floor(1 * 0.2) is zero, which is the right answer: if the village
    // only says one thing today, it is about a chicken.
    for (let day = 1; day <= 10; day++) {
      const one = aDay(livingVillage(), day, 1);
      expect(one).toHaveLength(1);
      expect(one[0].kind).toBe('NOISE');
    }
  });

  it('never returns more than it was asked for', () => {
    const world = livingVillage();
    for (const count of [1, 3, 5, 8, 40]) {
      expect(aDay(world, 4, count).length).toBeLessThanOrEqual(count);
    }
  });

  it('handles a village with nothing written for it at all', () => {
    const empty: NewsItem[] = newsday({
      state: livingVillage(),
      kinds: RULES.kinds,
      signals: [] as NewsSignalDef[],
      noise: [],
      count: 5,
      day: 1,
    });
    expect(empty).toEqual([]);
  });
});
