interface Props {
  message?: string;
}

/** Shown while the world (or a lazily loaded screen) is being read. */
export function LoadingScreen({ message = '世界を読み込んでいます……' }: Props) {
  return (
    <div
      className="screen title-screen"
      data-testid="loading-screen"
      role="status"
      aria-live="polite"
    >
      <h1 className="title-logo" style={{ fontSize: 28 }}>
        MUGEN
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{message}</p>
    </div>
  );
}
