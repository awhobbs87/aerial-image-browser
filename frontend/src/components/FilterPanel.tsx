import React from "react";
import {
  Box,
  Stack,
  Typography,
  Chip,
  Divider,
  Paper,
  Tooltip,
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
  History as HistoryIcon,
  TrendingUp,
  ZoomIn,
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

// Filter presets
const FILTER_PRESETS = [
  {
    id: "historical",
    label: "Historical",
    icon: HistoryIcon,
    description: "Photos before 1980",
    filters: {
      startDate: null,
      endDate: new Date("1980-01-01"),
      selectedScales: [] as number[],
      layerTypes: { aerial: true, ortho: true, digital: false },
    },
  },
  {
    id: "modern",
    label: "Modern",
    icon: TrendingUp,
    description: "Photos from 2000 onwards",
    filters: {
      startDate: new Date("2000-01-01"),
      endDate: null,
      selectedScales: [] as number[],
      layerTypes: { aerial: true, ortho: true, digital: true },
    },
  },
  {
    id: "high-detail",
    label: "High Detail",
    icon: ZoomIn,
    description: "Scale 1:5,000 or smaller",
    filters: {
      startDate: null,
      endDate: null,
      selectedScales: [] as number[], // Will be populated dynamically
      layerTypes: { aerial: true, ortho: true, digital: true },
    },
  },
];

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
  }, [availableScales, filters, onFiltersChange]);

  const formatScale = (scale: number): string => {
    if (scale >= 1000) {
      return `1:${(scale / 1000).toFixed(0)}K`;
    }
    return `1:${scale}`;
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

  const applyPreset = (presetId: string) => {
    const preset = FILTER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    // For high-detail preset, filter scales <= 5000
    let selectedScales = preset.filters.selectedScales;
    if (presetId === "high-detail") {
      selectedScales = availableScales.filter((scale) => scale <= 5000);
    }

    onFiltersChange({
      ...preset.filters,
      selectedScales,
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
      {/* Filter Presets */}
      <Box sx={{ mb: 1.5 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            mb: 0.75,
            display: "block",
            fontSize: "0.7rem",
            color: "text.secondary",
          }}
        >
          QUICK FILTERS
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {FILTER_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <Tooltip key={preset.id} title={preset.description} arrow placement="top">
                <Chip
                  icon={<Icon sx={{ fontSize: 14 }} />}
                  label={preset.label}
                  onClick={() => applyPreset(preset.id)}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 28,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(0, 77, 64, 0.1)" : "rgba(0, 77, 64, 0.05)",
                      transform: "translateY(-1px)",
                    },
                  }}
                />
              </Tooltip>
            );
          })}
        </Stack>
      </Box>

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
          transition: "all 0.2s ease-in-out",
        }}
      >
        <Box sx={{ p: 1.25 }}>
          <Stack spacing={1.5}>
            {/* Date Range Filter - Compact Inline */}
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <CalendarToday sx={{ fontSize: 13, color: "primary.main" }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      letterSpacing: "0.02em",
                      color: "text.primary",
                    }}
                  >
                    DATE RANGE
                  </Typography>
                </Box>
              </Box>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Stack direction="row" spacing={0.75} sx={{ width: "100%" }}>
                  <DatePicker
                    label="From"
                    value={filters.startDate}
                    onChange={(date) => onFiltersChange({ ...filters, startDate: date })}
                    slotProps={{
                      textField: {
                        size: "small",
                        fullWidth: true,
                        sx: {
                          "& .MuiInputBase-root": {
                            fontSize: "0.75rem",
                            height: 32,
                          },
                          "& .MuiInputLabel-root": {
                            fontSize: "0.75rem",
                          },
                        },
                      },
                    }}
                  />
                  <DatePicker
                    label="To"
                    value={filters.endDate}
                    onChange={(date) => onFiltersChange({ ...filters, endDate: date })}
                    slotProps={{
                      textField: {
                        size: "small",
                        fullWidth: true,
                        sx: {
                          "& .MuiInputBase-root": {
                            fontSize: "0.75rem",
                            height: 32,
                          },
                          "& .MuiInputLabel-root": {
                            fontSize: "0.75rem",
                          },
                        },
                      },
                    }}
                  />
                </Stack>
              </LocalizationProvider>
            </Box>

            <Divider sx={{ my: 0.5 }} />

            {/* Scale Filter - Compact Grid */}
            {sortedScales.length > 0 && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <PhotoSizeSelectActual sx={{ fontSize: 13, color: "secondary.main" }} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        letterSpacing: "0.02em",
                        color: "text.primary",
                      }}
                    >
                      SCALE
                    </Typography>
                  </Box>
                  <Tooltip
                    title="Smaller scales = more detail"
                    arrow
                    placement="top"
                  >
                    <HelpOutline sx={{ fontSize: 12, color: "text.secondary", cursor: "help" }} />
                  </Tooltip>
                </Box>
                <Box sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
                  gap: 0.5,
                }}>
                  {sortedScales.map((scale) => {
                    const isSelected = filters.selectedScales.includes(scale);
                    return (
                      <Box
                        key={scale}
                        onClick={() => handleScaleToggle(scale)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 28,
                          borderRadius: 0.75,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.15s ease-in-out",
                          border: (theme) => isSelected
                            ? `1.5px solid ${theme.palette.secondary.main}`
                            : `1px solid ${theme.palette.mode === "dark" ? "#4a5568" : "#e2e8f0"}`,
                          bgcolor: (theme) => isSelected
                            ? theme.palette.mode === "dark"
                              ? "rgba(8, 145, 178, 0.2)"
                              : "rgba(8, 145, 178, 0.1)"
                            : "transparent",
                          color: isSelected
                            ? "secondary.main"
                            : "text.secondary",
                          "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: (theme) => isSelected
                              ? theme.palette.mode === "dark"
                                ? "0 2px 8px rgba(8, 145, 178, 0.3)"
                                : "0 2px 8px rgba(8, 145, 178, 0.2)"
                              : theme.palette.mode === "dark"
                              ? "0 2px 6px rgba(0, 0, 0, 0.3)"
                              : "0 2px 6px rgba(0, 0, 0, 0.1)",
                            bgcolor: (theme) => isSelected
                              ? theme.palette.mode === "dark"
                                ? "rgba(8, 145, 178, 0.25)"
                                : "rgba(8, 145, 178, 0.15)"
                              : theme.palette.mode === "dark"
                              ? "rgba(74, 85, 104, 0.3)"
                              : "rgba(226, 232, 240, 0.5)",
                          },
                          "&:active": {
                            transform: "translateY(0)",
                          },
                        }}
                      >
                        {formatScale(scale)}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {sortedScales.length > 0 && <Divider sx={{ my: 0.5 }} />}

            {/* Layer Type Filter - Modern Toggle Pills */}
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Image sx={{ fontSize: 13, color: "success.main" }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      letterSpacing: "0.02em",
                      color: "text.primary",
                    }}
                  >
                    TYPES
                  </Typography>
                </Box>
                <Tooltip
                  title="Aerial: traditional | Ortho: corrected | Digital: modern"
                  arrow
                  placement="top"
                >
                  <HelpOutline sx={{ fontSize: 12, color: "text.secondary", cursor: "help" }} />
                </Tooltip>
              </Box>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {[
                  { key: "aerial", label: "Aerial" },
                  { key: "ortho", label: "Ortho" },
                  { key: "digital", label: "Digital" },
                ].map(({ key, label }) => {
                  const isSelected = filters.layerTypes[key as keyof typeof filters.layerTypes];
                  return (
                    <Box
                      key={key}
                      onClick={() => {
                        onFiltersChange({
                          ...filters,
                          layerTypes: {
                            ...filters.layerTypes,
                            [key]: !isSelected,
                          },
                        });
                      }}
                      sx={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 32,
                        borderRadius: 1,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease-in-out",
                        border: (theme) => isSelected
                          ? `1.5px solid ${theme.palette.success.main}`
                          : `1px solid ${theme.palette.mode === "dark" ? "#4a5568" : "#e2e8f0"}`,
                        bgcolor: (theme) => isSelected
                          ? theme.palette.mode === "dark"
                            ? "rgba(0, 77, 64, 0.2)"
                            : "rgba(0, 77, 64, 0.1)"
                          : "transparent",
                        color: isSelected
                          ? "success.main"
                          : "text.secondary",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: (theme) => isSelected
                            ? theme.palette.mode === "dark"
                              ? "0 2px 8px rgba(0, 77, 64, 0.3)"
                              : "0 2px 8px rgba(0, 77, 64, 0.2)"
                            : theme.palette.mode === "dark"
                            ? "0 2px 6px rgba(0, 0, 0, 0.3)"
                            : "0 2px 6px rgba(0, 0, 0, 0.1)",
                          bgcolor: (theme) => isSelected
                            ? theme.palette.mode === "dark"
                              ? "rgba(0, 77, 64, 0.25)"
                              : "rgba(0, 77, 64, 0.15)"
                            : theme.palette.mode === "dark"
                            ? "rgba(74, 85, 104, 0.3)"
                            : "rgba(226, 232, 240, 0.5)",
                        },
                        "&:active": {
                          transform: "translateY(0)",
                        },
                      }}
                    >
                      {label}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
