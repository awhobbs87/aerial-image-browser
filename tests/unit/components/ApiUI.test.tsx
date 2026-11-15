import { CompareSlider } from '@/components/compare/CompareSlider';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AISearchModal } from '@/components/search/AISearchModal';
import { PhotoDetails } from '@/components/photos/PhotoDetails';
import { ComparePhotoButton, ComparisonTray } from '@/components/compare/ComparePhotoButton';
import { useFilterStore } from '@/stores/filterStore';
import { useSearchStore } from '@/stores/searchStore';
import { useComparisonStore } from '@/stores/comparisonStore';
import { api } from '@/lib/api-client';
import { geocodeSearch } from '@/lib/geocoding';
import type { EnhancedPhoto } from '@/types/photo';
vi.mock('astro:transitions/client', () => ({ navigate: vi.fn<(url: string) => void>() }));
vi.mock('@/components/ui/Dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn<typeof api.get>(), post: vi.fn<typeof api.post>() },
}));
vi.mock('@/lib/geocoding', () => ({ geocodeSearch: vi.fn<typeof geocodeSearch>() }));
const photo = {
  objectId: 1,
  layerId: 0,
  name: '1439_183',
  layerName: 'Hobart 82',
  year: 1982,
  dateFlown: 0,
  scale: 0,
  filmType: '1439',
  photoNo: '183',
  run: '2',
  type: 'Black & White',
  tiffUrl: '',
  rings: [],
} as EnhancedPhoto;
beforeEach(() => {
  useFilterStore.getState().resetFilters();
  useSearchStore.getState().reset();
  useComparisonStore.getState().clear();
  vi.clearAllMocks();
});
it('requires reviewed location selection and applies detail preferences without retaining old filters', async () => {
  useFilterStore.getState().setDateRange(1950, 1960);
  useFilterStore.getState().setLayers([0]);
  useFilterStore.getState().setSurvey('Previous survey');
  vi.mocked(api.post).mockResolvedValue({
    success: true,
    data: { location: 'Hobart', resolution: 'high', parser: 'ai' },
  });
  vi.mocked(geocodeSearch).mockResolvedValue([
    {
      placeId: '1',
      displayName: 'Hobart, Tasmania',
      type: 'SUBURB/LOCALITY',
      lat: -42.88,
      lon: 147.32,
      boundingBox: [-42.9, -42.8, 147.3, 147.4],
      importance: 1,
    },
  ]);
  const close = vi.fn<() => void>();
  render(<AISearchModal opened onClose={close} />);
  fireEvent.change(screen.getByLabelText('Describe the aerial photography to find'), {
    target: { value: 'Detailed Hobart imagery' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Interpret search' }));
  await screen.findByLabelText('Interpreted location');
  expect(geocodeSearch).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Find matching locations' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Hobart, Tasmania · Locality' }));
  expect(useFilterStore.getState()).toMatchObject({
    startYear: null,
    endYear: null,
    layers: [0, 1, 2],
    scaleCategories: ['very-detailed', 'detailed'],
    survey: null,
  });
  expect(useSearchStore.getState().frameBounds).toEqual({
    south: -42.9,
    north: -42.8,
    west: 147.3,
    east: 147.4,
  });
  expect(close).toHaveBeenCalledOnce();
});
it('shows film number and inferred date without inventing scale or units', () => {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <PhotoDetails layerId={0} imageName={photo.name} initial={photo} />
    </QueryClientProvider>,
  );
  expect(screen.getByText('Film number')).toBeInTheDocument();
  expect(screen.getByText('1439')).toBeInTheDocument();
  expect(screen.getByText('1982 (inferred from survey name)')).toBeInTheDocument();
  expect(screen.queryByText('0 metres')).not.toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalled();
  client.clear();
});
it('limits comparisons to two photos and supports removing a selection', async () => {
  render(
    <>
      <ComparePhotoButton photo={photo} />
      <ComparisonTray />
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add to compare' }));
  expect(useComparisonStore.getState().photoA?.name).toBe(photo.name);
  expect(screen.getByRole('link', { name: 'View comparison' })).toHaveAttribute('href', '/compare');
  act(() => useComparisonStore.getState().setPhotoB({ ...photo, objectId: 2, name: 'second' }));
  render(<ComparePhotoButton photo={{ ...photo, objectId: 3, name: 'third' }} />);
  expect(screen.getByRole('button', { name: 'Comparison full' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: `Remove ${photo.name} from comparison` }));
  await waitFor(() => expect(useComparisonStore.getState().photoA).toBeNull());
});

it('keeps comparison image recovery accessible alongside the keyboard slider', () => {
  render(<CompareSlider photoA={photo} photoB={{ ...photo, name: 'second' }} />);
  const slider = screen.getByRole('slider', { name: 'Comparison slider' });
  fireEvent.keyDown(slider, { key: 'ArrowRight' });
  expect(slider).toHaveAttribute('aria-valuenow', '52');
  fireEvent.error(screen.getByAltText(photo.name));
  const retry = screen.getByRole('button', { name: 'Retry image' });
  expect(retry.closest('[aria-hidden="true"]')).toBeNull();
  expect(retry.closest('[role="slider"]')).toBeNull();
  fireEvent.click(retry);
  expect(screen.queryByRole('button', { name: 'Retry image' })).not.toBeInTheDocument();
});
