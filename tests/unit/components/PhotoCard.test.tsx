import { useUIStore } from '@/stores/uiStore';
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
    expect(img).toHaveAttribute('src', '/api/images/thumbnail/0/TEST_PHOTO_001?variant=card-320');
    expect(img.getAttribute('srcset')).toContain('variant=card-640 640w');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('shows a spinner until the image loads', () => {
    render(<PhotoCard photo={mockPhoto} />);
    const image = screen.getByAltText('Aerial photo TEST_PHOTO_001');
    expect(screen.getByRole('status', { name: 'Loading thumbnail' })).toBeInTheDocument();
    expect(image).toHaveStyle({ opacity: '0' });

    fireEvent.load(image);
    expect(screen.queryByRole('status', { name: 'Loading thumbnail' })).toBeNull();
    expect(image).toHaveStyle({ opacity: '1' });
  });

  it('shows an unavailable icon after a failed request', () => {
    render(<PhotoCard photo={mockPhoto} />);
    const image = screen.getByAltText('Aerial photo TEST_PHOTO_001');
    fireEvent.error(image);
    expect(screen.queryByRole('status', { name: 'Loading thumbnail' })).toBeNull();
    expect(screen.getByRole('img', { name: 'Thumbnail unavailable' })).toBeInTheDocument();
    expect(image).toHaveStyle({ opacity: '0' });
  });

  it('recognises an image already loaded when the ref attaches', () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const width = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(320);
    try {
      render(<PhotoCard photo={mockPhoto} />);
      expect(screen.queryByRole('status', { name: 'Loading thumbnail' })).toBeNull();
      expect(screen.getByAltText('Aerial photo TEST_PHOTO_001')).toHaveStyle({ opacity: '1' });
    } finally {
      complete.mockRestore();
      width.mockRestore();
    }
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
  it('opens with Space without opening when a favorite key event bubbles', () => {
    const handleClick = vi.fn<(photo: EnhancedPhoto) => void>();
    render(<PhotoCard photo={mockPhoto} onClick={handleClick} />);
    fireEvent.keyDown(screen.getByLabelText('Add to favorites'), { key: 'Enter' });
    expect(handleClick).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('article'), { key: ' ' });
    expect(handleClick).toHaveBeenCalledWith(mockPhoto);
  });
});

it('highlights the footprint on keyboard focus and clears it when the card unmounts', () => {
  const view = render(<PhotoCard photo={mockPhoto} />);
  fireEvent.focus(screen.getByRole('article'));
  expect(useUIStore.getState()).toMatchObject({ hoveredPhotoId: 1, hoveredPhotoLayerId: 0 });
  view.unmount();
  expect(useUIStore.getState().hoveredPhotoId).toBeNull();
});

it('highlights mouse hover, ignores touch entry and clears on pointer exit', () => {
  useUIStore.getState().setHoveredPhotoId(null);
  render(<PhotoCard photo={mockPhoto} />);
  const card = screen.getByRole('article');
  const enter = (pointerType: string) => {
    const event = new Event('pointerover', { bubbles: true });
    Object.defineProperty(event, 'pointerType', { value: pointerType });
    fireEvent(card, event);
  };
  enter('touch');
  expect(useUIStore.getState().hoveredPhotoId).toBeNull();
  enter('mouse');
  expect(useUIStore.getState()).toMatchObject({ hoveredPhotoId: 1, hoveredPhotoLayerId: 0 });
  fireEvent.pointerOut(card);
  expect(useUIStore.getState().hoveredPhotoId).toBeNull();
});
