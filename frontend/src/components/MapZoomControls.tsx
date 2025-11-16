import { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { Box, IconButton, Tooltip, Zoom } from '@mui/material';
import { Add, Remove, MyLocation } from '@mui/icons-material';

interface MapZoomControlsProps {
  searchCenter?: [number, number] | null;
}

export default function MapZoomControls({ searchCenter }: MapZoomControlsProps) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());
  const [maxZoom] = useState(map.getMaxZoom());
  const [minZoom] = useState(map.getMinZoom());
  const [showControls, setShowControls] = useState(false);

  // Track zoom changes
  useEffect(() => {
    const handleZoom = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map]);

  // Show controls on mobile or when explicitly toggled
  useEffect(() => {
    const checkMobile = () => {
      setShowControls(window.innerWidth < 900); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleRecenter = () => {
    if (searchCenter) {
      map.setView(searchCenter, 13, { animate: true });
    } else {
      // Recenter on Tasmania if no search center
      map.setView([-42.0, 147.0], 8, { animate: true });
    }
  };

  if (!showControls) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {/* Zoom In */}
      <Zoom in={showControls}>
        <Tooltip title="Zoom in" placement="left">
          <IconButton
            onClick={handleZoomIn}
            disabled={currentZoom >= maxZoom}
            size="small"
            sx={{
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(0, 0, 0, 0.8)'
                  : 'rgba(255, 255, 255, 0.95)',
              boxShadow: 2,
              width: 42,
              height: 42,
              '&:hover': {
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.9)'
                    : 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.05)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <Add />
          </IconButton>
        </Tooltip>
      </Zoom>

      {/* Zoom Out */}
      <Zoom in={showControls} style={{ transitionDelay: '50ms' }}>
        <Tooltip title="Zoom out" placement="left">
          <IconButton
            onClick={handleZoomOut}
            disabled={currentZoom <= minZoom}
            size="small"
            sx={{
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(0, 0, 0, 0.8)'
                  : 'rgba(255, 255, 255, 0.95)',
              boxShadow: 2,
              width: 42,
              height: 42,
              '&:hover': {
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.9)'
                    : 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.05)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <Remove />
          </IconButton>
        </Tooltip>
      </Zoom>

      {/* Recenter */}
      <Zoom in={showControls} style={{ transitionDelay: '100ms' }}>
        <Tooltip title="Recenter map" placement="left">
          <IconButton
            onClick={handleRecenter}
            size="small"
            sx={{
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(0, 0, 0, 0.8)'
                  : 'rgba(255, 255, 255, 0.95)',
              boxShadow: 2,
              width: 42,
              height: 42,
              color: 'primary.main',
              '&:hover': {
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.9)'
                    : 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.05)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <MyLocation />
          </IconButton>
        </Tooltip>
      </Zoom>
    </Box>
  );
}
