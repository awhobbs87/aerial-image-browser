import { render } from '../../test-utils';
import { screen, fireEvent } from '@testing-library/react';
import { PhotoCard } from '@/components/photos/PhotoCard';
import type { EnhancedPhoto } from '@/types/photo';

vi.mock('@/components/photos/PhotoCard.module.css', () => ({
  default: {
    card: 'card',
    imageWrap: 'imageWrap',
    image: 'image',
    heart: 'heart',
    heartActive: 'heartActive',
    typeBadge: 'typeBadge',
    overlay: 'overlay',
    overlayScale: 'overlayScale',
    overlayRef: 'overlayRef',
    meta: 'meta',
    year: 'year',
    project: 'project',
    details: 'details',
    scale: 'scale',
    ref: 'ref',
  },
}));

const mockPhoto: EnhancedPhoto = {
  objectId: 1,
  layerId: 0,
  name: 'TEST_PHOTO_001',
  type: 'Colour',
  run: 'R1',
  dateFlown: 946684800000,
  year: 2000,
  scale: 15000,
  filmType: 'BW',
  altitude: 5000,
  photoNo: '001',
  layerName: 'HUON - DERWENT',
  area: 1000,
  thumbnailUrl: '/thumb/0/TEST_PHOTO_001',
  imageUrl: '/img/0/TEST_PHOTO_001',
  tiffUrl: '/tiff/0/TEST_PHOTO_001',
  rings: [],
};

describe('PhotoCard', () => {
  it('renders year as main title', () => {
    render(<PhotoCard photo={mockPhoto} />);
    expect(screen.getByText('2000')).toBeInTheDocument();
  });

  it('renders project/layerName as subtitle', () => {
    render(<PhotoCard photo={mockPhoto} />);
    expect(screen.getByText('HUON - DERWENT')).toBeInTheDocument();
  });

  it('renders the thumbnail image with correct src', () => {
    render(<PhotoCard photo={mockPhoto} />);
    const img = screen.getByAltText('Aerial photo TEST_PHOTO_001');
    expect(img).toHaveAttribute('src', '/thumb/0/TEST_PHOTO_001');
  });

  it('renders type badge', () => {
    render(<PhotoCard photo={mockPhoto} />);
    expect(screen.getByText('Colour')).toBeInTheDocument();
  });

  it('renders scale', () => {
    render(<PhotoCard photo={mockPhoto} />);
    // Scale appears in overlay and details
    const scaleElements = screen.getAllByText('1:15,000');
    expect(scaleElements.length).toBeGreaterThan(0);
  });

  it('renders ref name in details', () => {
    render(<PhotoCard photo={mockPhoto} />);
    expect(screen.getByText('TEST_PHOTO_001')).toBeInTheDocument();
  });

  it('fires onClick when card is clicked', () => {
    const handleClick = vi.fn<(photo: EnhancedPhoto) => void>();
    render(<PhotoCard photo={mockPhoto} onClick={handleClick} />);
    const card = screen.getByRole('article');
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledWith(mockPhoto);
  });

  it('renders favorite button', () => {
    render(<PhotoCard photo={mockPhoto} />);
    const favBtn = screen.getByLabelText('Add to favorites');
    expect(favBtn).toBeInTheDocument();
  });

  it('shows "Undated" when year is 0', () => {
    const undatedPhoto = { ...mockPhoto, year: 0 };
    render(<PhotoCard photo={undatedPhoto} />);
    expect(screen.getByText('Undated')).toBeInTheDocument();
  });
});
