import { LOCATIONS } from '../../content/locations/alden';

interface Props {
  onEnterGreenwood: () => void;
  onBack: () => void;
  /**
   * World truth says a bakery exists in Alden (GALD_BECOMES_BAKER).
   * Until the player has actually met its owner, the card stays an
   * unspoiled "？？？" — discovery belongs to the player.
   */
  bakeryOpen: boolean;
  bakeryDiscovered: boolean;
  onEnterBakery: () => void;
}

export function ExploreScreen({
  onEnterGreenwood,
  onBack,
  bakeryOpen,
  bakeryDiscovered,
  onEnterBakery,
}: Props) {
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
        {bakeryOpen && (
          <button
            className="location-card"
            data-testid="location-ALDEN_BAKERY"
            onClick={onEnterBakery}
          >
            <div className="location-name">{bakeryDiscovered ? 'パン屋' : '？？？'}</div>
            <div className="location-desc">
              {bakeryDiscovered
                ? '焼きたてのパンの匂いがする、小さな店。'
                : '以前は空き店舗だった場所に、新しい店ができている。'}
            </div>
          </button>
        )}
      </div>
      <div className="screen-footer">
        <button className="btn" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
