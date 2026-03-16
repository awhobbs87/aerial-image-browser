import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActionIcon,
  Group,
  Text,
  Paper,
  Tooltip,
  Stack,
  Loader,
  Center,
  Slider,
  Divider,
  Popover,
} from '@mantine/core';
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
} from '@tabler/icons-react';
import classes from './ImageViewer.module.css';

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
        element: containerRef.current!,
        prefixUrl: '',
        tileSources,
        showNavigationControl: false,
        showNavigator: true,
        navigatorPosition: 'BOTTOM_RIGHT',
        navigatorSizeRatio: 0.15,
        minZoomLevel: 0.5,
        maxZoomLevel: 40,
        visibilityRatio: 0.8,
        constrainDuringPan: true,
        animationTime: 0.3,
        crossOriginPolicy: 'Anonymous',
        gestureSettingsTouch: { pinchRotate: true },
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
  }, [imageUrl, tiffUrl]);

  // Apply rotation to OpenSeadragon viewport
  const applyRotation = useCallback((deg: number) => {
    setRotation(deg);
    viewerRef.current?.viewport?.setRotation(deg);
  }, []);

  // Apply flip via CSS transform on the canvas container
  // OpenSeadragon doesn't have native flip, so we use CSS scaleX/scaleY
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sx = flippedH ? -1 : 1;
    const sy = flippedV ? -1 : 1;
    // Apply to the OSD canvas container (first child of our ref)
    const canvas = el.querySelector('.openseadragon-canvas') as HTMLElement | null;
    if (canvas) {
      canvas.style.transform = `scale(${sx}, ${sy})`;
    }
  }, [flippedH, flippedV]);

  const handleZoomIn = () => viewerRef.current?.viewport?.zoomBy(1.5);
  const handleZoomOut = () => viewerRef.current?.viewport?.zoomBy(0.67);
  const handleReset = () => {
    viewerRef.current?.viewport?.goHome();
    applyRotation(0);
    setFlippedH(false);
    setFlippedV(false);
  };

  const handleRotateCW = () => applyRotation((rotation + 90) % 360);
  const handleRotateCCW = () => applyRotation((rotation - 90 + 360) % 360);
  const handleFlipH = () => setFlippedH((f) => !f);
  const handleFlipV = () => setFlippedV((f) => !f);
  const handleFullscreen = () => viewerRef.current?.setFullScreen(!viewerRef.current?.isFullPage());

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/search';
    }
  };

  const layerLabel = layerId === 0 ? 'Aerial' : layerId === 1 ? 'Ortho' : 'Digital';

  return (
    <div className={classes.wrapper}>
      <div ref={containerRef} className={classes.viewer} />

      {loading && (
        <Center className={classes.loader}>
          <Loader size="lg" color="gray" />
        </Center>
      )}

      {/* Back button */}
      <Paper className={classes.backBtn} shadow="md" radius="md" p={0}>
        <Tooltip label="Back to results" position="right" withArrow>
          <ActionIcon variant="subtle" size="lg" onClick={handleBack} aria-label="Back">
            <IconArrowLeft size={20} />
          </ActionIcon>
        </Tooltip>
      </Paper>

      {/* Controls overlay */}
      {ready && (
        <Paper className={classes.controls} shadow="md" radius="md" p="xs">
          <Stack gap={4}>
            <Tooltip label="Zoom in" position="left" withArrow>
              <ActionIcon variant="subtle" size="lg" onClick={handleZoomIn} aria-label="Zoom in">
                <IconZoomIn size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Zoom out" position="left" withArrow>
              <ActionIcon variant="subtle" size="lg" onClick={handleZoomOut} aria-label="Zoom out">
                <IconZoomOut size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Reset view" position="left" withArrow>
              <ActionIcon variant="subtle" size="lg" onClick={handleReset} aria-label="Reset view">
                <IconZoomReset size={20} />
              </ActionIcon>
            </Tooltip>

            <Divider my={2} />

            {/* Rotation controls */}
            <Tooltip label="Rotate left 90" position="left" withArrow>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={handleRotateCCW}
                aria-label="Rotate left"
              >
                <IconRotate2 size={20} style={{ transform: 'scaleX(-1)' }} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Rotate right 90" position="left" withArrow>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={handleRotateCW}
                aria-label="Rotate right"
              >
                <IconRotateClockwise size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Flip horizontal" position="left" withArrow>
              <ActionIcon
                variant={flippedH ? 'filled' : 'subtle'}
                color={flippedH ? 'emerald' : undefined}
                size="lg"
                onClick={handleFlipH}
                aria-label="Flip horizontal"
              >
                <IconFlipHorizontal size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Flip vertical" position="left" withArrow>
              <ActionIcon
                variant={flippedV ? 'filled' : 'subtle'}
                color={flippedV ? 'emerald' : undefined}
                size="lg"
                onClick={handleFlipV}
                aria-label="Flip vertical"
              >
                <IconFlipVertical size={20} />
              </ActionIcon>
            </Tooltip>

            {/* Fine-tune rotation popover */}
            <Popover
              opened={finetuneOpen}
              onChange={setFinetuneOpen}
              position="left"
              withArrow
              shadow="md"
            >
              <Popover.Target>
                <Tooltip
                  label="Fine-tune rotation"
                  position="left"
                  withArrow
                  disabled={finetuneOpen}
                >
                  <ActionIcon
                    variant={finetuneOpen ? 'filled' : 'subtle'}
                    color={finetuneOpen ? 'emerald' : undefined}
                    size="lg"
                    onClick={() => setFinetuneOpen((o) => !o)}
                    aria-label="Fine-tune rotation"
                  >
                    <IconAdjustments size={20} />
                  </ActionIcon>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown p="sm" style={{ width: 220 }}>
                <Stack gap={6}>
                  <Group justify="space-between">
                    <Text size="xs" fw={600}>
                      Rotation
                    </Text>
                    <Text size="xs" c="dimmed">
                      {rotation}deg
                    </Text>
                  </Group>
                  <Slider
                    value={rotation}
                    onChange={applyRotation}
                    min={0}
                    max={359}
                    step={1}
                    size="sm"
                    label={(v) => `${v}deg`}
                    marks={[
                      { value: 0, label: '0' },
                      { value: 90, label: '90' },
                      { value: 180, label: '180' },
                      { value: 270, label: '270' },
                    ]}
                  />
                </Stack>
              </Popover.Dropdown>
            </Popover>

            <Divider my={2} />

            <Tooltip label="Fullscreen" position="left" withArrow>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={handleFullscreen}
                aria-label="Fullscreen"
              >
                <IconMaximize size={20} />
              </ActionIcon>
            </Tooltip>
            {tiffUrl && (
              <Tooltip label="Download TIFF" position="left" withArrow>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  component="a"
                  href={tiffUrl}
                  aria-label="Download TIFF"
                >
                  <IconDownload size={20} />
                </ActionIcon>
              </Tooltip>
            )}
          </Stack>
        </Paper>
      )}

      {/* Info bar */}
      <Paper className={classes.infoBar} shadow="md" radius="md" px="md" py="xs">
        <Group gap={10} wrap="nowrap">
          {/* Primary: year + name */}
          {year ? (
            <Text size="sm" fw={700}>
              {year}
            </Text>
          ) : null}
          <Text size="sm" fw={600} lineClamp={1}>
            {imageName}
          </Text>

          {/* Type + layer badge */}
          {photoType && (
            <Text size="xs" c="dimmed" fw={500} style={{ whiteSpace: 'nowrap' }}>
              {photoType === 'Black & White' ? 'B&W' : photoType}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {layerLabel}
          </Text>

          {/* Scale */}
          {scale ? (
            <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
              1:{scale.toLocaleString()}
            </Text>
          ) : null}

          {/* Project name */}
          {project && (
            <Text size="xs" c="dimmed" lineClamp={1} style={{ whiteSpace: 'nowrap' }}>
              {project}
            </Text>
          )}

          {/* Divider before viewer state */}
          <Text size="xs" c="dimmed">
            |
          </Text>

          {/* Viewer state */}
          <Text size="xs" c="dimmed">
            {zoom}x
          </Text>
          {rotation !== 0 && (
            <Text size="xs" c="dimmed">
              {rotation}deg
            </Text>
          )}
          {(flippedH || flippedV) && (
            <Text size="xs" c="dimmed">
              {flippedH && flippedV ? 'Flipped H+V' : flippedH ? 'Flipped H' : 'Flipped V'}
            </Text>
          )}
          {usingTiff && (
            <Text size="xs" c="green" fw={500}>
              Full res
            </Text>
          )}
        </Group>
      </Paper>
    </div>
  );
}
