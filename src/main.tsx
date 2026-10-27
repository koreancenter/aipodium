import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import './index.css';

const preloadedStylesheet = document.querySelector<HTMLLinkElement>('link[rel="preload"][as="style"]');
if (preloadedStylesheet) {
  preloadedStylesheet.rel = 'stylesheet';
}

// Global error handlers for resilience
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Gracefully handle cross-origin or third-party script errors
    if (event.message === 'Script error.') {
      console.warn('[AI Podium] Handled external script event:', event);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[AI Podium] Handled unhandled rejection:', event.reason);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
