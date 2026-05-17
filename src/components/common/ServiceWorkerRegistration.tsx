import { useEffect } from 'react';

/** Registers the service worker in production without surfacing update UI. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }, []);

  return null;
}
