import { MantineWrapper } from '../common/MantineWrapper';
import { ImageViewer } from '../viewer/ImageViewer';

interface ImageViewerIslandProps {
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
    <MantineWrapper>
      <ImageViewer
        imageUrl={imageUrl}
        layerId={layerId}
        imageName={imageName}
        tiffUrl={tiffUrl}
        year={year}
        scale={scale}
        project={project}
        photoType={photoType}
      />
    </MantineWrapper>
  );
}
