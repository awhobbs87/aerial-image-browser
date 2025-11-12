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
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ExpandMore, FilterList, Clear } from "@mui/icons-material";

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

  const hasActiveFilters =
    filters.startDate !== null ||
    filters.endDate !== null ||
    filters.minScale !== null ||
    filters.maxScale !== null ||
    !filters.layerTypes.aerial ||
    !filters.layerTypes.ortho ||
    !filters.layerTypes.digital;

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      sx={{ mb: 2 }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FilterList />
          <Typography variant="h6">Advanced Filters</Typography>
          {hasActiveFilters && (
            <Typography variant="caption" color="primary" sx={{ ml: 1 }}>
              (Active)
            </Typography>
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        <Stack spacing={3}>
          {/* Date Range Filter */}
          <FormControl component="fieldset">
            <FormLabel component="legend">Date Range</FormLabel>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                <DatePicker
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(date) =>
                    onFiltersChange({ ...filters, startDate: date })
                  }
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                    },
                  }}
                />
                <DatePicker
                  label="End Date"
                  value={filters.endDate}
                  onChange={(date) =>
                    onFiltersChange({ ...filters, endDate: date })
                  }
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                    },
                  }}
                />
              </Stack>
            </LocalizationProvider>
          </FormControl>

          {/* Scale Range Filter */}
          <FormControl component="fieldset">
            <FormLabel component="legend">Scale Range</FormLabel>
            <Box sx={{ px: 2, pt: 3 }}>
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
              />
            </Box>
          </FormControl>

          {/* Layer Type Filter */}
          <FormControl component="fieldset">
            <FormLabel component="legend">Image Types</FormLabel>
            <FormGroup row sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.layerTypes.aerial}
                    onChange={() => handleLayerTypeChange("aerial")}
                    color="primary"
                  />
                }
                label="Aerial"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.layerTypes.ortho}
                    onChange={() => handleLayerTypeChange("ortho")}
                    color="success"
                  />
                }
                label="Ortho"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.layerTypes.digital}
                    onChange={() => handleLayerTypeChange("digital")}
                    color="error"
                  />
                }
                label="Digital"
              />
            </FormGroup>
          </FormControl>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={handleClearFilters}
                size="small"
              >
                Clear Filters
              </Button>
            </Box>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
