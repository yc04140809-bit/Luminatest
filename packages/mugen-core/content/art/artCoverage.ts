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

/**
 * How many missing states a line names before it stops counting them.
 *
 * A LINE THAT LISTS EVERYTHING STOPS BEING READABLE. There were eleven
 * party states when this was written and there are fifteen now, so a
 * character with one drawing produced a hundred and ninety characters
 * of state names — which on an 800-pixel phone wrapped to five rows,
 * six times over, and pushed the DEV panel past the bottom of its own
 * screen. The panel is read at a glance: the COUNT is the thing, and
 * the first few names are enough to know what kind of gap it is.
 */
const NAMES_PER_LINE = 4;

/** One line per character, for a report or a DEV panel. */
export function artCoverageLines(): string[] {
  return artCoverage().map((row) => {
    const total = row.present.length + row.missing.length;
    const shown = row.missing.slice(0, NAMES_PER_LINE).join(', ');
    const rest = row.missing.length - NAMES_PER_LINE;
    const missing =
      row.missing.length === 0 ? 'なし' : rest > 0 ? `${shown} ほか${rest}件` : shown;
    return `${row.label}（${row.id}）: ${row.present.length}/${total} — 未実装 ${missing}`;
  });
}
