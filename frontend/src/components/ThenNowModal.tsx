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
} from "@mui/material";
import { Map as MapIcon, Close } from "@mui/icons-material";
import type { EnhancedPhoto } from "../types/api";
import apiClient from "../lib/apiClient";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface ThenNowModalProps {
  open: boolean;
  photo: EnhancedPhoto | null;
  onClose: () => void;
}

declare global {
  interface Window {
    initGoogleMaps?: () => void;
    google?: typeof google;
  }
}

export default function ThenNowModal({ open, photo, onClose }: ThenNowModalProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map>();

  const previewUrl = useMemo(() => {
    if (!photo) return null;
    return apiClient.getOptimizedImageUrl(photo.IMAGE_NAME, photo.layerId, {
      width: 1600,
      format: "webp",
      quality: 85,
    });
  }, [photo]);

  useEffect(() => {
    if (!open) return;
    if (!GOOGLE_MAPS_API_KEY) {
      setScriptError(
        "Missing Google Maps API key. Set VITE_GOOGLE_MAPS_API_KEY in your environment to enable this view."
      );
      return;
    }

    if (window.google) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[data-google-maps="true"]`);
    if (existingScript) {
      const onExistingLoad = () => setScriptLoaded(true);
      const onExistingError = () => setScriptError("Failed to load Google Maps API script.");

      existingScript.addEventListener("load", onExistingLoad);
      existingScript.addEventListener("error", onExistingError);

      return () => {
        existingScript.removeEventListener("load", onExistingLoad);
        existingScript.removeEventListener("error", onExistingError);
      };
    }

    const script = document.createElement("script");
    script.dataset.googleMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setScriptError("Failed to load Google Maps API script.");
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !scriptLoaded || !photo || !photo.geometry?.rings?.[0]) {
      return;
    }

    const path = photo.geometry.rings[0].map(([lon, lat]: [number, number]) => ({ lat, lng: lon }));
    const bounds = new google.maps.LatLngBounds();
    path.forEach((coord) => bounds.extend(coord));

    if (!mapRef.current && mapContainerRef.current) {
      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        disableDefaultUI: true,
        gestureHandling: "greedy",
      });
    }

    if (mapRef.current) {
      mapRef.current.fitBounds(bounds, 24);

      // Remove previous polygons
      const overlay = new google.maps.Polygon({
        paths: path,
        strokeColor: "#10b981",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#10b981",
        fillOpacity: 0.2,
      });
      overlay.setMap(mapRef.current);
    }
  }, [open, scriptLoaded, photo]);

  const renderContent = () => {
    if (!photo) {
      return <Alert severity="info">Select a photo to enable Then vs Now comparison.</Alert>;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return (
        <Alert severity="warning">
          Provide a Google Maps API key via VITE_GOOGLE_MAPS_API_KEY to view the modern satellite overlay.
        </Alert>
      );
    }

    if (scriptError) {
      return <Alert severity="error">{scriptError}</Alert>;
    }

    if (!scriptLoaded) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!photo.geometry?.rings?.[0]) {
      return <Alert severity="warning">This photo is missing geometry, so we cannot map it.</Alert>;
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
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
