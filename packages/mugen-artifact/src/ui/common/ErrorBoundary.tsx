import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Keeps an unexpected UI error from turning into a white screen.
 * Details go to the console (dev only); the player sees a way back.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('UI error', error, info.componentStack);
    } else {
      console.error('UI error');
    }
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="screen title-screen" data-testid="error-boundary">
        <h1 className="title-logo" style={{ fontSize: 24 }}>
          MUGEN ZERO
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 'var(--line-height-body)',
            textAlign: 'center',
            padding: '0 24px',
          }}
        >
          画面の読み込み中に問題が発生しました。
          <br />
          世界の記憶は保存されています。
        </p>
        <button className="btn primary" onClick={() => window.location.reload()}>
          再読み込み
        </button>
      </div>
    );
  }
}
