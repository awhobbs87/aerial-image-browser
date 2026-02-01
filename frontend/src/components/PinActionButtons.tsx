import { Box, Button, Paper, Typography, Stack } from "@mui/material";
import { Search as SearchIcon, Close as CloseIcon } from "@mui/icons-material";
import { formatCoordinates } from "../lib/formatCoordinates";

interface PinActionButtonsProps {
  position: [number, number];
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * PinActionButtons - Floating action buttons for confirming or canceling a pin drop
 * Displays coordinate information and action buttons
 * Positioned at center-bottom but higher to avoid overlap with welcome text
 */
export default function PinActionButtons({
  position,
  onConfirm,
  onCancel,
}: PinActionButtonsProps) {
  const [lat, lon] = position;

  return (
    <Paper
      elevation={4}
      sx={{
        position: "absolute",
        // Position higher on the screen to avoid overlap with welcome text
        bottom: { xs: 140, md: 160 },
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1100, // Higher than welcome text (z-index: 100)
        maxWidth: { xs: "calc(100% - 32px)", sm: 380 },
        width: "auto",
        borderRadius: 3,
        bgcolor: "rgba(18, 18, 18, 0.92)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        border: "1px solid rgba(148, 163, 184, 0.15)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        animation: "slideUp 0.3s ease-out",
        "@keyframes slideUp": {
          from: {
            opacity: 0,
            transform: "translateX(-50%) translateY(20px)",
          },
          to: {
            opacity: 1,
            transform: "translateX(-50%) translateY(0)",
          },
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography
          variant="body2"
          sx={{
            mb: 1.5,
            fontWeight: 500,
            textAlign: "center",
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "#94A3B8",
          }}
        >
          {formatCoordinates(lat, lon)}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<CloseIcon sx={{ fontSize: 18 }} />}
            onClick={onCancel}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              px: 2.5,
              py: 1,
              color: "#94A3B8",
              borderColor: "rgba(148, 163, 184, 0.3)",
              "&:hover": {
                borderColor: "#94A3B8",
                bgcolor: "rgba(148, 163, 184, 0.1)",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SearchIcon sx={{ fontSize: 18 }} />}
            onClick={onConfirm}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              px: 2.5,
              py: 1,
              bgcolor: "#10B981",
              color: "#FFFFFF",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
              "&:hover": {
                bgcolor: "#059669",
                boxShadow: "0 6px 20px rgba(16, 185, 129, 0.5)",
              },
            }}
          >
            Search Here
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
