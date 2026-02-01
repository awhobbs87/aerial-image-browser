import React from "react";
import { Box, IconButton, Typography, Badge } from "@mui/material";
import { Room, BookmarkBorder, Settings } from "@mui/icons-material";
import {
  appleLiquidGlass,
  createBackdropFilter,
} from "../theme/apple-liquid-glass";

interface GlassNavigationProps {
  onSavedClick: () => void;
  onSettingsClick: () => void;
  savedCount?: number;
}

const GlassNavigation: React.FC<GlassNavigationProps> = ({
  onSavedClick,
  onSettingsClick,
  savedCount,
}) => {
  const iconColor = "#94A3B8";
  const accentColor = "#10B981";

  return (
    <Box
      component="nav"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        background: "rgba(18, 18, 18, 0.75)",
        ...createBackdropFilter("blur(12px) saturate(180%)"),
        borderBottom: `1px solid ${appleLiquidGlass.borders.hairline.dark}`,
      }}
    >
      {/* Left side - Logo */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Room
          sx={{
            color: accentColor,
            fontSize: 20,
          }}
        />
        <Typography
          sx={{
            color: "#FFFFFF",
            fontWeight: 500,
            fontSize: "15px",
            letterSpacing: "0.01em",
          }}
        >
          Tasmania Aerial
        </Typography>
      </Box>

      {/* Right side - Icon buttons */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <IconButton
          onClick={onSavedClick}
          aria-label="Saved locations"
          sx={{
            color: iconColor,
            transition: appleLiquidGlass.transitions.standard,
            "&:hover": {
              color: accentColor,
              boxShadow: `0 0 12px ${accentColor}40`,
              backgroundColor: "rgba(16, 185, 129, 0.1)",
            },
          }}
        >
          <Badge
            badgeContent={savedCount}
            color="primary"
            sx={{
              "& .MuiBadge-badge": {
                backgroundColor: accentColor,
                color: "#FFFFFF",
                fontSize: "10px",
                minWidth: 16,
                height: 16,
              },
            }}
          >
            <BookmarkBorder sx={{ fontSize: 22 }} />
          </Badge>
        </IconButton>

        <IconButton
          onClick={onSettingsClick}
          aria-label="Settings"
          sx={{
            color: iconColor,
            transition: appleLiquidGlass.transitions.standard,
            "&:hover": {
              color: accentColor,
              boxShadow: `0 0 12px ${accentColor}40`,
              backgroundColor: "rgba(16, 185, 129, 0.1)",
            },
          }}
        >
          <Settings sx={{ fontSize: 22 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default GlassNavigation;
