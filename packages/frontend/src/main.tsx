import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

// Placeholder until routes are set up
function App() {
  return (
    <MantineProvider>
      <div style={{ padding: '2rem' }}>
        <h1>Try Tag Stats</h1>
        <p>Frontend will be implemented in Phase 5</p>
      </div>
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
