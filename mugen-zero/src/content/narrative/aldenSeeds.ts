// The loose threads the Alden region is currently holding.
//
// Two, on purpose. A world where everything is a clue has no clues; the
// player has to be able to meet a burnt stew and know it was just a
// burnt stew.

import type { NarrativeSeedDef } from '../../core/narrative/types';

export const ALDEN_NARRATIVE_SEEDS: readonly NarrativeSeedDef[] = [
  {
    seedId: 'TAVERN_MASTER_OLD_GREATSWORD',
    title: '酒場の壁の両手剣',
    sourceEventId: 'TAVERN_MASTER_OLD_GREATSWORD',
    relatedCharacters: ['GRAVE'],
    relatedLocations: ['MOONLIGHT_TAVERN'],
    // Nothing in this build answers it.
  },
  {
    seedId: 'ALDEN_UNSIGNED_LETTER',
    title: '差出人のない手紙',
    sourceEventId: 'ALDEN_UNSIGNED_LETTER',
    // Deliberately nobody's: it is the one thread with no face attached,
    // so the player cannot file it under "that man's story".
    relatedCharacters: [],
    relatedLocations: ['ALDEN_VILLAGE'],
  },
];
