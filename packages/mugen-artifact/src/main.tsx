import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/styles/tokens.css';
import './ui/styles.css';
import { ErrorBoundary } from './ui/common/ErrorBoundary';
import { LandscapeStage } from './ui/layout/LandscapeStage';
import { isNativeShell } from './platform/androidBack';

// Offline shell (assets only — WORLD MEMORY stays in IndexedDB).
//
// NOT IN THE ANDROID SHELL. There the assets are already on the phone,
// inside the APK, so a cache-first worker would copy all 85 MB of them
// into CacheStorage to serve files it is already sitting on top of. The
// web keeps the worker exactly as it was.
if (import.meta.env.PROD && !isNativeShell() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((e) => {
      console.warn('Service worker registration failed', e);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Everything below here may assume it is wider than it is tall. */}
    <LandscapeStage>
      <div className="app">
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </div>
    </LandscapeStage>
  </StrictMode>,
);
