import { useEffect, useRef, useState, useCallback } from "react";
import OpenSeadragon from "openseadragon";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import {
  Close,
  ZoomIn,
  ZoomOut,
  FitScreen,
  History,
} from "@mui/icons-material";

interface OpenSeadragonViewerProps {
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  onClose: () => void;
  onThenNowClick?: () => void;
}

// Debounce utility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function OpenSeadragonViewer({
  imageUrl,
  imageWidth,
  imageHeight,
  onClose,
  onThenNowClick,
}: OpenSeadragonViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const osdRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Calculate intelligent zoom limits based on image size
  const calculateZoomLimits = useCallback(() => {
    if (!imageWidth || !imageHeight) {
      return { minZoom: 0.5, maxZoom: 10, defaultZoom: 1 };
    }

    const totalPixels = imageWidth * imageHeight;
    const megapixels = totalPixels / 1_000_000;

    // Base limits
    const minZoom = 0.5; // Always allow zooming out
    let maxZoom = 10; // Default max

    // Adjust maxZoom based on image size
    if (megapixels < 1) {
      // Small images: allow more zoom for detail
      maxZoom = 20;
    } else if (megapixels < 5) {
      // Medium images: moderate zoom
      maxZoom = 15;
    } else if (megapixels < 15) {
      // Large images: careful zoom
      maxZoom = 10;
    } else if (megapixels < 25) {
      // Very large images: limited zoom to prevent memory issues
      maxZoom = 5;
    } else {
      // Huge images: very limited zoom
      maxZoom = 3;
    }

    console.log(
      `[OpenSeadragon] Image: ${imageWidth}x${imageHeight} (${megapixels.toFixed(1)}MP), maxZoom: ${maxZoom}`,
    );

    return { minZoom, maxZoom, defaultZoom: 1 };
  }, [imageWidth, imageHeight]);

  // Debounced zoom update to prevent lag
  const debouncedZoomUpdate = useRef(
    debounce((zoom: number) => {
      setZoomLevel(Math.round(zoom * 100));
    }, 100), // 100ms debounce
  ).current;

  useEffect(() => {
    if (!viewerRef.current) return;

    // Clean up existing viewer if it exists
    if (osdRef.current) {
      osdRef.current.destroy();
      osdRef.current = null;
    }

    const { minZoom, maxZoom, defaultZoom } = calculateZoomLimits();
    let isHandlingZoom = false; // Prevent recursive zoom handling

    // Initialize OpenSeadragon
    const viewer = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl:
        "https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/",
      tileSources: {
        type: "image",
        url: imageUrl,
      },
      // Zoom settings - conservative values to prevent crashes
      minZoomLevel: minZoom,
      maxZoomLevel: maxZoom,
      defaultZoomLevel: defaultZoom,
      zoomPerClick: 1.3, // Reduced for smoother zooming
      zoomPerScroll: 1.1, // Very conservative for mobile pinch
      zoomPerSecond: 1.5, // Limit zoom speed to prevent runaway zooming
      // Smooth animations
      animationTime: 0.5, // Slower animation for better control
      springStiffness: 8, // Less stiff for smoother motion
      // Constraints
      minZoomImageRatio: 0.8, // Allow slight zoom out
      maxZoomPixelRatio: 2.5, // Limit maximum zoom to prevent crashes
      visibilityRatio: 1.0, // Keep image fully visible
      constrainDuringPan: true,
      // Gesture settings
      gestureSettingsMouse: {
        clickToZoom: true,
        dblClickToZoom: true,
        pinchToZoom: true,
        flickEnabled: true,
        flickMinSpeed: 120,
        flickMomentum: 0.25,
      },
      gestureSettingsTouch: {
        clickToZoom: false,
        dblClickToZoom: true,
        pinchToZoom: true,
        flickEnabled: true,
        flickMinSpeed: 120,
        flickMomentum: 0.25,
      },
      // Visual settings
      showNavigationControl: false,
      showHomeControl: false,
      showZoomControl: false,
      showFullPageControl: false,
      minPixelRatio: 1.0, // Maintain 1:1 pixel ratio for maximum sharpness
      // Performance
      imageLoaderLimit: 2,
      timeout: 120000,
      // Prevent over-zooming past image quality
      maxImageCacheCount: 100,
      // Quality settings for maximum sharpness
      compositeOperation: "source-over", // Default, but explicit
      smoothTileEdgesMinZoom: Infinity, // Disable tile edge smoothing (keep sharp)
      immediateRender: false, // Wait for high-quality tiles
      blendTime: 0, // No blending animation for instant sharpness
      alwaysBlend: false, // Don't blend tiles (keeps sharp edges)
      wrapHorizontal: false,
      wrapVertical: false,
    });

    // Zoom handler: update UI and enforce limits
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewer.addHandler("zoom", (event: any) => {
      // Prevent recursive handling
      if (isHandlingZoom) return;

      const currentZoom = event.zoom;

      // Update zoom level display (debounced)
      debouncedZoomUpdate(currentZoom);

      // Check if we need to clamp the zoom
      let needsClamp = false;
      let clampedValue = currentZoom;

      if (currentZoom > maxZoom) {
        needsClamp = true;
        clampedValue = maxZoom;
      } else if (currentZoom < minZoom) {
        needsClamp = true;
        clampedValue = minZoom;
      }

      // If we need to clamp, do it carefully to avoid recursion
      if (needsClamp) {
        isHandlingZoom = true;
        requestAnimationFrame(() => {
          viewer.viewport.zoomTo(clampedValue, undefined, true);
          isHandlingZoom = false;
        });
      }
    });

    // Add constraint handler to prevent viewport from going completely black
    // This applies constraints during animation to keep content visible
    viewer.addHandler("animation", () => {
      if (isHandlingZoom) return;
      viewer.viewport.applyConstraints();
    });

    osdRef.current = viewer;

    return () => {
      viewer.destroy();
      osdRef.current = null;
    };
  }, [imageUrl, calculateZoomLimits, debouncedZoomUpdate]);

  const handleZoomIn = useCallback(() => {
    if (osdRef.current) {
      const currentZoom = osdRef.current.viewport.getZoom();
      osdRef.current.viewport.zoomTo(currentZoom * 1.4);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (osdRef.current) {
      const currentZoom = osdRef.current.viewport.getZoom();
      osdRef.current.viewport.zoomTo(currentZoom / 1.4);
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    if (osdRef.current) {
      osdRef.current.viewport.goHome();
    }
  }, []);

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: "rgba(0, 0, 0, 0.95)",
        zIndex: 9999,
      }}
    >
      {/* Zoom controls */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Tooltip title="Zoom in">
          <IconButton
            onClick={handleZoomIn}
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.1)",
              color: "white",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
            }}
          >
            <ZoomIn />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom out">
          <IconButton
            onClick={handleZoomOut}
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.1)",
              color: "white",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
            }}
          >
            <ZoomOut />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset zoom">
          <IconButton
            onClick={handleResetZoom}
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.1)",
              color: "white",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
            }}
          >
            <FitScreen />
          </IconButton>
        </Tooltip>
        {onThenNowClick && (
          <Tooltip title="Then vs Now">
            <IconButton
              onClick={onThenNowClick}
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
              }}
            >
              <History />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Close">
          <IconButton
            onClick={onClose}
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.1)",
              color: "white",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
            }}
          >
            <Close />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Zoom level indicator */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10000,
          bgcolor: "rgba(0, 0, 0, 0.5)",
          color: "white",
          px: 2,
          py: 1,
          borderRadius: 1,
        }}
      >
        <Typography variant="caption">{zoomLevel}%</Typography>
      </Box>

      {/* OpenSeadragon viewer container */}
      <div
        ref={viewerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
    </Box>
  );
}
