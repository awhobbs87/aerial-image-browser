import { createTheme } from "@mui/material/styles";
import { shadows, shadowsDark } from "./theme/tokens";

/**
 * Tasmania Aerial Photos - Premium Dark GIS Theme
 *
 * Color Palette:
 * - Deep Charcoal: #121212 (primary background)
 * - Emerald Green: #10B981 (accent color)
 * - Slate Grays: #1E293B, #334155, #475569, #64748B
 *
 * Design Philosophy:
 * - Modern dark mode with glassmorphism
 * - Premium, technical, immersive atmosphere
 * - Thin line weights, generous whitespace
 * - Map as hero, UI as assistant
 */

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
      fontWeight: 600,
      letterSpacing: "-0.025em",
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 500,
      letterSpacing: "-0.02em",
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 500,
      letterSpacing: "-0.015em",
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 500,
      letterSpacing: "-0.01em",
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 500,
      letterSpacing: "-0.005em",
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 500,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.6,
      letterSpacing: "0.01em",
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
      letterSpacing: "0.01em",
    },
    caption: {
      fontSize: "0.75rem",
      lineHeight: 1.4,
      letterSpacing: "0.02em",
    },
    button: {
      fontWeight: 500,
      letterSpacing: "0.02em",
    },
  },
  shape: {
    borderRadius: 12,
  },
  transitions: {
    duration: {
      shortest: 100,
      shorter: 150,
      short: 200,
      standard: 250,
      complex: 350,
      enteringScreen: 200,
      leavingScreen: 150,
    },
    easing: {
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          // Smooth scrolling for the entire page
          scrollBehavior: "smooth",
        },
        body: {
          // Premium scrollbar styling
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(148, 163, 184, 0.3) transparent",
          "&::-webkit-scrollbar": {
            width: "6px",
            height: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(148, 163, 184, 0.25)",
            borderRadius: "3px",
            "&:hover": {
              background: "rgba(148, 163, 184, 0.4)",
            },
          },
          // Prevent overscroll bounce
          overscrollBehavior: "none",
        },
        // Thin focus rings
        "*:focus-visible": {
          outline: "2px solid #10B981",
          outlineOffset: "2px",
        },
        // Selection color
        "::selection": {
          backgroundColor: "rgba(16, 185, 129, 0.3)",
          color: "inherit",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition:
            "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-2px)",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none" as const,
          fontWeight: 500,
          borderRadius: 20, // Pill-shaped buttons
          padding: "8px 20px",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-1px)",
          },
          "&:focus-visible": {
            outline: "2px solid #10B981",
            outlineOffset: "2px",
          },
        },
        // Pill button variants
        contained: {
          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
          "&:hover": {
            boxShadow: "0 4px 16px rgba(16, 185, 129, 0.35)",
          },
        },
        outlined: {
          borderWidth: "1px",
          "&:hover": {
            borderWidth: "1px",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 16, // Pill-shaped chips
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "scale(1.02)",
          },
          "&:focus-visible": {
            outline: "2px solid #10B981",
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
            outline: "2px solid #10B981",
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
          textTransform: "none" as const,
          fontWeight: 500,
          borderRadius: 10,
          transition: "all 0.2s ease-in-out",
          "&.Mui-selected": {
            transform: "scale(1.01)",
          },
          "&:focus-visible": {
            outline: "2px solid #10B981",
            outlineOffset: "2px",
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          "&:focus-visible": {
            outline: "2px solid #10B981",
            outlineOffset: "2px",
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "rgba(30, 41, 59, 0.95)",
          backdropFilter: "blur(8px)",
          fontSize: "0.75rem",
          fontWeight: 500,
          padding: "6px 12px",
          borderRadius: 8,
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
      main: "#059669", // Brighter emerald green for better visibility
      light: "#10B981",
      dark: "#047857",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#0891b2", // Cyan - matches layer colors
      light: "#22d3ee",
      dark: "#0e7490",
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
      default: "#F9FAFB", // Softer neutral
      paper: "#FFFFFF",
    },
    text: {
      primary: "#111827", // Darker for better contrast (4.5:1+)
      secondary: "#6B7280", // Better contrast
    },
    divider: "rgba(0, 0, 0, 0.08)",
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any,
});

// Dark theme - Premium GIS aesthetic with Deep Charcoal and Emerald accents
export const darkTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: "dark",
    primary: {
      main: "#10B981", // Emerald Green - primary accent
      light: "#34D399",
      dark: "#059669",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#22d3ee", // Cyan for secondary actions
      light: "#67e8f9",
      dark: "#0891b2",
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
      main: "#fbbf24",
      light: "#fcd34d",
      dark: "#f59e0b",
    },
    info: {
      main: "#60a5fa",
      light: "#93c5fd",
      dark: "#3b82f6",
    },
    background: {
      default: "#121212", // Deep Charcoal - primary background
      paper: "#1E293B", // Slate Gray 800 - elevated surfaces
    },
    text: {
      primary: "#F1F5F9", // Slate 100 - high contrast
      secondary: "#94A3B8", // Slate 400 - secondary text
    },
    divider: "rgba(148, 163, 184, 0.12)", // Slate-based divider
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any,
});
