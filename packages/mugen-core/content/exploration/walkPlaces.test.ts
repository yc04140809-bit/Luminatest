import { describe, expect, it } from 'vitest';
import { itemDef } from '../economy/itemDefs';
import { WALK_PLACES, WALK_PLACE_IDS } from './walkPlaces';
import { RUINS_WALK } from './ruinsWalk';
import { GREENWOOD_WALK } from './greenwoodWalk';
import { FOREST_ITEM_IDS } from './forestFinds';
import { ambientLinesFor, markerAt, pointLine, pointsFor } from './walkScene';

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

  it('looks higher up its painting than the forest does, and the forest higher than its bottom edge', () => {
    // Both walked about in now: each shows enough above its floor that a
    // walker at the back stays whole on the screen.
    expect(RUINS_WALK.framing).toBeLessThan(GREENWOOD_WALK.framing!);
    expect(GREENWOOD_WALK.framing).toBeLessThan(1);
  });
});

describe('「！」 — where each thing’s mark stands', () => {
  it('on the thing itself: its own place when given, else just above where it is', () => {
    expect(markerAt({ id: 'A', label: 'a', at: { x: 0.4, y: 0.6 }, lines: [] })).toEqual({ x: 0.4, y: 0.57 });
    expect(markerAt({ id: 'B', label: 'b', at: { x: 0.4, y: 0.6 }, marker: { x: 0.42, y: 0.3 }, lines: [] })).toEqual({
      x: 0.42,
      y: 0.3,
    });
  });

  it('every place’s marks are inside its painting, never below where the walk stops for the thing', () => {
    for (const scene of [GREENWOOD_WALK, RUINS_WALK]) {
      for (const p of scene.points) {
        const m = markerAt(p);
        expect(m.x, p.id).toBeGreaterThan(0);
        expect(m.x, p.id).toBeLessThan(1);
        expect(m.y, p.id).toBeGreaterThan(0);
        expect(m.y, p.id).toBeLessThan(1);
        // Over the thing, never far off to one side of it.
        expect(Math.abs(m.x - p.at.x), p.id).toBeLessThan(0.05);
      }
    }
  });

  it('the ruins’ marks stand up on the arch, the banner and the steps, off the floor', () => {
    for (const p of RUINS_WALK.points) expect(markerAt(p).y, p.id).toBeLessThan(p.at.y);
  });
});

describe('古代遺跡, walked about in — small finds', () => {
  const roam = RUINS_WALK.roam!;

  it('a dozen of them, each its own, each a short line that only notices', () => {
    expect(roam.discoveries.length).toBeGreaterThanOrEqual(10);
    expect(new Set(roam.discoveries.map((d) => d.id)).size).toBe(roam.discoveries.length);
    expect(new Set(roam.discoveries.map((d) => d.text)).size).toBe(roam.discoveries.length);
    for (const d of roam.discoveries) {
      expect(d.label.length, d.id).toBeGreaterThan(0);
      expect(d.text.length, d.id).toBeGreaterThan(0);
      expect(d.text.length, d.id).toBeLessThan(60);
    }
  });

  it('they name nobody and give nothing: no one from the story, no reward', () => {
    const all = roam.discoveries.map((d) => d.text + d.label).join('\n');
    expect(all).not.toMatch(/ガルド|盗賊|ケイオス|リナ|エッダ|赤龍|手に入れた|獲得|LUMI|アイテム/);
  });

  it('the floor is an outline of at least three points, far behind near, the spots spread across it', () => {
    expect(roam.floor.length).toBeGreaterThanOrEqual(3);
    expect(roam.far).toBeLessThan(roam.near);
    expect(roam.spots.length).toBeGreaterThanOrEqual(8);
    const xs = roam.spots.map((s) => s.x);
    // From the road's lower left (the adopted painting's ground begins there) to its right.
    expect(Math.min(...xs)).toBeLessThan(0.25);
    expect(Math.max(...xs)).toBeGreaterThan(0.8);
  });

  it('the forest gives some of its floor away to an ordinary look too (作者 実機 2026-10-23): its own floor things, nothing new, the rest still sights', () => {
    const roam = GREENWOOD_WALK.roam!;
    const giving = roam.discoveries.filter((d) => d.reward);
    expect(giving.length).toBeGreaterThanOrEqual(4);
    // Not every look: most stay something seen.
    expect(giving.length).toBeLessThan(roam.discoveries.length / 2);
    // Only the forest's own floor things (forestFinds) and its nut — never a key, never anything rare.
    const floor = new Set([...FOREST_ITEM_IDS, 'FOREST_NUT']);
    for (const d of giving) {
      expect(floor.has(d.reward!.itemId), d.id).toBe(true);
      const def = itemDef(d.reward!.itemId);
      expect(def, d.id).not.toBeNull();
      expect(def!.isKeyItem ?? false, d.id).toBe(false);
      expect(def!.rarity, d.id).not.toBe('RARE');
      expect(d.reward!.quantity ?? 1).toBe(1);
    }
    expect(giving.map((d) => d.text + d.label).join('\n')).not.toMatch(/ガルド|盗賊|人影|誰か|一人|男|手に入れた/);
    // The ruins' and the meadow's ordinary finds still hand nothing over.
    for (const other of [RUINS_WALK]) expect(other.roam!.discoveries.filter((d) => d.reward)).toEqual([]);
  });

  it('the forest is walked about in too — with small finds of its own, golden ones that hand a material over (2026-10-11), and no rainbow one yet', () => {
    const roam = GREENWOOD_WALK.roam!;
    expect(roam.floor.length).toBeGreaterThanOrEqual(3);
    expect(roam.far).toBeLessThan(roam.near);
    expect(roam.discoveries.length).toBeGreaterThanOrEqual(10);
    expect(new Set(roam.discoveries.map((d) => d.id)).size).toBe(roam.discoveries.length);
    // Golden: each hands over a material already in the catalogue — never a key, never the rare shard.
    expect(roam.rareDiscoveries!.length).toBeGreaterThanOrEqual(4);
    for (const d of roam.rareDiscoveries!) {
      const def = itemDef(d.reward!.itemId);
      expect(def, d.id).not.toBeNull();
      expect(def!.isKeyItem ?? false, d.id).toBe(false);
      expect(def!.rarity, d.id).not.toBe('RARE');
      expect(d.reward!.quantity ?? 1, d.id).toBeGreaterThan(0);
    }
    const ids = [...roam.discoveries, ...roam.rareDiscoveries!].map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(roam.rareDiscoveries!.map((d) => d.text + d.label).join('\n')).not.toMatch(/ガルド|盗賊|人影|誰か|一人|男/);
    expect(roam.rainbow).toBeUndefined();
    // Its small finds are plants, animals and weather — never a person,
    // and nothing that speaks for the man in the road.
    const all = roam.discoveries.map((d) => d.text + d.label).join('\n');
    expect(all).not.toMatch(/ガルド|盗賊|人影|誰か|一人|男/);
    // Its own things are all still there, each looked at from the floor.
    expect(GREENWOOD_WALK.points.map((p) => p.id)).toEqual(['PUDDLE', 'FRESH_FOOTPRINTS', 'FALLEN_LOG', 'OLD_TREE']);
    for (const p of GREENWOOD_WALK.points) expect(p.stand, p.id).toBeDefined();
  });
});
