// WHO IS IN THE FIGHT.
//
// The roster, and nothing else: no drawing, no layout, no React. A
// screen asks who is standing and is told, in the order they stand —
// front rank first. Kept out of the UI on purpose, because every reason
// this list will ever change (somebody joins for one chapter, somebody
// is carried out of the fight, an event fixes the party for a scene) is
// a fact about the world rather than about a screen.
//
// v0.1 answers with the two of them, always, which is exactly what the
// battle screen drew before there was a roster. The conditions come
// later, and they come HERE.

export interface PartyMember {
  /** Their id in the art registry and in the size registry. One id. */
  id: string;
  /** Their name, for a placeholder where a picture is missing. */
  label: string;
}

const HERO: PartyMember = { id: 'hero', label: 'あなた' };
const KAOS: PartyMember = { id: 'kaos', label: 'ケイオス' };

/**
 * The party standing in this fight, front rank first.
 *
 * Order is position: the first of them is nearest the enemy. Swapping
 * two entries swaps where they stand, which is the whole of "character
 * swapping" as far as the field is concerned.
 */
export function activeParty(
  /**
   * DISPLAY NAMES, by id, for anybody the player has renamed.
   *
   * Optional on purpose. A caller with no world — the Artifact, a
   * test, anything drawing the roster before a save is open — passes
   * nothing and gets the written labels, exactly as before. A caller
   * that HAS a world passes `{ hero: world.getHeroName() }` and gets
   * what the player chose. The id never moves either way, which is
   * what keeps renaming from reaching the battle or WORLD MEMORY.
   */
  names?: Readonly<Record<string, string>>,
): readonly PartyMember[] {
  const roster = [HERO, KAOS];
  if (!names) return roster;
  return roster.map((member) => {
    const given = names[member.id];
    return given ? { ...member, label: given } : member;
  });
}
