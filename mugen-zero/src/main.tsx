import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/styles/tokens.css';
import './ui/styles.css';
import { ErrorBoundary } from './ui/common/ErrorBoundary';

// Offline shell (assets only — WORLD MEMORY stays in IndexedDB).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((e) => {
      console.warn('Service worker registration failed', e);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="app">
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </div>
  </StrictMode>,
);
