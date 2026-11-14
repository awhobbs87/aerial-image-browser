import { useCallback, useState } from 'react';
import { ImageSquareIcon } from '@phosphor-icons/react';
import { Loader } from '@cloudflare/kumo/components/loader';
import { photoCardSources, photoImageUrl } from '@/lib/photo-images';
import type { EnhancedPhoto } from '@/types/photo';

interface PhotoThumbnailProps {
  photo: EnhancedPhoto;
  sizes: string;
  className?: string;
}

export function PhotoThumbnail({ photo, sizes, className }: PhotoThumbnailProps) {
  const src = photoImageUrl(photo, 'card-320');
  const [result, setResult] = useState<{ src: string; loaded: boolean }>();
  const status = result?.src !== src ? 'loading' : result.loaded ? 'loaded' : 'error';

  const updateStatus = useCallback(
    (image: HTMLImageElement) => setResult({ src, loaded: image.naturalWidth > 0 }),
    [src],
  );
  const checkCachedImage = useCallback(
    (image: HTMLImageElement | null) => {
      // A cached image can finish before React attaches its event handlers.
      if (image?.complete) updateStatus(image);
    },
    [updateStatus],
  );

  return (
    <>
      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-slate-300">
          <Loader aria-label="Loading thumbnail" />
        </div>
      )}
      {status === 'error' && (
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center text-slate-300"
          role="img"
          aria-label="Thumbnail unavailable"
        >
          <ImageSquareIcon size={24} aria-hidden="true" />
        </div>
      )}
      <img
        key={src}
        ref={checkCachedImage}
        className={className}
        src={src}
        srcSet={photoCardSources(photo)}
        sizes={sizes}
        decoding="async"
        alt={`Aerial photo ${photo.name}`}
        loading="lazy"
        onLoad={() => setResult({ src, loaded: true })}
        onError={() => setResult({ src, loaded: false })}
        aria-hidden={status !== 'loaded'}
        style={{ opacity: status === 'loaded' ? 1 : 0 }}
      />
    </>
  );
}
