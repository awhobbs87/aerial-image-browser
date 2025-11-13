import React from "react";
import {
  Box,
  Stack,
  Typography,
  Chip,
  Divider,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  IconButton,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  Clear,
  CalendarToday,
  PhotoSizeSelectActual,
  Image,
  HelpOutline,
} from "@mui/icons-material";
import { format } from "date-fns";

export interface Filters {
  startDate: Date | null;
  endDate: Date | null;
  selectedScales: number[];
  layerTypes: {
    aerial: boolean;
    ortho: boolean;
    digital: boolean;
  };
}

interface FilterPanelProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  availableScales?: number[]; // Scales available in current result set
}

export default function FilterPanel({ filters, onFiltersChange, availableScales = [] }: FilterPanelProps) {

  // Sort and format available scales
  const sortedScales = [...availableScales].sort((a, b) => a - b);

  // Auto-select all scales when they first become available (if none are selected)
  React.useEffect(() => {
    if (availableScales.length > 0 && filters.selectedScales.length === 0) {
      onFiltersChange({
        ...filters,
        selectedScales: availableScales,
      });
    }
  }, [availableScales.length]); // Only run when availableScales changes

  const formatScale = (scale: number): string => {
    if (scale >= 1000) {
      return `1:${(scale / 1000).toFixed(0)}K`;
    }
    return `1:${scale}`;
  };

  const handleLayerTypeChange = (type: "aerial" | "ortho" | "digital") => {
    onFiltersChange({
      ...filters,
      layerTypes: {
        ...filters.layerTypes,
        [type]: !filters.layerTypes[type],
      },
    });
  };

  const handleScaleToggle = (scale: number) => {
    const currentScales = filters.selectedScales;
    const newScales = currentScales.includes(scale)
      ? currentScales.filter(s => s !== scale)
      : [...currentScales, scale];

    onFiltersChange({
      ...filters,
      selectedScales: newScales,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      startDate: null,
      endDate: null,
      selectedScales: [],
      layerTypes: {
        aerial: true,
        ortho: true,
        digital: true,
      },
    });
  };

  const clearDateFilter = () => {
    onFiltersChange({
      ...filters,
      startDate: null,
      endDate: null,
    });
  };

  const clearScaleFilter = () => {
    onFiltersChange({
      ...filters,
      selectedScales: [],
    });
  };

  const resetLayerTypes = () => {
    onFiltersChange({
      ...filters,
      layerTypes: {
        aerial: true,
        ortho: true,
        digital: true,
      },
    });
  };

  const hasActiveFilters =
    filters.startDate !== null ||
    filters.endDate !== null ||
    filters.selectedScales.length > 0 ||
    !filters.layerTypes.aerial ||
    !filters.layerTypes.ortho ||
    !filters.layerTypes.digital;

  const hasDateFilter = filters.startDate !== null || filters.endDate !== null;
  const hasScaleFilter = filters.selectedScales.length > 0;
  const hasLayerFilter =
    !filters.layerTypes.aerial || !filters.layerTypes.ortho || !filters.layerTypes.digital;

  // Format active filters for display
  const getDateFilterLabel = () => {
    if (filters.startDate && filters.endDate) {
      return `${format(filters.startDate, "MMM yyyy")} - ${format(filters.endDate, "MMM yyyy")}`;
    } else if (filters.startDate) {
      return `From ${format(filters.startDate, "MMM yyyy")}`;
    } else if (filters.endDate) {
      return `Until ${format(filters.endDate, "MMM yyyy")}`;
    }
    return "";
  };

  const getScaleFilterLabel = () => {
    if (filters.selectedScales.length === 0) return "";
    if (filters.selectedScales.length === 1) {
      return formatScale(filters.selectedScales[0]);
    }
    return `${filters.selectedScales.length} scales`;
  };

  const getLayerFilterLabel = () => {
    const active = [];
    if (filters.layerTypes.aerial) active.push("Aerial");
    if (filters.layerTypes.ortho) active.push("Ortho");
    if (filters.layerTypes.digital) active.push("Digital");

    if (active.length === 0) return "No types selected";
    if (active.length === 3) return "";
    return active.join(", ");
  };

  return (
    <Box sx={{ mb: 1.5 }}>
      {/* Active Filters Chips - More compact */}
      {hasActiveFilters && (
        <Box sx={{ mb: 0.75 }}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {hasDateFilter && (
              <Chip
                icon={<CalendarToday sx={{ fontSize: 14 }} />}
                label={getDateFilterLabel()}
                onDelete={clearDateFilter}
                color="primary"
                variant="filled"
                size="small"
                sx={{
                  height: 24,
                  fontSize: "0.75rem",
                  "& .MuiChip-deleteIcon": {
                    fontSize: 16,
                  },
                }}
              />
            )}
            {hasScaleFilter && (
              <Chip
                icon={<PhotoSizeSelectActual sx={{ fontSize: 14 }} />}
                label={getScaleFilterLabel()}
                onDelete={clearScaleFilter}
                color="secondary"
                variant="filled"
                size="small"
                sx={{
                  height: 24,
                  fontSize: "0.75rem",
                  "& .MuiChip-deleteIcon": {
                    fontSize: 16,
                  },
                }}
              />
            )}
            {hasLayerFilter && (
              <Chip
                icon={<Image sx={{ fontSize: 14 }} />}
                label={getLayerFilterLabel()}
                onDelete={resetLayerTypes}
                color="success"
                variant="filled"
                size="small"
                sx={{
                  height: 24,
                  fontSize: "0.75rem",
                  "& .MuiChip-deleteIcon": {
                    fontSize: 16,
                  },
                }}
              />
            )}
            <Chip
              icon={<Clear sx={{ fontSize: 14 }} />}
              label="Clear"
              onClick={handleClearFilters}
              variant="outlined"
              size="small"
              sx={{
                height: 24,
                fontSize: "0.75rem",
              }}
            />
          </Stack>
        </Box>
      )}

      {/* Compact Filter Panel - No accordion */}
      <Paper
        elevation={2}
        sx={{
          overflow: "hidden",
          background: (theme) =>
            theme.palette.mode === "dark" ? "#2d3748" : "#ffffff",
          border: (theme) =>
            theme.palette.mode === "dark" ? "1px solid #4a5568" : "1px solid #e2e8f0",
        }}
      >
        <Box sx={{ p: 1 }}>
          <Stack spacing={1}>
            {/* Date Range Filter */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontSize: "0.7rem",
                }}
              >
                <CalendarToday sx={{ fontSize: 14 }} color="primary" />
                Date Range
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={0.75}>
                  <DatePicker
                    label="Start"
                    value={filters.startDate}
                    onChange={(date) => onFiltersChange({ ...filters, startDate: date })}
                    slotProps={{
                      textField: {
                        size: "small",
                        fullWidth: true,
                      },
                    }}
                  />
                  <DatePicker
                    label="End"
                    value={filters.endDate}
                    onChange={(date) => onFiltersChange({ ...filters, endDate: date })}
                    slotProps={{
                      textField: {
                        size: "small",
                        fullWidth: true,
                      },
                    }}
                  />
                </Stack>
              </LocalizationProvider>
            </Box>

            <Divider />

            {/* Scale Filter - Dynamic Buttons */}
            {sortedScales.length > 0 && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      fontSize: "0.7rem",
                    }}
                  >
                    <PhotoSizeSelectActual sx={{ fontSize: 13 }} color="secondary" />
                    Scale
                  </Typography>
                  <Tooltip
                    title="Click to filter by scale. Smaller = more detail, larger = wider coverage"
                    arrow
                    placement="top"
                  >
                    <IconButton size="small" sx={{ p: 0.25 }}>
                      <HelpOutline sx={{ fontSize: 11 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {sortedScales.map((scale) => (
                    <Chip
                      key={scale}
                      label={formatScale(scale)}
                      onClick={() => handleScaleToggle(scale)}
                      color={filters.selectedScales.includes(scale) ? "secondary" : "default"}
                      variant={filters.selectedScales.includes(scale) ? "filled" : "outlined"}
                      size="small"
                      sx={{
                        fontSize: "0.7rem",
                        height: 24,
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: (theme) =>
                            filters.selectedScales.includes(scale)
                              ? undefined
                              : theme.palette.mode === "dark"
                              ? "rgba(156, 39, 176, 0.1)"
                              : "rgba(156, 39, 176, 0.05)",
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {sortedScales.length > 0 && <Divider />}

            {/* Layer Type Filter */}
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    fontSize: "0.7rem",
                  }}
                >
                  <Image sx={{ fontSize: 13 }} color="success" />
                  Types
                </Typography>
                <Tooltip
                  title="Aerial: traditional photos | Ortho: corrected | Digital: modern"
                  arrow
                  placement="top"
                >
                  <IconButton size="small" sx={{ p: 0.25 }}>
                    <HelpOutline sx={{ fontSize: 11 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <ToggleButtonGroup
                value={Object.entries(filters.layerTypes)
                  .filter(([, checked]) => checked)
                  .map(([type]) => type)}
                onChange={(_event, newTypes) => {
                  onFiltersChange({
                    ...filters,
                    layerTypes: {
                      aerial: newTypes.includes("aerial"),
                      ortho: newTypes.includes("ortho"),
                      digital: newTypes.includes("digital"),
                    },
                  });
                }}
                size="small"
                sx={{
                  display: "flex",
                  gap: 0.5,
                  width: "100%",
                }}
              >
                <ToggleButton
                  value="aerial"
                  sx={{
                    flex: 1,
                    py: 0.375,
                    px: 0.75,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.7rem",
                  }}
                >
                  Aerial
                </ToggleButton>
                <ToggleButton
                  value="ortho"
                  sx={{
                    flex: 1,
                    py: 0.375,
                    px: 0.75,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.7rem",
                  }}
                >
                  Ortho
                </ToggleButton>
                <ToggleButton
                  value="digital"
                  sx={{
                    flex: 1,
                    py: 0.375,
                    px: 0.75,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.7rem",
                  }}
                >
                  Digital
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
