import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// 明朝 for the paper theme (ステータス's palette, used app-wide since
// 2026-10-07 — ui/styles.css 「THE PAPER THEME」). Self-hosted, OFL 1.1.
import '@fontsource/noto-serif-jp/latin-400.css';
import '@fontsource/noto-serif-jp/japanese-400.css';
import './ui/styles.css';

const root = createRoot(document.getElementById('root')!);
const params = new URLSearchParams(window.location.search);

// DEBUG BUILDS ONLY: `?preview=battle` shows the battle screen on its
// own (src/dev/BattlePreview.tsx) — on the dev server, and in the debug
// APK (`npm run build:debug`). Both halves of the check are compile
// time, so a release build (`npm run build`) contains neither the check
// nor the preview.
// `?tool=forge-import` — CHARACTER FORGE's deploy files into this
// device's save (src/dev/ForgeImport.tsx). Debug builds only, the same
// compile-time way.
if (
  (import.meta.env.DEV || import.meta.env.VITE_MUGEN_DEBUG_TOOLS === '1') &&
  params.get('tool') === 'forge-import'
) {
  void import('./dev/ForgeImport').then(({ ForgeImport }) =>
    root.render(
      <StrictMode>
        <ForgeImport />
      </StrictMode>,
    ),
  );
} else if (
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
} else if (
  (import.meta.env.DEV || import.meta.env.VITE_MUGEN_DEBUG_TOOLS === '1') &&
  params.get('preview') === 'walk'
) {
  // `?preview=walk&place=ANCIENT_RUINS` — a place walked on its own
  // (src/dev/WalkPreview.tsx), for places no door in the game leads to
  // yet. Debug builds only, the same compile-time way.
  void import('./dev/WalkPreview').then(({ WalkPreview }) =>
    root.render(
      <StrictMode>
        <WalkPreview params={params} />
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
