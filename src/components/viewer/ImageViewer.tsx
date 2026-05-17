import { useEffect, useRef, useState, useCallback } from 'react';
import {
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
  IconRotateClockwise,
  IconRotate2,
  IconFlipVertical,
  IconFlipHorizontal,
  IconMaximize,
  IconDownload,
  IconArrowLeft,
  IconAdjustments,
  IconDots,
} from '@tabler/icons-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';

interface ImageViewerProps {
  imageUrl: string;
  layerId: number;
  imageName: string;
  tiffUrl?: string;
  year?: number;
  scale?: number;
  project?: string;
  photoType?: string;
}

function ViewerButton({
  label,
  onClick,
  active,
  children,
  href,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
  href?: string;
}) {
  const className = cn(
    'flex h-10 w-10 items-center justify-center rounded-xl transition duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600',
    active
      ? 'bg-sky-600 text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
  );

  return (
    <Tooltip label={label} side="left">
      {href ? (
        <a href={href} aria-label={label} className={className}>
          {children}
        </a>
      ) : (
        <button type="button" onClick={onClick} aria-label={label} className={className}>
          {children}
        </button>
      )}
    </Tooltip>
  );
}

export function ImageViewer({
  imageUrl,
  layerId,
  imageName,
  tiffUrl,
  year,
  scale,
  project,
  photoType,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flippedH, setFlippedH] = useState(false);
  const [flippedV, setFlippedV] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usingTiff, setUsingTiff] = useState(false);
  const [finetuneOpen, setFinetuneOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    async function init() {
      if (destroyed || !containerRef.current) return;
      const osdMod = await import('openseadragon');
      if (destroyed) return;
      const OpenSeadragon = osdMod.default;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let tileSources: any = { type: 'image', url: imageUrl };

      if (tiffUrl) {
        try {
          const geoMod = await import('geotiff-tilesource');
          if (destroyed) return;
          geoMod.enableGeoTIFFTileSource(OpenSeadragon);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tiffTileSources = await (OpenSeadragon as any).GeoTIFFTileSource.getAllTileSources(
            tiffUrl,
            { logLatency: false },
          );
          if (!destroyed && tiffTileSources && tiffTileSources.length > 0) {
            tileSources = tiffTileSources[0];
            setUsingTiff(true);
          }
        } catch (err) {
          console.warn('GeoTIFF loading failed, falling back to image URL:', err);
        }
      }

      if (destroyed || !containerRef.current) return;

      const viewer = OpenSeadragon({
        element: containerRef.current,
        prefixUrl: '',
        tileSources,
        showNavigationControl: false,
        showNavigator: !isMobile,
        navigatorPosition: 'BOTTOM_RIGHT',
        navigatorSizeRatio: 0.15,
        minZoomLevel: 0.5,
        maxZoomLevel: 40,
        visibilityRatio: 0.8,
        constrainDuringPan: true,
        animationTime: 0.2,
        crossOriginPolicy: 'Anonymous',
        gestureSettingsTouch: {
          pinchRotate: false,
        },
      });

      viewer.addHandler('zoom', (event: { zoom: number }) => {
        setZoom(Math.round(event.zoom * 100) / 100);
      });
      viewer.addHandler('open', () => setLoading(false));
      viewer.addHandler('open-failed', () => setLoading(false));

      viewerRef.current = viewer;
      setReady(true);
    }

    init();
    return () => {
      destroyed = true;
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [imageUrl, tiffUrl, isMobile]);

  const applyRotation = useCallback((deg: number) => {
    setRotation(deg);
    viewerRef.current?.viewport?.setRotation(deg);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const canvas = el.querySelector('.openseadragon-canvas') as HTMLElement | null;
    if (canvas) canvas.style.transform = `scale(${flippedH ? -1 : 1}, ${flippedV ? -1 : 1})`;
  }, [flippedH, flippedV]);

  const handleReset = () => {
    viewerRef.current?.viewport?.goHome();
    applyRotation(0);
    setFlippedH(false);
    setFlippedV(false);
  };

  const handleBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/search';
  };

  const iconSize = isMobile ? 16 : 19;
  const layerLabel = layerId === 0 ? 'Aerial' : layerId === 1 ? 'Ortho' : 'Digital';

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-950">
      <div ref={containerRef} className="h-full w-full" />

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <span className="h-9 w-9 animate-spin rounded-full border-3 border-white/20 border-t-white" />
        </div>
      )}

      <div className="absolute top-3 left-3 z-20 rounded-2xl border border-white/10 bg-white/90 p-1 shadow-lg backdrop-blur-md dark:bg-slate-950/85">
        <ViewerButton label="Back to results" onClick={handleBack}>
          <IconArrowLeft size={iconSize} />
        </ViewerButton>
      </div>

      {ready && (
        <div className="absolute top-3 right-3 z-20 rounded-2xl border border-white/10 bg-white/90 p-1 shadow-lg backdrop-blur-md dark:bg-slate-950/85">
          <div className="flex flex-col gap-1">
            <ViewerButton label="Zoom in" onClick={() => viewerRef.current?.viewport?.zoomBy(1.5)}>
              <IconZoomIn size={iconSize} />
            </ViewerButton>
            <ViewerButton
              label="Zoom out"
              onClick={() => viewerRef.current?.viewport?.zoomBy(0.67)}
            >
              <IconZoomOut size={iconSize} />
            </ViewerButton>
            <ViewerButton label="Reset view" onClick={handleReset}>
              <IconZoomReset size={iconSize} />
            </ViewerButton>
            <ViewerButton
              label={expanded ? 'Fewer controls' : 'More controls'}
              onClick={() => setExpanded((e) => !e)}
              active={expanded}
            >
              <IconDots size={iconSize} />
            </ViewerButton>

            {expanded && (
              <div className="flex flex-col gap-1 border-t border-slate-950/10 pt-1 dark:border-white/10">
                <ViewerButton
                  label="Rotate left 90"
                  onClick={() => applyRotation((rotation - 90 + 360) % 360)}
                >
                  <IconRotate2 size={iconSize} style={{ transform: 'scaleX(-1)' }} />
                </ViewerButton>
                <ViewerButton
                  label="Rotate right 90"
                  onClick={() => applyRotation((rotation + 90) % 360)}
                >
                  <IconRotateClockwise size={iconSize} />
                </ViewerButton>
                <ViewerButton
                  label="Flip horizontal"
                  onClick={() => setFlippedH((f) => !f)}
                  active={flippedH}
                >
                  <IconFlipHorizontal size={iconSize} />
                </ViewerButton>
                <ViewerButton
                  label="Flip vertical"
                  onClick={() => setFlippedV((f) => !f)}
                  active={flippedV}
                >
                  <IconFlipVertical size={iconSize} />
                </ViewerButton>
                <ViewerButton
                  label="Fine-tune rotation"
                  onClick={() => setFinetuneOpen((o) => !o)}
                  active={finetuneOpen}
                >
                  <IconAdjustments size={iconSize} />
                </ViewerButton>
                <ViewerButton
                  label="Fullscreen"
                  onClick={() => viewerRef.current?.setFullScreen(!viewerRef.current?.isFullPage())}
                >
                  <IconMaximize size={iconSize} />
                </ViewerButton>
                {tiffUrl && (
                  <ViewerButton label="Download TIFF" href={tiffUrl}>
                    <IconDownload size={iconSize} />
                  </ViewerButton>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {finetuneOpen && (
        <div className="absolute top-3 right-18 z-20 w-56 rounded-2xl border border-white/10 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:bg-slate-950/95">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>Rotation</span>
            <span>{rotation}deg</span>
          </div>
          <input
            type="range"
            value={rotation}
            onChange={(e) => applyRotation(Number(e.currentTarget.value))}
            min={0}
            max={359}
            step={1}
            className="w-full accent-sky-600"
          />
        </div>
      )}

      <div className="absolute bottom-3 left-1/2 z-20 max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-2xl border border-white/10 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-md dark:bg-slate-950/85">
        <div className="flex items-center gap-2 overflow-hidden text-xs">
          {year ? (
            <span className="font-bold text-slate-950 dark:text-slate-50">{year}</span>
          ) : null}
          <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
            {imageName}
          </span>
          {photoType && (
            <span className="shrink-0 text-slate-500 dark:text-slate-400">
              {photoType === 'Black & White' ? 'B&W' : photoType}
            </span>
          )}
          <span className="shrink-0 text-slate-500 dark:text-slate-400">{layerLabel}</span>
          {scale ? (
            <span className="shrink-0 text-slate-500 dark:text-slate-400">
              1:{scale.toLocaleString()}
            </span>
          ) : null}
          {!isMobile && project && (
            <span className="truncate text-slate-500 dark:text-slate-400">{project}</span>
          )}
          <span className="shrink-0 text-slate-400">|</span>
          <span className="shrink-0 text-slate-500 dark:text-slate-400">{zoom}x</span>
          {rotation !== 0 && (
            <span className="shrink-0 text-slate-500 dark:text-slate-400">{rotation}deg</span>
          )}
          {usingTiff && <span className="shrink-0 font-bold text-sky-600">Full res</span>}
        </div>
      </div>
    </div>
  );
}
