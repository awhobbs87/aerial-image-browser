import { Drawer, IconButton, Box, Typography, Divider } from "@mui/material";
import { Close } from "@mui/icons-material";
import FilterPanel, { type Filters } from "./FilterPanel";

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
        className: "rounded-t-2xl",
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "85vh",
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
      }}
    >
      {/* Swipe handle */}
      <Box
        className="flex justify-center pt-2 pb-1"
        sx={{
          cursor: 'grab',
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      >
        <Box
          className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"
        />
      </Box>
      
      <Box 
        className="px-4 pb-4 overflow-y-auto"
        sx={{
          paddingTop: 1,
          maxHeight: 'calc(85vh - 24px)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Box className="flex justify-between items-center mb-4">
          <Typography variant="h6" className="font-bold">
            Filters
          </Typography>
          <IconButton
            onClick={onClose}
            className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            size="medium"
          >
            <Close />
          </IconButton>
        </Box>
        <Divider className="mb-4" />
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

