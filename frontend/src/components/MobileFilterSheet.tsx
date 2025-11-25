import { Drawer, IconButton, Box, Typography, Divider } from "@mui/material";
import { Close } from "@mui/icons-material";
import FilterPanel from "./FilterPanel";
import type { Filters } from "./filterPanelConfig";

interface MobileFilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  availableScales?: number[];
  dateRange?: { min: number; max: number } | null;
}

export default function MobileFilterSheet({
  open,
  onClose,
  filters,
  onFiltersChange,
  availableScales,
  dateRange,
}: MobileFilterSheetProps) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "85vh",
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Filters
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{
              bgcolor: "action.hover",
              "&:hover": { bgcolor: "action.selected" },
            }}
            size="large"
          >
            <Close />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <FilterPanel
          filters={filters}
          onFiltersChange={onFiltersChange}
          availableScales={availableScales}
          dateRange={dateRange}
        />
      </Box>
    </Drawer>
  );
}

