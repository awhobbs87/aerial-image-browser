import React from "react";
import {
  Box,
  Stack,
  Typography,
  Chip,
  Divider,
  Tooltip,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Clear,
  CalendarToday,
  PhotoSizeSelectActual,
  Image,
  HelpOutline,
  History as HistoryIcon,
  TrendingUp,
  ZoomIn,
  ExpandMore,
  FilterList,
} from "@mui/icons-material";

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
  dateRange?: { min: number; max: number } | null; // Min/max years from search results
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

// Define scale categories for simplified filtering
const SCALE_CATEGORIES = [
  {
    id: 'very-detailed',
    label: 'Very Detailed',
    description: 'Best quality, smallest area (1:5,000 or smaller)',
    icon: '🔍',
    maxScale: 5000,
    color: 'success' as const,
  },
  {
    id: 'detailed',
    label: 'Detailed',
    description: 'Good quality, medium area (1:5,000 - 1:15,000)',
    icon: '📸',
    minScale: 5001,
    maxScale: 15000,
    color: 'primary' as const,
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Standard quality, larger area (1:15,000 - 1:40,000)',
    icon: '🗺️',
    minScale: 15001,
    maxScale: 40000,
    color: 'secondary' as const,
  },
  {
    id: 'overview',
    label: 'Overview',
    description: 'Wide coverage, less detail (larger than 1:40,000)',
    icon: '🌍',
    minScale: 40001,
    color: 'warning' as const,
  },
];

