import { render } from '../../test-utils';
import { screen } from '@testing-library/react';
import { PhotoGrid } from '@/components/photos/PhotoGrid';
import type { EnhancedPhoto } from '@/types/photo';
import { useFilterStore } from '@/stores/filterStore';

vi.mock('@/components/photos/PhotoCard', () => ({
  PhotoCard: ({ photo }: any) => <div data-testid="photo-card">{photo.name}</div>,
}));

vi.mock('@/components/photos/PhotoSkeleton', () => ({
  PhotoSkeleton: () => <div data-testid="photo-skeleton" />,
}));

vi.mock('@/components/photos/PhotoGrid.module.css', () => ({
  default: {
    decadeHeader: 'decadeHeader',
  },
}));

function makePhoto(overrides: Partial<EnhancedPhoto> = {}): EnhancedPhoto {
  return {
    objectId: 1,
    layerId: 0,
    name: 'PHOTO_001',
    type: 'aerial',
    run: 'R1',
    dateFlown: 946684800000,
    year: 2000,
    scale: 15000,
    filmType: 'BW',
    altitude: 5000,
    photoNo: '001',
    layerName: 'Aerial',
    area: 1000,
    thumbnailUrl: '/thumb/0/PHOTO_001',
    imageUrl: '/img/0/PHOTO_001',
    tiffUrl: '/tiff/0/PHOTO_001',
    rings: [],
    ...overrides,
  };
}

describe('PhotoGrid', () => {
  beforeEach(() => {
    useFilterStore.getState().resetFilters();
  });

  it('shows loading skeletons when isLoading and no photos', () => {
    render(<PhotoGrid photos={[]} isLoading={true} total={0} />);
    expect(screen.getByTestId('photo-skeleton')).toBeInTheDocument();
  });

  it('shows "No photos found" when empty and not loading', () => {
    render(<PhotoGrid photos={[]} isLoading={false} total={0} />);
    expect(screen.getByText('No photos found')).toBeInTheDocument();
  });

  it('shows photo count text', () => {
    const photos = [
      makePhoto({ objectId: 1, name: 'A' }),
      makePhoto({ objectId: 2, name: 'B' }),
      makePhoto({ objectId: 3, name: 'C' }),
    ];
    render(<PhotoGrid photos={photos} isLoading={false} total={3} />);
    expect(screen.getByText('3 photos found')).toBeInTheDocument();
  });

  it('renders PhotoCard components for each photo', () => {
    const photos = [
      makePhoto({ objectId: 1, name: 'ALPHA' }),
      makePhoto({ objectId: 2, name: 'BRAVO' }),
    ];
    render(<PhotoGrid photos={photos} isLoading={false} total={2} />);
    const cards = screen.getAllByTestId('photo-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('ALPHA')).toBeInTheDocument();
    expect(screen.getByText('BRAVO')).toBeInTheDocument();
  });
});
