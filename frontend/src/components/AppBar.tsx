import { AppBar as MuiAppBar, Toolbar, Typography, IconButton, Tooltip } from "@mui/material";
import {
  Brightness4,
  Brightness7,
  BrightnessAuto,
  Map,
} from "@mui/icons-material";

interface AppBarProps {
  themeMode: "light" | "dark" | "system";
  onToggleDarkMode: () => void;
}

export default function AppBar({ themeMode, onToggleDarkMode }: AppBarProps) {
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
