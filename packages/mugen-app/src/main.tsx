import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/styles.css';

const root = createRoot(document.getElementById('root')!);
const params = new URLSearchParams(window.location.search);

// DEBUG BUILDS ONLY: `?preview=battle` shows the battle screen on its
// own (src/dev/BattlePreview.tsx) — on the dev server, and in the debug
// APK (`npm run build:debug`). Both halves of the check are compile
// time, so a release build (`npm run build`) contains neither the check
// nor the preview.
if (
  (import.meta.env.DEV || import.meta.env.VITE_MUGEN_DEBUG_TOOLS === '1') &&
  params.get('preview') === 'battle'
) {
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
