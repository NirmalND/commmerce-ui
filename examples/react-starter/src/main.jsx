import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Poppins and the --cm-* design tokens. Load them once, before any component renders.
import '@commmerce/tokens/fonts.css';
import '@commmerce/tokens/tokens.css';
import './app.css';
import { App } from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
