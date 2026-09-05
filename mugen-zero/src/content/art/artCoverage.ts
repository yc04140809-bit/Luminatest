// What has been drawn, and what has not.
//
// The art layer falls back silently by design — a missing attack pose
// must never be a broken image in front of a player — which means the
// only way anybody finds out what is still missing is if something
// counts it. This is that something. It is derived from the registries,
// so it cannot go out of date the way a hand-written list would.

import { statesMissing, statesPresent } from '../../core/art/artStates';
import { ENEMY_ART, ENEMY_ART_STATES } from './enemyArt';
import { PARTY_ART, PARTY_ART_STATES } from './partyArt';

export interface ArtCoverageRow {
  id: string;
  label: string;
  side: 'ENEMY' | 'PARTY';
  present: string[];
  missing: string[];
}

export function artCoverage(): ArtCoverageRow[] {
  const rows: ArtCoverageRow[] = [];
  for (const set of Object.values(ENEMY_ART)) {
    rows.push({
      id: set.id,
      label: set.label,
      side: 'ENEMY',
      present: statesPresent(set, ENEMY_ART_STATES),
      missing: statesMissing(set, ENEMY_ART_STATES),
    });
  }
  for (const set of Object.values(PARTY_ART)) {
    rows.push({
      id: set.id,
      label: set.label,
      side: 'PARTY',
      present: statesPresent(set, PARTY_ART_STATES),
      missing: statesMissing(set, PARTY_ART_STATES),
    });
  }
  return rows;
}

/** One line per character, for a report or a DEV panel. */
export function artCoverageLines(): string[] {
  return artCoverage().map(
    (row) =>
      `${row.label}（${row.id}）: ${row.present.length}/${row.present.length + row.missing.length} — ` +
      `未実装 ${row.missing.length === 0 ? 'なし' : row.missing.join(', ')}`,
  );
}
