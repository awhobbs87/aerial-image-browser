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
            Search Location
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
        <SearchBar onSearch={onSearch} loading={loading} />
      </Box>
    </Drawer>
  );
}

