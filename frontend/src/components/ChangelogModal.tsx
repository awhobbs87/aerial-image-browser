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

