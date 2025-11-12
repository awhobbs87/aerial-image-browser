import { useState } from "react";
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Button,
  Stack,
  Typography,
  Chip,
  Divider,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  ExpandMore,
  FilterList,
  Clear,
  CalendarToday,
  PhotoSizeSelectActual,
  Image,
  Close,
} from "@mui/icons-material";
import { format } from "date-fns";

export interface Filters {
  startDate: Date | null;
  endDate: Date | null;
  minScale: number | null;
  maxScale: number | null;
  layerTypes: {
    aerial: boolean;
    ortho: boolean;
    digital: boolean;
  };
}

interface FilterPanelProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export default function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  // Scale values for the slider (log scale for better UX)
  const scaleMarks = [
    { value: 1000, label: "1:1K" },
    { value: 5000, label: "1:5K" },
    { value: 10000, label: "1:10K" },
    { value: 25000, label: "1:25K" },
    { value: 50000, label: "1:50K" },
    { value: 100000, label: "1:100K" },
  ];

  const handleLayerTypeChange = (type: "aerial" | "ortho" | "digital") => {
    onFiltersChange({
      ...filters,
      layerTypes: {
        ...filters.layerTypes,
        [type]: !filters.layerTypes[type],
      },
    });
  };

  const handleScaleChange = (_event: Event, newValue: number | number[]) => {
    const [min, max] = newValue as number[];
    onFiltersChange({
      ...filters,
      minScale: min,
      maxScale: max,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      startDate: null,
      endDate: null,
      minScale: null,
      maxScale: null,
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
      minScale: null,
      maxScale: null,
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
    filters.minScale !== null ||
    filters.maxScale !== null ||
    !filters.layerTypes.aerial ||
    !filters.layerTypes.ortho ||
    !filters.layerTypes.digital;

  const hasDateFilter = filters.startDate !== null || filters.endDate !== null;
  const hasScaleFilter = filters.minScale !== null || filters.maxScale !== null;
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
    const defaultMin = scaleMarks[0].value;
    const defaultMax = scaleMarks[scaleMarks.length - 1].value;
    const min = filters.minScale || defaultMin;
    const max = filters.maxScale || defaultMax;

    if (min !== defaultMin || max !== defaultMax) {
      return `1:${(min / 1000).toFixed(0)}K - 1:${(max / 1000).toFixed(0)}K`;
    }
    return "";
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
    <Box sx={{ mb: 3 }}>
      {/* Active Filters Chips */}
      {hasActiveFilters && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {hasDateFilter && (
              <Chip
                icon={<CalendarToday />}
                label={getDateFilterLabel()}
                onDelete={clearDateFilter}
                color="primary"
                variant="filled"
                sx={{
                  fontWeight: 600,
                  "& .MuiChip-deleteIcon": {
                    color: "inherit",
                  },
                }}
              />
            )}
            {hasScaleFilter && (
              <Chip
                icon={<PhotoSizeSelectActual />}
                label={getScaleFilterLabel()}
                onDelete={clearScaleFilter}
                color="secondary"
                variant="filled"
                sx={{
                  fontWeight: 600,
                  "& .MuiChip-deleteIcon": {
                    color: "inherit",
                  },
                }}
              />
            )}
            {hasLayerFilter && (
              <Chip
                icon={<Image />}
                label={getLayerFilterLabel()}
                onDelete={resetLayerTypes}
                color="success"
                variant="filled"
                sx={{
                  fontWeight: 600,
                  "& .MuiChip-deleteIcon": {
                    color: "inherit",
                  },
                }}
              />
            )}
            <Chip
              icon={<Clear />}
              label="Clear All"
              onClick={handleClearFilters}
              variant="outlined"
              sx={{
                fontWeight: 600,
                "&:hover": {
                  background: (theme) => theme.palette.action.hover,
                },
              }}
            />
          </Stack>
        </Box>
      )}

      {/* Filter Panel */}
      <Paper
        elevation={3}
        sx={{
          overflow: "hidden",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f7fafc 100%)",
          border: (theme) =>
            theme.palette.mode === "dark" ? "1px solid #4a5568" : "1px solid #e2e8f0",
        }}
      >
        <Accordion
          expanded={expanded}
          onChange={() => setExpanded(!expanded)}
          elevation={0}
          sx={{
            background: "transparent",
            "&:before": {
              display: "none",
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            sx={{
              px: 3,
              py: 1.5,
              "& .MuiAccordionSummary-content": {
                my: 1,
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
              <FilterList
                sx={{
                  color: hasActiveFilters ? "primary.main" : "text.secondary",
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  background: hasActiveFilters
                    ? (theme) =>
                        theme.palette.mode === "dark"
                          ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "none",
                  WebkitBackgroundClip: hasActiveFilters ? "text" : "unset",
                  WebkitTextFillColor: hasActiveFilters ? "transparent" : "inherit",
                  backgroundClip: hasActiveFilters ? "text" : "unset",
                }}
              >
                Advanced Filters
              </Typography>
              {hasActiveFilters && (
                <Chip
                  label="Active"
                  size="small"
                  color="primary"
                  sx={{
                    ml: "auto",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                  }}
                />
              )}
            </Box>
          </AccordionSummary>

          <Divider />

          <AccordionDetails
            sx={{
              p: 3,
            }}
          >
            <Stack spacing={4}>
              {/* Date Range Filter */}
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <CalendarToday fontSize="small" color="primary" />
                  Date Range
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <DatePicker
                      label="Start Date"
                      value={filters.startDate}
                      onChange={(date) => onFiltersChange({ ...filters, startDate: date })}
                      slotProps={{
                        textField: {
                          size: "small",
                          fullWidth: true,
                          sx: {
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                            },
                          },
                        },
                      }}
                    />
                    <DatePicker
                      label="End Date"
                      value={filters.endDate}
                      onChange={(date) => onFiltersChange({ ...filters, endDate: date })}
                      slotProps={{
                        textField: {
                          size: "small",
                          fullWidth: true,
                          sx: {
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                            },
                          },
                        },
                      }}
                    />
                  </Stack>
                </LocalizationProvider>
              </Box>

              <Divider />

              {/* Scale Range Filter */}
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <PhotoSizeSelectActual fontSize="small" color="secondary" />
                  Photo Scale Range
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: "block" }}>
                  Lower scales (e.g., 1:5K) show more detail, higher scales (e.g., 1:50K) show
                  wider areas
                </Typography>
                <Box sx={{ px: 2, pt: 2 }}>
                  <Slider
                    value={[
                      filters.minScale || scaleMarks[0].value,
                      filters.maxScale || scaleMarks[scaleMarks.length - 1].value,
                    ]}
                    onChange={handleScaleChange}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `1:${value.toLocaleString()}`}
                    min={scaleMarks[0].value}
                    max={scaleMarks[scaleMarks.length - 1].value}
                    marks={scaleMarks}
                    step={1000}
                    sx={{
                      "& .MuiSlider-thumb": {
                        width: 20,
                        height: 20,
                      },
                      "& .MuiSlider-track": {
                        height: 6,
                      },
                      "& .MuiSlider-rail": {
                        height: 6,
                      },
                    }}
                  />
                </Box>
              </Box>

              <Divider />

              {/* Layer Type Filter */}
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Image fontSize="small" color="success" />
                  Image Types
                </Typography>
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
                  sx={{
                    display: "flex",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <ToggleButton
                    value="aerial"
                    sx={{
                      flex: 1,
                      minWidth: 100,
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    Aerial
                  </ToggleButton>
                  <ToggleButton
                    value="ortho"
                    sx={{
                      flex: 1,
                      minWidth: 100,
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    Ortho
                  </ToggleButton>
                  <ToggleButton
                    value="digital"
                    sx={{
                      flex: 1,
                      minWidth: 100,
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    Digital
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Paper>
    </Box>
  );
}
