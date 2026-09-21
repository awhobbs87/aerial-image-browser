import type { SearchReference } from '../viewer/LocationReference';
import { AppProviders } from '../common/AppProviders';
import { ImageViewer } from '../viewer/ImageViewer';

interface ImageViewerIslandProps {
  reference?: SearchReference;
  imageUrl: string;
  layerId: number;
  imageName: string;
  tiffUrl?: string;
  year?: number;
  scale?: number;
  project?: string;
  photoType?: string;
}

export function ImageViewerIsland({
  reference,
  imageUrl,
  layerId,
  imageName,
  tiffUrl,
  year,
  scale,
  project,
  photoType,
}: ImageViewerIslandProps) {
  return (
    <AppProviders>
      <ImageViewer
        reference={reference}
        imageUrl={imageUrl}
        layerId={layerId}
        imageName={imageName}
        tiffUrl={tiffUrl}
        year={year}
        scale={scale}
        project={project}
        photoType={photoType}
      />
    </AppProviders>
  );
}
