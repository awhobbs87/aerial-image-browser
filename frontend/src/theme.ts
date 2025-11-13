import { createTheme } from "@mui/material/styles";
import { shadows, shadowsDark } from "./theme/tokens";

// Common theme options with enhanced visual polish
const commonTheme = {
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: "1.1rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "1rem",
      lineHeight: 1.5,
    },
    caption: {
      lineHeight: 1.4,
      letterSpacing: "0.025em",
    },
    button: {
      fontWeight: 600,
      letterSpacing: "0.02em",
    },
  },
  shape: {
    borderRadius: 12,
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-6px)",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 10,
          padding: "8px 20px",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-1px)",
          },
          "&:focus-visible": {
            outline: "3px solid #004d40",
            outlineOffset: "2px",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "scale(1.05)",
          },
          "&:focus-visible": {
            outline: "2px solid #004d40",
            outlineOffset: "2px",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:focus-visible": {
            outline: "2px solid #004d40",
            outlineOffset: "2px",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          "&:before": {
            display: "none",
          },
          "&.Mui-expanded": {
            margin: 0,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 10,
          transition: "all 0.2s ease-in-out",
          "&.Mui-selected": {
            transform: "scale(1.02)",
          },
          "&:focus-visible": {
            outline: "2px solid #6366f1",
            outlineOffset: "2px",
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          "&:focus-visible": {
            outline: "2px solid #004d40",
            outlineOffset: "2px",
          },
        },
      },
    },
  },
};

// Light theme with enhanced color palette and custom shadows
export const lightTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: "light",
    primary: {
      main: "#004d40", // Deep, earthy green
      light: "#39796b",
      dark: "#00251a",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#455a64", // Cool, slate blue
      light: "#718792",
      dark: "#1c313a",
      contrastText: "#ffffff",
    },
    success: {
      main: "#10b981",
      light: "#34d399",
      dark: "#059669",
    },
    error: {
      main: "#ef4444",
      light: "#f87171",
      dark: "#dc2626",
    },
    warning: {
      main: "#f59e0b", // Warm, golden yellow
      light: "#fbbf24",
      dark: "#d97706",
    },
    info: {
      main: "#3b82f6",
      light: "#60a5fa",
      dark: "#2563eb",
    },
    background: {
      default: "#f5f5f5", // Warm gray
      paper: "#ffffff",
    },
    text: {
      primary: "#212121",
      secondary: "#757575",
    },
    divider: "rgba(0, 0, 0, 0.12)",
  },
  shadows: [
    "none",
    shadows.sm,
    shadows.md,
    shadows.lg,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
  // @ts-expect-error MUI's type for shadows is a tuple of 25 strings, but we are using a custom shadows array.
  ] as any,
});

// Dark theme with enhanced color palette and softer shadows
export const darkTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: "dark",
    primary: {
      main: "#39796b", // Lighter green for dark mode
      light: "#6ab7a7",
      dark: "#004d40",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#718792", // Lighter blue for dark mode
      light: "#a1b8c1",
      dark: "#455a64",
      contrastText: "#ffffff",
    },
    success: {
      main: "#34d399",
      light: "#6ee7b7",
      dark: "#10b981",
    },
    error: {
      main: "#f87171",
      light: "#fca5a5",
      dark: "#ef4444",
    },
    warning: {
      main: "#fbbf24", // Same yellow for dark mode
      light: "#fcd34d",
      dark: "#f59e0b",
    },
    info: {
      main: "#60a5fa",
      light: "#93c5fd",
      dark: "#3b82f6",
    },
    background: {
      default: "#121212", // Dark gray
      paper: "#1e1e1e",
    },
    text: {
      primary: "#e0e0e0",
      secondary: "#bdbdbd",
    },
    divider: "rgba(255, 255, 255, 0.12)",
  },
  shadows: [
    "none",
    shadowsDark.sm,
    shadowsDark.md,
    shadowsDark.lg,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
    shadowsDark.xl,
  // @ts-expect-error MUI's type for shadows is a tuple of 25 strings, but we are using a custom shadows array.
  ] as any,
});
