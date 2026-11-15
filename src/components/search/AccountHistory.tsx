import { useState, useSyncExternalStore } from 'react';
import { Button } from '@cloudflare/kumo/components/button';
import {
  getSearchHistory,
  deleteSearchHistory,
  type SearchHistoryItem,
} from '@/lib/search-history';
import { getRecentSearches } from '@/lib/recent-searches';
import {
  HISTORY_SYNC_KEY,
  historySyncEnabled,
  historySyncMessage,
  subscribeHistorySync,
  setHistorySyncMessage,
  queueHistorySave,
} from '@/lib/history-sync';
export function AccountHistory({
  onSelect,
}: {
  onSelect: (lat: number, lon: number, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchHistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const status = useSyncExternalStore(
    subscribeHistorySync,
    historySyncMessage,
    () => 'Recent searches are saved on this device.',
  );
  const [enabled, setEnabled] = useState(historySyncEnabled);
  const load = async () => {
    setBusy(true);
    setError('');
    try {
      setItems(await getSearchHistory());
    } catch {
      setError('Account history unavailable. Sign in and retry; device history is unchanged.');
    } finally {
      setBusy(false);
    }
  };
  const toggleSync = async () => {
    try {
      localStorage.setItem(HISTORY_SYNC_KEY, String(!enabled));
    } catch {
      setError('History settings could not be saved on this device.');
      return;
    }
    setEnabled(!enabled);
    if (enabled) {
      setHistorySyncMessage('Recent searches are saved on this device.');
      return;
    }
    setBusy(true);
    for (const item of [...getRecentSearches()].reverse()) await queueHistorySave(item);
    await load();
  };
  return (
    <section className="w-full space-y-2 text-xs">
      <Button
        variant="ghost"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open) void load();
        }}
      >
        Account search history
      </Button>
      {open && (
        <div className="space-y-2 rounded-xl bg-background p-2">
          <p>Optionally sync recent locations across devices.</p>
          <p role="status">{status}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              aria-pressed={enabled}
              onClick={() => void toggleSync()}
            >
              {enabled ? 'Turn off history sync' : 'Enable history sync'}
            </Button>
            <Button variant="ghost" loading={busy} onClick={() => void load()}>
              Reload account history
            </Button>
            {enabled && (
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  for (const item of [...getRecentSearches()].reverse())
                    await queueHistorySave(item);
                  await load();
                }}
              >
                Retry history sync
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">
            Enabling sync also saves this device’s recent locations. Turning it off keeps existing
            account history.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <div className="flex gap-1" key={item.id}>
                <Button
                  className="h-auto min-h-11 min-w-0 flex-1 justify-start whitespace-normal text-left"
                  variant="ghost"
                  onClick={() => onSelect(item.lat, item.lon, item.query)}
                >
                  {item.query}
                </Button>
                <Button
                  aria-label={`Delete account search ${item.query}`}
                  disabled={busy}
                  variant="ghost"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await deleteSearchHistory(item.id);
                      setItems((rows) => rows.filter((row) => row.id !== item.id));
                    } catch {
                      setError('Could not delete this account search. Please retry.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
          {!busy && !error && !items.length && <p>No account searches saved.</p>}
        </div>
      )}
    </section>
  );
}
