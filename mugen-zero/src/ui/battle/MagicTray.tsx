import type { MagicDef } from '../../core/magic/magic';

interface Props {
  spells: readonly MagicDef[];
  mp: number;
  onCast: (id: string) => void;
  onClose: () => void;
}

/**
 * What she can do, and what it costs.
 *
 * A way of choosing rather than a second action: opening it spends
 * nothing, closing it spends nothing, and picking from it spends the
 * one turn the player had. A spell she cannot pay for is shown and
 * disabled rather than hidden — a player needs to know it exists and
 * why they cannot have it.
 */
export function MagicTray({ spells, mp, onCast, onClose }: Props) {
  return (
    <div className="magic-tray" data-testid="magic-tray">
      {spells.length === 0 && <p className="magic-tray-empty">まだ使える魔法がない。</p>}
      {spells.map((spell) => {
        const affordable = mp >= spell.mpCost;
        return (
          <button
            key={spell.id}
            className="magic-tray-item"
            data-testid={`magic-${spell.id}`}
            disabled={!affordable}
            onClick={() => onCast(spell.id)}
          >
            <span className="magic-tray-name">《{spell.name}》</span>
            <span className="magic-tray-cost" data-testid={`magic-cost-${spell.id}`}>
              MP {spell.mpCost}
            </span>
            {!affordable && <span className="magic-tray-short">MPが足りない</span>}
          </button>
        );
      })}
      <button className="magic-tray-close" data-testid="magic-close" onClick={onClose}>
        やめる
      </button>
    </div>
  );
}
