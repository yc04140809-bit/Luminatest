import { LOCATIONS } from '@mugen/content/locations/alden';
import type { OpenFutureSite } from '@mugen/core/world/world';

interface Props {
  onEnterGreenwood: () => void;
  onBack: () => void;
  /**
   * Places world truth has opened — the bakery, the roadside waystation,
   * the village workyard, the grave in the forest. Whichever route this
   * world took, the card stays an unspoiled 「？？？」 until the player has
   * actually been there: discovery belongs to the player, not the clock.
   */
  sites: OpenFutureSite[];
  onEnterSite: (siteId: string) => void;
  /** Places the player can walk into and talk to someone. */
  onEnterSpot: (spotId: string) => void;
  /**
   * The one door in the village that takes LUMI.
   *
   * A CARD IN THIS LIST rather than a button on HOME, because it is a
   * place: the player walks to it, and it sits beside the forest and
   * the tavern where somebody looking for somewhere to go will find it.
   */
  onEnterShop: () => void;
  /**
   * Places where something is waiting that the player has not met yet.
   * Derived from WORLD MEMORY plus what they have already seen — never a
   * UI-only flag, and never a hint about WHAT is there.
   */
  changedLocations: Set<string>;
}

export function ExploreScreen({
  onEnterGreenwood,
  onBack,
  sites,
  onEnterSite,
  onEnterSpot,
  onEnterShop,
  changedLocations,
}: Props) {
  // 「✦」 says only "there is something here". Which is the whole point:
  // it stops the player being lost without telling them the answer.
  const mark = (id: string) =>
    changedLocations.has(id) ? (
      <span className="location-new" data-testid={`new-mark-${id}`} aria-label="新しい出来事">
        ✦
      </span>
    ) : null;

  return (
    <div className="screen">
      <div className="screen-title">アルデン地方を探索する</div>
      <div className="location-list">
        {LOCATIONS.map((loc) => (
          <button
            key={loc.id}
            className="location-card"
            disabled={!loc.enterable}
            data-testid={`location-${loc.id}`}
            onClick={
              loc.id === 'GREENWOOD_FOREST' ? onEnterGreenwood : () => onEnterSpot(loc.id)
            }
          >
            <div className="location-name">
              {loc.name}
              {mark(loc.id)}
            </div>
            <div className="location-desc">{loc.description}</div>
          </button>
        ))}
        {/* The shop. Not in LOCATIONS because that list is places the
            WORLD has, and a counter inside the village is not a place
            the map needs an entry for — it is a door off the square,
            the way the memory book is a door off HOME. */}
        <button
          className="location-card"
          data-testid="location-ALDEN_ITEM_SHOP"
          onClick={onEnterShop}
        >
          <div className="location-name">アルデン道具屋</div>
          <div className="location-desc">
            薬草や拾いものを売り買いできる。店主は無口だ。
          </div>
        </button>
        {sites.map(({ def, discovered }) => (
          <button
            key={def.id}
            className="location-card"
            data-testid={`location-${def.id}`}
            onClick={() => onEnterSite(def.id)}
          >
            <div className="location-name">
              {discovered ? def.knownName : def.unknownName}
              {mark(def.id)}
            </div>
            <div className="location-desc">
              {discovered ? def.knownDescription : def.unknownDescription}
            </div>
          </button>
        ))}
      </div>
      <div className="screen-footer">
        <button className="btn" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
