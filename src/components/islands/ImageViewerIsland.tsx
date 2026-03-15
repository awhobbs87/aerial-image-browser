import { MantineWrapper } from '../common/MantineWrapper';
import { ImageViewer } from '../viewer/ImageViewer';

interface ImageViewerIslandProps {
  imageUrl: string;
  layerId: number;
  imageName: string;
  tiffUrl?: string;
}

/**
 * Self-contained island for the image viewer.
 * Must be used with client:only="react".
 */
export function ImageViewerIsland({
  imageUrl,
  layerId,
  imageName,
  tiffUrl,
}: ImageViewerIslandProps) {
  return (
    <MantineWrapper>
      <ImageViewer imageUrl={imageUrl} layerId={layerId} imageName={imageName} tiffUrl={tiffUrl} />
    </MantineWrapper>
  );
}
