import { useState } from "react";
import {
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Box,
} from "@mui/material";
import {
  CompareArrows,
  History,
  Close,
  CheckCircle,
} from "@mui/icons-material";
import type { EnhancedPhoto } from "../types/api";

interface ComparisonFABProps {
  photos: EnhancedPhoto[];
  onOpenComparison: () => void;
  onOpenThenNow: () => void;
  onRemove: (photoKey: string) => void;
  onClear: () => void;
  hidden?: boolean;
}

const getPhotoKey = (photo: EnhancedPhoto) => `${photo.layerId}-${photo.OBJECTID}`;

export default function ComparisonFAB({
  photos,
  onOpenComparison,
  onOpenThenNow,
  onRemove,
  onClear,
  hidden = false,
}: ComparisonFABProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  if (photos.length === 0 || hidden) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCompare = () => {
    onOpenComparison();
    handleClose();
  };

  const handleThenNow = () => {
    onOpenThenNow();
    handleClose();
  };

  return (
    <>
      <Fab
        color="primary"
        aria-label="comparison menu"
        onClick={handleClick}
        sx={{
          position: "fixed",
          bottom: { xs: 16, md: 24 },
          right: { xs: 16, md: 24 },
          zIndex: 2000,
          boxShadow: 6,
        }}
      >
        <CompareArrows />
        {photos.length > 0 && (
          <Box
            sx={{
              position: "absolute",
              top: -4,
              right: -4,
              bgcolor: "error.main",
              color: "error.contrastText",
              borderRadius: "50%",
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700,
              border: 2,
              borderColor: "background.paper",
            }}
          >
            {photos.length}
          </Box>
        )}
      </Fab>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            minWidth: 280,
            maxWidth: 400,
            maxHeight: 500,
            mt: -1,
            borderRadius: 3,
          },
        }}
      >
        <Box sx={{ p: 1.5, pb: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CompareArrows fontSize="small" color="primary" />
              <Box>
                <Box component="span" sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                  {photos.length} photo{photos.length !== 1 ? "s" : ""} selected
                </Box>
              </Box>
            </Box>
            <Tooltip title="Clear selection">
              <IconButton size="small" onClick={onClear} sx={{ ml: 1 }}>
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.5,
              maxHeight: 120,
              overflowY: "auto",
            }}
          >
            {photos.map((photo) => (
              <Chip
                key={`fab-${getPhotoKey(photo)}`}
                label={`${photo.dateFormatted || "Unknown"}`}
                size="small"
                onDelete={() => onRemove(getPhotoKey(photo))}
                sx={{ fontSize: "0.7rem", height: 24 }}
                deleteIcon={<Close sx={{ fontSize: 14 }} />}
              />
            ))}
          </Box>
        </Box>

        <Divider />

        <MenuItem onClick={handleCompare} disabled={photos.length === 0}>
          <ListItemIcon>
            <CompareArrows fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Compare Photos"
            secondary={photos.length >= 2 ? "Side-by-side comparison" : "Select 2 photos"}
          />
          {photos.length >= 2 && (
            <CheckCircle color="success" sx={{ fontSize: 18, ml: 1 }} />
          )}
        </MenuItem>

        <MenuItem onClick={handleThenNow} disabled={photos.length !== 1}>
          <ListItemIcon>
            <History fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Then vs Now"
            secondary={photos.length === 1 ? "Compare with current imagery" : "Select 1 photo"}
          />
          {photos.length === 1 && (
            <CheckCircle color="success" sx={{ fontSize: 18, ml: 1 }} />
          )}
        </MenuItem>
      </Menu>
    </>
  );
}

