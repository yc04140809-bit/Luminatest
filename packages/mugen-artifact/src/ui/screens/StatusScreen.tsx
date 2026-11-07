import { BATTLE_FIGURES } from '@mugen/assets';
import { activeParty } from '@mugen/game/party/battleParty';
import {
  battleProfileOf,
  battleStyleLabelOf,
  weaponLabelOf,
} from '@mugen/content/characters/battleProfiles';
import type { PartyCondition } from '@mugen/core/party/condition';

/**
 * WHO THE PARTY ARE, rather than how they are doing.
 *
 * The village screen already answers the second question in one line —
 * what a fight cost them, where they will see it before walking into
 * the next one — and that line is deliberately not a status screen.
 * This is the status screen, and it is a different job: a page you
 * open to LOOK at the people, with room for the things a page like
 * that grows.
 *
 * READ-ONLY, ALL OF IT. Nothing here changes anything: there is no
 * equipment system to change, no skins to swap, and inventing either
 * so that this screen would have a button was not the round's work.
 * What it does is make a place for them to arrive in — the shape below
 * has a slot for a weapon name, armour, an accessory and an outfit,
 * and adding one is a row rather than a screen.
 *
 * WHERE EVERY FACT COMES FROM, so that none of them is written twice:
 *
 *   who is here      the party roster, the same one the fight uses
 *   the picture      the battle figures, by the roster's own id
 *   weapon / style   content/characters/battleProfiles
 *   LV               the world
 *   HP / MP          the party condition the village line already reads
 *
 * Nothing is keyed off a character's NAME, which is what would break
 * the day somebody is renamed or a third person joins.
 */
interface Props {
  /** Their levels, by the roster's id. */
  levels: Record<string, number>;
  /** What each has left, and can hold. The same store HOME reads. */
  party: PartyCondition;
  onBack: () => void;
}

const FIGURES: Record<string, string | undefined> = BATTLE_FIGURES;

export function StatusScreen({ levels, party, onBack }: Props) {
  return (
    <div className="screen status-screen" data-testid="status-screen">
      <p className="place">ステータス</p>
      <div className="status-list">
        {activeParty().map((member) => {
          const profile = battleProfileOf(member.id);
          const condition = party[member.id];
          const figure = FIGURES[profile?.portraitKey ?? member.id];
          return (
            <section
              className="status-card"
              key={member.id}
              data-testid={`status-${member.id}`}
            >
              {/* Decoration: everything that must be read is text. */}
              {figure && (
                <div className="status-figure" aria-hidden="true">
                  <img src={figure} alt="" />
                </div>
              )}
              <div className="status-facts">
                <p className="status-name" data-testid={`status-name-${member.id}`}>
                  {member.label}
                </p>
                <p className="status-row">
                  <span className="status-key">LV</span>
                  <span data-testid={`status-level-${member.id}`}>{levels[member.id] ?? 1}</span>
                </p>
                {condition && (
                  <>
                    <p className="status-row">
                      <span className="status-key">HP</span>
                      <span data-testid={`status-hp-${member.id}`}>
                        {condition.currentHp}/{condition.maxHp}
                      </span>
                    </p>
                    <p className="status-row">
                      <span className="status-key">MP</span>
                      <span data-testid={`status-mp-${member.id}`}>
                        {condition.currentMp}/{condition.maxMp}
                      </span>
                    </p>
                  </>
                )}
                {profile && (
                  <>
                    <p className="status-row">
                      <span className="status-key">武器種</span>
                      <span data-testid={`status-weapon-${member.id}`}>
                        {weaponLabelOf(profile)}
                      </span>
                    </p>
                    <p className="status-row">
                      <span className="status-key">戦闘スタイル</span>
                      <span data-testid={`status-style-${member.id}`}>
                        {battleStyleLabelOf(profile)}
                      </span>
                    </p>
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <div className="screen-footer">
        <button className="btn" data-testid="status-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
