import { navigate } from 'astro:transitions/client';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowClockwiseIcon,
  CornersOutIcon,
  CrosshairSimpleIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  SlidersHorizontalIcon,
} from '@phosphor-icons/react';
import { Button, LinkButton } from '@cloudflare/kumo/components/button';
import { LayerCard } from '@cloudflare/kumo/components/layer-card';
import { Loader } from '@cloudflare/kumo/components/loader';
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
    'flex h-11 w-11 items-center justify-center rounded-md transition duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
    active
      ? 'bg-sky-600 text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
  );

  return (
    <Tooltip label={label} side="left">
      {href ? (
        <LinkButton
          href={href}
          aria-label={label}
          shape="square"
          variant="ghost"
          className={className}
        >
          {children}
        </LinkButton>
      ) : (
        <Button
          type="button"
          onClick={onClick}
          aria-label={label}
          shape="square"
          variant={active ? 'primary' : 'ghost'}
          className={className}
        >
          {children}
        </Button>
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
  const [imageOpened, setImageOpened] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [usingTiff, setUsingTiff] = useState(false);
  const [finetuneOpen, setFinetuneOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    let zoomTimer: ReturnType<typeof setTimeout> | undefined;
    let pendingZoom = 1;

    async function init() {
      // Begin both downloads together, but never hold the preview behind TIFF setup.
      const geoModule = tiffUrl
        ? import('geotiff-tilesource').catch(() => null)
        : Promise.resolve(null);
      const { default: OpenSeadragon } = await import('openseadragon');
      if (destroyed || !containerRef.current) return;
      const viewer = OpenSeadragon({
        element: containerRef.current,
        prefixUrl: '',
        tileSources: { type: 'image', url: imageUrl },
        showNavigationControl: false,
        showNavigator: !window.matchMedia('(max-width: 768px)').matches,
        navigatorPosition: 'BOTTOM_RIGHT',
        navigatorSizeRatio: 0.15,
        minZoomLevel: 0.5,
        maxZoomLevel: 40,
        visibilityRatio: 0.8,
        constrainDuringPan: true,
        animationTime: 0.2,
        crossOriginPolicy: 'Anonymous',
        gestureSettingsTouch: { pinchRotate: false },
      });
      viewer.addHandler('zoom', (event: { zoom: number }) => {
        pendingZoom = Math.round(event.zoom * 100) / 100;
        if (zoomTimer === undefined)
          zoomTimer = setTimeout(() => {
            zoomTimer = undefined;
            if (!destroyed) setZoom(pendingZoom);
          }, 100);
      });
      viewer.addHandler('open', () => {
        if (!destroyed) {
          setLoading(false);
          setImageOpened(true);
        }
      });
      viewer.addHandler('open-failed', () => {
        if (!destroyed) setLoading(false);
      });
      viewerRef.current = viewer;
      setReady(true);

      const geoMod = await geoModule;
      if (!geoMod || !tiffUrl || destroyed) return;
      try {
        geoMod.enableGeoTIFFTileSource(OpenSeadragon);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sources = await (OpenSeadragon as any).GeoTIFFTileSource.getAllTileSources(tiffUrl, {
          logLatency: false,
        });
        if (destroyed || !sources?.length) return;
        // Keep the preview beneath the new tiled image while its first tiles arrive.
        viewer.addTiledImage({
          tileSource: sources[0],
          success: (event) => {
            const { item } = event as Event & { item: import('openseadragon').TiledImage };
            if (destroyed) return;
            setUsingTiff(true);
            const removePreview = () => {
              if (destroyed || !item.getFullyLoaded()) return;
              item.removeHandler('fully-loaded-change', removePreview);
              for (let i = viewer.world.getItemCount() - 1; i >= 0; i--) {
                const previous = viewer.world.getItemAt(i);
                if (previous !== item) viewer.world.removeItem(previous);
              }
            };
            item.addHandler('fully-loaded-change', removePreview);
            removePreview();
          },
        });
      } catch (error) {
        console.warn('Full-resolution image unavailable; keeping preview', error);
      }
    }
    void init().catch((error: unknown) => {
      console.warn('Viewer initialization failed; keeping preview', error);
      if (!destroyed) setLoading(false);
    });
    return () => {
      destroyed = true;
      clearTimeout(zoomTimer);
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [imageUrl, tiffUrl]);

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
    else void navigate('/search');
  };

  const iconSize = isMobile ? 16 : 19;
  const layerLabel = layerId === 0 ? 'Aerial' : layerId === 1 ? 'Ortho' : 'Digital';

  return (
    <div className="relative h-[calc(100dvh-var(--mobile-nav-height,0px))] w-full overflow-hidden bg-slate-950 md:h-dvh">
      {!imageOpened && (
        <img
          src={imageUrl}
          alt={`Aerial photo ${imageName}`}
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-contain"
          onLoad={() => setPreviewLoaded(true)}
        />
      )}
      <div ref={containerRef} className="relative h-full w-full" />

      {loading && !previewLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Loader size="lg" aria-label="Loading image" className="text-white" />
        </div>
      )}

      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-3 z-20 rounded-lg border border-white/10 bg-white/90 p-1 shadow-lg backdrop-blur-xl dark:bg-popover">
        <ViewerButton label="Back to results" onClick={handleBack}>
          <ArrowLeftIcon size={iconSize} />
        </ViewerButton>
      </div>

      {ready && (
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-20 max-h-[calc(100%-7rem)] overflow-y-auto rounded-xl border border-white/10 bg-white/90 p-1 shadow-lg backdrop-blur-xl dark:bg-popover">
          <div className="flex flex-col gap-1">
            <ViewerButton label="Zoom in" onClick={() => viewerRef.current?.viewport?.zoomBy(1.5)}>
              <MagnifyingGlassPlusIcon size={iconSize} />
            </ViewerButton>
            <ViewerButton
              label="Zoom out"
              onClick={() => viewerRef.current?.viewport?.zoomBy(0.67)}
            >
              <MagnifyingGlassMinusIcon size={iconSize} />
            </ViewerButton>
            <ViewerButton label="Reset view" onClick={handleReset}>
              <CrosshairSimpleIcon size={iconSize} />
            </ViewerButton>
            <ViewerButton
              label={expanded ? 'Fewer controls' : 'More controls'}
              onClick={() => setExpanded((e) => !e)}
              active={expanded}
            >
              <DotsThreeIcon size={iconSize} />
            </ViewerButton>

            {expanded && (
              <div className="flex flex-col gap-1 border-t border-slate-950/10 pt-1 dark:border-border">
                <ViewerButton
                  label="Rotate left 90"
                  onClick={() => applyRotation((rotation - 90 + 360) % 360)}
                >
                  <ArrowCounterClockwiseIcon size={iconSize} />
                </ViewerButton>
                <ViewerButton
                  label="Rotate right 90"
                  onClick={() => applyRotation((rotation + 90) % 360)}
                >
                  <ArrowClockwiseIcon size={iconSize} />
                </ViewerButton>
                <ViewerButton
                  label="Flip horizontal"
                  onClick={() => setFlippedH((f) => !f)}
                  active={flippedH}
                >
                  <FlipHorizontalIcon size={iconSize} />
                </ViewerButton>
                <ViewerButton
                  label="Flip vertical"
                  onClick={() => setFlippedV((f) => !f)}
                  active={flippedV}
                >
                  <FlipVerticalIcon size={iconSize} />
                </ViewerButton>
                <ViewerButton
                  label="Fine-tune rotation"
                  onClick={() => setFinetuneOpen((o) => !o)}
                  active={finetuneOpen}
                >
                  <SlidersHorizontalIcon size={iconSize} />
                </ViewerButton>
                <ViewerButton
                  label="Fullscreen"
                  onClick={() => viewerRef.current?.setFullScreen(!viewerRef.current?.isFullPage())}
                >
                  <CornersOutIcon size={iconSize} />
                </ViewerButton>
                {tiffUrl && (
                  <ViewerButton label="Download TIFF" href={tiffUrl}>
                    <DownloadSimpleIcon size={iconSize} />
                  </ViewerButton>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {finetuneOpen && (
        <LayerCard className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-18 z-20 w-56 rounded-lg p-3 shadow-xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>Rotation</span>
            <span>{rotation}°</span>
          </div>
          <input
            type="range"
            aria-label="Image rotation"
            value={rotation}
            onChange={(e) => applyRotation(Number(e.currentTarget.value))}
            min={0}
            max={359}
            step={1}
            className="w-full accent-sky-600"
          />
        </LayerCard>
      )}

      <div className="absolute bottom-3 left-1/2 z-20 max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-lg border border-white/10 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-xl dark:bg-popover">
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
            <span className="shrink-0 text-slate-500 dark:text-slate-400">{rotation}°</span>
          )}
          {usingTiff && <span className="shrink-0 font-bold text-sky-600">Full res</span>}
        </div>
      </div>
    </div>
  );
}
