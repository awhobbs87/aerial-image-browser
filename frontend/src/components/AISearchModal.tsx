import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  IconButton,
} from "@mui/material";
import {
  AutoAwesome,
  Close,
  Search,
  CalendarMonth,
  HighQuality,
  PhotoCamera,
  Place,
} from "@mui/icons-material";
import { apiClient, type ParsedSearchQuery } from "../lib/apiClient";
import geocodingService from "../lib/geocoding";
import { appleLiquidGlass, getThemeValue } from "../theme/apple-liquid-glass";

interface AISearchModalProps {
  open: boolean;
  onClose: () => void;
  onSearch: (
    lat: number,
    lon: number,
    locationName?: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      imageTypes?: string[];
      minScale?: number;
      maxScale?: number;
      resolution?: string; // For display in AI filters banner
    },
  ) => void;
}

const EXAMPLE_QUERIES = [
  "Find aerial photos of Sandy Bay between 1940-1960",
  "High resolution images of Hobart CBD from the 1930s",
  "Show me old photos of 78 New Town Rd, New Town",
  "Aerial views of Launceston around 1950",
];

export default function AISearchModal({
  open,
  onClose,
  onSearch,
}: AISearchModalProps) {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedQuery, setParsedQuery] = useState<ParsedSearchQuery | null>(
    null,
  );
  const [stage, setStage] = useState<"input" | "parsed" | "searching">("input");

  const handleQuerySubmit = async () => {
    if (!query.trim()) return;

    setIsProcessing(true);
    setError(null);
    setStage("searching");

    try {
      // Parse the natural language query with AI
      const parsed = await apiClient.parseNaturalLanguageSearch(query);
      setParsedQuery(parsed);
      setStage("parsed");

      // Now geocode the extracted location
      const locations = await geocodingService.searchLocations(
        parsed.location,
        1,
      );

      if (locations.length === 0) {
        setError(
          `Could not find location "${parsed.location}". Try being more specific or check the spelling.`,
        );
        setStage("input");
        setIsProcessing(false);
        return;
      }

      const location = locations[0];
      const locationName = geocodingService.formatLocationName(location);

      // Build filters from parsed query
      const filters: {
        startDate?: string;
        endDate?: string;
        imageTypes?: string[];
        minScale?: number;
        maxScale?: number;
        resolution?: string;
      } = {};

      if (parsed.startYear) {
        filters.startDate = `${parsed.startYear}-01-01`;
      }
      if (parsed.endYear) {
        filters.endDate = `${parsed.endYear}-12-31`;
      }
      if (parsed.imageType) {
        filters.imageTypes = [parsed.imageType];
      }

      // Map resolution to scale filters
      // "high" = Very Detailed (≤5,000) + Detailed (5,001-15,000)
      // "medium" = Standard (15,001-40,000)
      // "low" = Overview (>40,000)
      if (parsed.resolution === "high") {
        filters.maxScale = 15000;
        filters.resolution = parsed.resolution;
      } else if (parsed.resolution === "medium") {
        filters.minScale = 15001;
        filters.maxScale = 40000;
        filters.resolution = parsed.resolution;
      } else if (parsed.resolution === "low") {
        filters.minScale = 40001;
        filters.resolution = parsed.resolution;
      }

      // Trigger the search
      onSearch(location.lat, location.lon, locationName, filters);

      // Reset state
      setQuery("");
      setParsedQuery(null);
      setStage("input");
    } catch (err) {
      console.error("AI search error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to process search query",
      );
      setStage("input");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  const handleClose = () => {
    setQuery("");
    setParsedQuery(null);
    setError(null);
    setStage("input");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: appleLiquidGlass.radius.large,
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(30, 30, 30, 0.95)"
              : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(40px)",
          border: (theme) =>
            `1px solid ${getThemeValue(
              appleLiquidGlass.borders.subtle,
              theme.palette.mode === "dark",
            )}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AutoAwesome sx={{ color: "#a855f7" }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AI Search
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Describe what you're looking for in natural language. The AI will
          parse your query and find relevant aerial photos.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="e.g., Find high resolution aerial photos of Battery Point from 1945-1955..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isProcessing}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleQuerySubmit();
            }
          }}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: appleLiquidGlass.radius.medium,
            },
          }}
        />

        {/* Example queries */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: "block" }}
          >
            Try an example:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {EXAMPLE_QUERIES.map((example, index) => (
              <Chip
                key={index}
                label={
                  example.length > 40 ? example.slice(0, 40) + "..." : example
                }
                size="small"
                onClick={() => handleExampleClick(example)}
                disabled={isProcessing}
                sx={{
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(168, 85, 247, 0.15)"
                        : "rgba(168, 85, 247, 0.1)",
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Parsed query preview */}
        {parsedQuery && stage === "parsed" && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: appleLiquidGlass.radius.medium,
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(168, 85, 247, 0.1)"
                  : "rgba(168, 85, 247, 0.05)",
              border: "1px solid rgba(168, 85, 247, 0.2)",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, color: "#a855f7", fontWeight: 600 }}
            >
              AI parsed your query:
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Place sx={{ fontSize: 18, color: "text.secondary" }} />
                <Typography variant="body2">
                  <strong>Location:</strong> {parsedQuery.location}
                </Typography>
              </Box>
              {(parsedQuery.startYear || parsedQuery.endYear) && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CalendarMonth
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                  <Typography variant="body2">
                    <strong>Date range:</strong>{" "}
                    {parsedQuery.startYear || "any"} -{" "}
                    {parsedQuery.endYear || "any"}
                  </Typography>
                </Box>
              )}
              {parsedQuery.resolution && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <HighQuality sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2">
                    <strong>Resolution:</strong> {parsedQuery.resolution}
                  </Typography>
                </Box>
              )}
              {parsedQuery.imageType && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PhotoCamera sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2">
                    <strong>Image type:</strong> {parsedQuery.imageType}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              py: 3,
            }}
          >
            <CircularProgress size={24} sx={{ color: "#a855f7" }} />
            <Typography color="text.secondary">
              {stage === "searching"
                ? "AI is analyzing your query..."
                : "Finding location..."}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={isProcessing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleQuerySubmit}
          disabled={!query.trim() || isProcessing}
          startIcon={
            isProcessing ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Search />
            )
          }
          sx={{
            background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #9333ea 0%, #4f46e5 100%)",
            },
          }}
        >
          {isProcessing ? "Processing..." : "Search"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
