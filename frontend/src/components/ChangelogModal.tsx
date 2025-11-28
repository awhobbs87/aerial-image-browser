import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
  Stack,
  IconButton,
} from "@mui/material";
import { Close, CheckCircle, Add, Build, BugReport } from "@mui/icons-material";

interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
}

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: "added" | "changed" | "fixed" | "improved";
    description: string;
  }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.8.0",
    date: "2025-11-29",
    changes: [
      { type: "fixed", description: "Mobile Welcome Screen: Hidden welcome cards on mobile when no search is active - map displays immediately without overlay" },
    ],
  },
  {
    version: "2.7.0",
    date: "2025-11-29",
    changes: [
      { type: "added", description: "Pin-Drop Location Selection: Click anywhere on the map to drop a pin, preview coordinates, then confirm to search - replaces instant search for better control" },
      { type: "added", description: "Visual Pin Marker: Red marker with pulsing circle animation shows selected location before search" },
      { type: "added", description: "Pin Action Buttons: Floating 'Search Here' and 'Cancel' buttons with coordinate display for confirming or canceling pin placement" },
      { type: "added", description: "Keyboard Shortcuts: Press Escape key to cancel pending pin and remove marker" },
      { type: "changed", description: "Mobile Layout: Map now displays by default on mobile (no welcome screen), tap to drop pin and search" },
      { type: "changed", description: "Search Behavior: Map clicks now show pending pin instead of immediate search - confirm with button to trigger API call" },
      { type: "improved", description: "Mobile User Experience: Direct access to interactive map on app launch, no need to navigate through welcome screen" },
      { type: "improved", description: "Search Control: Visual feedback and confirmation step prevents accidental searches from map clicks" },
    ],
  },
  {
    version: "2.6.0",
    date: "2025-11-28",
    changes: [
      { type: "added", description: "Web Worker TIFF Conversion: Client-side TIFF to PNG/WebP conversion in background thread - off-main-thread processing prevents UI blocking" },
      { type: "added", description: "PNG format (default): Truly lossless, zero compression artifacts, absolute maximum quality. Increased pixel budget from 20M to 100M pixels (~10000x10000 images)" },
      { type: "added", description: "OpenSeadragon Integration: Professional image viewer with intelligent zoom limits based on image megapixels (prevents crashes/black screens)" },
      { type: "added", description: "R2 Caching for Client Conversions: Automatically cache client-converted WebP to R2, check R2 cache before converting (avoid redundant work)" },
      { type: "changed", description: "Replaced react-zoom-pan-pinch with OpenSeadragon for better large image handling" },
      { type: "changed", description: "TIFF conversion now uses client-side Web Worker instead of external service" },
      { type: "changed", description: "Switched to PNG format (default) for truly lossless conversion (was WebP)" },
      { type: "improved", description: "Image Sharpness: MAXIMUM quality with zero compromises - PNG format (truly lossless), pixel-perfect rendering, 100M pixel budget, 1:1 pixel mapping, zero tile blending" },
      { type: "improved", description: "Performance: Conversion happens in background thread (no UI blocking)" },
    ],
  },
  {
    version: "2.5.0",
    date: "2025-11-28",
    changes: [
      { type: "added", description: "Intelligent search caching (5-minute cache for geocoding results)" },
      { type: "added", description: "Immediate loading feedback when typing in search bar" },
      { type: "changed", description: "Reduced debounce time from 300ms to 150ms for faster search responsiveness" },
      { type: "changed", description: "Optimized mobile UI with reduced padding across all components (sidebar, buttons, margins reduced by 25% on mobile)" },
      { type: "improved", description: "Search now shows loading state immediately when typing (no delay)" },
      { type: "improved", description: "More efficient use of screen space on mobile devices" },
    ],
  },
  {
    version: "2.4.0",
    date: "2025-11-25",
    changes: [
      { type: "added", description: "Professional zoom/pan image viewer with react-zoom-pan-pinch library" },
      { type: "added", description: "Smooth zoom transitions with proper easing animations, mouse wheel zoom at cursor position" },
      { type: "added", description: "Buttery smooth pinch-to-zoom on mobile devices, double-tap to toggle zoom" },
      { type: "changed", description: "Replaced manual zoom/pan implementation (~155 lines) with react-zoom-pan-pinch library" },
      { type: "improved", description: "Significantly reduced component complexity in PhotoPreviewModal" },
      { type: "improved", description: "Better mobile performance with native gesture handling" },
    ],
  },
  {
    version: "2.3.0",
    date: "2025-01-27",
    changes: [
      { type: "added", description: "Windows 7 Aero-style transparent search bar with enhanced transparency (35% opacity) and 40px blur for better map visibility" },
      { type: "added", description: "Natural pan/drag functionality for full-screen photo preview with touch support for mobile devices (iOS and Android)" },
      { type: "changed", description: "Comparison section styling: More compact design with frosted glass appearance and dynamic hint text" },
      { type: "changed", description: "Full-screen preview panning: Removed pan button controls in favor of natural drag behavior" },
      { type: "fixed", description: "iOS text selection issue when trying to pan images (added user-select: none and WebkitTouchCallout: none)" },
    ],
  },
  {
    version: "2.2.0",
    date: "2024-11-24",
    changes: [
      { type: "added", description: "TIFF to WEBP/PNG conversion service integration with automatic background conversion when opening photo preview modals" },
      { type: "added", description: "Enhanced full-screen image viewing: Fit-to-screen zoom functionality with automatic optimal zoom level calculation" },
      { type: "added", description: "Pan controls (up, down, left, right) for navigating zoomed images that appear when zoomed in (zoom > 100%)" },
      { type: "changed", description: "Conversion progress bar moved from top to bottom of image preview for better visibility" },
      { type: "improved", description: "Better image loading experience with thumbnail shown while conversion happens in background" },
    ],
  },
  {
    version: "2.1.0",
    date: "2024-11-19",
    changes: [
      { type: "added", description: "Advanced alignment controls for Then vs Now modal: Interactive position adjustment (X/Y offset), scale control (0.5x to 2x), rotation control (±45°)" },
      { type: "added", description: "Rotation controls for both images in side-by-side view" },
      { type: "added", description: "Mobile search drawer (similar to filters) - search bar hidden after search" },
      { type: "added", description: "Unified 4-button view control on mobile (Grid, Map, Timeline, Gallery)" },
      { type: "changed", description: "Then vs Now modal now uses Esri World Imagery instead of LIST services for better reliability" },
      { type: "improved", description: "Better space efficiency on mobile with optimized toggle button layouts" },
    ],
  },
  {
    version: "2.0.0",
    date: "2024-11-19",
    changes: [
      { type: "added", description: "Area selection feature - draw rectangles on map to search for photos covering that area" },
      { type: "added", description: "PhotoViewer component - unified photo viewing experience across all views" },
      { type: "added", description: "Mobile filter bottom sheet for better mobile UX" },
      { type: "changed", description: "Redesigned layout with collapsible sidebar (replaced resizable sidebar)" },
      { type: "changed", description: "Replaced ComparisonTray with floating action button (FAB) menu" },
      { type: "changed", description: "Redesigned FilterPanel with more compact design and better visual hierarchy" },
      { type: "improved", description: "Optimized PhotoMarkers - reduced max polygons from 200 to 100 with prioritization" },
      { type: "improved", description: "Enhanced theme with better contrast, spacing, and consistent styling" },
      { type: "improved", description: "Better mobile experience with improved touch targets and responsive design" },
      { type: "improved", description: "Performance optimizations throughout the application" },
    ],
  },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case "added":
      return <Add color="success" sx={{ fontSize: 18 }} />;
    case "changed":
      return <Build color="primary" sx={{ fontSize: 18 }} />;
    case "fixed":
      return <BugReport color="error" sx={{ fontSize: 18 }} />;
    case "improved":
      return <CheckCircle color="info" sx={{ fontSize: 18 }} />;
    default:
      return null;
  }
};

const getTypeColor = (type: string): "success" | "primary" | "error" | "info" | "default" => {
  switch (type) {
    case "added":
      return "success";
    case "changed":
      return "primary";
    case "fixed":
      return "error";
    case "improved":
      return "info";
    default:
      return "default";
  }
};

export default function ChangelogModal({ open, onClose }: ChangelogModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          maxHeight: "85vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
          Changelog
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          <Stack spacing={3}>
            {CHANGELOG.map((entry) => (
              <Box key={entry.version}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    v{entry.version}
                  </Typography>
                  <Chip
                    label={entry.date}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.75rem" }}
                  />
                </Box>

                <Stack spacing={1.5}>
                  {entry.changes.map((change, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        alignItems: "flex-start",
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.03)"
                            : "rgba(0, 0, 0, 0.02)",
                      }}
                    >
                      <Box sx={{ mt: 0.25 }}>{getTypeIcon(change.type)}</Box>
                      <Box sx={{ flex: 1 }}>
                        <Chip
                          label={change.type.charAt(0).toUpperCase() + change.type.slice(1)}
                          size="small"
                          color={getTypeColor(change.type)}
                          sx={{ mb: 0.5, fontSize: "0.7rem", height: 20 }}
                        />
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {change.description}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" size="large">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

