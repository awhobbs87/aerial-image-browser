import { addSearchHistory } from './search-history';
export const HISTORY_SYNC_KEY = 'tas-aerial-history-sync';
let queue = Promise.resolve();
let message = 'Recent searches are saved on this device.';
const listeners = new Set<() => void>();
export function historySyncEnabled() {
  try {
    return localStorage.getItem(HISTORY_SYNC_KEY) === 'true';
  } catch {
    return false;
  }
}
export function historySyncMessage() {
  return message;
}
export function subscribeHistorySync(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function setHistorySyncMessage(value: string) {
  message = value;
  listeners.forEach((listener) => listener());
}
export function queueHistorySave(item: { label: string; lat: number; lon: number }) {
  if (!historySyncEnabled()) return queue;
  setHistorySyncMessage('Syncing search history…');
  queue = queue.then(async () => {
    if (!historySyncEnabled()) return;
    try {
      await addSearchHistory(item.label, item.lat, item.lon);
      setHistorySyncMessage('Search history synced to your account.');
    } catch {
      setHistorySyncMessage(
        'History sync failed. Your searches remain on this device. Open account history to retry.',
      );
    }
  });
  return queue;
}
