import { CharacterArt } from '../art/CharacterArt';
import { spriteHeight } from '../../content/art/spriteFrames';
import type { ActorView } from './actorView';
import type { SlotPlacement } from './formation';

interface Props<S extends string> {
  actor: ActorView<S>;
  /** The place on the field they are standing in. */
  placement: SlotPlacement;
  /**
   * Which edge the placement's inset is measured from — the side of the
   * field this actor's side occupies. The party is on the right.
   */
  edge: 'left' | 'right';
  /** The field's height in real pixels; every size is a share of it. */
  stageHeight: number;
}

/**
 * Somebody standing on the battlefield.
 *
 * Deliberately knows nothing about parties or enemies: it is handed a
 * picture, a place and a height, and it puts the three together. That
 * is what lets an enemy group later be the same component with the
 * inset measured from the other edge.
 *
 * The height comes from content/art/spriteFrames and the field, never
 * from the pixel size of the file — the rule the landscape pass exists
 * to enforce — and the drawing itself is CharacterArt's business.
 */
export function BattleActor<S extends string>({ actor, placement, edge, stageHeight }: Props<S>) {
  const className = ['bf-actor', actor.beat, actor.downed ? 'downed' : '', actor.targeted ? 'targeted' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={className}
      data-actor={actor.id}
      style={{
        [edge]: `${placement.inset * 100}%`,
        bottom: `${placement.bottom * 100}%`,
        zIndex: placement.depth,
      }}
    >
      <span className="bf-shadow" aria-hidden="true" />
      <CharacterArt
        art={actor.art}
        height={spriteHeight(actor.id, actor.art.state, stageHeight)}
        className="bf-art"
        face={actor.face}
        label={actor.label}
        testId={actor.testId}
      />
    </div>
  );
}
