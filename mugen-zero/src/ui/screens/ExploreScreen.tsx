import { LOCATIONS } from '../../content/locations/alden';

interface Props {
  onEnterGreenwood: () => void;
  onBack: () => void;
}

export function ExploreScreen({ onEnterGreenwood, onBack }: Props) {
  return (
    <div className="screen">
      <div className="screen-title">EXPLORE — ALDEN REGION</div>
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
      </div>
      <div className="screen-footer">
        <button className="btn" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
