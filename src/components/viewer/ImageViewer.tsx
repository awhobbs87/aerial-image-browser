import { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import { ActionIcon, Group, Text, Paper, Tooltip, Stack } from '@mantine/core';
import {
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
  IconRotateClockwise,
  IconMaximize,
  IconDownload,
} from '@tabler/icons-react';
import classes from './ImageViewer.module.css';

interface ImageViewerProps {
  imageUrl: string;
  layerId: number;
  imageName: string;
  tiffUrl?: string;
}

export function ImageViewer({ imageUrl, layerId, imageName, tiffUrl }: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = OpenSeadragon({
      element: containerRef.current,
      prefixUrl: '', // No default button images needed
      tileSources: {
        type: 'image',
        url: imageUrl,
      },
      showNavigationControl: false,
      showNavigator: true,
      navigatorPosition: 'BOTTOM_RIGHT',
      navigatorSizeRatio: 0.15,
      minZoomLevel: 0.5,
      maxZoomLevel: 20,
      visibilityRatio: 0.8,
      constrainDuringPan: true,
      animationTime: 0.3,
      gestureSettingsTouch: {
        pinchRotate: true,
      },
    });

    viewer.addHandler('zoom', (event: { zoom: number }) => {
      setZoom(Math.round(event.zoom * 100) / 100);
    });

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [imageUrl]);

  const handleZoomIn = () => viewerRef.current?.viewport?.zoomBy(1.5);
  const handleZoomOut = () => viewerRef.current?.viewport?.zoomBy(0.67);
  const handleReset = () => viewerRef.current?.viewport?.goHome();
  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    viewerRef.current?.viewport?.setRotation(newRotation);
  };
  const handleFullscreen = () => viewerRef.current?.setFullScreen(!viewerRef.current?.isFullPage());

  const layerLabel = layerId === 0 ? 'Aerial' : layerId === 1 ? 'Ortho' : 'Digital';

  return (
    <div className={classes.wrapper}>
      <div ref={containerRef} className={classes.viewer} />

      {/* Controls overlay */}
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
          <Tooltip label="Rotate 90deg" position="left" withArrow>
            <ActionIcon variant="subtle" size="lg" onClick={handleRotate} aria-label="Rotate">
              <IconRotateClockwise size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Fullscreen" position="left" withArrow>
            <ActionIcon variant="subtle" size="lg" onClick={handleFullscreen} aria-label="Fullscreen">
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

      {/* Info bar */}
      <Paper className={classes.infoBar} shadow="md" radius="md" px="md" py="xs">
        <Group gap="md" wrap="nowrap">
          <Text size="sm" fw={600} lineClamp={1}>{imageName}</Text>
          <Text size="xs" c="dimmed">{layerLabel}</Text>
          <Text size="xs" c="dimmed">{zoom}x</Text>
        </Group>
      </Paper>
    </div>
  );
}
