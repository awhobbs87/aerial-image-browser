import { AppBar as MuiAppBar, Toolbar, Typography, IconButton, Box } from "@mui/material";
import { Brightness4, Brightness7, Map } from "@mui/icons-material";

interface AppBarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function AppBar({ darkMode, onToggleDarkMode }: AppBarProps) {
  return (
    <MuiAppBar position="static" elevation={2}>
      <Toolbar>
        <Map sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Tasmania Aerial Photos
        </Typography>
        <IconButton color="inherit" onClick={onToggleDarkMode} aria-label="toggle dark mode">
          {darkMode ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
      </Toolbar>
    </MuiAppBar>
  );
}
