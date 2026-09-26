import { describe, expect, it } from 'vitest';
import { ARCANA_DEFS } from '@mugen/content/arcana/arcanaDefs';
import type { ArcanaRecord } from '@mugen/core/arcana/arcana';
import { battleArcanaOf } from './battleArcana';
import { memoryDepth } from './battleHud';
import { arcanaReading } from './arcanaDepth';

/**
 * The App's reading of the pages equals the Artifact's, for a world with
 * nothing, a little, and a finished page.
 */
describe('arcana reading', () => {
  const id = ARCANA_DEFS[0].arcanaId;
  const all = ARCANA_DEFS[0].conditions.map((c) => c.id);
  const worlds: ArcanaRecord[][] = [
    [],
    [{ arcanaId: id, met: [all[0]], completeSeen: false }],
    [{ arcanaId: id, met: [...all], completeSeen: false }],
  ];
  worlds.forEach((records, i) => {
    it(`matches the Artifact for world ${i}`, () => {
      const theirs = battleArcanaOf(ARCANA_DEFS, records);
      const mine = arcanaReading(ARCANA_DEFS, records);
      expect(mine.depth).toBe(memoryDepth(theirs));
      expect(mine.anyComplete).toBe(theirs.some((a) => a.complete));
    });
  });
});
