import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePhotos } from '@/hooks/usePhotos';
import { useSearchStore } from '@/stores/searchStore';
import { useFilterStore } from '@/stores/filterStore';
import type { ReactNode } from 'react';

it('filters locally and reuses cached results after returning to search', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          count: 2,
          photos: [
            { objectId: 1, layerId: 0, year: 1980, scale: 5000 },
            { objectId: 2, layerId: 2, year: 2020, scale: 50000 },
          ],
        },
      }),
      { headers: { 'Content-Type': 'application/json' } },
    ),
  );
  vi.stubGlobal('fetch', fetcher);
  useSearchStore.getState().setLocation(-42, 147);
  useFilterStore.getState().resetFilters();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const first = renderHook(() => usePhotos(), { wrapper });
  await waitFor(() => expect(first.result.current.data?.count).toBe(2));
  act(() => useFilterStore.getState().setDateRange(2000, 2020));
  await waitFor(() => expect(first.result.current.data?.count).toBe(1));
  act(() => useFilterStore.getState().setLayers([]));
  await waitFor(() => expect(first.result.current.data?.count).toBe(0));
  expect(fetcher).toHaveBeenCalledOnce();
  expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  first.unmount();
  act(() => useFilterStore.getState().resetFilters());
  const second = renderHook(() => usePhotos(), { wrapper });
  await waitFor(() => expect(second.result.current.data?.count).toBe(2));
  expect(fetcher).toHaveBeenCalledOnce();
  second.unmount();
  client.clear();
  vi.unstubAllGlobals();
});

it('refreshes past the browser cache and retries only unavailable layers', async () => {
  sessionStorage.clear();
  const results = [
    {
      count: 1,
      photos: [{ objectId: 1, layerId: 0, year: 1980, scale: 5000 }],
      failedLayers: [1, 2],
      complete: false,
    },
    {
      count: 1,
      photos: [{ objectId: 2, layerId: 2, year: 2026, scale: 0 }],
      failedLayers: [1],
      complete: false,
    },
    { count: 0, photos: [], failedLayers: [], complete: true },
    { count: 0, photos: [], failedLayers: [], complete: true },
  ];
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () =>
        new Response(JSON.stringify({ success: true, data: results.shift() }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    );
  vi.stubGlobal('fetch', fetcher);
  useSearchStore.getState().setLocation(-42.8, 147.2);
  useFilterStore.getState().resetFilters();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => usePhotos(), { wrapper });
  await waitFor(() => expect(hook.result.current.data?.failedLayers).toEqual([1, 2]));
  await act(async () => {
    await hook.result.current.refresh(true);
  });
  await waitFor(() => expect(hook.result.current.data?.count).toBe(2));
  expect(new URL(String(fetcher.mock.calls[1][0])).searchParams.get('layers')).toBe('1,2');
  expect(new URL(String(fetcher.mock.calls[1][0])).searchParams.get('refresh')).toBe('true');
  await act(async () => {
    await hook.result.current.refresh(true);
  });
  await waitFor(() => expect(hook.result.current.data?.count).toBe(2));
  await waitFor(() => expect(hook.result.current.data?.complete).toBe(true));
  await act(async () => {
    await hook.result.current.refresh();
  });
  expect(new URL(String(fetcher.mock.calls[3][0])).searchParams.get('layers')).toBe('0,1,2');
  await waitFor(() => expect(hook.result.current.data?.count).toBe(0));
  hook.unmount();
  client.clear();
  vi.unstubAllGlobals();
});
