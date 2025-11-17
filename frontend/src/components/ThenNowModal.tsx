import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Stack,
  Button,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Map as MapIcon, Close } from "@mui/icons-material";
import type { EnhancedPhoto } from "../types/api";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import apiClient from "../lib/apiClient";

const DEFAULT_STYLE = "https://demotiles.maplibre.org/style.json";

interface ThenNowModalProps {
  open: boolean;
  photo: EnhancedPhoto | null;
  onClose: () => void;
}

export default function ThenNowModal({ open, photo, onClose }: ThenNowModalProps) {
  const [mapReady, setMapReady] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const previewUrl = useMemo(() => {
    if (!photo) return null;
    return apiClient.getOptimizedImageUrl(photo.IMAGE_NAME, photo.layerId, {
      width: 1600,
      format: "webp",
      quality: 85,
    });
  }, [photo]);

  useEffect(() => {
    if (!open || !mapContainerRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DEFAULT_STYLE,
      center: [147.325, -42.879],
      zoom: 8,
      attributionControl: true,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current.on("load", () => setMapReady(true));

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open || !mapReady || !mapRef.current || !photo?.geometry?.rings?.[0]) {
      return;
    }

    const ring = photo.geometry.rings[0];
    const coordinates = ring.map(([lon, lat]: [number, number]) => [lon, lat]);
    const geojson = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
      properties: {},
    };

    const sourceId = "photo-footprint";
    if (mapRef.current.getSource(sourceId)) {
      (mapRef.current.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
    } else {
      mapRef.current.addSource(sourceId, {
        type: "geojson",
        data: geojson,
      });
      mapRef.current.addLayer({
        id: "photo-footprint-fill",
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": 0.25,
        },
      });
      mapRef.current.addLayer({
        id: "photo-footprint-line",
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#10b981",
          "line-width": 2,
        },
      });
    }

    const bounds = coordinates.reduce((acc, coord) => acc.extend(coord as [number, number]), new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]));
    mapRef.current.fitBounds(bounds, { padding: 24, maxZoom: 17 });
  }, [open, mapReady, photo]);

  const renderContent = () => {
    if (!photo) {
      return <Alert severity="info">Select a photo to enable Then vs Now comparison.</Alert>;
    }

    if (!photo.geometry?.rings?.[0]) {
      return <Alert severity="warning">This photo is missing geometry, so we cannot map it.</Alert>;
    }

    if (!mapReady) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Paper sx={{ flex: 1, p: 2, borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Then — {photo.dateFormatted || "Unknown Date"}
          </Typography>
          <Box
            component="img"
            src={previewUrl || undefined}
            alt={photo.IMAGE_NAME}
            sx={{
              width: "100%",
              borderRadius: 2,
              objectFit: "contain",
              maxHeight: 400,
            }}
          />
        </Paper>
        <Paper sx={{ flex: 1, p: 2, borderRadius: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <MapIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              Now — Current Satellite
            </Typography>
          </Stack>
          <Box
            ref={mapContainerRef}
            sx={{
              width: "100%",
              height: { xs: 320, md: 400 },
              borderRadius: 2,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {!scriptLoaded && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "background.paper",
                }}
              >
                <CircularProgress />
              </Box>
            )}
          </Box>
        </Paper>
      </Stack>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" fullScreen={isMobile}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" fontWeight={700}>
          Then vs Now
        </Typography>
        <IconButton onClick={onClose} aria-label="Close Then vs Now modal">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>{renderContent()}</DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
