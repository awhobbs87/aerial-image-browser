import {
  Paper,
  Stack,
  Typography,
  Chip,
  Button,
  Divider,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import type { EnhancedPhoto } from "../types/api";

interface ComparisonTrayProps {
  photos: EnhancedPhoto[];
  onOpen: () => void;
  onOpenThenNow: () => void;
  onRemove: (photoKey: string) => void;
  onClear: () => void;
}

const getPhotoKey = (photo: EnhancedPhoto) => `${photo.layerId}-${photo.OBJECTID}`;

export default function ComparisonTray({
  photos,
  onOpen,
  onOpenThenNow,
  onRemove,
  onClear,
}: ComparisonTrayProps) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: { xs: 16, md: 24 },
        right: { xs: 16, md: 24 },
        width: { xs: "calc(100% - 32px)", sm: 360 },
        zIndex: 2000,
        borderRadius: 3,
        p: 2,
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 12px 32px rgba(0,0,0,0.6)"
            : "0 12px 32px rgba(15,23,42,0.25)",
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2" fontWeight={700}>
            Comparison ready
          </Typography>
          <IconButton size="small" onClick={onClear} aria-label="Clear comparison selection">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          sx={{ maxHeight: 120, overflowY: "auto" }}
        >
          {photos.map((photo) => (
            <Chip
              key={`tray-${getPhotoKey(photo)}`}
              label={`${photo.dateFormatted || "Unknown"} • ${photo.IMAGE_NAME}`}
              size="small"
              onDelete={() => onRemove(getPhotoKey(photo))}
              sx={{ maxWidth: "100%" }}
            />
          ))}
        </Stack>

        <Divider />

        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={1}>
          <Typography variant="caption" color="text.secondary">
            {photos.length === 1 ? "Compare with Then vs Now" : "Choose a view"}
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<CompareArrowsIcon />}
            onClick={onOpen}
            disabled={photos.length === 0}
            sx={{ mr: 1 }}
          >
            Compare
          </Button>
          <Button variant="outlined" size="small" onClick={onOpenThenNow} disabled={photos.length === 0}>
            Then vs Now
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
