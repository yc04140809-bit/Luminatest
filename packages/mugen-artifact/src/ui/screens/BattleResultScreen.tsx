import { useState } from 'react';
import { itemDef } from '@mugen/content/economy/itemDefs';
import type { AppliedReward } from '@mugen/core/progression/battleReward';

interface Props {
  /**
   * WHAT LANDED, not what the fight was worth.
   *
   * The world works out which of the offered items the bag had room
   * for and which characters were not already at the ceiling, and this
   * draws that. A screen fed the OFFER would congratulate a player on a
   * herb they did not get.
   */
  reward: AppliedReward;
  /** Back to the path — or to wherever the fight was entered from. */
  onDone: () => void;
}

/**
 * WHAT THE FIGHT WAS WORTH.
 *
 * A screen of its own, between the battlefield and the forest, and
 * that is what makes the winnings safe: the fight is over, the walk has
 * not started, and nothing the player taps can reach either of them
 * until they close this. The reward itself was applied and saved before
 * this was ever drawn — so a reload, a double tap or a re-render shows
 * the same figures rather than paying them again.
 *
 * SMALL ON PURPOSE. This is the place MUGEN ZERO will eventually put
 * world memory, resonance and arcana as well, and every one of those is
 * a bigger idea than a number. What is here is the three that exist,
 * said plainly, with room underneath them rather than decoration.
 */
export function BattleResultScreen({ reward, onDone }: Props) {
  /**
   * ONE WAY OUT, PRESSED ONCE.
   *
   * A thumb on a phone produces two or three taps before a screen has
   * finished leaving, and the second of them used to ask the flow to go
   * somewhere it already was — which throws. The winnings were never at
   * risk (the world refuses a reward it has already paid), but the
   * navigation was, so the button stops being a button the moment it
   * has been one.
   */
  const [leaving, setLeaving] = useState(false);
  const levelled = reward.levels.filter((row) => row.levelsGained > 0);
  return (
    <div className="screen result-screen" data-testid="battle-result">
      <div className="result-plate">
        <p className="result-label">BATTLE RESULT</p>
        <span className="result-rule" aria-hidden="true" />

        <dl className="result-gains">
          <div className="result-gain">
            <dt>EXP</dt>
            <dd data-testid="result-exp">+{reward.exp}</dd>
          </div>
          <div className="result-gain">
            {/* LUMI, and never Gold, G or Coin. It is the currency's
                name, not a label somebody chose for this screen. */}
            <dt>LUMI</dt>
            <dd data-testid="result-lumi">+{reward.lumi}</dd>
          </div>
        </dl>

        <div className="result-items" data-testid="result-items">
          <p className="result-heading">ITEM</p>
          {reward.items.length === 0 ? (
            // An honest nothing rather than an empty space: a fight that
            // dropped nothing is a fight that dropped nothing, and a
            // blank gap reads as a screen that failed to load.
            <p className="result-none" data-testid="result-no-items">
              なし
            </p>
          ) : (
            <ul>
              {reward.items.map((stack) => (
                <li key={stack.itemId} data-testid={`result-item-${stack.itemId}`}>
                  <span className="result-item-name">
                    {itemDef(stack.itemId)?.name ?? stack.itemId}
                  </span>
                  <span className="result-item-count">×{stack.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {levelled.length > 0 && (
          <div className="result-levels" data-testid="result-levels">
            <p className="result-heading">LEVEL UP</p>
            <ul>
              {levelled.map((row) => (
                <li key={row.characterId} data-testid={`result-level-${row.characterId}`}>
                  <span className="result-item-name">{row.label}</span>
                  <span className="result-level-move">
                    Lv.{row.from} <i aria-hidden="true">→</i> Lv.{row.to}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          className="result-done"
          data-testid="result-done"
          disabled={leaving}
          onClick={() => {
            if (leaving) return;
            setLeaving(true);
            onDone();
          }}
        >
          つづける
        </button>
      </div>
    </div>
  );
}
