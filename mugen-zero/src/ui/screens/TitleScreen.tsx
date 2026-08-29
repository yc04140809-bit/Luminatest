interface Props {
  onStart: () => void;
}

export function TitleScreen({ onStart }: Props) {
  return (
    <div className="screen title-screen">
      <div>
        <h1 className="title-logo">MUGEN ZERO</h1>
        <p className="title-sub">v0.1</p>
      </div>
      <button className="btn primary" data-testid="start-button" onClick={onStart}>
        はじめる
      </button>
    </div>
  );
}
