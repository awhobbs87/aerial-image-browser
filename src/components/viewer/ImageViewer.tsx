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
  Collapse,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
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
        element: containerRef.current!,
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
        animationTime: 0.3,
        crossOriginPolicy: 'Anonymous',
        gestureSettingsTouch: {
          // Disable pinch-rotate on touch — it fights with pinch-to-zoom.
          // Rotation is available via manual controls instead.
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
    const sx = flippedH ? -1 : 1;
    const sy = flippedV ? -1 : 1;
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
  const iconSize = isMobile ? 16 : 20;
  const btnSize = isMobile ? 'md' : 'lg';

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
          <ActionIcon variant="subtle" size={btnSize} onClick={handleBack} aria-label="Back">
            <IconArrowLeft size={iconSize} />
          </ActionIcon>
        </Tooltip>
      </Paper>

      {/* Controls overlay */}
      {ready && (
        <Paper className={classes.controls} shadow="md" radius="md" p={isMobile ? 4 : 'xs'}>
          <Stack gap={isMobile ? 2 : 4}>
            {/* Always-visible core controls */}
            <Tooltip label="Zoom in" position="left" withArrow>
              <ActionIcon
                variant="subtle"
                size={btnSize}
                onClick={handleZoomIn}
                aria-label="Zoom in"
              >
                <IconZoomIn size={iconSize} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Zoom out" position="left" withArrow>
              <ActionIcon
                variant="subtle"
                size={btnSize}
                onClick={handleZoomOut}
                aria-label="Zoom out"
              >
                <IconZoomOut size={iconSize} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Reset view" position="left" withArrow>
              <ActionIcon
                variant="subtle"
                size={btnSize}
                onClick={handleReset}
                aria-label="Reset view"
              >
                <IconZoomReset size={iconSize} />
              </ActionIcon>
            </Tooltip>

            {/* Expand/collapse toggle */}
            <Tooltip
              label={expanded ? 'Fewer controls' : 'More controls'}
              position="left"
              withArrow
            >
              <ActionIcon
                variant={expanded ? 'light' : 'subtle'}
                size={btnSize}
                onClick={() => setExpanded((e) => !e)}
                aria-label={expanded ? 'Collapse controls' : 'Expand controls'}
              >
                <IconDots size={iconSize} />
              </ActionIcon>
            </Tooltip>

            {/* Expandable section */}
            <Collapse in={expanded}>
              <Stack gap={isMobile ? 2 : 4}>
                <Divider my={1} />

                {/* Rotation controls */}
                <Tooltip label="Rotate left 90" position="left" withArrow>
                  <ActionIcon
                    variant="subtle"
                    size={btnSize}
                    onClick={handleRotateCCW}
                    aria-label="Rotate left"
                  >
                    <IconRotate2 size={iconSize} style={{ transform: 'scaleX(-1)' }} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Rotate right 90" position="left" withArrow>
                  <ActionIcon
                    variant="subtle"
                    size={btnSize}
                    onClick={handleRotateCW}
                    aria-label="Rotate right"
                  >
                    <IconRotateClockwise size={iconSize} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Flip horizontal" position="left" withArrow>
                  <ActionIcon
                    variant={flippedH ? 'filled' : 'subtle'}
                    color={flippedH ? 'emerald' : undefined}
                    size={btnSize}
                    onClick={handleFlipH}
                    aria-label="Flip horizontal"
                  >
                    <IconFlipHorizontal size={iconSize} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Flip vertical" position="left" withArrow>
                  <ActionIcon
                    variant={flippedV ? 'filled' : 'subtle'}
                    color={flippedV ? 'emerald' : undefined}
                    size={btnSize}
                    onClick={handleFlipV}
                    aria-label="Flip vertical"
                  >
                    <IconFlipVertical size={iconSize} />
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
                        size={btnSize}
                        onClick={() => setFinetuneOpen((o) => !o)}
                        aria-label="Fine-tune rotation"
                      >
                        <IconAdjustments size={iconSize} />
                      </ActionIcon>
                    </Tooltip>
                  </Popover.Target>
                  <Popover.Dropdown p="sm" style={{ width: 200 }}>
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

                <Divider my={1} />

                <Tooltip label="Fullscreen" position="left" withArrow>
                  <ActionIcon
                    variant="subtle"
                    size={btnSize}
                    onClick={handleFullscreen}
                    aria-label="Fullscreen"
                  >
                    <IconMaximize size={iconSize} />
                  </ActionIcon>
                </Tooltip>
                {tiffUrl && (
                  <Tooltip label="Download TIFF" position="left" withArrow>
                    <ActionIcon
                      variant="subtle"
                      size={btnSize}
                      component="a"
                      href={tiffUrl}
                      aria-label="Download TIFF"
                    >
                      <IconDownload size={iconSize} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Stack>
            </Collapse>
          </Stack>
        </Paper>
      )}

      {/* Info bar */}
      <Paper className={classes.infoBar} shadow="md" radius="md" px="sm" py={4}>
        <Group gap={6} wrap="nowrap">
          {year ? (
            <Text size="xs" fw={700}>
              {year}
            </Text>
          ) : null}
          <Text size="xs" fw={600} lineClamp={1}>
            {imageName}
          </Text>
          {photoType && (
            <Text size="xs" c="dimmed" fw={500} style={{ whiteSpace: 'nowrap' }}>
              {photoType === 'Black & White' ? 'B&W' : photoType}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {layerLabel}
          </Text>
          {scale ? (
            <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
              1:{scale.toLocaleString()}
            </Text>
          ) : null}
          {!isMobile && project && (
            <Text size="xs" c="dimmed" lineClamp={1} style={{ whiteSpace: 'nowrap' }}>
              {project}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            |
          </Text>
          <Text size="xs" c="dimmed">
            {zoom}x
          </Text>
          {rotation !== 0 && (
            <Text size="xs" c="dimmed">
              {rotation}deg
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