export default function FilterPanel({ filters, onFiltersChange, availableScales = [], dateRange = null }: FilterPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Group available scales into categories
  const scaleCategories = React.useMemo(() => {
    return SCALE_CATEGORIES.map(category => {
      const scales = availableScales.filter(scale => {
        if (category.minScale && category.maxScale) {
          return scale >= category.minScale && scale <= category.maxScale;
        } else if (category.maxScale) {
          return scale <= category.maxScale;
        } else if (category.minScale) {
          return scale >= category.minScale;
        }
        return false;
      });
      return { ...category, scales, count: scales.length };
    }).filter(cat => cat.count > 0);
  }, [availableScales]);

  // Track which categories are selected
  const [selectedCategories, setSelectedCategories] = React.useState<Set<string>>(new Set());

  // Initialize selected categories to include all when scales first load
  React.useEffect(() => {
    if (availableScales.length > 0 && selectedCategories.size === 0) {
      setSelectedCategories(new Set(scaleCategories.map(cat => cat.id)));
    }
  }, [availableScales.length, selectedCategories.size, scaleCategories]);

  // Update filters when categories change
  React.useEffect(() => {
    if (selectedCategories.size === 0) return;

    const selectedScales = scaleCategories
      .filter(cat => selectedCategories.has(cat.id))
      .flatMap(cat => cat.scales);

    if (selectedScales.length > 0 &&
        JSON.stringify(selectedScales.sort()) !== JSON.stringify([...filters.selectedScales].sort())) {
      onFiltersChange({
        ...filters,
        selectedScales,
      });
    }
  }, [selectedCategories, scaleCategories, filters, onFiltersChange]);

  // Calculate year range for slider
  const yearRange = React.useMemo(() => {
    if (dateRange) {
      return [dateRange.min, dateRange.max];
    }
    // Default fallback range
    return [1940, new Date().getFullYear()];
  }, [dateRange]);

  // Get current slider values from filters
  const sliderValue = React.useMemo(() => {
    const startYear = filters.startDate ? new Date(filters.startDate).getFullYear() : yearRange[0];
    const endYear = filters.endDate ? new Date(filters.endDate).getFullYear() : yearRange[1];
    return [startYear, endYear];
  }, [filters.startDate, filters.endDate, yearRange]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
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

  const handleYearRangeChange = (_event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      const [startYear, endYear] = newValue;
      onFiltersChange({
        ...filters,
        startDate: new Date(startYear, 0, 1),
        endDate: new Date(endYear, 11, 31),
      });
    }
  };

  const clearScaleFilter = () => {
    setSelectedCategories(new Set(scaleCategories.map(cat => cat.id)));
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
      const startYear = new Date(filters.startDate).getFullYear();
      const endYear = new Date(filters.endDate).getFullYear();
      // Only show if not the full range
      if (startYear !== yearRange[0] || endYear !== yearRange[1]) {
        return `${startYear} - ${endYear}`;
      }
    } else if (filters.startDate) {
      return `From ${new Date(filters.startDate).getFullYear()}`;
    } else if (filters.endDate) {
      return `Until ${new Date(filters.endDate).getFullYear()}`;
    }
    return "";
  };

  const getScaleFilterLabel = () => {
    if (selectedCategories.size === 0) return "No scales selected";
    if (selectedCategories.size === scaleCategories.length) return "";
    const labels = scaleCategories
      .filter(cat => selectedCategories.has(cat.id))
      .map(cat => cat.label);
    return labels.join(", ");
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

      {/* Compact Filter Panel - Collapsible on mobile */}
      <Accordion
        defaultExpanded={!isMobile}
        elevation={2}
        sx={{
          overflow: "hidden",
          background: (theme) =>
            theme.palette.mode === "dark" ? "#2d3748" : "#ffffff",
          border: (theme) =>
            theme.palette.mode === "dark" ? "1px solid #4a5568" : "1px solid #e2e8f0",
          '&:before': {
            display: 'none',
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{
            minHeight: 48,
            '& .MuiAccordionSummary-content': {
              margin: '12px 0',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList sx={{ fontSize: 20, color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Filters
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 1 }}>
          <Stack spacing={1}>
            {/* Date Range Filter - Slider */}
            {dateRange && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
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
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: "primary.main",
                    }}
                  >
                    {sliderValue[0]} - {sliderValue[1]}
                  </Typography>
                </Box>
                <Box sx={{ px: 3, py: 0, pb: 4 }}>
                  <Slider
                    value={sliderValue}
                    onChange={handleYearRangeChange}
                    valueLabelDisplay="auto"
                    min={yearRange[0]}
                    max={yearRange[1]}
                    marks={[
                      { value: yearRange[0], label: yearRange[0].toString() },
                      { value: yearRange[1], label: yearRange[1].toString() },
                    ]}
                    sx={{
                      color: "primary.main",
                      height: 4,
                      mb: 1,
                      "& .MuiSlider-thumb": {
                        width: 14,
                        height: 14,
                      },
                      "& .MuiSlider-mark": {
                        display: "none",
                      },
                      "& .MuiSlider-markLabel": {
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        color: "text.secondary",
                        top: 24,
                        "&:first-of-type": {
                          left: "8px !important",
                          transform: "translateX(0%)",
                        },
                        "&:last-of-type": {
                          left: "auto !important",
                          right: "8px !important",
                          transform: "translateX(0%)",
                        },
                      },
                      "& .MuiSlider-valueLabel": {
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        bgcolor: "primary.main",
                      },
                    }}
                  />
                </Box>
              </Box>
            )}

            {dateRange && <Divider sx={{ my: 0.5 }} />}

            {/* Scale Filter - Simplified Categories */}
            {scaleCategories.length > 0 && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
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
                      DETAIL LEVEL
                    </Typography>
                  </Box>
                  <Tooltip
                    title="Choose quality level based on your needs"
                    arrow
                    placement="top"
                  >
                    <HelpOutline sx={{ fontSize: 12, color: "text.secondary", cursor: "help" }} />
                  </Tooltip>
                </Box>
                <Box sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 0.5,
                }}>
                  {scaleCategories.map((category) => {
                    const isSelected = selectedCategories.has(category.id);
                    return (
                      <Tooltip key={category.id} title={category.description} arrow placement="top">
                        <Box
                          onClick={() => handleCategoryToggle(category.id)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.5,
                            px: 0.75,
                            py: 0.5,
                            borderRadius: 0.75,
                            cursor: "pointer",
                            transition: "all 0.15s ease-in-out",
                            border: (theme) => isSelected
                              ? `1.5px solid ${theme.palette[category.color].main}`
                              : `1px solid ${theme.palette.mode === "dark" ? "#4a5568" : "#e2e8f0"}`,
                            bgcolor: (theme) => isSelected
                              ? theme.palette.mode === "dark"
                                ? `${theme.palette[category.color].main}20`
                                : `${theme.palette[category.color].main}10`
                              : "transparent",
                            "&:hover": {
                              transform: "translateY(-1px)",
                              boxShadow: (theme) => isSelected
                                ? theme.palette.mode === "dark"
                                  ? `0 2px 8px ${theme.palette[category.color].main}40`
                                  : `0 2px 8px ${theme.palette[category.color].main}30`
                                : theme.palette.mode === "dark"
                                ? "0 2px 6px rgba(0, 0, 0, 0.3)"
                                : "0 2px 6px rgba(0, 0, 0, 0.1)",
                            },
                            "&:active": {
                              transform: "translateY(0)",
                            },
                          }}
                        >
                          <Typography sx={{ fontSize: "0.95rem" }}>{category.icon}</Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.7rem",
                              color: isSelected ? `${category.color}.main` : "text.primary",
                            }}
                          >
                            {category.label}
                          </Typography>
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            )}

            {scaleCategories.length > 0 && <Divider sx={{ my: 0.5 }} />}

            {/* Layer Type Filter - Modern Toggle Pills */}
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
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
                        height: 26,
                        borderRadius: 0.75,
                        fontSize: "0.68rem",
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
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
