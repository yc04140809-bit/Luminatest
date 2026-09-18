import { itemDef } from '../../content/economy/itemDefs';
import { itemRefusalLine, refuseItem, type BattleState } from '../../game/battle/battleLogic';
import { useStatLabel, type ItemStack } from '../../core/economy/items';

interface Props {
  /** The bag as this fight sees it, counted down as things are used. */
  bag: readonly ItemStack[];
  battle: BattleState;
  onUse: (itemId: string) => void;
  onClose: () => void;
}

/**
 * THE BAG, IN A FIGHT.
 *
 * Built the same way the magic tray is, and refuses the same way: a
 * thing that cannot be used right now is SHOWN and disabled with the
 * reason written under it, never hidden. A player who bought a herb
 * and cannot find it in the fight they bought it for has been told the
 * game is broken, whatever the truth is.
 *
 * What is not listed at all is what is not for using — an old
 * arrowhead is material, and a bag where everything is a button is a
 * bag with no decisions in it. Those are still there; they are just
 * not here, because this is the list of things a turn can be spent on.
 */
export function ItemTray({ bag, battle, onUse, onClose }: Props) {
  const usable = bag
    .map((stack) => ({ stack, def: itemDef(stack.itemId) }))
    .filter((row) => row.def?.use);

  return (
    <div className="bp-tray" data-testid="bp-item-tray">
      {usable.length === 0 && (
        <p className="bp-tray-empty" data-testid="bp-item-empty">
          使えるものは持っていない。
        </p>
      )}
      {usable.map(({ stack, def }) => {
        const use = def!.use!;
        const refusal = refuseItem(battle, use, stack.quantity);
        return (
          <button
            key={stack.itemId}
            className="bp-tray-item"
            data-testid={`bp-item-${stack.itemId}`}
            disabled={refusal !== null}
            onClick={() => onUse(stack.itemId)}
          >
            <span className="bp-tray-name">
              {def!.name}
              <b className="bp-tray-count" data-testid={`bp-item-count-${stack.itemId}`}>
                ×{stack.quantity}
              </b>
            </span>
            <span className="bp-tray-sub">
              {refusal === null
                ? `${useStatLabel(use.kind)}が${use.amount}回復する`
                : itemRefusalLine(refusal, def!.name)}
            </span>
          </button>
        );
      })}
      <button className="bp-tray-close" data-testid="bp-item-close" onClick={onClose}>
        やめる
      </button>
    </div>
  );
}
