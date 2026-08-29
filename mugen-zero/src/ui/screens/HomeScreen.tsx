interface Props {
  onExplore: () => void;
}

export function HomeScreen({ onExplore }: Props) {
  return (
    <div className="screen">
      <div className="home-main">
        <div className="home-place">ALDEN VILLAGE — アルデン村</div>
        <button className="btn home-explore" data-testid="explore-button" onClick={onExplore}>
          EXPLORE
        </button>
        <div className="home-place" style={{ letterSpacing: 0 }}>
          周辺を探索する
        </div>
      </div>
      <nav className="bottom-nav">
        <button className="nav-item active">HOME</button>
        <button className="nav-item" disabled title="PHASE F で実装">
          ARCHIVE
        </button>
        <button className="nav-item" disabled title="PHASE D で実装">
          REST
        </button>
      </nav>
    </div>
  );
}
