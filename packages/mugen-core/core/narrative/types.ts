// NARRATIVE SEED v0.1 — the questions the world has asked and not answered.
//
// A seed is not world canon. WORLD MEMORY records what happened; a seed
// records that the player has been shown a loose thread. Keeping the two
// apart is the point: a sword on a wall is not an event, and "the player
// wondered about it" must never turn up in the LIFE ARCHIVE.
//
// Deliberately not a narrative graph. Four states, one registry, no
// dependencies between seeds, no scheduler.

export type SeedState =
  /** Planted in the world, but the player has not met it. */
  | 'SEED'
  /** The player has seen it and knows there is something there. */
  | 'HINTED'
  /** Being followed — reserved for a later build. */
  | 'ACTIVE'
  /** Answered. Nothing in this build reaches here yet. */
  | 'RESOLVED';

export interface NarrativeSeedDef {
  seedId: string;
  /** Short human title, for the dev admin and for us. */
  title: string;
  /** The experience event that shows it to the player. */
  sourceEventId: string;
  relatedCharacters: string[];
  relatedLocations: string[];
  /** Filled in when a build finally answers it. */
  resolvedByEventId?: string;
}

export interface NarrativeSeedStatus {
  def: NarrativeSeedDef;
  state: SeedState;
  /** Whether the player has actually been shown it. */
  playerKnown: boolean;
}
