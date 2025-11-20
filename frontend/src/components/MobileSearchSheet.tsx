import { Drawer, IconButton, Box, Typography, Divider } from "@mui/material";
import { Close } from "@mui/icons-material";
import SearchBar from "./SearchBar";

interface MobileSearchSheetProps {
  open: boolean;
  onClose: () => void;
  onSearch: (lat: number, lon: number, locationName?: string) => void;
  loading?: boolean;
}

export default function MobileSearchSheet({
  open,
  onClose,
  onSearch,
  loading = false,
}: MobileSearchSheetProps) {
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
            Search Location
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
        <SearchBar onSearch={onSearch} loading={loading} />
      </Box>
    </Drawer>
  );
}

