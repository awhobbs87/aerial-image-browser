import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Badge,
  Box,
} from "@mui/material";
import {
  Brightness4,
  Brightness7,
  BrightnessAuto,
  Map,
  Favorite,
} from "@mui/icons-material";

interface AppBarProps {
  darkMode: boolean;
  themeMode: "light" | "dark" | "system";
  onToggleDarkMode: () => void;
  favoritesCount?: number;
  onViewFavorites?: () => void;
  version?: string;
  onVersionClick?: () => void;
}

export default function AppBar({
  themeMode,
  onToggleDarkMode,
  favoritesCount = 0,
  onViewFavorites,
  version,
  onVersionClick,
}: AppBarProps) {
  const getThemeIcon = () => {
    if (themeMode === "system") return <BrightnessAuto />;
    if (themeMode === "dark") return <Brightness4 />;
    return <Brightness7 />;
  };

  const getThemeLabel = () => {
    if (themeMode === "system") return "System theme (click for light)";
    if (themeMode === "dark") return "Dark mode (click for system)";
    return "Light mode (click for dark)";
  };

  return (
    <MuiAppBar
      position="static"
      elevation={1}
      sx={{
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
        <Map
          sx={{
            mr: { xs: 1, sm: 2 },
            fontSize: { xs: 24, sm: 28 },
            color: "primary.main",
          }}
        />
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 700,
            color: "text.primary",
            fontSize: { xs: "0.95rem", sm: "1.25rem" },
          }}
        >
          {/* Show shorter title on mobile */}
          <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
            Tas Aerial Photos
          </Box>
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            Tasmania Aerial Photos
          </Box>
        </Typography>
        {version && onVersionClick && (
          <Typography
            variant="caption"
            onClick={onVersionClick}
            sx={{
              display: { xs: "block", md: "none" },
              fontSize: "0.65rem",
              color: "text.disabled",
              opacity: 0.6,
              fontWeight: 500,
              userSelect: "none",
              cursor: "pointer",
              transition: "opacity 0.2s ease-in-out",
              mr: 1,
              "&:hover": {
                opacity: 1,
                color: "primary.main",
              },
            }}
          >
            v{version}
          </Typography>
        )}
        {onViewFavorites && (
          <Tooltip
            title={`View ${favoritesCount} favorite${favoritesCount !== 1 ? "s" : ""}`}
          >
            <IconButton
              color="inherit"
              onClick={onViewFavorites}
              aria-label="view favorites"
              sx={{ mr: 1 }}
            >
              <Badge badgeContent={favoritesCount} color="error">
                <Favorite />
              </Badge>
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={getThemeLabel()}>
          <IconButton
            color="inherit"
            onClick={onToggleDarkMode}
            aria-label="toggle theme mode"
          >
            {getThemeIcon()}
          </IconButton>
        </Tooltip>
      </Toolbar>
    </MuiAppBar>
  );
}
