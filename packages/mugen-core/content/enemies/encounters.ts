// WHAT IS MET IN THE FOREST — the ordinary fights (作者判断 2026-10-10).
//
// Every ordinary creature FORGE sends is, unless there is a reason not, a
// part of the forest's life: met in ordinary fights, at a rate set against
// the others. A creature's one story (a particular individual, met once) is
// a different thing and does not take the species out of the forest.
//
//   モスラビット  always
//   フウミミ      once the one individual (IND-43452DFD) has been answered —
//                 its kind is first met as that one, then as itself
//   ヒョウレイ    a little after it is first talked about: the rumour comes
//                 with the signs' second phase (6 points); it is met from 8,
//                 two steps of the player's on — never by reading the rumour
//
// The rabbit stays the commonest; the two newer ones are rarer and longer
// fights. Which one comes is a roll the caller makes (0 ≤ roll < 1).

import type { SekiryugaStage } from '../../core/world/storyArc';
import type { DialogueLine } from '../dialogue/prologue';
import type { SpeciesId } from './species';
import { HYOUREI_FIRST_SIGHT } from './hyourei';

export interface WildFacts {
  stage: SekiryugaStage;
  /** ALDEN INCIDENT's hidden point. */
  point: number;
  /** Whether フウミミ's one individual has been answered. */
  fuumimiAnswered: boolean;
}

/** ヒョウレイ is met from this point on (its rumour comes at 6). */
export const HYOUREI_MET_FROM_POINT = 8;

export interface WildEntry {
  speciesId: SpeciesId;
  /** Relative weight among those open now. */
  weight: number;
  opens: (facts: WildFacts) => boolean;
}

export const GREENWOOD_ENCOUNTERS: readonly WildEntry[] = [
  { speciesId: 'moss_rabbit', weight: 6, opens: () => true },
  { speciesId: 'fuumimi', weight: 2, opens: (f) => f.fuumimiAnswered },
  { speciesId: 'hyourei', weight: 2, opens: (f) => f.stage === 'SETTLED' && f.point >= HYOUREI_MET_FROM_POINT },
];

/** The creatures that can be met in the forest now. */
export function wildOpenIn(facts: WildFacts): readonly WildEntry[] {
  return GREENWOOD_ENCOUNTERS.filter((e) => e.opens(facts));
}

/** Which one comes, for a roll in [0, 1). */
export function wildSpeciesFor(facts: WildFacts, roll: number): SpeciesId {
  const open = wildOpenIn(facts);
  const total = open.reduce((n, e) => n + e.weight, 0);
  let at = Math.min(Math.max(roll, 0), 0.999999) * total;
  for (const e of open) {
    if (at < e.weight) return e.speciesId;
    at -= e.weight;
  }
  return open[open.length - 1].speciesId;
}

/** A few lines the first time a kind is met in an ordinary fight (none for the rabbit). */
export const FIRST_SIGHT: Partial<Record<SpeciesId, readonly DialogueLine[]>> = {
  hyourei: HYOUREI_FIRST_SIGHT,
  fuumimi: [
    { speaker: null, text: '翅の音。あの時と同じ姿の生き物が、茂みから飛び出してきた。' },
    { speaker: 'ケイオス', text: '……別の子だね。この子は、ただ気が立ってるだけみたい。' },
  ],
};

/** readMarks id: the first sight of a kind, seen. */
export const firstSightMark = (speciesId: SpeciesId): string => `note:FIRST_SIGHT_${speciesId}`;
