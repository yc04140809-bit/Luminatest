import type { FoundItemDef } from '../../content/exploration/forestFinds';

interface Props {
  item: FoundItemDef;
  /** Closes the card. The player decides when they have read it. */
  onTake: () => void;
}

/**
 * What was on the ground.
 *
 * A small parchment card over the forest, not a screen and not a
 * celebration: the word FOUND in gold, the thing's name, two lines about
 * it, and one way out. It never closes itself — whatever else a find is
 * worth, the player is allowed to know what they picked up.
 */
export function FoundItemCard({ item, onTake }: Props) {
  return (
    <div className="find-card-wrap">
      <div className="find-card" role="dialog" aria-label={`${item.name}を見つけた`}>
        <p className="find-card-label">FOUND</p>
        <span className="find-card-rule" aria-hidden="true" />
        <h2 className="find-card-name" data-testid="found-item-name">
          {item.name}
        </h2>
        <p className="find-card-text">{item.description}</p>
        <button className="find-card-take" data-testid="take-item" onClick={onTake}>
          手に入れた
        </button>
      </div>
    </div>
  );
}
