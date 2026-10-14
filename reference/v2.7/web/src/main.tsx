import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import './styles/styles.css';
import './app.css';
import { ThemeProvider } from './theme';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

/* The single-file build opens from file://, where the History API can't push real paths —
   so it routes on the hash instead. The hosted build keeps clean URLs. */
const Router = import.meta.env.VITE_SINGLE_FILE === '1' || window.location.protocol === 'file:'
  ? HashRouter
  : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
        <Router>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </Router>
    </ThemeProvider>
  </React.StrictMode>,
);
