import { AppBar as MuiAppBar, Toolbar, Typography, IconButton, Tooltip, Badge } from "@mui/material";
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
}

export default function AppBar({ themeMode, onToggleDarkMode, favoritesCount = 0, onViewFavorites }: AppBarProps) {
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
    <MuiAppBar position="static" elevation={2}>
      <Toolbar>
        <Map sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Tasmania Aerial Photos
        </Typography>
        {onViewFavorites && (
          <Tooltip title={`View ${favoritesCount} favorite${favoritesCount !== 1 ? 's' : ''}`}>
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
