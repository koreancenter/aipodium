import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { EditorEventBusProvider } from './context/EditorEventBusContext.tsx';
import './index.css';

// Global error handlers for resilience
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Gracefully handle cross-origin scripts or iframe proxy WebSocket disconnections
    if (
      event.message === 'Script error.' ||
      (event.message && event.message.includes('WebSocket')) ||
      (event.error && String(event.error).includes('WebSocket'))
    ) {
      event.preventDefault();
      return;
    }
    console.warn('[AI Podium] Handled script event:', event);
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && String(event.reason).includes('WebSocket')) {
      event.preventDefault();
      return;
    }
    console.warn('[AI Podium] Handled unhandled rejection:', event.reason);
  });

  // Automatically unregister stale development service workers that interfere with Vite module resolution
  if ('serviceWorker' in navigator && import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).catch(() => {});
    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      }).catch(() => {});
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <EditorEventBusProvider>
            <App />
          </EditorEventBusProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
