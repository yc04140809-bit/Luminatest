// ANONYMOUS GROUPS — people the world speaks of as a group, nobody named
// (作者 2026-10-20).
//
// Not the registry of named people (registry.ts), and never written into it:
// an entry there is somebody — a name, a place, a standing — and a group of
// merchants on a road is nobody in particular. The checks that ask "is every
// id the content uses somebody the registry knows?" (content/people/
// registry.test.ts, the Artifact's god view) accept these as allowed group
// expressions instead.
//
// If one person out of a group is ever made a character in their own right,
// THAT person goes into the registry under their own id — the group stays here.

export interface AnonymousGroup {
  /** The id the content uses for the group (an actor, a core, a bloom's person). */
  id: string;
  /** What a developer's screen calls them. */
  displayName: string;
  /** Where in the world they come from, and why nobody is named. */
  note: string;
}

export const ANONYMOUS_GROUPS: readonly AnonymousGroup[] = [
  {
    id: 'MERCHANT_CARAVAN',
    displayName: '商会の人々',
    note: 'ROUTE D（見逃す）：村の外で襲われた商会の人々と護衛。バルドの家とはしない、誰も名指ししない。',
  },
];

export function isAnonymousGroup(id: string): boolean {
  return ANONYMOUS_GROUPS.some((group) => group.id === id);
}
