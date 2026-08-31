import { LOCATIONS } from '../../content/locations/alden';
import type { OpenFutureSite } from '../../core/world/world';

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
}

export function ExploreScreen({ onEnterGreenwood, onBack, sites, onEnterSite }: Props) {
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
            onClick={loc.id === 'GREENWOOD_FOREST' ? onEnterGreenwood : undefined}
          >
            <div className="location-name">{loc.name}</div>
            <div className="location-desc">{loc.description}</div>
          </button>
        ))}
        {sites.map(({ def, discovered }) => (
          <button
            key={def.id}
            className="location-card"
            data-testid={`location-${def.id}`}
            onClick={() => onEnterSite(def.id)}
          >
            <div className="location-name">{discovered ? def.knownName : def.unknownName}</div>
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
