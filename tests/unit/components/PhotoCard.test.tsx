import { render } from '../../test-utils';
import { screen, fireEvent } from '@testing-library/react';
import { PhotoCard } from '@/components/photos/PhotoCard';
import type { EnhancedPhoto } from '@/types/photo';

vi.mock('@/components/photos/PhotoCard.module.css', () => ({
  default: {
    card: 'card',
    imageContainer: 'imageContainer',
    image: 'image',
    favoriteButton: 'favoriteButton',
    overlay: 'overlay',
    overlayName: 'overlayName',
    overlayMeta: 'overlayMeta',
    overlayText: 'overlayText',
    compareButton: 'compareButton',
    info: 'info',
    infoName: 'infoName',
    infoMeta: 'infoMeta',
  },
}));

const mockPhoto: EnhancedPhoto = {
  objectId: 1,
  layerId: 0,
  name: 'TEST_PHOTO_001',
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
  thumbnailUrl: '/thumb/0/TEST_PHOTO_001',
  imageUrl: '/img/0/TEST_PHOTO_001',
  tiffUrl: '/tiff/0/TEST_PHOTO_001',
  rings: [],
};

describe('PhotoCard', () => {
  it('renders photo name text', () => {
    render(<PhotoCard photo={mockPhoto} />);
    // The name appears in both overlay and info sections
    const nameElements = screen.getAllByText('TEST_PHOTO_001');
    expect(nameElements.length).toBeGreaterThan(0);
  });

  it('renders the thumbnail image with correct src', () => {
    render(<PhotoCard photo={mockPhoto} />);
    const img = screen.getByAltText('Aerial photo TEST_PHOTO_001');
    expect(img).toHaveAttribute('src', '/thumb/0/TEST_PHOTO_001');
  });

  it('renders layer type badge', () => {
    render(<PhotoCard photo={mockPhoto} />);
    // Badge appears in both overlay and info sections
    const badges = screen.getAllByText('Aerial');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('fires onClick when card is clicked', () => {
    const handleClick = vi.fn();
    render(<PhotoCard photo={mockPhoto} onClick={handleClick} />);
    const card = screen.getByRole('article');
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledWith(mockPhoto);
  });
});
