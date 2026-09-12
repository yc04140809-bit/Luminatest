import { describe, it, expect } from 'vitest';
import { artCoverage } from './artCoverage';
import { activeParty } from '../../game/party/battleParty';
import { PARTY_ART } from './partyArt';
import { SPRITE_FRAMES } from './spriteFrames';
import { ENEMY_ART, ENEMY_ART_STATES } from './enemyArt';
import { PARTY_ART_STATES } from './partyArt';

describe('art coverage', () => {
  const rows = artCoverage();
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

  it('counts every state exactly once for every character', () => {
    for (const row of rows) {
      const all = row.side === 'ENEMY' ? ENEMY_ART_STATES : PARTY_ART_STATES;
      expect([...row.present, ...row.missing].sort()).toEqual([...all].sort());
    }
  });

  it('knows the moss rabbit has two of its ten pictures', () => {
    // This is the number a report quotes. If somebody draws one more,
    // this test is the thing that says the report is now out of date.
    expect(byId.moss_rabbit.present).toEqual(['front', 'down']);
    expect(byId.moss_rabbit.missing).toContain('attack');
    expect(byId.moss_rabbit.missing).toContain('damage');
  });

  it('knows the party is standing in exploration sprites', () => {
    expect(byId.hero.present).toContain('battle_idle');
    expect(byId.hero.missing).toContain('battle_attack');
    expect(byId.kaos.present).toContain('battle_idle');
    expect(byId.kaos.present).toContain('portrait');
  });

  /**
   * The one thing that would let a third member arrive as a question
   * mark.
   *
   * Joining the party is two files — the roster and this registry — and
   * nothing crashes if somebody does only the first: the art layer
   * answers with a placeholder and the battlefield draws a '?'. That is
   * the right failure at runtime and the wrong one to find in a
   * screenshot, so it is a failing test instead.
   */
  it('has a battle picture and a size for everybody in the party', () => {
    for (const member of activeParty()) {
      expect(PARTY_ART[member.id], `${member.id} has no pictures`).toBeDefined();
      expect(
        PARTY_ART[member.id]?.states.battle_idle,
        `${member.id} has no standing battle picture`,
      ).toBeDefined();
      expect(SPRITE_FRAMES[member.id], `${member.id} has no size on the stage`).toBeDefined();
    }
  });

  /**
   * FACE BOXES — the six numbers that make a 27-pixel turn order icon a
   * face instead of a crop of somebody's shoulder.
   *
   * A face box is a rectangle in FILE coordinates, and the failure it
   * has is silent: a box past the edge of its file draws nothing at
   * all, and a battle screen with three empty diamonds in the corner is
   * a thing you find in a screenshot rather than in a stack trace. So
   * every one of them is checked to be inside the file it names, and to
   * be square enough to sit in a diamond.
   */
  it('keeps every face box inside the file it is measured from', () => {
    const sets = [
      ...Object.values(PARTY_ART).map((set) => ['party', set] as const),
      ...Object.values(ENEMY_ART).map((set) => ['enemy', set] as const),
    ];
    let measured = 0;
    for (const [side, set] of sets) {
      for (const [state, asset] of Object.entries(set.states)) {
        const face = (asset as { face?: { fileW: number; fileH: number; x: number; y: number; width: number; height: number } }).face;
        if (!face) continue;
        measured += 1;
        const where = `${side}/${set.id}/${state}`;
        expect(face.width, `${where}: a face with no width`).toBeGreaterThan(0);
        expect(face.height, `${where}: a face with no height`).toBeGreaterThan(0);
        expect(face.x, `${where}: starts before the file`).toBeGreaterThanOrEqual(0);
        expect(face.y, `${where}: starts above the file`).toBeGreaterThanOrEqual(0);
        expect(face.x + face.width, `${where}: runs off the right of the file`).toBeLessThanOrEqual(
          face.fileW,
        );
        expect(face.y + face.height, `${where}: runs off the bottom of the file`).toBeLessThanOrEqual(
          face.fileH,
        );
        // Roughly square, because the thing it is drawn into is. A face
        // box twice as wide as it is tall is a measurement mistake.
        const ratio = face.width / face.height;
        expect(ratio, `${where}: not a face-shaped box`).toBeGreaterThan(0.6);
        expect(ratio, `${where}: not a face-shaped box`).toBeLessThan(1.7);
      }
    }
    // And that there are some: the turn order and the party column both
    // read faces, so losing every box would be a silent regression.
    expect(measured, 'nobody has a measured face').toBeGreaterThanOrEqual(3);
  });

  it('has nobody with nothing at all', () => {
    // A character in the registry with no pictures would be a
    // placeholder on the battlefield; that must be a decision, not a
    // typo nobody noticed.
    for (const row of rows) expect(row.present.length).toBeGreaterThan(0);
  });
});
