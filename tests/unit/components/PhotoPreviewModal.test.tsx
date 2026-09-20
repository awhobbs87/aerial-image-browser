import { act, fireEvent, screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { PhotoPreviewModal } from '@/components/photos/PhotoPreviewModal';
import type { EnhancedPhoto } from '@/types/photo';

const photo: EnhancedPhoto = {
  objectId: 183,
  layerId: 0,
  name: '1439_183',
  type: 'Colour',
  run: '1439',
  dateFlown: 1230768000000,
  year: 2009,
  scale: 7000,
  filmType: 'Colour',
  altitude: 0,
  photoNo: '183',
  layerName: 'Towns 2009 / 2010',
  area: 0,
  thumbnailUrl: '/1439_183_thumb.jpg',
  imageUrl: '/1439_183.jpg',
  tiffUrl: '/1439_183.tif',
  rings: [],
};

describe('PhotoPreviewModal', () => {
  it('keeps a cached image visible when the deferred opening reset runs after load', () => {
    const animationFrames: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        animationFrames.push(callback);
        return animationFrames.length;
      });

    render(
      <PhotoPreviewModal
        photo={photo}
        photos={[photo]}
        opened
        onClose={vi.fn<() => void>()}
        initialIndex={0}
      />,
    );

    const image = screen.getByAltText(photo.name);
    fireEvent.load(image);

    act(() => {
      animationFrames.forEach((callback) => callback(performance.now()));
    });

    expect(image).toHaveStyle({ opacity: '1' });
    expect(screen.queryByLabelText('Loading photo preview')).not.toBeInTheDocument();

    requestAnimationFrame.mockRestore();
  });
});
