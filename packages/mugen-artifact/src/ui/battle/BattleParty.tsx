import { BattleActor } from './BattleActor';
import type { ActorView } from './actorView';
import { partyFormation } from './formation';

interface Props<S extends string> {
  /** The party, front rank first. Its length picks the formation. */
  actors: readonly ActorView<S>[];
  /** The field's height in real pixels. */
  stageHeight: number;
}

/**
 * THE PARTY, as one thing that is drawn.
 *
 * This is the whole of the change it exists for: a screen hands over a
 * list of people and gets a party on the field, so a screen never again
 * contains one block of markup per character and never again grows a
 * branch when a character joins. Two today, four when there are four.
 *
 * It is the party's own component — it knows the party stands on the
 * right and reads the party's formation table — while the drawing of
 * any one of them is BattleActor's, which knows neither. An enemy group
 * is that same actor with the other table and the other edge.
 */
export function BattleParty<S extends string>({ actors, stageHeight }: Props<S>) {
  const slots = partyFormation(actors.length);
  return (
    <>
      {actors.slice(0, slots.length).map((actor, i) => (
        <BattleActor
          key={actor.id}
          actor={actor}
          placement={slots[i]}
          edge="right"
          stageHeight={stageHeight}
        />
      ))}
    </>
  );
}
