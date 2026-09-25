import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/styles.css';

const root = createRoot(document.getElementById('root')!);
const params = new URLSearchParams(window.location.search);

// DEVELOPMENT ONLY: `?preview=battle` shows the battle screen on its
// own (src/dev/BattlePreview.tsx). `import.meta.env.DEV` is compile
// time, so a release build contains neither the check nor the preview.
if (import.meta.env.DEV && params.get('preview') === 'battle') {
  void import('./dev/BattlePreview').then(({ BattlePreview }) =>
    root.render(
      <StrictMode>
        <BattlePreview params={params} />
      </StrictMode>,
    ),
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
