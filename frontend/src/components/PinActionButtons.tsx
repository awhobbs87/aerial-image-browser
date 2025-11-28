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
 */
export default function PinActionButtons({ position, onConfirm, onCancel }: PinActionButtonsProps) {
  const [lat, lon] = position;

  return (
    <Paper
      elevation={4}
      sx={{
        position: "absolute",
        bottom: { xs: 80, md: 24 },
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        maxWidth: { xs: "calc(100% - 32px)", sm: 400 },
        width: "100%",
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
          color="text.secondary"
          sx={{
            mb: 1.5,
            fontWeight: 500,
            textAlign: "center",
            fontFamily: "monospace",
          }}
        >
          {formatCoordinates(lat, lon)}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<CloseIcon />}
            onClick={onCancel}
            fullWidth
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SearchIcon />}
            onClick={onConfirm}
            fullWidth
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: 2,
              "&:hover": {
                boxShadow: 4,
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
