import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="app">
      <App />
    </div>
  </StrictMode>,
);
