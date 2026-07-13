import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import RMOPublic from './pages/RMOPublic.jsx';

// Self-hosted fonts (bundled at build time, no runtime call to Google's
// font CDN). Inter is used for both body text and display/numeric values
// (matching FusionSolar's uniform sans-serif instead of a separate
// condensed display face), so its 700 weight is included alongside the
// regular text weights. Only the latin/latin-ext subsets are pulled in
// (the UI is Indonesian/English text), skipping the cyrillic/greek/
// vietnamese/devanagari subsets @fontsource ships by default.
import '@fontsource/inter/latin-300.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-ext-300.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-ext-500.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/inter/latin-ext-700.css';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/dm-mono/latin-500.css';
import '@fontsource/dm-mono/latin-ext-400.css';
import '@fontsource/dm-mono/latin-ext-500.css';

import './index.css';

const isRMOPage = window.location.pathname === '/rmo';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isRMOPage ? <RMOPublic /> : <App />}
  </React.StrictMode>
);
