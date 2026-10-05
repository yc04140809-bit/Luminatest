import { describe, expect, it } from 'vitest';
import { WALK_PLACES, WALK_PLACE_IDS } from './walkPlaces';
import { RUINS_WALK } from './ruinsWalk';
import { GREENWOOD_WALK } from './greenwoodWalk';
import { ambientLinesFor, pointLine, pointsFor } from './walkScene';

const empty = { known: new Set<string>(), day: 1 };

describe('the places that can be walked', () => {
  it('six of them, each with an id and a name; all but the forest a working title', () => {
    expect(WALK_PLACE_IDS.sort()).toEqual(
      ['ANCIENT_RUINS', 'CASTLE_TOWN', 'GRASSLAND', 'GREENWOOD_FOREST', 'SEASHORE', 'SWAMP'].sort(),
    );
    for (const id of WALK_PLACE_IDS) {
      expect(WALK_PLACES[id].id).toBe(id);
      expect(WALK_PLACES[id].title.length).toBeGreaterThan(0);
      expect(WALK_PLACES[id].provisional, id).toBe(id !== 'GREENWOOD_FOREST');
    }
  });

  it('the ruins take their name from the table, so renaming them is one line', () => {
    expect(RUINS_WALK.id).toBe('ANCIENT_RUINS');
    expect(RUINS_WALK.title).toBe(WALK_PLACES.ANCIENT_RUINS.title);
    expect(RUINS_WALK.title).toBe('古代遺跡');
  });
});

describe('古代遺跡, walked', () => {
  it('three things to look at, each saying only what the painting shows', () => {
    const lines = Object.fromEntries(pointsFor(RUINS_WALK, empty).map((p) => [p.id, pointLine(p, empty)]));
    expect(lines).toEqual({
      STONE_ARCH: '欠けた石のアーチが、遠い山々を切り取っている。',
      OLD_BANNER: '色褪せた旗が、風に小さく揺れている。',
      BROKEN_STEPS: '崩れた石段に、白い花が根を張っている。',
    });
  });

  it('things noticed while walking, short ones; no figures, no conditions, nothing that changes', () => {
    const lines = ambientLinesFor(RUINS_WALK, empty);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const l of lines) expect(l.length, l).toBeLessThanOrEqual(24);
    expect(RUINS_WALK.figures ?? []).toEqual([]);
    for (const p of RUINS_WALK.points) expect(p.when).toBeUndefined();
    for (const l of [...RUINS_WALK.ambientLines, ...RUINS_WALK.points.flatMap((p) => p.lines)]) expect(l.when).toBeUndefined();
  });

  it('looks higher up its painting than the forest, which keeps the bottom as before', () => {
    expect(RUINS_WALK.framing).toBeLessThan(1);
    expect(GREENWOOD_WALK.framing ?? 1).toBe(1);
  });
});
